import { api } from "@/lib/api"

// Knowledge gaps: campus questions the official guidelines couldn't answer.
// With server.js they're shared in gaps.json (every student on the server feeds one list);
// on static hosting they live in this browser's localStorage.

export interface Gap {
  question: string
  missing: string
  at: string
}

export interface GapGroup {
  key: string
  missing: string
  count: number
  last: string
  questions: string[]
}

export async function logGap(gap: Omit<Gap, "at">): Promise<void> {
  await api("POST", "api/gaps", gap).catch(() => {})
}

export async function loadGaps(): Promise<Gap[]> {
  return api<Gap[]>("GET", "api/gaps").catch(() => [])
}

/** Stable key for "the same missing detail", so a faculty answer can close every copy of it. */
export const gapKey = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()

/** Groups gaps by the missing detail, most asked first. */
export function groupGaps(gaps: Gap[]): GapGroup[] {
  const map = new Map<string, GapGroup>()
  for (const g of gaps) {
    const k = gapKey(g.missing)
    const cur = map.get(k)
    if (cur) {
      cur.count++
      if (g.at > cur.last) cur.last = g.at
      if (!cur.questions.includes(g.question)) cur.questions.push(g.question)
    } else {
      map.set(k, { key: k, missing: g.missing, count: 1, last: g.at, questions: [g.question] })
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last))
}

export function gapsCsv(groups: GapGroup[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
  const rows = groups.map((g) => [esc(g.missing), g.count, g.last, esc(g.questions.join(" | "))].join(","))
  return ["missing_detail,times_asked,last_asked,example_questions", ...rows].join("\n")
}
