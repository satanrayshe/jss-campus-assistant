// Knowledge gaps: campus questions the official guidelines couldn't answer.
// With server.js they're shared in gaps.json (every student on the server feeds one list);
// on static hosting they live in this browser's localStorage.

export interface Gap {
  question: string
  missing: string
  at: string
}

export interface GapGroup {
  missing: string
  count: number
  last: string
  questions: string[]
}

const LS_KEY = "axon_gaps"
const readLocal = (): Gap[] => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]")
  } catch {
    return []
  }
}

export async function logGap(gap: Omit<Gap, "at">, useServer: boolean): Promise<void> {
  const entry = { ...gap, at: new Date().toISOString() }
  if (useServer) {
    try {
      const r = await fetch("api/gaps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry) })
      if (r.ok) return
    } catch {
      /* fall through to local */
    }
  }
  localStorage.setItem(LS_KEY, JSON.stringify([...readLocal(), entry].slice(-500)))
}

export async function loadGaps(useServer: boolean): Promise<Gap[]> {
  if (useServer) {
    try {
      const r = await fetch("api/gaps")
      if (r.ok) return await r.json()
    } catch {
      /* fall through to local */
    }
  }
  return readLocal()
}

export async function clearGaps(useServer: boolean): Promise<void> {
  if (useServer) await fetch("api/gaps", { method: "DELETE" }).catch(() => {})
  localStorage.removeItem(LS_KEY)
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()

/** Groups gaps by the missing detail, most asked first. */
export function groupGaps(gaps: Gap[]): GapGroup[] {
  const map = new Map<string, GapGroup>()
  for (const g of gaps) {
    const k = norm(g.missing)
    const cur = map.get(k)
    if (cur) {
      cur.count++
      if (g.at > cur.last) cur.last = g.at
      if (!cur.questions.includes(g.question)) cur.questions.push(g.question)
    } else {
      map.set(k, { missing: g.missing, count: 1, last: g.at, questions: [g.question] })
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last))
}

export function gapsCsv(groups: GapGroup[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
  const rows = groups.map((g) => [esc(g.missing), g.count, g.last, esc(g.questions.join(" | "))].join(","))
  return ["missing_detail,times_asked,last_asked,example_questions", ...rows].join("\n")
}
