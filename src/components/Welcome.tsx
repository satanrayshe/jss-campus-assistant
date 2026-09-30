import gsap from "gsap"
import { useLayoutEffect, useRef } from "react"
import IconArrow from "~icons/solar/arrow-right-up-linear"
import IconChecklist from "~icons/solar/checklist-minimalistic-linear"
import IconClock from "~icons/solar/clock-circle-linear"
import { Button } from "@/components/ui/button"
import { fmtTime, nextClass, pct, shortVerdict, whenLabel, type Course } from "@/lib/semester"
import { byId, catById } from "@/data/faq"
import { CATEGORY_ICON } from "@/components/Topics"

const STARTERS = ["attendance", "hostel-curfew", "library-timings", "clubs", "fest", "anti-ragging"]

interface Props {
  name: string
  onAsk: (q: string) => void
  onPlan: () => void
  courses: Course[]
  onOpenSemester: () => void
}

const PERSONAL = ["What's my next class?", "Can I bunk any class tomorrow?"]

export function Welcome({ name, onAsk, onPlan, courses, onOpenSemester }: Props) {
  const HEADLINE = `Namaste, ${name || "fresher"}.`
  const next = nextClass(courses)
  const root = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const q = gsap.utils.selector(root)
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(q("[data-word]"), { yPercent: 110, duration: 0.8, stagger: 0.09 })
        .from(q("[data-sub]"), { autoAlpha: 0, y: 8, duration: 0.5 }, "-=0.45")
        .from(q("[data-row]"), { autoAlpha: 0, y: 10, duration: 0.45, stagger: 0.05 }, "-=0.3")
        .from(q("[data-foot]"), { autoAlpha: 0, duration: 0.4 }, "-=0.2")
    })
    return () => mm.revert()
  }, [])

  return (
    <div ref={root} className="mx-auto flex w-full max-w-2xl flex-col px-5 pt-[9vh] pb-10 md:pt-[12vh]">
      <h1 className="font-display text-[clamp(2.6rem,7vw,4.25rem)] leading-[1.02] font-[450] tracking-[-0.02em] text-foreground">
        <span className="sr-only">{HEADLINE}</span>
        <span aria-hidden className="flex flex-wrap gap-x-[0.24em]">
          {HEADLINE.split(" ").map((w, i) => (
            <span key={`${w}-${i}`} className="overflow-hidden pb-[0.08em]">
              <span data-word className={i > 0 ? "inline-block text-saffron italic" : "inline-block"}>
                {w}
              </span>
            </span>
          ))}
        </span>
      </h1>
      <p data-sub className="mt-4 max-w-[34rem] text-[17px] leading-relaxed text-muted-foreground">
        I'm Axon. Ask me anything about your first weeks at JSS University Noida. Every answer comes from the university's own
        guidelines, and I'll show you where.
      </p>
      <div data-sub className="mt-6 flex flex-wrap gap-2">
        <Button variant="outline" size="lg" onClick={onPlan} className="h-10 rounded-full pr-4 pl-3.5 text-[14px]">
          <IconChecklist className="size-[18px] text-saffron-ink" />
          Build my first-week plan
        </Button>
        {!courses.length && (
          <Button variant="outline" size="lg" onClick={onOpenSemester} className="h-10 rounded-full pr-4 pl-3.5 text-[14px]">
            <IconClock className="size-[18px] text-saffron-ink" />
            Set up my timetable
          </Button>
        )}
      </div>

      {next && (
        <button
          type="button"
          data-sub
          onClick={onOpenSemester}
          className="group mt-8 flex w-full items-center gap-4 rounded-2xl bg-primary px-5 py-4 text-left text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <IconClock className="size-5 shrink-0 text-saffron" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-primary-foreground/70">
              Next class · {whenLabel(next)} · {fmtTime(next.slot.start)}
              {next.slot.room ? ` · ${next.slot.room}` : ""}
            </span>
            <span className="block truncate font-medium">{next.course.name}</span>
          </span>
          <span className="hidden text-right text-xs text-primary-foreground/80 sm:block">
            <span className="font-mono text-base text-primary-foreground">{pct(next.course).toFixed(0)}%</span>
            <span className="block">{shortVerdict(next.course)}</span>
          </span>
        </button>
      )}

      <ul className={next ? "mt-6 border-t border-border" : "mt-10 border-t border-border"} aria-label="Common first-week questions">
        {courses.length > 0 &&
          PERSONAL.map((q) => (
            <li key={q} data-row className="border-b border-border">
              <button type="button" onClick={() => onAsk(q)} className="group flex w-full items-center gap-4 px-1 py-3.5 text-left outline-none focus-visible:bg-accent/60">
                <IconClock className="size-[18px] shrink-0 text-muted-foreground transition-colors group-hover:text-saffron-ink" />
                <span className="flex-1 text-[15px] font-medium transition-transform duration-300 group-hover:translate-x-0.5">{q}</span>
                <span className="hidden font-mono text-[11px] tracking-wide text-muted-foreground uppercase sm:block">My semester</span>
                <IconArrow className="size-4 shrink-0 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
              </button>
            </li>
          ))}
        {STARTERS.slice(0, courses.length ? 4 : 6).map((id) => {
          const f = byId[id]
          const Icon = CATEGORY_ICON[f.category]
          return (
            <li key={id} data-row className="border-b border-border">
              <button
                type="button"
                onClick={() => onAsk(f.question)}
                className="group flex w-full items-center gap-4 px-1 py-3.5 text-left outline-none focus-visible:bg-accent/60"
              >
                <Icon className="size-[18px] shrink-0 text-muted-foreground transition-colors group-hover:text-saffron-ink" />
                <span className="flex-1 text-[15px] font-medium transition-transform duration-300 group-hover:translate-x-0.5">
                  {f.question}
                </span>
                <span className="hidden font-mono text-[11px] tracking-wide text-muted-foreground uppercase sm:block">
                  {catById[f.category].label}
                </span>
                <IconArrow className="size-4 shrink-0 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
              </button>
            </li>
          )
        })}
      </ul>

      <p data-foot className="mt-5 text-[13px] text-muted-foreground">
        Type or tap the mic. English, Hindi and Hinglish all work.
      </p>
    </div>
  )
}
