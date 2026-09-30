import { completeJson, type AiConfig } from "@/lib/ai"
import { newId, type Course } from "@/lib/semester"

// Turns whatever the class rep pasted (WhatsApp text, a copied table, notes) into courses.

const SYSTEM = `You convert a college class timetable, pasted as messy text, into JSON.
Return ONLY a JSON object, no prose, in exactly this shape:
{"courses":[{"name":"Engineering Mathematics-I","code":"MATH","slots":[{"day":"Mon","start":"09:30","end":"10:20","room":"Room 204"}]}]}
Rules:
- One entry per subject. Merge all of a subject's weekly slots into its "slots" array.
- "day" is one of Mon, Tue, Wed, Thu, Fri, Sat, Sun. "start" and "end" use 24-hour HH:MM.
- Expand common abbreviations into readable names when obvious (e.g. "EM-1" becomes "Engineering Mathematics-I"), and keep the original short form as "code".
- Leave out breaks, lunch, library periods and free periods.
- Omit "room" or "end" if the text doesn't say. Never invent subjects, times or rooms.`

interface Raw {
  courses?: { name?: string; code?: string; slots?: { day?: string; start?: string; end?: string; room?: string }[] }[]
}

const DAY_INDEX: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }
const time = (t?: string) => {
  const m = t?.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return undefined
  let h = Number(m[1])
  if (h >= 1 && h <= 6) h += 12 // "2:00" in a college timetable is 2 PM, not 2 AM
  return h < 24 ? `${String(h).padStart(2, "0")}:${m[2]}` : undefined
}

export async function importTimetable(cfg: AiConfig, text: string): Promise<Course[]> {
  const raw = await completeJson<Raw>(cfg, SYSTEM, text.slice(0, 6000))
  const courses: Course[] = []
  for (const c of raw.courses ?? []) {
    const name = c.name?.trim()
    if (!name) continue
    const slots = (c.slots ?? [])
      .map((s) => ({ day: DAY_INDEX[(s.day ?? "").slice(0, 3).toLowerCase()], start: time(s.start), end: time(s.end), room: s.room?.trim() || undefined }))
      .filter((s): s is { day: number; start: string; end: string | undefined; room: string | undefined } => s.day !== undefined && Boolean(s.start))
    const code = c.code?.trim()
    courses.push({ id: newId(), name, code: code && code.toLowerCase() !== name.toLowerCase() ? code : undefined, slots, attended: 0, held: 0, log: [] })
  }
  if (!courses.length) throw new Error("couldn't find any subjects in that text")
  return courses
}
