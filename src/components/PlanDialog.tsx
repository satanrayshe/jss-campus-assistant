import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { INTEREST_LABEL, PROGRAMME_LABEL, STAY_LABEL, type Interest, type Profile, type Programme, type Stay } from "@/lib/plan"
import { cn } from "@/lib/utils"

function Choice({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        pressed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-foreground/25",
      )}
    >
      {children}
    </button>
  )
}

function Group({ legend, hint, children }: { legend: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-2.5">
      <legend className="mb-2.5 text-sm font-medium">
        {legend} {hint && <span className="font-normal text-muted-foreground">{hint}</span>}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}

export function PlanDialog({ open, onOpenChange, onBuild }: { open: boolean; onOpenChange: (o: boolean) => void; onBuild: (p: Profile) => void }) {
  const [stay, setStay] = useState<Stay | null>(null)
  const [programme, setProgramme] = useState<Programme | null>(null)
  const [interests, setInterests] = useState<Interest[]>([])

  const toggle = (i: Interest) => setInterests((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form
          className="grid gap-6"
          onSubmit={(e) => {
            e.preventDefault()
            if (!stay || !programme) return
            onBuild({ stay, programme, interests })
            onOpenChange(false)
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-[450]">Your first-week plan</DialogTitle>
            <DialogDescription>Three quick taps. Every step comes from the university's own guidelines.</DialogDescription>
          </DialogHeader>

          <Group legend="Where will you stay?">
            {(Object.keys(STAY_LABEL) as Stay[]).map((s) => (
              <Choice key={s} pressed={stay === s} onClick={() => setStay(s)}>
                {STAY_LABEL[s]}
              </Choice>
            ))}
          </Group>
          <Group legend="Your programme">
            {(Object.keys(PROGRAMME_LABEL) as Programme[]).map((p) => (
              <Choice key={p} pressed={programme === p} onClick={() => setProgramme(p)}>
                {PROGRAMME_LABEL[p]}
              </Choice>
            ))}
          </Group>
          <Group legend="What are you into?" hint="(pick any)">
            {(Object.keys(INTEREST_LABEL) as Interest[]).map((i) => (
              <Choice key={i} pressed={interests.includes(i)} onClick={() => toggle(i)}>
                {INTEREST_LABEL[i]}
              </Choice>
            ))}
          </Group>

          <DialogFooter>
            <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={!stay || !programme}>
              Build my plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
