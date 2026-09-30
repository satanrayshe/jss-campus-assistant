import { useState } from "react"
import IconMagic from "~icons/solar/magic-stick-3-linear"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { AiConfig } from "@/lib/ai"
import { DAYS, fmtTime, type Course } from "@/lib/semester"
import { importTimetable } from "@/lib/timetable"

const EXAMPLE = `CSE-A Sem 1 timetable (from the class group)
Mon: 9:30 EM-1 (204), 11:30 PPS lab (Lab 3), 2:00 BEE (115)
Tue: 9:30 Physics (301), 10:30 PPS (108), 2:00 EG (Drawing Hall)
Wed: 9:30 EM-1 (204), 12:30 lunch, 2:00 BEE (115)
Thu: 9:30 Physics (301), 10:30 PPS (108)
Fri: 9:30 BEE (115), 11:30 EM-1 (204)
Sat: 9:30 EG (Drawing Hall), 10:30 Physics (301)`

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  ai: AiConfig | null
  hasCourses: boolean
  onImport: (courses: Course[], replace: boolean) => void
}

export function ImportDialog({ open, onOpenChange, ai, hasCourses, onImport }: Props) {
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [preview, setPreview] = useState<Course[] | null>(null)
  const [replace, setReplace] = useState(true)

  const reset = () => {
    setPreview(null)
    setError("")
    setBusy(false)
  }

  const read = async () => {
    if (!ai) return
    setBusy(true)
    setError("")
    try {
      setPreview(await importTimetable(ai, text))
    } catch (e) {
      setError(`Couldn't read that: ${(e as Error).message}. Try again, or add courses by hand.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconMagic className="size-5 text-saffron-ink" /> Paste your timetable
          </DialogTitle>
          <DialogDescription>
            Paste it however you got it, like the class group message or a copied table. Axon's AI turns it into your courses and class times.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="grid gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={9}
              placeholder={"Mon: 9:30 EM-1 (204), 11:30 PPS lab…\nTue: …"}
              className="font-mono text-[13px] leading-relaxed"
              aria-label="Timetable text"
            />
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => setText(EXAMPLE)} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
                Fill in an example
              </button>
              {!ai && <p className="text-xs text-saffron-ink">Needs AI mode. Add a key in AI settings, or add courses by hand.</p>}
            </div>
            {error && <p className="text-[13px] text-destructive">{error}</p>}
          </div>
        ) : (
          <div className="grid gap-3">
            <p className="text-sm">
              Found <b>{preview.length} courses</b>. Check them, then save. You can edit any of them later.
            </p>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {preview.map((c) => (
                <li key={c.id} className="px-3.5 py-2.5">
                  <p className="text-sm font-medium">
                    {c.name} {c.code && <span className="font-mono text-[11px] text-muted-foreground">{c.code}</span>}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {c.slots.length ? c.slots.map((s) => `${DAYS[s.day]} ${fmtTime(s.start)}${s.room ? ` ${s.room}` : ""}`).join(" · ") : "no class times found"}
                  </p>
                </li>
              ))}
            </ul>
            {hasCourses && (
              <div className="flex items-center gap-2">
                <Checkbox id="replace" checked={replace} onCheckedChange={(v) => setReplace(v === true)} />
                <Label htmlFor="replace" className="font-normal">
                  Replace my current courses
                </Label>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {preview ? (
            <>
              <Button variant="outline" onClick={() => setPreview(null)}>
                Back
              </Button>
              <Button
                onClick={() => {
                  onImport(preview, replace)
                  reset()
                  setText("")
                  onOpenChange(false)
                }}
              >
                Save {preview.length} courses
              </Button>
            </>
          ) : (
            <Button onClick={read} disabled={!ai || !text.trim() || busy} className="min-w-36">
              {busy ? "Reading timetable…" : "Read with AI"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
