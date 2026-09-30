import { CAMPUS, catById } from "@/data/faq"
import { sourceInfo } from "@/lib/knowledge"
import { search } from "@/lib/search"

// Free OpenRouter models, picked for staying faithful to the FAQ in testing (Sep 2026).
// If one is rate-limited, OpenRouter falls through to the next; if all fail, the app answers offline.
export const DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b:free"
const FALLBACK_MODELS = ["nvidia/nemotron-3-ultra-550b-a55b:free", "openrouter/free"]

export type ChatTurn = { role: "user" | "assistant"; content: string }

export interface AiConfig {
  /** true when served by server.js with a key in .env: calls go through /api/chat. */
  viaServer: boolean
  key: string
  model: string
  /** The student's own timetable and attendance (from My semester), already computed. */
  personal?: string
  /** Faculty answers and relevant uploaded passages for this question. */
  knowledge?: string
}

function systemPrompt(personal = "", knowledge = "") {
  const kb = CAMPUS.faqs
    .map(
      (f) =>
        `[${f.id}] (${catById[f.category].label}${f.official ? "" : ", general guidance"})\nQ: ${f.question}\nA: ${f.answer}`,
    )
    .join("\n\n")
  return `You are Axon, a friendly campus assistant for new students at ${CAMPUS.name} (${CAMPUS.address}).

Answer ONLY from the campus knowledge base below. It contains the university's official guidelines.
Rules:
- Be warm, concise and practical, like a helpful senior. Use short paragraphs and "- " bullet lists. Bold key facts (**like this**). Don't use headings or tables.
- LANGUAGE: reply in the same language and script the student used. English gets English, Hindi (Devanagari) gets Hindi, and Hinglish (Hindi written in English letters, e.g. "kitne baje hai") gets Hinglish.
- STRICT GROUNDING: state only facts written in the knowledge base. Do NOT add tips, advice, exceptions, assumptions or details of your own, even if they seem helpful or obvious. Never invent numbers, timings, names, phone numbers or rules.
- If the answer isn't in the knowledge base, say you don't have that detail yet and point the student to the contact details in [contact].
- Combine several entries when a question spans topics. Keep every fact exactly as written.
- If an entry is marked "general guidance", phrase it softly and suggest the student confirms it.
- Off-topic requests (homework, coding and so on): politely steer back to campus questions.
- End every reply with these machine-readable lines, each on its own line:
  SOURCES: <the [ids] of the entries you used, e.g. hostel-curfew, library-timings>. Write "SOURCES: none" if you used none, or "SOURCES: offtopic" if the question isn't about campus life at all.
  MISSING: <in under 10 words, the campus detail the student asked for that the knowledge base doesn't cover>. Include this line only when part of a campus question went unanswered.

=== CAMPUS KNOWLEDGE BASE ===
${kb}${
    knowledge
      ? `

=== FROM JSS FACULTY AND SENIORS ===
Faculty answers and uploaded documents are as authoritative as the entries above, and newer.
Entries marked "Senior tip" are advice from senior students, NOT official policy: introduce them as "Seniors say…" or "A senior's tip:", keep them separate from official facts, and if one conflicts with an official entry, the official entry wins.
${knowledge}`
      : ""
  }${
    personal
      ? `

=== THIS STUDENT'S OWN SEMESTER (private, from their tracker) ===
${personal}

For questions about the student's own classes, timetable, attendance or bunking, answer from this block and cite it as "my-semester" in SOURCES. Its numbers are already calculated: repeat them exactly, never recalculate. Remind them the rule is 75% per course when it matters.`
      : ""
  }`
}

// The model ends with SOURCES:/MISSING: lines. Everything from the first of them on is metadata.
const TRAILER_RE = /\n\s*(?:SOURCES|MISSING):[\s\S]*$/i
const PARTIAL_RE = /\n+\s*(?:S(?:O(?:U(?:R(?:C(?:E(?:S)?)?)?)?)?)?|M(?:I(?:S(?:S(?:I(?:N(?:G)?)?)?)?)?)?)$/
/** Text safe to show mid-stream: hides the trailer lines, even while they're half-written. */
export const visibleText = (t: string) => `\n${t}`.replace(TRAILER_RE, "").replace(PARTIAL_RE, "").slice(1)

export interface Answer {
  text: string
  sources: string[]
  model: string
  /** Campus detail the knowledge base couldn't answer: a knowledge gap. */
  missing?: string
  offTopic: boolean
  /** The answer drew on the student's own semester data. */
  personal: boolean
}

export async function streamAnswer(
  cfg: AiConfig,
  history: ChatTurn[],
  onText: (text: string) => void,
  signal?: AbortSignal,
): Promise<Answer> {
  const models = [cfg.model, ...FALLBACK_MODELS.filter((m) => m !== cfg.model)].slice(0, 3)
  const res = await fetch(cfg.viaServer ? "api/chat" : "https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal,
    headers: cfg.viaServer
      ? { "Content-Type": "application/json" }
      : {
          Authorization: `Bearer ${cfg.key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": location.origin,
          "X-Title": "Axon Campus Assistant",
        },
    body: JSON.stringify({
      models,
      stream: true,
      temperature: 0.3,
      max_tokens: 1500,
      reasoning: { effort: "low", exclude: true }, // free reasoning models otherwise burn the token budget thinking
      messages: [{ role: "system", content: systemPrompt(cfg.personal, cfg.knowledge) }, ...history.slice(-8)],
    }),
  })
  if (!res.ok || !res.body) {
    let detail = ""
    try {
      detail = (await res.json()).error?.message || ""
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`OpenRouter ${res.status}${detail ? `: ${detail}` : ""}`)
  }

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ""
  let text = ""
  let model = cfg.model
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split("\n")
    buf = lines.pop() ?? ""
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue // skips ": OPENROUTER PROCESSING" keep-alives
      const data = line.slice(6).trim()
      if (data === "[DONE]") continue
      let j
      try {
        j = JSON.parse(data)
      } catch {
        continue
      }
      if (j.error) throw new Error(j.error.message || "stream error")
      if (j.model) model = j.model
      const delta = j.choices?.[0]?.delta?.content
      if (delta) {
        text += delta
        onText(visibleText(text))
      }
    }
  }
  if (!text.trim()) throw new Error("the model returned an empty answer")

  const srcLine = text.match(/^\s*SOURCES:\s*(.*)$/im)?.[1]?.trim() ?? ""
  const missing = text
    .match(/^\s*MISSING:\s*(.*)$/im)?.[1]
    ?.trim()
    .replace(/^[<"']+|[>"'.]+$/g, "")
  const offTopic = /^offtopic/i.test(srcLine)
  let sources = srcLine
    .split(/[,\s]+/)
    .map((s) => s.replace(/[[\]]/g, ""))
    .filter((id) => sourceInfo(id))
  // Some free models garble the SOURCES line; fall back to keyword matching unless they said none/offtopic.
  const question = history.at(-1)?.content ?? ""
  if (!sources.length && !/^(none|offtopic)/i.test(srcLine)) {
    sources = search(question)
      .filter((r) => r.score >= 2)
      .slice(0, 2)
      .map((r) => r.f.id)
  }
  return {
    text: visibleText(text).trim(),
    sources,
    model,
    missing: !offTopic && missing && !/^none$/i.test(missing) ? missing.slice(0, 120) : undefined,
    offTopic,
    personal: /my-semester/i.test(srcLine),
  }
}

/** One non-streaming call that must return JSON. Used for timetable import. */
export async function completeJson<T>(cfg: AiConfig, system: string, user: string): Promise<T> {
  const models = [cfg.model, ...FALLBACK_MODELS.filter((m) => m !== cfg.model)].slice(0, 3)
  const res = await fetch(cfg.viaServer ? "api/chat" : "https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: cfg.viaServer
      ? { "Content-Type": "application/json" }
      : { Authorization: `Bearer ${cfg.key}`, "Content-Type": "application/json", "HTTP-Referer": location.origin, "X-Title": "Axon Campus Assistant" },
    body: JSON.stringify({
      models,
      temperature: 0,
      max_tokens: 3000,
      reasoning: { effort: "low", exclude: true },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(j.error?.message || `OpenRouter ${res.status}`)
  const text: string = j.choices?.[0]?.message?.content ?? ""
  const block = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)
  if (!block) throw new Error("the model didn't return a timetable")
  return JSON.parse(block) as T
}

/** Asks server.js whether it holds a key. Resolves null on static hosting. */
export async function probeServer(): Promise<{ ai: boolean; model: string } | null> {
  if (location.hostname.endsWith("github.io")) return null // static hosting: no server to ask
  try {
    const r = await fetch("api/health")
    if (!r.ok || !r.headers.get("content-type")?.includes("json")) return null
    return await r.json()
  } catch {
    return null
  }
}
