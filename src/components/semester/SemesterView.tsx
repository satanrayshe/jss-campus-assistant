import { useEffect, useRef, useState } from "react"
import IconMagic from "~icons/solar/magic-stick-3-linear"
import IconAdd from "~icons/solar/add-circle-linear"
import IconClock from "~icons/solar/clock-circle-linear"
import IconPin from "~icons/solar/map-point-linear"
import IconCheck from "~icons/solar/check-circle-linear"
import IconClose from "~icons/solar/close-circle-linear"
import IconChat from "~icons/solar/chat-round-dots-linear"
import { AttendanceBar, CourseCard, STATUS_TEXT } from "@/components/semester/CourseCard"
import { CourseDialog } from "@/components/semester/CourseDialog"
import { Button } from "@/components/ui/button"
import { useReveal } from "@/hooks/useReveal"
import type { useSemester } from "@/hooks/useSemester"
import { classesOn, DAY_NAMES, fmtTime, nextClass, pct, status, verdict, whenLabel, type Course } from "@/lib/semester"
import { cn } from "@/lib/utils"

interface Props {
  semester: ReturnType<typeof useSemester>
  isSample: boolean
  onImport: () => void
  onLoadSample: () => void
  onClearSample: () => void
  onAsk: (q: string) => void
}

const loggedToday = (c: Course) => c.log.filter((l) => new Date(l.at).toDateString() === new Date().toDateString())

export function SemesterView({ semester, isSample, onImport, onLoadSample, onClearSample, onAsk }: Props) {
  const { courses } = semester
  const [now, setNow] = useState(() => new Date())
  const [editing, setEditing] = useState<{ course: Course; isNew: boolean } | null>(null)
  const root = useRef<HTMLDivElement>(null)
  useReveal(root, { y: 8 })

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const next = nextClass(courses, now)
  const today = classesOn(courses, now.getDay())
  const atRisk = courses.filter((c) => status(c) === "danger").length

  const addCourse = () =>
    setEditing({ course: { id: `new-${Date.now()}`, name: "", code: "", slots: [{ day: now.getDay() || 1, start: "09:30" }], attended: 0, held: 0, log: [] }, isNew: true })

  return (
    <div ref={root} className="mx-auto w-full max-w-3xl px-5 pt-8 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl leading-none font-[450] tracking-[-0.01em]">My semester</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {courses.length
              ? `${courses.length} courses · ${atRisk ? `${atRisk} below 75%` : "all at or above 75%"} · ${DAY_NAMES[now.getDay()]}`
              : "Your timetable and attendance, with the 75% rule worked out for you."}
          </p>
        </div>
        {courses.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={addCourse}>
              <IconAdd /> Add course
            </Button>
            <Button onClick={onImport}>
              <IconMagic /> Paste timetable
            </Button>
          </div>
        )}
      </div>

      {isSample && (
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-saffron/30 bg-saffron-wash px-4 py-3 text-[13px] text-saffron-ink">
          <p className="flex-1">
            <b>Sample semester.</b> These courses and numbers are made up so you can try Axon. Paste your own timetable to replace them.
          </p>
          <button type="button" onClick={onClearSample} className="font-medium underline underline-offset-2">
            Clear sample
          </button>
        </div>
      )}

      {!courses.length ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <h2 className="font-display text-2xl font-[450]">Set up your semester in one paste</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Paste the timetable your class rep shared. Axon reads it, then tracks your attendance, tells you your next class, and answers
            "can I bunk this?" with real numbers.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button size="lg" onClick={onImport}>
              <IconMagic /> Paste my timetable
            </Button>
            <Button size="lg" variant="outline" onClick={addCourse}>
              <IconAdd /> Add a course by hand
            </Button>
          </div>
          <button type="button" onClick={onLoadSample} className="mt-4 text-[13px] text-muted-foreground underline underline-offset-2 hover:text-foreground">
            or try it with a sample semester
          </button>
        </div>
      ) : (
        <>
          {next && (
            <section aria-label="Next class" className="mt-6 overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground md:p-6">
              <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-saffron uppercase">
                <IconClock className="size-3.5" /> Next class · {whenLabel(next)}
              </p>
              <h2 className="mt-2 font-display text-[1.75rem] leading-tight font-[450]">{next.course.name}</h2>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-primary-foreground/75">
                <span>
                  {next.daysAhead > 1 ? `${DAY_NAMES[next.day]}, ` : ""}
                  {fmtTime(next.slot.start)}
                </span>
                {next.slot.room && (
                  <span className="flex items-center gap-1">
                    <IconPin className="size-3.5" /> {next.slot.room}
                  </span>
                )}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                <AttendanceBar course={next.course} className="min-w-40 flex-1 bg-white/15" />
                <p className="text-[13px] text-primary-foreground/90">
                  <span className="font-mono">{pct(next.course).toFixed(0)}%</span> · {verdict(next.course)}
                </p>
              </div>
            </section>
          )}

          <section className="mt-8" aria-labelledby="today-h">
            <div className="flex items-baseline justify-between">
              <h2 id="today-h" className="text-sm font-medium">
                Today
              </h2>
              <button
                type="button"
                onClick={() => onAsk("Can I bunk any class tomorrow?")}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <IconChat className="size-3.5" /> Ask "can I bunk tomorrow?"
              </button>
            </div>
            {today.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No classes today. Enjoy it.</p>
            ) : (
              <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-card">
                {today.map((s, i) => {
                  const idx = today.filter((x, j) => j < i && x.course.id === s.course.id).length
                  const mark = loggedToday(s.course)[idx]
                  return (
                    <li key={`${s.course.id}-${s.slot.start}`} className="flex items-center gap-3 px-4 py-3">
                      <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{fmtTime(s.slot.start)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.course.name}</p>
                        <p className={cn("truncate text-xs", STATUS_TEXT[status(s.course)])}>
                          {s.slot.room ? `${s.slot.room} · ` : ""}
                          {pct(s.course).toFixed(0)}%
                        </p>
                      </div>
                      {mark ? (
                        <span className={cn("flex items-center gap-1 text-xs font-medium", mark.present ? "text-emerald-700" : "text-destructive")}>
                          {mark.present ? <IconCheck className="size-4" /> : <IconClose className="size-4" />}
                          {mark.present ? "Present" : "Absent"}
                        </span>
                      ) : (
                        <div className="flex gap-1">
                          <Button variant="outline" size="icon-sm" aria-label={`Present in ${s.course.name}`} onClick={() => semester.mark(s.course.id, true)}>
                            <IconCheck className="text-emerald-700" />
                          </Button>
                          <Button variant="outline" size="icon-sm" aria-label={`Absent from ${s.course.name}`} onClick={() => semester.mark(s.course.id, false)}>
                            <IconClose className="text-destructive" />
                          </Button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="mt-8" aria-labelledby="att-h">
            <div className="flex items-baseline justify-between">
              <h2 id="att-h" className="text-sm font-medium">
                Attendance
              </h2>
              <p className="text-xs text-muted-foreground">75% per course to sit the semester-end exam</p>
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {courses.map((c) => (
                <CourseCard
                  key={c.id}
                  course={c}
                  onMark={(p) => semester.mark(c.id, p)}
                  onUndo={() => semester.undo(c.id)}
                  onEdit={() => setEditing({ course: c, isNew: false })}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <CourseDialog
        course={editing?.course ?? null}
        isNew={editing?.isNew ?? false}
        onClose={() => setEditing(null)}
        onSave={(c) => semester.save(editing?.isNew ? { ...c, id: c.id.replace(/^new-/, "c") } : c)}
        onDelete={semester.remove}
      />
    </div>
  )
}
