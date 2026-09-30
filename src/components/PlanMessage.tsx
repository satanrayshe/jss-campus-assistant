import { useEffect, useMemo, useRef, useState } from "react"
import IconPrint from "~icons/solar/printer-minimalistic-linear"
import IconOfficial from "~icons/solar/document-text-linear"
import IconGuidance from "~icons/solar/lightbulb-linear"
import { AxonMark } from "@/components/AxonMark"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { byId } from "@/data/faq"
import { useReveal } from "@/hooks/useReveal"
import { buildPlan, INTEREST_LABEL, PROGRAMME_LABEL, STAY_LABEL, type Profile, type When } from "@/lib/plan"
import { cn } from "@/lib/utils"

const WHEN: When[] = ["Day 1", "Week 1", "This month"]

export function PlanMessage({ profile }: { profile: Profile }) {
  const ref = useRef<HTMLDivElement>(null)
  useReveal(ref)
  const items = useMemo(() => buildPlan(profile), [profile])
  const storeKey = `axon_plan_${profile.stay}_${profile.programme}`
  const [done, setDone] = useState<Set<string>>(() => new Set(JSON.parse(localStorage.getItem(storeKey) ?? "[]")))

  useEffect(() => {
    localStorage.setItem(storeKey, JSON.stringify([...done]))
  }, [done, storeKey])

  const toggle = (key: string) =>
    setDone((cur) => {
      const next = new Set(cur)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const count = items.filter((i) => done.has(i.key)).length
  const tags = [STAY_LABEL[profile.stay], PROGRAMME_LABEL[profile.programme], ...profile.interests.map((i) => INTEREST_LABEL[i])]

  return (
    <div ref={ref} className="flex gap-3.5">
      <AxonMark className="mt-1 print:hidden" />
      <section className="print-plan min-w-0 flex-1 rounded-2xl border border-border bg-card p-5 md:p-6" aria-label="Your first-week plan">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl leading-tight font-[450]">Your first-week plan</h2>
            <p className="mt-1.5 text-[13px] text-muted-foreground">{tags.join(" · ")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="shrink-0 print:hidden">
            <IconPrint /> Print
          </Button>
        </div>

        <div className="mt-4 flex items-center gap-3" aria-live="polite">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-saffron transition-[width] duration-500" style={{ width: `${(count / items.length) * 100}%` }} />
          </div>
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {count}/{items.length} done
          </span>
        </div>

        {WHEN.map((when) => {
          const group = items.filter((i) => i.when === when)
          if (!group.length) return null
          return (
            <div key={when} className="mt-6">
              <h3 className="mb-1 text-xs font-medium tracking-wide text-saffron-ink uppercase">{when}</h3>
              <ul className="divide-y divide-border">
                {group.map((item) => {
                  const f = byId[item.source]
                  const checked = done.has(item.key)
                  const Icon = f.official ? IconOfficial : IconGuidance
                  return (
                    <li key={item.key} className="flex gap-3 py-3">
                      <Checkbox id={`plan-${item.key}`} checked={checked} onCheckedChange={() => toggle(item.key)} className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <label
                          htmlFor={`plan-${item.key}`}
                          className={cn("block cursor-pointer text-[15px] font-medium transition-colors", checked && "text-muted-foreground line-through decoration-saffron/60")}
                        >
                          {item.title}
                        </label>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{item.detail}</p>
                        <a
                          href={f.source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground/90 hover:text-foreground"
                        >
                          <Icon className="size-3" />
                          {f.official ? "Official guideline" : "General guidance"}
                        </a>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </section>
    </div>
  )
}
