import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import IconInbox from "~icons/solar/inbox-line-linear"
import IconPen from "~icons/solar/pen-new-square-linear"
import IconUpload from "~icons/solar/upload-minimalistic-linear"
import IconDoc from "~icons/solar/paperclip-linear"
import IconTrash from "~icons/solar/trash-bin-minimalistic-linear"
import IconDownload from "~icons/solar/download-minimalistic-linear"
import IconCopy from "~icons/solar/copy-linear"
import { TipCard } from "@/components/seniors/Tips"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useReveal } from "@/hooks/useReveal"
import { isServerMode } from "@/lib/api"
import type { CategoryId } from "@/data/faq"
import { gapsCsv, groupGaps, loadGaps, type GapGroup } from "@/lib/gaps"
import { categories, clearGapsApi, deleteItem, publishAnswer, uploadDoc, type Knowledge } from "@/lib/knowledge"
import { fileText } from "@/lib/pdf"
import { cn } from "@/lib/utils"

const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

const selectCls =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

interface Props {
  token: string
  who: string
  knowledge: Knowledge
  gapVersion: number
  onChanged: () => void
  onSignedOut: () => void
}

function AnswerForm({ group, token, onDone }: { group: GapGroup; token: string; onDone: () => void }) {
  const [question, setQuestion] = useState(group.questions[0])
  const [answer, setAnswer] = useState("")
  const [category, setCategory] = useState<CategoryId>("facilities")
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="mt-3 grid gap-3 rounded-xl border border-border bg-background p-3.5"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
          await publishAnswer(token, { question: question.trim(), answer: answer.trim(), category, gapKey: group.key })
          toast.success("Published to Axon", { description: "Students asking this now get your answer." })
          onDone()
        } catch (err) {
          toast.error((err as Error).message)
        } finally {
          setBusy(false)
        }
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor={`q-${group.key}`}>Question, as students will see it</Label>
        <Input id={`q-${group.key}`} value={question} onChange={(e) => setQuestion(e.target.value)} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`a-${group.key}`}>Your answer</Label>
        <Textarea id={`a-${group.key}`} value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} placeholder="Be specific: times, places, who to contact." required autoFocus />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-44 flex-1 gap-1.5">
          <Label htmlFor={`c-${group.key}`}>Topic</Label>
          <select id={`c-${group.key}`} value={category} onChange={(e) => setCategory(e.target.value as CategoryId)} className={selectCls}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={busy || !answer.trim() || !question.trim()}>
          {busy ? "Publishing…" : "Publish to Axon"}
        </Button>
      </div>
    </form>
  )
}

export function FacultyDesk({ token, who, knowledge, gapVersion, onChanged, onSignedOut }: Props) {
  const root = useRef<HTMLDivElement>(null)
  useReveal(root, { y: 8 })
  const [groups, setGroups] = useState<GapGroup[]>([])
  const [answering, setAnswering] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)

  // Source upload state
  const [title, setTitle] = useState("")
  const [text, setText] = useState("")
  const [filename, setFilename] = useState("")
  const [reading, setReading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadGaps().then((g) => setGroups(groupGaps(g)))
  }, [gapVersion, refresh])

  const resolved = useMemo(() => new Set(knowledge.resolved), [knowledge.resolved])
  const open = groups.filter((g) => !resolved.has(g.key))

  const guard = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn()
      toast.success(ok)
      onChanged()
    } catch (err) {
      const msg = (err as Error).message
      if (/sign-in required|faculty only/i.test(msg)) {
        toast.error("Your faculty session expired. Please sign in again.")
        onSignedOut()
      } else toast.error(msg)
    }
  }

  const pickFile = async (file: File) => {
    setReading(true)
    try {
      const t = await fileText(file)
      if (!t.trim()) throw new Error("No text found. Scanned PDFs need OCR first.")
      setText(t)
      setFilename(file.name)
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "))
    } catch (err) {
      toast.error(`Couldn't read ${file.name}: ${(err as Error).message}`)
    } finally {
      setReading(false)
    }
  }

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([gapsCsv(open)], { type: "text/csv" }))
    Object.assign(document.createElement("a"), { href: url, download: `axon-open-gaps-${new Date().toISOString().slice(0, 10)}.csv` }).click()
    URL.revokeObjectURL(url)
  }

  const copyEmail = async () => {
    const lines = open.map((g) => `- ${g.missing} (asked ${g.count}×), e.g. "${g.questions[0]}"`)
    await navigator.clipboard.writeText(`Hello,\n\nStudents asked Axon these questions that nobody has answered yet:\n\n${lines.join("\n")}\n\nAnswer them in Axon's faculty desk and every student gets the answer.\n`)
    toast.success("Copied as an email draft")
  }

  return (
    <div ref={root} className="mx-auto w-full max-w-3xl px-5 pt-8 pb-16">
      <h1 className="font-display text-4xl leading-none font-[450] tracking-[-0.01em]">Faculty desk</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Signed in as {who}. Anything you publish here, Axon starts using in its answers straight away.
      </p>
      {!isServerMode() && (
        <p className="mt-3 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          Demo mode: everything is saved in this browser, and shared live with other tabs of it. Run the campus server to share across devices.
        </p>
      )}

      <dl className="mt-6 grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card">
        {[
          ["Open gaps", open.length],
          ["Answers published", knowledge.answers.length],
          ["Documents", knowledge.docs.length],
        ].map(([label, n]) => (
          <div key={label} className="px-4 py-3.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={cn("mt-1 font-mono text-2xl tabular-nums", label === "Open gaps" && Number(n) > 0 && "text-saffron-ink")}>{n}</dd>
          </div>
        ))}
      </dl>

      <Tabs defaultValue="gaps" className="mt-8">
        <TabsList>
          <TabsTrigger value="gaps">Open gaps</TabsTrigger>
          <TabsTrigger value="answers">Published answers</TabsTrigger>
          <TabsTrigger value="sources">Source material</TabsTrigger>
          <TabsTrigger value="tips">Senior tips{knowledge.tips.length ? ` (${knowledge.tips.length})` : ""}</TabsTrigger>
        </TabsList>

        {/* ---------- senior tips: moderation ---------- */}
        <TabsContent value="tips" className="mt-4">
          <p className="mb-3 text-[13px] text-muted-foreground">Seniors' tips are shown to freshers as experience, never as official policy. Remove anything that's wrong or inappropriate.</p>
          {knowledge.tips.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">No senior tips yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {[...knowledge.tips].reverse().map((t) => (
                <TipCard key={t.id} tip={t} onDelete={() => confirm("Remove this senior tip?") && guard(() => deleteItem(token, "tips", t.id), "Tip removed")} />
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ---------- open gaps ---------- */}
        <TabsContent value="gaps" className="mt-4">
          {open.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-8 py-14 text-center">
              <IconInbox className="size-8 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-medium">No open gaps</p>
              <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                When a student asks something neither the guidelines nor your answers cover, it lands here with a count of how often it's asked.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <p className="mr-auto text-[13px] text-muted-foreground">Most asked first. Answer once, and every student who asks gets it.</p>
                <Button variant="ghost" size="sm" onClick={copyEmail}>
                  <IconCopy /> Email
                </Button>
                <Button variant="ghost" size="sm" onClick={exportCsv}>
                  <IconDownload /> CSV
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => confirm("Clear every logged gap?") && guard(() => clearGapsApi(token), "Gaps cleared").then(() => setRefresh((r) => r + 1))}
                >
                  <IconTrash /> Clear
                </Button>
              </div>
              <ol className="divide-y divide-border rounded-2xl border border-border bg-card">
                {open.map((g) => (
                  <li key={g.key} className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium first-letter:uppercase">{g.missing}</p>
                        <p className="mt-1 text-[13px] text-muted-foreground">
                          "{g.questions[0]}"{g.questions.length > 1 && ` and ${g.questions.length - 1} similar`}
                        </p>
                        <p className="mt-1.5 font-mono text-[11px] text-muted-foreground/80">
                          asked {g.count}× · last {ago(g.last)}
                        </p>
                      </div>
                      <span className="rounded-full bg-saffron-wash px-2 py-0.5 font-mono text-xs text-saffron-ink tabular-nums">×{g.count}</span>
                      {answering !== g.key && (
                        <Button size="sm" onClick={() => setAnswering(g.key)}>
                          <IconPen /> Answer
                        </Button>
                      )}
                    </div>
                    {answering === g.key && (
                      <AnswerForm
                        group={g}
                        token={token}
                        onDone={() => {
                          setAnswering(null)
                          onChanged()
                        }}
                      />
                    )}
                  </li>
                ))}
              </ol>
            </>
          )}
        </TabsContent>

        {/* ---------- published answers ---------- */}
        <TabsContent value="answers" className="mt-4">
          {knowledge.answers.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">Answers you publish from the gaps inbox show up here.</p>
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {[...knowledge.answers].reverse().map((a) => (
                <li key={a.id} className="flex gap-3 px-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium">{a.question}</p>
                    <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed whitespace-pre-line text-muted-foreground">{a.answer}</p>
                    <p className="mt-1.5 font-mono text-[11px] text-muted-foreground/80">
                      {a.by} · {ago(a.at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete answer: ${a.question}`}
                    onClick={() => confirm("Delete this answer? Its gap will reopen.") && guard(() => deleteItem(token, "answers", a.id), "Answer deleted")}
                  >
                    <IconTrash />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ---------- source material ---------- */}
        <TabsContent value="sources" className="mt-4 grid gap-5">
          <form
            className="grid gap-3 rounded-2xl border border-border bg-card p-4"
            onSubmit={async (e) => {
              e.preventDefault()
              setUploading(true)
              await guard(() => uploadDoc(token, { title: title.trim(), filename, text }), `Added "${title.trim()}" to Axon`)
              setUploading(false)
              setTitle("")
              setText("")
              setFilename("")
            }}
          >
            <div>
              <p className="text-[15px] font-medium">Teach Axon from a document</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">Circulars, hostel rules, exam notices, transport schedules. Upload a PDF or text file, or paste the text.</p>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) pickFile(f)
                e.target.value = ""
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files?.[0]
                if (f) pickFile(f)
              }}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-input px-4 py-6 text-center transition-colors outline-none hover:border-foreground/30 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <IconUpload className="size-6 text-muted-foreground" />
              <span className="text-sm font-medium">{reading ? "Reading file…" : filename ? `Loaded ${filename}` : "Drop a file or click to choose"}</span>
              <span className="text-xs text-muted-foreground">PDF, TXT or MD</span>
            </button>
            <div className="grid gap-1.5">
              <Label htmlFor="doc-title">Title</Label>
              <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Transport circular, Sep 2026" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="doc-text">Text {text && <span className="font-normal text-muted-foreground">({text.length.toLocaleString("en-IN")} characters)</span>}</Label>
              <Textarea id="doc-text" value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="…or paste the text here" className="font-mono text-[12.5px]" required />
            </div>
            <Button type="submit" className="w-fit" disabled={uploading || reading || !title.trim() || !text.trim()}>
              {uploading ? "Adding…" : "Add to Axon"}
            </Button>
          </form>

          {knowledge.docs.length > 0 && (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {[...knowledge.docs].reverse().map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-3.5">
                  <IconDoc className="size-5 shrink-0 text-emerald-700" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {[d.filename, `${d.chars.toLocaleString("en-IN")} chars`, `${d.chunks.length} passages`, d.by, ago(d.at)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${d.title}`}
                    onClick={() => confirm(`Remove "${d.title}" from Axon?`) && guard(() => deleteItem(token, "docs", d.id), "Document removed")}
                  >
                    <IconTrash />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
