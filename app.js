const { faqs, categories, name: CAMPUS_NAME } = window.CAMPUS;
const byId = Object.fromEntries(faqs.map((f) => [f.id, f]));
const catById = Object.fromEntries(categories.map((c) => [c.id, c]));

// Free OpenRouter models. If one is rate-limited, OpenRouter falls through to the next.
const DEFAULT_MODEL = "google/gemma-4-31b-it:free";
const FALLBACK_MODELS = ["nvidia/nemotron-3-super-120b-a12b:free", "openrouter/free"];
const cfg = window.AXON_CONFIG || {};

const $ = (id) => document.getElementById(id);
const chat = $("chat");
const input = $("input");
const sendBtn = $("sendBtn");

const history = []; // [{role, content}] sent to the model for follow-up context
const asked = new Set();
let busy = false;

// ---------- settings ----------
const getKey = () => localStorage.getItem("axon_key") || cfg.key || "";
const getModel = () => localStorage.getItem("axon_model") || cfg.model || server.model || DEFAULT_MODEL;

// When run via `npm start`, server.js holds the key (from .env) and proxies AI calls.
const server = { ai: false, model: "" };
const useServer = () => server.ai && !getKey();
const aiOn = () => useServer() || Boolean(getKey());
fetch("/api/health")
  .then((r) => (r.ok ? r.json() : null))
  .then((j) => {
    if (j?.ai) Object.assign(server, j);
    updateBadge();
  })
  .catch(() => {});

function updateBadge() {
  const badge = $("modeBadge");
  if (aiOn()) {
    badge.textContent = `✨ AI mode · ${getModel().replace(/^~/, "").split("/").pop()}`;
    badge.className = "badge ai";
  } else {
    badge.textContent = "📴 Offline mode (FAQ match)";
    badge.className = "badge offline";
  }
}

$("settingsBtn").onclick = () => {
  $("keyInput").value = localStorage.getItem("axon_key") || "";
  $("modelInput").value = localStorage.getItem("axon_model") || "";
  $("settings").showModal();
};
$("saveSettings").onclick = () => {
  const k = $("keyInput").value.trim();
  const m = $("modelInput").value.trim();
  k ? localStorage.setItem("axon_key", k) : localStorage.removeItem("axon_key");
  m ? localStorage.setItem("axon_model", m) : localStorage.removeItem("axon_model");
  updateBadge();
};
$("clearBtn").onclick = () => location.reload();

// ---------- sidebar + starters ----------
function renderCategories() {
  const nav = $("categories");
  for (const c of categories) {
    const n = faqs.filter((f) => f.category === c.id).length;
    const b = document.createElement("button");
    b.className = "cat";
    b.innerHTML = `<span>${c.icon}</span><span>${c.label}</span><span class="count">${n}</span>`;
    b.onclick = () => {
      document.querySelectorAll(".cat").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      showCategory(c);
    };
    nav.appendChild(b);
  }
}

function showCategory(c) {
  hideWelcome();
  const list = faqs.filter((f) => f.category === c.id);
  const el = addBot(`<p><b>${c.icon} ${c.label}</b>: pick a question, or type your own.</p>`);
  el.querySelector(".bubble").appendChild(chipRow(list.map((f) => f.question), "followups"));
  scrollDown();
}

function chipRow(questions, extraClass = "") {
  const row = document.createElement("div");
  row.className = `chips ${extraClass}`;
  for (const q of questions) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = q;
    b.onclick = () => ask(q);
    row.appendChild(b);
  }
  return row;
}

const STARTERS = ["attendance", "hostel-curfew", "library-timings", "clubs", "fest", "anti-ragging"];
$("starter").appendChild(chipRow(STARTERS.map((id) => byId[id].question)));

// ---------- rendering ----------
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function md(text) {
  const inline = (s) =>
    esc(s)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|[\s(])(https?:\/\/[^\s<)]+[^\s<).,])/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>");
  let html = "";
  let inList = false;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const item = line.match(/^[-*•]\s+(.*)/) || line.match(/^\d+[.)]\s+(.*)/);
    if (item) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inline(item[1])}</li>`;
      continue;
    }
    if (inList) { html += "</ul>"; inList = false; }
    if (line) html += `<p>${inline(line.replace(/^#+\s*/, ""))}</p>`;
  }
  if (inList) html += "</ul>";
  return html;
}

function hideWelcome() {
  const w = $("welcome");
  if (w) w.remove();
}

function addMsg(role, html) {
  hideWelcome();
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.innerHTML = `<div class="avatar">${role === "bot" ? "A" : "🙂"}</div><div class="bubble">${html}</div>`;
  chat.appendChild(el);
  scrollDown();
  return el;
}
const addBot = (html) => addMsg("bot", html);
const scrollDown = () => chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });

function finishBot(el, text, sourceIds, tag) {
  const bubble = el.querySelector(".bubble");
  bubble.innerHTML = md(text);

  const meta = document.createElement("div");
  meta.className = "meta";
  for (const id of sourceIds) {
    const f = byId[id];
    if (!f) continue;
    const a = document.createElement("a");
    a.className = `src ${f.official ? "" : "guidance"}`;
    a.href = f.source;
    a.target = "_blank";
    a.rel = "noopener";
    a.title = f.official ? "From the official JSS University Noida website" : "General guidance, not on the official site";
    a.textContent = `${f.official ? "📄" : "💡"} ${catById[f.category].label}: ${f.question}`;
    meta.appendChild(a);
  }
  const t = document.createElement("span");
  t.className = "tag";
  t.textContent = tag;
  meta.appendChild(t);

  const speak = document.createElement("button");
  speak.className = "speak";
  speak.type = "button";
  speak.textContent = "🔊 Listen";
  speak.onclick = () => readAloud(text, speak);
  meta.appendChild(speak);
  bubble.appendChild(meta);

  const next = relatedQuestions(sourceIds);
  if (next.length) bubble.appendChild(chipRow(next, "followups"));
  scrollDown();
}

function relatedQuestions(sourceIds) {
  const cats = new Set(sourceIds.map((id) => byId[id]?.category).filter(Boolean));
  const pool = faqs.filter((f) => !sourceIds.includes(f.id) && !asked.has(f.question));
  const same = pool.filter((f) => cats.has(f.category));
  const other = pool.filter((f) => !cats.has(f.category)).sort(() => Math.random() - 0.5);
  return [...same, ...other].slice(0, 3).map((f) => f.question);
}

// ---------- offline retrieval ----------
const STOP = new Set("a an the is are was were do does did i me my we our you your to of in on at for and or what whats where when how who which can could should will would there any about tell please it its be have has get this that with from".split(" "));
const tokens = (s) =>
  s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/[\s-]+/).filter((w) => w && !STOP.has(w))
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));

function search(query) {
  const q = tokens(query);
  return faqs
    .map((f) => {
      const kw = new Set(f.keywords.flatMap(tokens));
      const qs = new Set(tokens(f.question));
      let score = 0;
      for (const w of q) {
        if (kw.has(w)) score += 2;
        if (qs.has(w)) score += 1.5;
      }
      if (query.trim().toLowerCase() === f.question.toLowerCase()) score += 100;
      return { f, score: score / Math.sqrt(q.length || 1) };
    })
    .sort((a, b) => b.score - a.score);
}

function answerOffline(question, el, note = "") {
  const [best, second] = search(question);
  if (!best || best.score < 1.2) {
    finishBot(
      el,
      `${note}I don't have that in my campus guide yet. Try one of the topics on the left, or contact the university:\n- **Phone:** 0120-2401484\n- **Email:** admissions@jssuninoida.edu.in`,
      [],
      "offline · no match",
    );
    return;
  }
  const ids = [best.f.id];
  if (second && second.score >= best.score * 0.8 && second.score > 2) ids.push(second.f.id);
  const text = note + ids.map((id) => byId[id].answer).join("\n\n");
  history.push({ role: "assistant", content: text });
  finishBot(el, text, ids, "offline · matched from FAQ");
}

// ---------- AI (OpenRouter, streaming) ----------
function systemPrompt() {
  const kb = faqs
    .map((f) => `[${f.id}] (${catById[f.category].label}${f.official ? "" : ", general guidance"})\nQ: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");
  return `You are Axon, a friendly campus assistant for new students at ${CAMPUS_NAME} (${window.CAMPUS.address}).

Answer ONLY from the campus knowledge base below. It contains the university's official guidelines.
Rules:
- Be warm, concise and practical, like a helpful senior. Use short paragraphs and "- " bullet lists. Bold key facts (**like this**). Don't use headings or tables.
- LANGUAGE: reply in the same language and script the student used. English gets English, Hindi (Devanagari) gets Hindi, and Hinglish (Hindi written in English letters, e.g. "kitne baje hai") gets Hinglish.
- Never invent numbers, timings, names, phone numbers or rules. If the answer isn't in the knowledge base, say you don't have that detail yet and point the student to the contact details in [contact].
- Combine several entries when a question spans topics. Keep every fact exactly as written.
- If an entry is marked "general guidance", phrase it softly and suggest the student confirms it.
- Off-topic requests (homework, coding and so on): politely steer back to campus questions.
- The LAST line of every reply must list the [ids] of the entries you used, e.g. "SOURCES: hostel-curfew, library-timings", or "SOURCES: none" if you used none.

=== CAMPUS KNOWLEDGE BASE ===
${kb}`;
}

const SOURCES_RE = /\n*\s*SOURCES:\s*(.*)\s*$/i;
const visible = (t) => t.replace(SOURCES_RE, "").replace(/\n*S(O(U(R(C(E(S)?)?)?)?)?)?$/, "");

async function answerAI(question, el) {
  const viaServer = useServer();
  const res = await fetch(viaServer ? "/api/chat" : "https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: viaServer
      ? { "Content-Type": "application/json" }
      : {
          Authorization: `Bearer ${getKey()}`,
          "Content-Type": "application/json",
          "HTTP-Referer": location.origin.startsWith("http") ? location.origin : "https://github.com/satanrayshe",
          "X-Title": "Axon Campus Assistant",
        },
    body: JSON.stringify({
      models: [getModel(), ...FALLBACK_MODELS.filter((m) => m !== getModel())].slice(0, 3),
      stream: true,
      temperature: 0.3,
      max_tokens: 1500,
      reasoning: { effort: "low", exclude: true }, // free reasoning models otherwise burn the token budget thinking
      messages: [{ role: "system", content: systemPrompt() }, ...history.slice(-8)],
    }),
  });
  if (!res.ok || !res.body) {
    let detail = "";
    try { detail = (await res.json()).error?.message || ""; } catch {}
    throw new Error(`OpenRouter ${res.status}${detail ? `: ${detail}` : ""}`);
  }

  const bubble = el.querySelector(".bubble");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  let model = getModel();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue; // skips ": OPENROUTER PROCESSING" keep-alives
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const j = JSON.parse(data);
        if (j.error) throw new Error(j.error.message || "stream error");
        if (j.model) model = j.model;
        const delta = j.choices?.[0]?.delta?.content;
        if (delta) {
          text += delta;
          bubble.innerHTML = md(visible(text));
          scrollDown();
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
  if (!text.trim()) throw new Error("empty response");

  const m = text.match(SOURCES_RE);
  let ids = m ? m[1].split(/[,\s]+/).map((s) => s.replace(/[\[\]]/g, "")).filter((id) => byId[id]) : [];
  // Some free models garble the SOURCES line; fall back to keyword matching unless they said "none".
  if (!ids.length && !/^\s*none/i.test(m?.[1] || "")) {
    ids = search(question).filter((r) => r.score >= 2).slice(0, 2).map((r) => r.f.id);
  }
  const clean = text.replace(SOURCES_RE, "").trim();
  history.push({ role: "assistant", content: clean });
  finishBot(el, clean, ids, `✨ AI · ${model.split("/").pop()} · grounded in the JSS FAQ`);
}

// ---------- ask ----------
async function ask(question) {
  question = question.trim();
  if (!question || busy) return;
  busy = true;
  sendBtn.disabled = true;
  input.value = "";
  asked.add(question);
  addMsg("user", esc(question));
  history.push({ role: "user", content: question });
  const el = addBot(`<div class="typing"><span></span><span></span><span></span></div>`);

  try {
    if (aiOn()) {
      try {
        await answerAI(question, el);
      } catch (err) {
        console.warn(err);
        answerOffline(question, el, `*(AI unavailable: ${err.message}. Showing the closest FAQ answer instead.)*\n\n`);
      }
    } else {
      await new Promise((r) => setTimeout(r, 350));
      answerOffline(question, el);
    }
  } finally {
    busy = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

$("composer").onsubmit = (e) => {
  e.preventDefault();
  ask(input.value);
};

// ---------- voice ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const mic = $("micBtn");
if (!SR) {
  mic.title = "Voice input needs Chrome or Edge";
  mic.style.opacity = 0.4;
  mic.onclick = () => alert("Voice input works in Chrome or Edge.");
} else {
  const rec = new SR();
  rec.lang = "en-IN";
  rec.interimResults = true;
  let listening = false;
  rec.onresult = (e) => {
    const r = e.results[e.results.length - 1];
    input.value = Array.from(e.results).map((x) => x[0].transcript).join("");
    if (r.isFinal) ask(input.value);
  };
  rec.onend = () => { listening = false; mic.classList.remove("listening"); };
  rec.onerror = (e) => console.warn("speech", e.error);
  mic.onclick = () => {
    if (listening) return rec.stop();
    speechSynthesis.cancel();
    listening = true;
    mic.classList.add("listening");
    input.value = "";
    input.placeholder = "Listening…";
    rec.start();
    setTimeout(() => (input.placeholder = "e.g. What time is the girls' hostel curfew?"), 4000);
  };
}

function readAloud(text, btn) {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    btn.textContent = "🔊 Listen";
    return;
  }
  const plain = text.replace(/\*/g, "").replace(/https?:\/\/\S+/g, "the link").replace(/^[-•]\s*/gm, "");
  const u = new SpeechSynthesisUtterance(plain);
  const isHindi = /[ऀ-ॿ]/.test(plain);
  u.lang = isHindi ? "hi-IN" : "en-IN";
  const v = speechSynthesis.getVoices().find((x) => x.lang === u.lang);
  if (v) u.voice = v;
  u.rate = 1.03;
  u.onend = () => (btn.textContent = "🔊 Listen");
  btn.textContent = "⏹ Stop";
  speechSynthesis.speak(u);
}

renderCategories();
updateBadge();
input.focus();
