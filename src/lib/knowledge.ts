import { CAMPUS, byId, catById, type CategoryId } from "@/data/faq"
import { tokens } from "@/lib/search"

// Faculty-published knowledge: answers to gaps and uploaded source material.
// Lives in knowledge.json on server.js; read by everyone, written only by signed-in faculty.

export interface FacultyAnswer {
  id: string
  question: string
  answer: string
  category: CategoryId
  by: string
  at: string
  gapKey?: string
}

export interface SourceDoc {
  id: string
  title: string
  filename?: string
  by: string
  at: string
  chars: number
  chunks: string[]
}

export interface SeniorTip {
  id: string
  text: string
  category: CategoryId
  by: string
  role: "senior" | "faculty"
  at: string
  helpful: number
  gapKey?: string
  question?: string
}

export interface Knowledge {
  answers: FacultyAnswer[]
  docs: SourceDoc[]
  resolved: string[]
  tips: SeniorTip[]
}

export const EMPTY: Knowledge = { answers: [], docs: [], resolved: [], tips: [] }

// Module-level copy so source chips and search can resolve ids anywhere.
let current: Knowledge = EMPTY
export const setKnowledge = (k: Knowledge) => {
  current = k
}

export async function fetchKnowledge(): Promise<Knowledge> {
  try {
    const r = await fetch("api/knowledge")
    if (r.ok && r.headers.get("content-type")?.includes("json")) return { ...EMPTY, ...(await r.json()) }
  } catch {
    /* static hosting */
  }
  return EMPTY
}

// ---------- source ids shown as chips ----------
export type SourceKind = "official" | "guidance" | "faculty" | "document" | "senior"
export interface SourceInfo {
  kind: SourceKind
  label: string
  href?: string
  tooltip: string
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })

export function sourceInfo(id: string): SourceInfo | null {
  const f = byId[id]
  if (f) {
    return {
      kind: f.official ? "official" : "guidance",
      label: `${catById[f.category].label}: ${f.question}`,
      href: f.source,
      tooltip: f.official ? "Official: from jssuninoida.edu.in" : "General guidance, not on the official site. Worth confirming.",
    }
  }
  const a = current.answers.find((x) => x.id === id)
  if (a) return { kind: "faculty", label: `Answered by ${a.by.split(",")[0]}`, tooltip: `Faculty answer from ${a.by}, ${shortDate(a.at)}` }
  const t = current.tips.find((x) => x.id === id)
  if (t) return { kind: "senior", label: `Senior tip · ${t.by}`, tooltip: `From a senior, ${shortDate(t.at)}. Their experience, not official policy.` }
  const m = id.match(/^(doc-[\w]+)-(\d+)$/)
  const d = m && current.docs.find((x) => x.id === m[1])
  if (d) return { kind: "document", label: d.title, tooltip: `Uploaded by ${d.by}, ${shortDate(d.at)}${d.filename ? ` · ${d.filename}` : ""}` }
  return null
}

// ---------- retrieval ----------
function score(query: Set<string>, text: string) {
  let s = 0
  for (const w of new Set(tokens(text))) if (query.has(w)) s++
  return s
}

/** Knowledge-base block for the model: every faculty answer, plus the document passages most relevant to the question. */
export function knowledgeForAi(question: string, k: Knowledge = current): string {
  const q = new Set(tokens(question))
  const answers = k.answers
    .slice(-60)
    .map((a) => `[${a.id}] (Faculty answer by ${a.by})\nQ: ${a.question}\nA: ${a.answer}`)
  const passages = k.docs
    .flatMap((d) => d.chunks.map((c, i) => ({ id: `${d.id}-${i}`, title: d.title, by: d.by, c, s: score(q, c) + score(q, d.title) })))
    .filter((p) => p.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 4)
    .map((p) => `[${p.id}] (From uploaded document "${p.title}", by ${p.by})\n${p.c}`)
  const tips = k.tips
    .map((t) => ({ t, s: score(q, t.text) + (t.question ? score(q, t.question) : 0) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.t.helpful - a.t.helpful)
    .slice(0, 5)
    .map(({ t }) => `[${t.id}] (Senior tip by ${t.by}: student experience, NOT official policy; ${t.helpful} freshers found it helpful)\n${t.text}`)
  return [...answers, ...passages, ...tips].join("\n\n")
}

/** Offline: the best faculty answer or document passage for a question, if any is a confident match. */
export function matchKnowledge(question: string, k: Knowledge = current): { id: string; text: string } | null {
  const q = new Set(tokens(question))
  if (!q.size) return null
  let best: { id: string; text: string; s: number } | null = null
  for (const a of k.answers) {
    const s = (score(q, a.question) * 2 + score(q, a.answer)) / Math.sqrt(q.size)
    if (!best || s > best.s) best = { id: a.id, text: a.answer, s }
  }
  for (const d of k.docs) {
    d.chunks.forEach((c, i) => {
      const s = (score(q, c) + score(q, d.title)) / Math.sqrt(q.size)
      if (!best || s > best.s) best = { id: `${d.id}-${i}`, text: `From **${d.title}**:\n\n${c}`, s }
    })
  }
  if (best && best.s >= 1.2) return best
  for (const t of k.tips) {
    const s = (score(q, t.text) + (t.question ? score(q, t.question) * 2 : 0)) / Math.sqrt(q.size)
    if (s >= 1.2 && (!best || s > best.s)) best = { id: t.id, text: `A senior (${t.by}) says:\n\n${t.text}`, s }
  }
  return best && best.s >= 1.2 ? best : null
}

// ---------- faculty API ----------
async function call<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : j.error?.message || `Request failed (${r.status})`)
  return j as T
}

export const publishAnswer = (token: string, a: { question: string; answer: string; category: CategoryId; gapKey?: string }) =>
  call<FacultyAnswer>(token, "POST", "api/knowledge/answers", a)
export const uploadDoc = (token: string, d: { title: string; filename?: string; text: string }) => call<{ id: string; chunks: number }>(token, "POST", "api/knowledge/docs", d)
export const postTip = (token: string, t: { text: string; category: CategoryId; gapKey?: string; question?: string }) =>
  call<SeniorTip>(token, "POST", "api/knowledge/tips", t)
export async function markHelpful(id: string): Promise<number | null> {
  const voted = new Set<string>(JSON.parse(localStorage.getItem("axon_helpful") ?? "[]"))
  if (voted.has(id)) return null
  const r = await fetch(`api/knowledge/tips/${id}/helpful`, { method: "POST" })
  if (!r.ok) return null
  localStorage.setItem("axon_helpful", JSON.stringify([...voted, id]))
  return (await r.json()).helpful
}
export const hasVoted = (id: string) => (JSON.parse(localStorage.getItem("axon_helpful") ?? "[]") as string[]).includes(id)
export const deleteItem = (token: string, kind: "answers" | "docs" | "tips", id: string) => call(token, "DELETE", `api/knowledge/${kind}/${id}`)
export const clearGapsApi = (token: string) => call(token, "DELETE", "api/gaps")

export const categories = CAMPUS.categories
