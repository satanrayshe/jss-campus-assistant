import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { toast } from "sonner"
import IconMenu from "~icons/solar/hamburger-menu-linear"
import IconRestart from "~icons/solar/restart-linear"
import IconChecklist from "~icons/solar/checklist-minimalistic-linear"
import IconChat from "~icons/solar/chat-round-dots-linear"
import IconCalendar from "~icons/solar/calendar-linear"
import IconDesk from "~icons/solar/case-round-linear"
import IconUser from "~icons/solar/user-circle-linear"
import IconLogout from "~icons/solar/logout-2-linear"
import IconSenior from "~icons/solar/users-group-rounded-linear"
import { AxonMark } from "@/components/AxonMark"
import { AssistantMessage, UserMessage, type Msg } from "@/components/ChatMessage"
import { Composer } from "@/components/Composer"
import { Login } from "@/components/Login"
import { FacultyDesk } from "@/components/faculty/FacultyDesk"
import { SeniorDesk, TipsFeed } from "@/components/seniors/Tips"
import { PlanDialog } from "@/components/PlanDialog"
import { PlanMessage } from "@/components/PlanMessage"
import { SettingsDialog } from "@/components/SettingsDialog"
import { Topics } from "@/components/Topics"
import { Welcome } from "@/components/Welcome"
import { ImportDialog } from "@/components/semester/ImportDialog"
import { SemesterView } from "@/components/semester/SemesterView"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Toaster } from "@/components/ui/sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CAMPUS, byId } from "@/data/faq"
import { useSemester } from "@/hooks/useSemester"
import { useSpeaker } from "@/hooks/useSpeech"
import { DEFAULT_MODEL, probeServer, streamAnswer, type AiConfig, type ChatTurn } from "@/lib/ai"
import { clearSession, firstName, loadSession, saveSession, type Session } from "@/lib/auth"
import { groupGaps, loadGaps, logGap } from "@/lib/gaps"
import { EMPTY, fetchKnowledge, knowledgeForAi, matchKnowledge, setKnowledge, type Knowledge } from "@/lib/knowledge"
import { plainText } from "@/lib/markdown"
import type { Profile } from "@/lib/plan"
import { matchFaqs } from "@/lib/search"
import { answerPersonal, classesOn, contextForAi, mark, parseLog, pct, sampleSemester, verdict } from "@/lib/semester"
import { cn } from "@/lib/utils"

type AssistantMsg = Extract<Msg, { role: "assistant" }>
type View = "chat" | "semester" | "faculty" | "senior" | "tips"

const NO_MATCH =
  "I don't have that in my campus guide yet. Try a topic from the list, or contact the university:\n- **Phone:** 0120-2401484\n- **Email:** admissions@jssuninoida.edu.in"

let seq = 0
const uid = () => `m${++seq}`

function followUps(sources: string[], asked: Set<string>) {
  sources = sources.filter((id) => byId[id]) // only campus FAQ entries have related questions
  if (!sources.length) return [] // nothing to relate to; random suggestions would read as noise
  const cats = new Set(sources.map((id) => byId[id]?.category))
  const pool = CAMPUS.faqs.filter((f) => !sources.includes(f.id) && !asked.has(f.question))
  return [...pool.filter((f) => cats.has(f.category)), ...pool.filter((f) => !cats.has(f.category))].slice(0, 3).map((f) => f.question)
}

const stored = (k: string) => localStorage.getItem(k) ?? ""
const homeView = (s: Session | null): View => (s?.role === "faculty" ? "faculty" : s?.role === "senior" ? "senior" : "chat")

export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession)
  const [view, setView] = useState<View>(() => homeView(loadSession()))
  const [knowledge, setKnowledgeState] = useState<Knowledge>(EMPTY)
  const [openGaps, setOpenGaps] = useState(0)
  const [messages, setMessages] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [asked, setAsked] = useState<Set<string>>(() => new Set())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [key, setKey] = useState(() => stored("axon_key"))
  const [model, setModel] = useState(() => stored("axon_model"))
  const [server, setServer] = useState<{ ai: boolean; model: string; faculty?: boolean; senior?: boolean } | null>(null)
  const [gapVersion, setGapVersion] = useState(0)
  const [kbVersion, setKbVersion] = useState(0)
  const [planOpen, setPlanOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [isSample, setIsSample] = useState(() => stored("axon_sample") === "1")
  const [autoSpeak, setAutoSpeak] = useState(() => stored("axon_autospeak") === "1")

  const semester = useSemester()
  const turns = useRef<ChatTurn[]>([])
  const abort = useRef<AbortController | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const pinned = useRef(true) // follow new text unless the reader has scrolled up
  const speaker = useSpeaker()

  useEffect(() => {
    probeServer().then(setServer)
  }, [])
  useEffect(() => {
    fetchKnowledge().then((k) => {
      setKnowledge(k)
      setKnowledgeState(k)
    })
  }, [kbVersion])
  useEffect(() => {
    if (session?.role !== "faculty") return
    loadGaps(true).then((g) => setOpenGaps(groupGaps(g).filter((x) => !knowledge.resolved.includes(x.key)).length))
  }, [session, gapVersion, knowledge])
  useEffect(() => localStorage.setItem("axon_sample", isSample ? "1" : "0"), [isSample])
  useEffect(() => localStorage.setItem("axon_autospeak", autoSpeak ? "1" : "0"), [autoSpeak])

  const shared = server !== null // gaps go to server.js when it's there
  const viaServer = Boolean(server?.ai) && !key
  const aiOn = viaServer || Boolean(key)
  const activeModel = model || (viaServer ? server!.model : "") || DEFAULT_MODEL
  const aiConfig: AiConfig | null = aiOn ? { viaServer, key, model: activeModel } : null

  const patch = (id: string, p: Partial<AssistantMsg>) =>
    setMessages((ms) => ms.map((m) => (m.id === id && m.role === "assistant" ? { ...m, ...p } : m)))

  useLayoutEffect(() => {
    const el = scroller.current
    if (el && pinned.current && view === "chat" && messages.length) el.scrollTop = el.scrollHeight
  }, [messages, view])

  function recordGap(question: string, missing: string) {
    logGap({ question, missing }, shared).then(() => setGapVersion((v) => v + 1))
  }

  const ask = useCallback(
    async (raw: string) => {
      const question = raw.trim()
      if (!question || busy) return
      setView("chat")
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

      const finish = (p: Partial<AssistantMsg> & { text: string }) => {
        turns.current.push({ role: "assistant", content: p.text })
        patch(id, { ...p, status: "done" })
        if (autoSpeak) speaker.toggle(id, plainText(p.text))
      }

      const answerOffline = (note?: string) => {
        const personal = answerPersonal(question, semester.courses)
        if (personal) return finish({ text: personal, sources: [], mode: "tracker", personal: true, note })
        const hits = matchFaqs(question)
        const fac = hits.length ? null : matchKnowledge(question)
        if (fac) return finish({ text: fac.text, sources: [fac.id], mode: "offline", note })
        const text = hits.length ? hits.map((f) => f.answer).join("\n\n") : NO_MATCH
        const sources = hits.map((f) => f.id)
        const gap = hits.length ? undefined : "not covered by any FAQ entry"
        if (gap) recordGap(question, question)
        finish({ text, sources, mode: hits.length ? "offline" : "nomatch", note, gap, followUps: followUps(sources, nextAsked) })
      }

      try {
        // "attended OS, skipped maths" updates the tracker directly: instant, and works offline.
        const logs = parseLog(question, semester.courses)
        if (logs.length) {
          for (const l of logs) semester.mark(l.course.id, l.present)
          const lines = logs.map(({ course, present }) => {
            const after = mark(course, present)
            return `- **${course.name}**: marked **${present ? "present" : "absent"}**. Now **${pct(after).toFixed(0)}%**. ${verdict(after)}`
          })
          await new Promise((r) => setTimeout(r, 250))
          return finish({ text: `Logged it.\n${lines.join("\n")}`, sources: [], mode: "tracker", personal: true })
        }

        if (!aiConfig) {
          await new Promise((r) => setTimeout(r, 350))
          return answerOffline()
        }
        abort.current = new AbortController()
        try {
          const res = await streamAnswer(
            { ...aiConfig, personal: contextForAi(semester.courses), knowledge: knowledgeForAi(question) },
            turns.current,
            (text) => patch(id, { text, status: "streaming" }),
            abort.current.signal,
          )
          if (res.missing) recordGap(question, res.missing)
          finish({
            text: res.text,
            sources: res.sources,
            model: res.model,
            mode: "ai",
            personal: res.personal,
            gap: res.missing,
            followUps: res.offTopic || res.personal ? [] : followUps(res.sources, nextAsked),
          })
        } catch (err) {
          if ((err as Error).name === "AbortError") return
          console.warn(err)
          toast.warning("AI is busy right now", { description: "Answered without AI instead." })
          answerOffline("AI unavailable, so this answer comes straight from your data and the FAQ.")
        }
      } finally {
        setBusy(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, asked, aiConfig?.key, aiConfig?.model, aiConfig?.viaServer, shared, semester.courses, autoSpeak, knowledge],
  )

  const buildPlan = (profile: Profile) => {
    setView("chat")
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

  const signIn = (s: Session) => {
    saveSession(s)
    setSession(s)
    setView(homeView(s))
  }
  const signOut = () => {
    clearSession()
    newChat()
    setSession(null)
  }

  const go = (v: View) => {
    setView(v)
    setMenuOpen(false)
  }
  const todayCount = classesOn(semester.courses, new Date().getDay()).length

  const navItem = (v: View, Icon: typeof IconChat, label: string, hint: string) => (
    <button
      type="button"
      onClick={() => go(v)}
      aria-current={view === v ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50",
        view === v && "bg-card shadow-[0_0_0_1px_var(--sidebar-border)]",
      )}
    >
      <Icon className={cn("size-[18px] shrink-0 text-muted-foreground", view === v && "text-saffron-ink")} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  )

  const sidebar = (
    <>
      <nav aria-label="Main" className="mb-5 flex flex-col gap-0.5">
        {session?.role === "faculty" && navItem("faculty", IconDesk, "Faculty desk", openGaps ? `${openGaps} open ${openGaps === 1 ? "gap" : "gaps"} to answer` : "Gaps, answers, source material")}
        {session?.role === "senior" && navItem("senior", IconSenior, "Senior desk", "Share tips with freshers")}
        {navItem("chat", IconChat, "Ask Axon", session?.role !== "student" ? "See what students see" : "Campus questions, any language")}
        {session?.role === "student" &&
          navItem("tips", IconSenior, "From seniors", knowledge.tips.length ? `${knowledge.tips.length} ${knowledge.tips.length === 1 ? "tip" : "tips"} from JSS seniors` : "Tips from JSS seniors")}
        {session?.role === "student" &&
          navItem(
            "semester",
            IconCalendar,
            "My semester",
            semester.courses.length ? `${todayCount} ${todayCount === 1 ? "class" : "classes"} today · bunk maths` : "Timetable + bunk calculator",
          )}
        {session?.role === "student" && (
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              setPlanOpen(true)
            }}
            className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <IconChecklist className="size-[18px] shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">First-week plan</span>
              <span className="block text-xs text-muted-foreground">A checklist built for you</span>
            </span>
          </button>
        )}
      </nav>
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

  if (!session) {
    return (
      <TooltipProvider>
        <Login onSignIn={signIn} facultyAvailable={Boolean(server?.faculty)} seniorAvailable={Boolean(server?.senior)} />
        <Toaster position="top-center" />
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid h-dvh grid-cols-1 md:grid-cols-[288px_1fr]">
        <aside className="hidden min-h-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
          <div className="flex items-center gap-2.5 px-5 pt-5 pb-5">
            <AxonMark />
            <div className="leading-tight">
              <p className="font-semibold tracking-tight">Axon</p>
              <p className="text-xs text-muted-foreground">JSS University Noida</p>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2.5 pb-5">{sidebar}</div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/70 px-3 md:px-5">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                  <IconMenu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-[86vw] max-w-sm flex-col bg-sidebar p-0">
                <SheetHeader className="flex-row items-center gap-2.5 px-5 pt-5">
                  <AxonMark />
                  <div>
                    <SheetTitle>Axon</SheetTitle>
                    <SheetDescription className="text-xs">JSS University Noida</SheetDescription>
                  </div>
                </SheetHeader>
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2.5 pb-5">{sidebar}</div>
              </SheetContent>
            </Sheet>

            {/* Mobile view switch */}
            <div className="flex rounded-full border border-border bg-card p-0.5 md:hidden" role="tablist" aria-label="View">
              {(session?.role === "faculty" ? (["faculty", "chat"] as View[]) : session?.role === "senior" ? (["senior", "chat"] as View[]) : (["chat", "semester", "tips"] as View[])).map((v) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => go(v)}
                  className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                >
                  {({ chat: "Ask", semester: "Semester", tips: "Seniors", faculty: "Desk", senior: "Desk" } as const)[v]}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 rounded-full pr-3 pl-2.5" onClick={() => setSettingsOpen(true)}>
                    <span aria-hidden className={cn("size-2 rounded-full", aiOn ? "bg-emerald-500 shadow-[0_0_0_3px_oklch(0.7_0.15_155/0.18)]" : "bg-saffron")} />
                    {aiOn ? (
                      <span className="hidden font-mono text-[11px] sm:inline">{activeModel.split("/").pop()}</span>
                    ) : (
                      <span className="text-xs">Offline</span>
                    )}
                    {aiOn && <span className="text-xs sm:hidden">AI</span>}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{aiOn ? "AI answers are on. Change the model or key." : "Add an OpenRouter key for AI answers"}</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" aria-label="Account">
                    <IconUser className="size-[18px]" />
                    <span className="hidden max-w-28 truncate lg:inline">{session && session.name ? firstName(session) : "Guest"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium">{session?.name || "Guest student"}</p>
                    <p className="text-xs text-muted-foreground">
                      {session?.role === "student"
                        ? session.roll
                          ? `Student · ${session.roll}`
                          : "Student"
                        : `${session?.role === "faculty" ? "Faculty" : "Senior"}${session?.dept ? ` · ${session.dept}` : ""}`}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={signOut}>
                    <IconLogout /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {view === "chat" && messages.length > 0 && (
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

          {view === "faculty" && session?.role === "faculty" ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <FacultyDesk
                token={session.token}
                who={session.dept ? `${session.name}, ${session.dept}` : session.name}
                knowledge={knowledge}
                gapVersion={gapVersion}
                onChanged={() => {
                  setKbVersion((v) => v + 1)
                  setGapVersion((v) => v + 1)
                }}
                onSignedOut={signOut}
              />
            </div>
          ) : view === "senior" && session?.role === "senior" ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SeniorDesk token={session.token} who={session.dept ? `${session.name}, ${session.dept}` : session.name} knowledge={knowledge} onChanged={() => setKbVersion((v) => v + 1)} />
            </div>
          ) : view === "tips" ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <TipsFeed knowledge={knowledge} serverless={!server} onChanged={() => setKbVersion((v) => v + 1)} />
            </div>
          ) : view === "semester" ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SemesterView
                semester={semester}
                isSample={isSample}
                onImport={() => setImportOpen(true)}
                onLoadSample={() => {
                  semester.setCourses(sampleSemester())
                  setIsSample(true)
                }}
                onClearSample={() => {
                  semester.setCourses([])
                  setIsSample(false)
                }}
                onAsk={ask}
              />
            </div>
          ) : (
            <>
              <div
                ref={scroller}
                onScroll={(e) => {
                  const el = e.currentTarget
                  pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
                }}
                className="min-h-0 flex-1 overflow-y-auto"
              >
                {messages.length === 0 ? (
                  <Welcome
                    name={session?.role === "student" && session.name ? firstName(session) : ""}
                    onAsk={ask}
                    onPlan={() => setPlanOpen(true)}
                    courses={semester.courses}
                    onOpenSemester={() => go("semester")}
                  />
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
                          onOpenSemester={() => go("semester")}
                        />
                      ),
                    )}
                  </div>
                )}
              </div>
              <Composer onSend={ask} busy={busy} autoSpeak={autoSpeak} onToggleAutoSpeak={() => setAutoSpeak((v) => !v)} />
            </>
          )}
        </main>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} serverHasKey={Boolean(server?.ai)} keyValue={key} modelValue={model} onSave={saveSettings} />
      <PlanDialog open={planOpen} onOpenChange={setPlanOpen} onBuild={buildPlan} />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        ai={aiConfig}
        hasCourses={semester.courses.length > 0}
        onImport={(courses, replace) => {
          semester.setCourses((cur) => (replace ? courses : [...cur, ...courses]))
          if (replace) setIsSample(false)
          setView("semester")
          toast.success(`Added ${courses.length} courses`, { description: "Update each course's attendance so far with the pencil icon." })
        }}
      />
      <Toaster position="top-center" />
    </TooltipProvider>
  )
}
