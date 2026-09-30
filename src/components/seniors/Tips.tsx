import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import IconLike from "~icons/solar/like-linear"
import IconLiked from "~icons/solar/like-bold"
import IconTrash from "~icons/solar/trash-bin-minimalistic-linear"
import IconSenior from "~icons/solar/users-group-rounded-linear"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CAMPUS, catById, type CategoryId } from "@/data/faq"
import { useReveal } from "@/hooks/useReveal"
import { groupGaps, loadGaps, type GapGroup } from "@/lib/gaps"
import { deleteItem, hasVoted, markHelpful, postTip, type Knowledge, type SeniorTip } from "@/lib/knowledge"
import { cn } from "@/lib/utils"

const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 3600) return s < 60 ? "just now" : `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}
const selectCls =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function TipCard({ tip, onDelete, onChanged }: { tip: SeniorTip; onDelete?: () => void; onChanged?: () => void }) {
  const [count, setCount] = useState(tip.helpful)
  const [voted, setVoted] = useState(() => hasVoted(tip.id))
  return (
    <li className="px-4 py-4">
      {tip.question && <p className="mb-1.5 text-xs text-muted-foreground">Re: "{tip.question}"</p>}
      <p className="text-[15px] leading-relaxed whitespace-pre-line">{tip.text}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        <span className="font-medium text-sky-900">{tip.by}</span>
        <span>·</span>
        <span>{catById[tip.category]?.label ?? "Campus"}</span>
        <span>·</span>
        <span>{ago(tip.at)}</span>
        <Button
          variant="outline"
          size="xs"
          className={cn("ml-auto gap-1 rounded-full", voted && "border-sky-700/30 bg-sky-50 text-sky-900")}
          disabled={voted}
          aria-pressed={voted}
          onClick={async () => {
            const n = await markHelpful(tip.id)
            if (n !== null) {
              setCount(n)
              setVoted(true)
              onChanged?.()
            }
          }}
        >
          {voted ? <IconLiked /> : <IconLike />} Helpful{count ? ` · ${count}` : ""}
        </Button>
        {onDelete && (
          <Button variant="ghost" size="icon-xs" aria-label="Remove tip" onClick={onDelete}>
            <IconTrash />
          </Button>
        )}
      </div>
    </li>
  )
}

/** Students: tips from seniors, most helpful first, filterable by topic. */
export function TipsFeed({ knowledge, serverless, onChanged }: { knowledge: Knowledge; serverless: boolean; onChanged: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  useReveal(root, { y: 8 })
  const [topic, setTopic] = useState<CategoryId | "all">("all")
  const tips = useMemo(
    () => [...knowledge.tips].filter((t) => topic === "all" || t.category === topic).sort((a, b) => b.helpful - a.helpful || b.at.localeCompare(a.at)),
    [knowledge.tips, topic],
  )
  const used = new Set(knowledge.tips.map((t) => t.category))

  return (
    <div ref={root} className="mx-auto w-full max-w-2xl px-5 pt-8 pb-16">
      <h1 className="font-display text-4xl leading-none font-[450] tracking-[-0.01em]">From seniors</h1>
      <p className="mt-2 text-sm text-muted-foreground">What JSS seniors and alumni wish they'd known as freshers. Their experience, not official rules.</p>

      {knowledge.tips.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-1.5" role="group" aria-label="Filter by topic">
          {[{ id: "all" as const, label: "All" }, ...CAMPUS.categories.filter((c) => used.has(c.id))].map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={topic === c.id}
              onClick={() => setTopic(c.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-[13px] transition-colors",
                topic === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-foreground/25",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {tips.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border px-8 py-14 text-center">
          <IconSenior className="size-8 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium">No tips yet</p>
          <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            {serverless ? "Senior tips live on the campus server. Run Axon with npm start to see them." : "When seniors share advice, it shows up here, and Axon starts mentioning it in answers."}
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
          {tips.map((t) => (
            <TipCard key={t.id} tip={t} onChanged={onChanged} />
          ))}
        </ul>
      )}
    </div>
  )
}

function TipForm({ token, gap, onDone }: { token: string; gap?: GapGroup; onDone: () => void }) {
  const [text, setText] = useState("")
  const [category, setCategory] = useState<CategoryId>("facilities")
  const [busy, setBusy] = useState(false)
  return (
    <form
      className={cn("grid gap-3", gap && "mt-3 rounded-xl border border-border bg-background p-3.5")}
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
          await postTip(token, { text: text.trim(), category, gapKey: gap?.key, question: gap?.questions[0] })
          toast.success("Shared with freshers", { description: "Axon will mention it when it's relevant." })
          setText("")
          onDone()
        } catch (err) {
          toast.error((err as Error).message)
        } finally {
          setBusy(false)
        }
      }}
    >
      <Label htmlFor={`tip-${gap?.key ?? "new"}`} className="sr-only">
        Your tip
      </Label>
      <Textarea
        id={`tip-${gap?.key ?? "new"}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={gap ? "What would you tell them?" : "e.g. Get to the 9:30 class 5 minutes early: the Block B lift queue is long."}
        required
        autoFocus={Boolean(gap)}
      />
      <div className="flex items-center gap-2">
        <select aria-label="Topic" value={category} onChange={(e) => setCategory(e.target.value as CategoryId)} className={selectCls}>
          {CAMPUS.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <Button type="submit" className="ml-auto" disabled={busy || !text.trim()}>
          {busy ? "Sharing…" : "Share with freshers"}
        </Button>
      </div>
    </form>
  )
}

/** Seniors: post tips, reply to what freshers are asking, see what landed. */
export function SeniorDesk({ token, who, knowledge, onChanged }: { token: string; who: string; knowledge: Knowledge; onChanged: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  useReveal(root, { y: 8 })
  const [asks, setAsks] = useState<GapGroup[]>([])
  const [replying, setReplying] = useState<string | null>(null)

  useEffect(() => {
    loadGaps(true).then((g) => setAsks(groupGaps(g).filter((x) => !knowledge.resolved.includes(x.key)).slice(0, 8)))
  }, [knowledge])

  const mine = knowledge.tips.filter((t) => t.by === who).sort((a, b) => b.at.localeCompare(a.at))
  const helped = mine.reduce((n, t) => n + t.helpful, 0)

  return (
    <div ref={root} className="mx-auto w-full max-w-2xl px-5 pt-8 pb-16">
      <h1 className="font-display text-4xl leading-none font-[450] tracking-[-0.01em]">
        Pass it <span className="text-saffron italic">on.</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Signed in as {who}. Share what you wish you'd known in first year. Freshers see it in "From seniors", and Axon quotes it as a senior's tip.
      </p>
      {mine.length > 0 && (
        <p className="mt-4 font-mono text-xs text-muted-foreground">
          {mine.length} {mine.length === 1 ? "tip" : "tips"} shared · marked helpful {helped}×
        </p>
      )}

      <section className="mt-6 rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-[15px] font-medium">Share a tip</h2>
        <TipForm token={token} onDone={onChanged} />
      </section>

      {asks.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium">Freshers are asking</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Questions the official guidelines don't answer yet. Faculty will add official answers, but your experience helps now.</p>
          <ol className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card">
            {asks.map((g) => (
              <li key={g.key} className="px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">"{g.questions[0]}"</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">asked {g.count}×</p>
                  </div>
                  {replying !== g.key && (
                    <Button size="sm" variant="outline" onClick={() => setReplying(g.key)}>
                      Reply with a tip
                    </Button>
                  )}
                </div>
                {replying === g.key && (
                  <TipForm
                    token={token}
                    gap={g}
                    onDone={() => {
                      setReplying(null)
                      onChanged()
                    }}
                  />
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {mine.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium">Your tips</h2>
          <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card">
            {mine.map((t) => (
              <TipCard
                key={t.id}
                tip={t}
                onDelete={async () => {
                  if (!confirm("Remove this tip?")) return
                  try {
                    await deleteItem(token, "tips", t.id)
                    onChanged()
                  } catch (err) {
                    toast.error((err as Error).message)
                  }
                }}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
