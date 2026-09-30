import { CAMPUS, type Faq } from "@/data/faq"

// Offline retrieval: keyword overlap against each entry's keywords and question.
const STOP = new Set(
  "a an the is are was were do does did i me my we our you your to of in on at for and or what whats where when how who which can could should will would there any about tell please it its be have has get this that with from".split(
    " ",
  ),
)

const tokens = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w && !STOP.has(w))
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))

const index = CAMPUS.faqs.map((f) => ({
  f,
  kw: new Set(f.keywords.flatMap(tokens)),
  qs: new Set(tokens(f.question)),
}))

export function search(query: string): { f: Faq; score: number }[] {
  const q = tokens(query)
  const exact = query.trim().toLowerCase()
  return index
    .map(({ f, kw, qs }) => {
      let score = 0
      for (const w of q) {
        if (kw.has(w)) score += 2
        if (qs.has(w)) score += 1.5
      }
      if (exact === f.question.toLowerCase()) score += 100
      return { f, score: score / Math.sqrt(q.length || 1) }
    })
    .sort((a, b) => b.score - a.score)
}

/** Best one or two entries for a question, or [] when nothing is a confident match. */
export function matchFaqs(query: string): Faq[] {
  const [best, second] = search(query)
  if (!best || best.score < 1.2) return []
  const out = [best.f]
  if (second && second.score >= best.score * 0.8 && second.score > 2) out.push(second.f)
  return out
}
