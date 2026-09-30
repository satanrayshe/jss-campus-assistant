import { useEffect, useState } from "react"
import { toast } from "sonner"
import IconRadar from "~icons/solar/radar-2-linear"
import IconDownload from "~icons/solar/download-minimalistic-linear"
import IconCopy from "~icons/solar/copy-linear"
import IconTrash from "~icons/solar/trash-bin-minimalistic-linear"
import IconInbox from "~icons/solar/inbox-line-linear"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { clearGaps, gapsCsv, groupGaps, loadGaps, type GapGroup } from "@/lib/gaps"

const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  shared: boolean
  /** Bumped whenever a new gap is logged, so an open panel refreshes. */
  version: number
  onCount: (n: number) => void
}

export function GapsPanel({ open, onOpenChange, shared, version, onCount }: Props) {
  const [groups, setGroups] = useState<GapGroup[]>([])

  useEffect(() => {
    loadGaps(shared).then((g) => {
      const grouped = groupGaps(g)
      setGroups(grouped)
      onCount(grouped.length)
    })
  }, [shared, version, open, onCount])

  const total = groups.reduce((n, g) => n + g.count, 0)

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([gapsCsv(groups)], { type: "text/csv" }))
    const a = Object.assign(document.createElement("a"), { href: url, download: `axon-knowledge-gaps-${new Date().toISOString().slice(0, 10)}.csv` })
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyEmail = async () => {
    const lines = groups.map((g) => `- ${g.missing} (asked ${g.count}×), e.g. "${g.questions[0]}"`)
    await navigator.clipboard.writeText(
      `Hello,\n\nNew students asked Axon, the campus assistant, these questions that the official guidelines don't answer yet:\n\n${lines.join("\n")}\n\nPublishing these on jssuninoida.edu.in would help the next batch of freshers.\n`,
    )
    toast.success("Copied as an email draft")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 pt-5 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <IconRadar className="size-5 text-saffron-ink" />
            Knowledge gaps
          </SheetTitle>
          <SheetDescription className="leading-relaxed">
            What freshers asked that the official guidelines don't answer yet. Send it to the university so the next batch gets an
            answer.
          </SheetDescription>
          {groups.length > 0 && (
            <p className="pt-1 font-mono text-[11px] text-muted-foreground">
              {groups.length} {groups.length === 1 ? "gap" : "gaps"} · {total} {total === 1 ? "question" : "questions"} ·{" "}
              {shared ? "shared across this server" : "this browser only"}
            </p>
          )}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center px-8 py-16 text-center">
              <IconInbox className="size-8 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-medium">No gaps yet</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                When a student asks something the guidelines don't cover, like bus routes or the Wi-Fi password, it shows up here.
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-border">
              {groups.map((g) => (
                <li key={g.missing} className="px-5 py-4">
                  <div className="flex items-baseline gap-3">
                    <p className="flex-1 text-sm font-medium first-letter:uppercase">{g.missing}</p>
                    <span className="shrink-0 font-mono text-xs text-saffron-ink tabular-nums">×{g.count}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">"{g.questions[0]}"</p>
                  <p className="mt-1.5 font-mono text-[11px] text-muted-foreground/80">last asked {ago(g.last)}</p>
                </li>
              ))}
            </ol>
          )}
        </div>

        {groups.length > 0 && (
          <SheetFooter className="flex-row gap-2 border-t border-border p-4">
            <Button variant="outline" size="lg" className="flex-1" onClick={copyEmail}>
              <IconCopy /> Copy as email
            </Button>
            <Button size="lg" className="flex-1" onClick={exportCsv}>
              <IconDownload /> Export CSV
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Clear all gaps"
              className="text-muted-foreground"
              onClick={async () => {
                if (!confirm("Clear every logged gap?")) return
                await clearGaps(shared)
                setGroups([])
                onCount(0)
              }}
            >
              <IconTrash />
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
