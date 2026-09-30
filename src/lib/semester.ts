// "My semester": the student's own timetable and attendance, kept in this browser.
// The 75% threshold is the university's rule (see the "attendance" FAQ entry).

export const TARGET = 0.75

export interface Slot {
  day: number // 0 = Sunday … 6 = Saturday, matching Date.getDay()
  start: string // "09:30"
  end?: string
  room?: string
}

export interface Course {
  id: string
  name: string
  code?: string
  slots: Slot[]
  attended: number
  held: number
  log: { at: string; present: boolean }[]
}

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export const newId = () => Math.random().toString(36).slice(2, 9)

// ---------- attendance maths ----------
export const pct = (c: Pick<Course, "attended" | "held">) => (c.held ? (c.attended / c.held) * 100 : 100)

/** Classes you can still miss in a row and stay at or above 75%. */
export const safeSkips = (c: Pick<Course, "attended" | "held">) => Math.max(0, Math.floor(c.attended / TARGET - c.held + 1e-9))

/** Classes you must attend in a row to get back to 75%. */
export const toRecover = (c: Pick<Course, "attended" | "held">) =>
  Math.max(0, Math.ceil((TARGET * c.held - c.attended) / (1 - TARGET) - 1e-9))

export type Status = "safe" | "edge" | "danger"
export function status(c: Course): Status {
  if (pct(c) < TARGET * 100) return "danger"
  return safeSkips(c) === 0 ? "edge" : "safe"
}

export function verdict(c: Course): string {
  const s = safeSkips(c)
  const r = toRecover(c)
  if (!c.held) return "No classes logged yet"
  if (r > 0) return `Below 75%. Attend the next ${r} ${r === 1 ? "class" : "classes"} to get back.`
  if (s === 0) return "Right at the edge. Don't skip the next one."
  return `Safe. You can skip ${s} more ${s === 1 ? "class" : "classes"}.`
}

/** Compact form for tight spaces: "2 skips left", "don't skip", "attend next 4". */
export function shortVerdict(c: Course): string {
  if (!c.held) return "no classes logged"
  const r = toRecover(c)
  if (r > 0) return `below 75%, attend next ${r}`
  const s = safeSkips(c)
  return s === 0 ? "at the edge, don't skip" : `${s} ${s === 1 ? "skip" : "skips"} left`
}

// ---------- timetable ----------
const mins = (t: string) => {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + (m || 0)
}
export const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number)
  const ap = h >= 12 ? "PM" : "AM"
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${ap}`
}

export interface Session {
  course: Course
  slot: Slot
  day: number
}

export function classesOn(courses: Course[], day: number): Session[] {
  return courses
    .flatMap((course) => course.slots.filter((s) => s.day === day).map((slot) => ({ course, slot, day })))
    .sort((a, b) => mins(a.slot.start) - mins(b.slot.start))
}

/** The next class from `now`, looking up to a week ahead. */
export function nextClass(courses: Course[], now = new Date()): (Session & { daysAhead: number; minutesUntil: number }) | null {
  const nowMin = now.getHours() * 60 + now.getMinutes()
  for (let d = 0; d < 7; d++) {
    const day = (now.getDay() + d) % 7
    const hit = classesOn(courses, day).find((s) => d > 0 || mins(s.slot.start) > nowMin - 5)
    if (hit) return { ...hit, daysAhead: d, minutesUntil: d * 1440 + mins(hit.slot.start) - nowMin }
  }
  return null
}

export function whenLabel(n: { daysAhead: number; minutesUntil: number; day: number }) {
  if (n.daysAhead === 0) {
    if (n.minutesUntil <= 0) return "starting now"
    if (n.minutesUntil < 60) return `in ${n.minutesUntil} min`
    return `in ${Math.floor(n.minutesUntil / 60)} h ${n.minutesUntil % 60} min`
  }
  return n.daysAhead === 1 ? "tomorrow" : DAY_NAMES[n.day]
}

// ---------- matching course names in free text ----------
const GENERIC = new Set("engineering basic basics introduction intro to for of and the lab laboratory i ii iii iv 1 2 3 4 fundamentals principles applied".split(" "))

/** Words a student might use for a course: its code, acronym, and distinctive words. */
function aliases(c: Course): string[] {
  const words = c.name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean)
  const acronym = words.filter((w) => !["for", "of", "and", "to", "the"].includes(w)).map((w) => w[0]).join("")
  const out = words.filter((w) => w.length >= 4 && !GENERIC.has(w))
  if (acronym.length >= 2) out.push(acronym)
  if (c.code) out.push(c.code.toLowerCase())
  if (words.includes("mathematics")) out.push("maths", "math")
  return [...new Set(out)]
}

export function findCourses(text: string, courses: Course[]): Course[] {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9\s]/g, " ")} `
  return courses.filter((c) => aliases(c).some((a) => t.includes(` ${a} `) || (a.length >= 5 && t.includes(a))))
}

// ---------- "attended OS, skipped maths" → attendance updates ----------
const ABSENT = /\b(skip|skipped|skipping|bunk|bunked|miss|missed|absent|chhod|chhodi|chhoda|chodi|choda|nahi|nhi|didn't|didnt|not)\b/
const PRESENT = /\b(attend|attended|attending|present|went|gaya|gayi|gya|kiya|kari|sat|was in)\b/
const QUESTION = /\?|\b(can|could|should|shall|will|kya|sakta|sakti|sakte|agar|if|how many|kitni|kitne)\b/

export function parseLog(text: string, courses: Course[], now = new Date()): { course: Course; present: boolean }[] {
  const t = text.toLowerCase()
  if (!courses.length || QUESTION.test(t) || !(ABSENT.test(t) || PRESENT.test(t))) return []
  const out = new Map<string, { course: Course; present: boolean }>()
  let polarity: boolean | null = null
  for (const clause of t.split(/,|;|\.|\band\b|\baur\b|\bbut\b|\bpar\b|\bthen\b/)) {
    if (ABSENT.test(clause)) polarity = false
    else if (PRESENT.test(clause)) polarity = true
    if (polarity === null) continue
    let hits = findCourses(clause, courses)
    if (!hits.length && /\b(all|sab|sabhi|every)\b/.test(clause)) hits = classesOn(courses, now.getDay()).map((s) => s.course)
    for (const course of hits) out.set(course.id, { course, present: polarity })
  }
  // "skipped maths and physics": clauses before the first verb get the first verb's polarity.
  if (out.size) {
    const first = [...out.values()][0].present
    for (const course of findCourses(t, courses)) if (!out.has(course.id)) out.set(course.id, { course, present: first })
  }
  return [...out.values()]
}

export function mark(c: Course, present: boolean): Course {
  return { ...c, held: c.held + 1, attended: c.attended + (present ? 1 : 0), log: [...c.log, { at: new Date().toISOString(), present }] }
}

export function undo(c: Course): Course {
  const last = c.log.at(-1)
  if (!last) return c
  return { ...c, held: c.held - 1, attended: c.attended - (last.present ? 1 : 0), log: c.log.slice(0, -1) }
}

// ---------- personal questions answered without AI ----------
const MINE = /\b(my|mera|meri|mere|i|i'm|im|me|mujhe|main)\b/

export function answerPersonal(q: string, courses: Course[], now = new Date()): string | null {
  if (!courses.length) return null
  const t = q.toLowerCase()
  const named = findCourses(t, courses)

  if (/\b(next|agli|agla|upcoming)\b.*\b(class|lecture|period)\b|\bkaunsi class\b/.test(t)) {
    const n = nextClass(courses, now)
    if (!n) return "You haven't added any class times yet. Add them in **My semester**."
    return `Your next class is **${n.course.name}**, **${whenLabel(n)}** at **${fmtTime(n.slot.start)}**${n.slot.room ? ` in **${n.slot.room}**` : ""}.\n\n${verdict(n.course)} (${pct(n.course).toFixed(0)}% so far)`
  }

  if (/\b(today|aaj|tomorrow|kal)\b/.test(t) && /\b(class|classes|schedule|timetable|lecture)\b/.test(t)) {
    const tomorrow = /\b(tomorrow|kal)\b/.test(t)
    const day = (now.getDay() + (tomorrow ? 1 : 0)) % 7
    const list = classesOn(courses, day)
    const label = tomorrow ? "Tomorrow" : "Today"
    if (!list.length) return `${label} (${DAY_NAMES[day]}) you have **no classes** in your timetable.`
    return `${label} (${DAY_NAMES[day]}) you have **${list.length} ${list.length === 1 ? "class" : "classes"}**:\n${list
      .map((s) => `- **${fmtTime(s.slot.start)}**: ${s.course.name}${s.slot.room ? ` (${s.slot.room})` : ""}`)
      .join("\n")}`
  }

  if (/\b(bunk|skip|miss|chhod|chod)\b/.test(t)) {
    const targets = named.length ? named : courses
    return (
      (named.length ? "" : "Here's where you stand in each course:\n") +
      targets.map((c) => `- **${c.name}** at **${pct(c).toFixed(0)}%** (${c.attended}/${c.held}). ${verdict(c)}`).join("\n") +
      "\n\nThe university needs **75% in each course** to sit its semester-end exam."
    )
  }

  if (/\battendance\b/.test(t) && MINE.test(t)) {
    const targets = named.length ? named : courses
    return targets.map((c) => `- **${c.name}**: **${pct(c).toFixed(1)}%** (${c.attended}/${c.held}). ${verdict(c)}`).join("\n")
  }
  return null
}

/** Private context block for the model, with the maths already done. */
export function contextForAi(courses: Course[], now = new Date()): string {
  if (!courses.length) return ""
  const n = nextClass(courses, now)
  const today = classesOn(courses, now.getDay())
  const tomorrow = classesOn(courses, (now.getDay() + 1) % 7)
  const list = (s: Session[]) => (s.length ? s.map((x) => `${fmtTime(x.slot.start)} ${x.course.name}${x.slot.room ? ` (${x.slot.room})` : ""}`).join("; ") : "none")
  return `Now: ${DAY_NAMES[now.getDay()]} ${now.toTimeString().slice(0, 5)}
Today's classes: ${list(today)}
Tomorrow's classes: ${list(tomorrow)}
Next class: ${n ? `${n.course.name}, ${whenLabel(n)} at ${fmtTime(n.slot.start)}${n.slot.room ? `, ${n.slot.room}` : ""}` : "none"}
Attendance (numbers are final, do not recalculate):
${courses.map((c) => `- ${c.name}: ${pct(c).toFixed(1)}% (${c.attended}/${c.held}). ${verdict(c)}`).join("\n")}`
}

// ---------- sample, clearly labelled in the UI ----------
export function sampleSemester(): Course[] {
  const mk = (name: string, code: string, attended: number, held: number, slots: [number, string, string][]): Course => ({
    id: newId(),
    name,
    code,
    attended,
    held,
    log: [],
    slots: slots.map(([day, start, room]) => ({ day, start, room })),
  })
  return [
    mk("Engineering Mathematics-I", "MATH", 21, 26, [[1, "09:30", "Room 204"], [3, "09:30", "Room 204"], [5, "11:30", "Room 204"]]),
    mk("Programming for Problem Solving", "PPS", 24, 26, [[1, "11:30", "Lab 3"], [2, "10:30", "Room 108"], [4, "10:30", "Room 108"]]),
    mk("Engineering Physics", "PHY", 17, 24, [[2, "09:30", "Room 301"], [4, "09:30", "Room 301"], [6, "10:30", "Room 301"]]),
    mk("Basic Electrical Engineering", "BEE", 19, 25, [[1, "14:00", "Room 115"], [3, "14:00", "Room 115"], [5, "09:30", "Room 115"]]),
    mk("Engineering Graphics", "EG", 12, 14, [[2, "14:00", "Drawing Hall"], [6, "09:30", "Drawing Hall"]]),
  ]
}
