import IconCheck from "~icons/solar/check-circle-linear"
import IconClose from "~icons/solar/close-circle-linear"
import IconUndo from "~icons/solar/undo-left-linear"
import IconPen from "~icons/solar/pen-2-linear"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DAYS, fmtTime, pct, status, TARGET, verdict, type Course } from "@/lib/semester"
import { cn } from "@/lib/utils"

export const STATUS_TEXT = { safe: "text-emerald-700", edge: "text-saffron-ink", danger: "text-destructive" } as const
export const STATUS_BAR = { safe: "bg-emerald-600", edge: "bg-saffron", danger: "bg-destructive" } as const

/** Attendance bar with a tick at the 75% line. */
export function AttendanceBar({ course, className }: { course: Course; className?: string }) {
  const p = Math.min(100, pct(course))
  return (
    <div className={cn("relative h-1.5 rounded-full bg-muted", className)} role="presentation">
      <div className={cn("h-full rounded-full transition-[width] duration-500", STATUS_BAR[status(course)])} style={{ width: `${p}%` }} />
      <span className="absolute -top-1 h-3.5 w-px bg-foreground/40" style={{ left: `${TARGET * 100}%` }} aria-hidden />
    </div>
  )
}

interface Props {
  course: Course
  onMark: (present: boolean) => void
  onUndo: () => void
  onEdit: () => void
}

export function CourseCard({ course, onMark, onUndo, onEdit }: Props) {
  const s = status(course)
  const days = [...new Set(course.slots.map((sl) => sl.day))]
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map((d) => DAYS[d])
  const first = course.slots[0]

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-medium" title={course.name}>
            {course.name}
          </h3>
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
            {[course.code, days.join(" "), first && fmtTime(first.start), first?.room].filter(Boolean).join(" · ")}
          </p>
        </div>
        <p className={cn("font-mono text-2xl leading-none font-medium tabular-nums", STATUS_TEXT[s])}>
          {course.held ? pct(course).toFixed(0) : "–"}
          <span className="text-sm">%</span>
        </p>
      </div>

      <AttendanceBar course={course} className="mt-4" />
      <p className={cn("mt-2.5 text-[13px] leading-snug", STATUS_TEXT[s])}>{verdict(course)}</p>

      <div className="mt-auto flex items-center gap-1 pt-3">
        <Button variant="outline" size="sm" onClick={() => onMark(true)} className="gap-1">
          <IconCheck className="text-emerald-700" /> Present
        </Button>
        <Button variant="outline" size="sm" onClick={() => onMark(false)} className="gap-1">
          <IconClose className="text-destructive" /> Absent
        </Button>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground tabular-nums">
          {course.attended}/{course.held}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={onUndo} disabled={!course.log.length} aria-label="Undo last mark">
              <IconUndo />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo last mark</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Edit ${course.name}`}>
              <IconPen />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit course</TooltipContent>
        </Tooltip>
      </div>
    </article>
  )
}
