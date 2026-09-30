import { useEffect, useState } from "react"
import IconAdd from "~icons/solar/add-circle-linear"
import IconTrash from "~icons/solar/trash-bin-minimalistic-linear"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DAYS, newId, type Course, type Slot } from "@/lib/semester"

const blank = (): Course => ({ id: newId(), name: "", code: "", slots: [{ day: 1, start: "09:30" }], attended: 0, held: 0, log: [] })

interface Props {
  course: Course | null // null = closed; a course with an unknown id = new
  onClose: () => void
  onSave: (c: Course) => void
  onDelete: (id: string) => void
  isNew: boolean
}

export function CourseDialog({ course, onClose, onSave, onDelete, isNew }: Props) {
  const [draft, setDraft] = useState<Course>(blank)
  useEffect(() => {
    if (course) setDraft(structuredClone(course))
  }, [course])

  const set = (p: Partial<Course>) => setDraft((d) => ({ ...d, ...p }))
  const setSlot = (i: number, p: Partial<Slot>) => set({ slots: draft.slots.map((s, j) => (j === i ? { ...s, ...p } : s)) })
  const valid = draft.name.trim() && draft.attended <= draft.held && draft.attended >= 0

  return (
    <Dialog open={course !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (!valid) return
            onSave({ ...draft, name: draft.name.trim(), code: draft.code?.trim() || undefined, slots: draft.slots.filter((s) => s.start) })
            onClose()
          }}
        >
          <DialogHeader>
            <DialogTitle>{isNew ? "Add a course" : "Edit course"}</DialogTitle>
            <DialogDescription>Class times power "what's my next class?". Counts power the bunk maths.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <div className="grid gap-2">
              <Label htmlFor="c-name">Course name</Label>
              <Input id="c-name" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Engineering Physics" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-code">Short name</Label>
              <Input id="c-code" value={draft.code ?? ""} onChange={(e) => set({ code: e.target.value })} placeholder="PHY" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="c-att">Classes attended</Label>
              <Input id="c-att" type="number" min={0} value={draft.attended} onChange={(e) => set({ attended: Math.max(0, Number(e.target.value)) })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-held">Classes held</Label>
              <Input id="c-held" type="number" min={0} value={draft.held} onChange={(e) => set({ held: Math.max(0, Number(e.target.value)) })} />
            </div>
            {draft.attended > draft.held && <p className="col-span-2 -mt-1 text-xs text-destructive">Attended can't be more than held.</p>}
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Weekly classes</legend>
            {draft.slots.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  aria-label="Day"
                  value={s.day}
                  onChange={(e) => setSlot(i, { day: Number(e.target.value) })}
                  className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <option key={d} value={d}>
                      {DAYS[d]}
                    </option>
                  ))}
                </select>
                <Input aria-label="Start time" type="time" value={s.start} onChange={(e) => setSlot(i, { start: e.target.value })} className="w-32" />
                <Input aria-label="Room" value={s.room ?? ""} onChange={(e) => setSlot(i, { room: e.target.value || undefined })} placeholder="Room" className="flex-1" />
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove class" onClick={() => set({ slots: draft.slots.filter((_, j) => j !== i) })}>
                  <IconTrash />
                </Button>
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => set({ slots: [...draft.slots, { day: 1, start: "09:30" }] })}>
              <IconAdd /> Add a class time
            </Button>
          </fieldset>

          <DialogFooter>
            {!isNew && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm(`Delete ${draft.name}?`)) {
                    onDelete(draft.id)
                    onClose()
                  }
                }}
              >
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
