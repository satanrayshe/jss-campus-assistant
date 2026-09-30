import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { toast } from "sonner"
import IconMenu from "~icons/solar/hamburger-menu-linear"
import IconRestart from "~icons/solar/restart-linear"
import IconRadar from "~icons/solar/radar-2-linear"
import IconChecklist from "~icons/solar/checklist-minimalistic-linear"
import { AxonMark } from "@/components/AxonMark"
import { AssistantMessage, UserMessage, type Msg } from "@/components/ChatMessage"
import { Composer } from "@/components/Composer"
import { GapsPanel } from "@/components/GapsPanel"
import { PlanDialog } from "@/components/PlanDialog"
import { PlanMessage } from "@/components/PlanMessage"
import { SettingsDialog } from "@/components/SettingsDialog"
import { Topics } from "@/components/Topics"
import { Welcome } from "@/components/Welcome"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Toaster } from "@/components/ui/sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CAMPUS, byId } from "@/data/faq"
import { useSpeaker } from "@/hooks/useSpeech"
import { DEFAULT_MODEL, probeServer, streamAnswer, type ChatTurn } from "@/lib/ai"
import { plainText } from "@/lib/markdown"
import { logGap } from "@/lib/gaps"
import type { Profile } from "@/lib/plan"
import { matchFaqs } from "@/lib/search"
import { cn } from "@/lib/utils"

type AssistantMsg = Extract<Msg, { role: "assistant" }>

const NO_MATCH =
  "I don't have that in my campus guide yet. Try a topic from the list, or contact the university:\n- **Phone:** 0120-2401484\n- **Email:** admissions@jssuninoida.edu.in"

let seq = 0
const uid = () => `m${++seq}`

function followUps(sources: string[], asked: Set<string>) {
  if (!sources.length) return [] // nothing to relate to; random suggestions would read as noise
  const cats = new Set(sources.map((id) => byId[id]?.category))
  const pool = CAMPUS.faqs.filter((f) => !sources.includes(f.id) && !asked.has(f.question))
  return [...pool.filter((f) => cats.has(f.category)), ...pool.filter((f) => !cats.has(f.category))].slice(0, 3).map((f) => f.question)
}

export default function App() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [asked, setAsked] = useState<Set<string>>(() => new Set())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [key, setKey] = useState(() => localStorage.getItem("axon_key") ?? "")
  const [model, setModel] = useState(() => localStorage.getItem("axon_model") ?? "")
  const [server, setServer] = useState<{ ai: boolean; model: string } | null>(null)
  const [gapsOpen, setGapsOpen] = useState(false)
  const [gapCount, setGapCount] = useState(0)
  const [gapVersion, setGapVersion] = useState(0)
  const [planOpen, setPlanOpen] = useState(false)

  const turns = useRef<ChatTurn[]>([])
  const abort = useRef<AbortController | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const pinned = useRef(true) // follow new text unless the reader has scrolled up
  const speaker = useSpeaker()

  useEffect(() => {
    probeServer().then(setServer)
  }, [])

  const shared = server !== null // gaps go to server.js when it's there
  const viaServer = Boolean(server?.ai) && !key
  const aiOn = viaServer || Boolean(key)
  const activeModel = model || (viaServer ? server!.model : "") || DEFAULT_MODEL

  const patch = (id: string, p: Partial<AssistantMsg>) =>
    setMessages((ms) => ms.map((m) => (m.id === id && m.role === "assistant" ? { ...m, ...p } : m)))

  useLayoutEffect(() => {
    const el = scroller.current
    if (el && pinned.current) el.scrollTop = el.scrollHeight
  }, [messages])

  const ask = useCallback(
    async (raw: string) => {
      const question = raw.trim()
      if (!question || busy) return
      setMenuOpen(false)
      setBusy(true)
      pinned.current = true
      const nextAsked = new Set(asked).add(question)
      setAsked(nextAsked)
      turns.current.push({ role: "user", content: question })
      const id = uid()
      setMessages((ms) => [
        ...ms,
        { id: uid(), role: "user", text: question },
        { id, role: "assistant", text: "", status: "thinking", sources: [] },
      ])

      const answerOffline = (note?: string) => {
        const hits = matchFaqs(question)
        const text = hits.length ? hits.map((f) => f.answer).join("\n\n") : NO_MATCH
        const sources = hits.map((f) => f.id)
        turns.current.push({ role: "assistant", content: text })
        const gap = hits.length ? undefined : "not covered by any FAQ entry"
        if (gap) recordGap(question, question)
        patch(id, { text, sources, status: "done", mode: hits.length ? "offline" : "nomatch", note, gap, followUps: followUps(sources, nextAsked) })
      }

      try {
        if (aiOn) {
          abort.current = new AbortController()
          try {
            const res = await streamAnswer(
              { viaServer, key, model: activeModel },
              turns.current,
              (text) => patch(id, { text, status: "streaming" }),
              abort.current.signal,
            )
            turns.current.push({ role: "assistant", content: res.text })
            if (res.missing) recordGap(question, res.missing)
            patch(id, {
              text: res.text,
              sources: res.sources,
              model: res.model,
              mode: "ai",
              status: "done",
              gap: res.missing,
              followUps: res.offTopic ? [] : followUps(res.sources, nextAsked),
            })
          } catch (err) {
            if ((err as Error).name === "AbortError") return
            console.warn(err)
            toast.warning("AI is busy right now", { description: "Answered straight from the FAQ instead." })
            answerOffline("AI unavailable, so this is the closest FAQ answer.")
          }
        } else {
          await new Promise((r) => setTimeout(r, 350))
          answerOffline()
        }
      } finally {
        setBusy(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, asked, aiOn, viaServer, key, activeModel, shared],
  )

  function recordGap(question: string, missing: string) {
    logGap({ question, missing }, shared).then(() => setGapVersion((v) => v + 1))
  }

  const buildPlan = (profile: Profile) => {
    setMenuOpen(false)
    pinned.current = true
    setMessages((ms) => [...ms, { id: uid(), role: "plan", profile }])
  }

  const newChat = () => {
    abort.current?.abort()
    speechSynthesis.cancel()
    turns.current = []
    setMessages([])
    setAsked(new Set())
    setBusy(false)
  }

  const saveSettings = (k: string, m: string) => {
    k ? localStorage.setItem("axon_key", k) : localStorage.removeItem("axon_key")
    m ? localStorage.setItem("axon_model", m) : localStorage.removeItem("axon_model")
    setKey(k)
    setModel(m)
    toast.success(k || server?.ai ? "AI mode on" : "Offline mode", {
      description: k || server?.ai ? "Answers are written by a free model, grounded in the FAQ." : "Answers come straight from the FAQ.",
    })
  }

  const sidebar = (
    <>
      <button
        type="button"
        onClick={() => {
          setMenuOpen(false)
          setPlanOpen(true)
        }}
        className="mb-4 flex items-center gap-3 rounded-lg border border-sidebar-border bg-card px-2.5 py-2.5 text-left transition-colors outline-none hover:border-foreground/20 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <IconChecklist className="size-[18px] shrink-0 text-saffron-ink" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">My first-week plan</span>
          <span className="block text-xs text-muted-foreground">A checklist built for you</span>
        </span>
      </button>
      <p className="px-2.5 pb-2 text-xs font-medium text-muted-foreground">Browse by topic</p>
      <Topics onAsk={ask} asked={asked} />
      <div className="mt-auto space-y-1 px-2.5 pt-6 text-xs leading-relaxed text-muted-foreground">
        <p>
          Sourced from{" "}
          <a href="https://jssuninoida.edu.in" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
            jssuninoida.edu.in
          </a>
          , Sep 2026.
        </p>
        <p>{CAMPUS.address}</p>
      </div>
    </>
  )

  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid h-dvh grid-cols-1 md:grid-cols-[288px_1fr]">
        <aside className="hidden min-h-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
          <div className="flex items-center gap-2.5 px-5 pt-5 pb-6">
            <AxonMark />
            <div className="leading-tight">
              <p className="font-semibold tracking-tight">Axon</p>
              <p className="text-xs text-muted-foreground">JSS University Noida</p>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2.5 pb-5">
            {sidebar}
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/70 px-3 md:px-5">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Browse topics">
                  <IconMenu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-[86vw] max-w-sm flex-col bg-sidebar p-0">
                <SheetHeader className="flex-row items-center gap-2.5 px-5 pt-5">
                  <AxonMark />
                  <div>
                    <SheetTitle>Axon</SheetTitle>
                    <SheetDescription className="text-xs">Browse by topic</SheetDescription>
                  </div>
                </SheetHeader>
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2.5 pb-5">{sidebar}</div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2 md:hidden">
              <AxonMark className="size-6 text-[13px]" />
              <span className="font-semibold tracking-tight">Axon</span>
            </div>

            <div className="ml-auto flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setGapsOpen(true)}>
                    <IconRadar className="size-[18px]" />
                    <span className="hidden sm:inline">Gaps</span>
                    {gapCount > 0 && (
                      <span className="grid h-4.5 min-w-4.5 place-items-center rounded-full bg-saffron px-1 font-mono text-[10px] font-medium text-white tabular-nums">
                        {gapCount}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Knowledge gaps: what the guidelines don't answer yet</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 rounded-full pr-3 pl-2.5" onClick={() => setSettingsOpen(true)}>
                    <span
                      aria-hidden
                      className={cn("size-2 rounded-full", aiOn ? "bg-emerald-500 shadow-[0_0_0_3px_oklch(0.7_0.15_155/0.18)]" : "bg-saffron")}
                    />
                    {aiOn ? (
                      <span className="font-mono text-[11px]">{activeModel.split("/").pop()}</span>
                    ) : (
                      <span className="text-xs">Offline mode</span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{aiOn ? "AI answers are on. Change the model or key." : "Add an OpenRouter key for AI answers"}</TooltipContent>
              </Tooltip>
              {messages.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={newChat} aria-label="New chat">
                      <IconRestart className="size-[18px]" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>New chat</TooltipContent>
                </Tooltip>
              )}
            </div>
          </header>

          <div
            ref={scroller}
            onScroll={(e) => {
              const el = e.currentTarget
              pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
            }}
            className="min-h-0 flex-1 overflow-y-auto"
          >
            {messages.length === 0 ? (
              <Welcome onAsk={ask} onPlan={() => setPlanOpen(true)} />
            ) : (
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 pt-8 pb-10" aria-live="polite">
                {messages.map((m) =>
                  m.role === "user" ? (
                    <UserMessage key={m.id} text={m.text} />
                  ) : m.role === "plan" ? (
                    <PlanMessage key={m.id} profile={m.profile} />
                  ) : (
                    <AssistantMessage
                      key={m.id}
                      msg={m}
                      speaking={speaker.speakingId === m.id}
                      onSpeak={() => speaker.toggle(m.id, plainText(m.text))}
                      onAsk={ask}
                    />
                  ),
                )}
              </div>
            )}
          </div>

          <Composer onSend={ask} busy={busy} />
        </main>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        serverHasKey={Boolean(server?.ai)}
        keyValue={key}
        modelValue={model}
        onSave={saveSettings}
      />
      <GapsPanel open={gapsOpen} onOpenChange={setGapsOpen} shared={shared} version={gapVersion} onCount={setGapCount} />
      <PlanDialog open={planOpen} onOpenChange={setPlanOpen} onBuild={buildPlan} />
      <Toaster position="top-center" />
    </TooltipProvider>
  )
}
