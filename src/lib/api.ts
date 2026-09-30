// One entry point for Axon's API. With server.js running, calls go over HTTP.
// On static hosting (GitHub Pages) the same endpoints run in the browser against
// localStorage ("demo mode"), so sign-in, gaps, faculty answers, uploads and senior
// tips all work, shared between tabs of this browser rather than across devices.

let serverMode = false
export const setServerMode = (on: boolean) => {
  serverMode = on
}
export const isServerMode = () => serverMode

export async function api<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
  if (!serverMode) return localApi(method, path, body, token) as Promise<T>
  const r = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : j.error?.message || `Request failed (${r.status})`)
  return j as T
}

// ---------------- demo mode ----------------

// SHA-256 of the demo passcodes (same values as .env.example's demo setup).
// Checked in the browser, so this is demo-grade: use server.js for real deployments.
const PASS_HASH: Record<string, string> = {
  faculty: "c2fed279acf6e35bed3594f9f4e466fbb55c4811a3d868d0ca641b0637e959c5",
  senior: "15ec196f9f03f291afb34b3cbabaefdaec77cc3f1842bd32077c2472852fceda",
}

export const KB_KEY = "axon_kb"
export const GAPS_KEY = "axon_gaps"

type User = { role: "faculty" | "senior"; name: string; dept: string; exp: number }
type Kb = { answers: any[]; docs: any[]; resolved: string[]; tips: any[] } // eslint-disable-line @typescript-eslint/no-explicit-any

class ApiError extends Error {}
const fail = (msg: string): never => {
  throw new ApiError(msg)
}

const read = <T>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "") ?? fallback
  } catch {
    return fallback
  }
}
const write = (key: string, data: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    fail("This browser's storage is full. Remove a document and try again.")
  }
}
const readKb = (): Kb => ({ answers: [], docs: [], resolved: [], tips: [], ...read<Partial<Kb>>(KB_KEY, {}) })
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")
const uid = (prefix: string) => `${prefix}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(16)}`

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

function userFrom(token?: string): User | null {
  try {
    const u = JSON.parse(atob((token ?? "").split(".")[0].replace(/-/g, "+").replace(/_/g, "/")))
    return u.exp > Date.now() && PASS_HASH[u.role] ? u : null
  } catch {
    return null
  }
}

/** Same chunking as server.js: ~900-character passages along paragraph and sentence breaks. */
function chunk(text: string) {
  const parts = text
    .replace(/\r/g, "")
    .split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((p) => p.trim())
    .filter(Boolean)
  const out: string[] = []
  let cur = ""
  for (const p of parts) {
    if (cur && cur.length + p.length > 900) {
      out.push(cur)
      cur = ""
    }
    cur = cur ? `${cur}\n${p}` : p
    while (cur.length > 1400) {
      out.push(cur.slice(0, 1200))
      cur = cur.slice(1200)
    }
  }
  if (cur) out.push(cur)
  return out
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function localApi(method: string, path: string, body: any = {}, token?: string): Promise<unknown> {
  const now = new Date().toISOString()

  if (path === "api/login" && method === "POST") {
    const role = body.role as string
    if (!Object.hasOwn(PASS_HASH, role)) fail("Unknown role")
    if ((await sha256(String(body.passcode ?? ""))) !== PASS_HASH[role]) fail(`Wrong ${role} passcode`)
    const user = { role, name: str(body.name, 80) || (role === "senior" ? "A senior" : "Faculty"), dept: str(body.dept, 80) }
    const payload = btoa(JSON.stringify({ ...user, exp: Date.now() + 12 * 3600e3 })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
    return { ...user, token: `${payload}.demo` }
  }

  if (path === "api/gaps") {
    if (method === "GET") return read(GAPS_KEY, [])
    if (method === "POST") {
      const entry = { question: str(body.question, 300), missing: str(body.missing, 120), at: now }
      write(GAPS_KEY, [...read<unknown[]>(GAPS_KEY, []), entry].slice(-500))
      return entry
    }
    if (method === "DELETE") {
      if (userFrom(token)?.role !== "faculty") fail("Faculty only")
      localStorage.removeItem(GAPS_KEY)
      return []
    }
  }

  if (path === "api/knowledge" && method === "GET") return readKb()

  const helpful = path.match(/^api\/knowledge\/tips\/([\w-]+)\/helpful$/)
  if (helpful && method === "POST") {
    const kb = readKb()
    const tip = kb.tips.find((t) => t.id === helpful[1]) ?? fail("not found")
    tip.helpful = (tip.helpful || 0) + 1
    write(KB_KEY, kb)
    return { helpful: tip.helpful }
  }

  const user = userFrom(token) ?? fail("Sign-in required")
  const kb = readKb()
  const by = user.dept ? `${user.name}, ${user.dept}` : user.name

  if (path === "api/knowledge/tips" && method === "POST") {
    const gapKey = str(body.gapKey, 200)
    const tip = { id: uid("tip"), text: str(body.text, 1500), category: str(body.category, 20) || "facilities", by, role: user.role, at: now, helpful: 0, ...(gapKey && { gapKey, question: str(body.question, 300) }) }
    if (!tip.text) fail("the tip is empty")
    kb.tips.push(tip)
    write(KB_KEY, kb)
    return tip
  }
  const delTip = path.match(/^api\/knowledge\/tips\/([\w-]+)$/)
  if (delTip && method === "DELETE") {
    const tip = kb.tips.find((t) => t.id === delTip[1]) ?? fail("not found")
    if (user.role !== "faculty" && tip.by !== by) fail("You can only remove your own tips")
    kb.tips = kb.tips.filter((t) => t.id !== tip.id)
    write(KB_KEY, kb)
    return { ok: true }
  }

  if (user.role !== "faculty") fail("Faculty only")

  if (path === "api/knowledge/answers" && method === "POST") {
    const gapKey = str(body.gapKey, 200)
    const answer = { id: uid("fac"), question: str(body.question, 300), answer: str(body.answer, 4000), category: str(body.category, 20) || "facilities", by, at: now, ...(gapKey && { gapKey }) }
    if (!answer.question || !answer.answer) fail("question and answer are required")
    kb.answers.push(answer)
    if (gapKey && !kb.resolved.includes(gapKey)) kb.resolved.push(gapKey)
    write(KB_KEY, kb)
    return answer
  }
  if (path === "api/knowledge/docs" && method === "POST") {
    const text = str(body.text, 200_000)
    if (!text) fail("the document has no text")
    const doc = { id: uid("doc"), title: str(body.title, 140) || "Untitled document", filename: str(body.filename, 200), by, at: now, chars: text.length, chunks: chunk(text) }
    kb.docs.push(doc)
    write(KB_KEY, kb)
    return { ...doc, chunks: doc.chunks.length }
  }
  const del = path.match(/^api\/knowledge\/(answers|docs)\/([\w-]+)$/)
  if (del && method === "DELETE") {
    const kind = del[1] as "answers" | "docs"
    const gone = kb[kind].find((x) => x.id === del[2])
    if (gone?.gapKey && !kb.answers.some((a) => a.id !== gone.id && a.gapKey === gone.gapKey)) kb.resolved = kb.resolved.filter((k) => k !== gone.gapKey)
    kb[kind] = kb[kind].filter((x) => x.id !== del[2])
    write(KB_KEY, kb)
    return { ok: true }
  }
  return fail("not found")
}
