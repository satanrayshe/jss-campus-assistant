import { useRef, useState } from "react"
import IconSpeak from "~icons/solar/volume-loud-linear"
import IconPause from "~icons/solar/pause-linear"
import IconCopy from "~icons/solar/copy-linear"
import IconCopied from "~icons/solar/check-read-linear"
import IconOfficial from "~icons/solar/document-text-linear"
import IconGuidance from "~icons/solar/lightbulb-linear"
import IconWarn from "~icons/solar/danger-triangle-linear"
import IconRadar from "~icons/solar/radar-2-linear"
import IconCalendar from "~icons/solar/calendar-linear"
import { AxonMark } from "@/components/AxonMark"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { byId, catById } from "@/data/faq"
import { useReveal } from "@/hooks/useReveal"
import { Markdown, plainText } from "@/lib/markdown"
import type { Profile } from "@/lib/plan"
import { cn } from "@/lib/utils"

export type Msg =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "plan"; profile: Profile }
  | {
      id: string
      role: "assistant"
      text: string
      status: "thinking" | "streaming" | "done"
      sources: string[]
      mode?: "ai" | "offline" | "nomatch" | "tracker"
      /** Answer came from the student's own semester data. */
      personal?: boolean
      model?: string
      note?: string
      /** Set when the guidelines couldn't answer part of the question; it was logged as a knowledge gap. */
      gap?: string
      followUps?: string[]
    }

export function UserMessage({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useReveal(ref, { y: 6 })
  return (
    <div ref={ref} className="flex justify-end">
      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-primary-foreground">
        {text}
      </p>
    </div>
  )
}

interface AssistantProps {
  msg: Extract<Msg, { role: "assistant" }>
  speaking: boolean
  onSpeak: () => void
  onAsk: (q: string) => void
  onOpenSemester: () => void
}

export function AssistantMessage({ msg, speaking, onSpeak, onAsk, onOpenSemester }: AssistantProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  useReveal(ref)

  const copy = async () => {
    await navigator.clipboard.writeText(plainText(msg.text))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const done = msg.status === "done"
  const modeLabel =
    msg.mode === "ai"
      ? `${(msg.model ?? "").split("/").pop()} · grounded in the FAQ`
      : msg.mode === "offline"
        ? "offline · matched from the FAQ"
        : msg.mode === "nomatch"
          ? "offline · no match"
          : msg.mode === "tracker"
            ? "from your semester tracker"
            : ""

  return (
    <div ref={ref} className="flex gap-3.5">
      <AxonMark className="mt-0.5" />
      <div className="min-w-0 flex-1">
        {msg.note && (
          <p className="mb-2 flex items-center gap-1.5 text-[13px] text-saffron-ink">
            <IconWarn className="size-3.5 shrink-0" />
            {msg.note}
          </p>
        )}

        {msg.status === "thinking" ? (
          <p className="flex h-7 items-center gap-2 text-sm text-muted-foreground" role="status">
            <span className="flex gap-1" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 animate-pulse rounded-full bg-saffron motion-reduce:animate-none"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
            </span>
            Checking the guidelines
          </p>
        ) : (
          <div className={cn("text-[15px] leading-7 text-foreground/90", msg.status === "streaming" && "caret")}>
            <Markdown text={msg.text} />
          </div>
        )}

        {done && (
          <>
            {msg.gap && (
              <p className="mt-4 flex items-start gap-2 rounded-lg border border-saffron/25 bg-saffron-wash px-3 py-2 text-[13px] leading-snug text-saffron-ink">
                <IconRadar className="mt-px size-4 shrink-0" />
                <span>
                  <span className="font-medium">Not in the official guidelines yet.</span> Logged as a knowledge gap
                  <span className="text-saffron-ink/80"> ({msg.gap})</span> so the university can fill it in.
                </span>
              </p>
            )}
            {(msg.sources.length > 0 || msg.personal) && (
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Sources">
                {msg.personal && (
                  <li>
                    <button
                      type="button"
                      onClick={onOpenSemester}
                      className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/[0.06] px-2 py-1 text-xs text-foreground transition-colors outline-none hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <IconCalendar className="size-3.5 shrink-0" />
                      Your semester tracker
                    </button>
                  </li>
                )}
                {msg.sources.map((id) => {
                  const f = byId[id]
                  const Icon = f.official ? IconOfficial : IconGuidance
                  return (
                    <li key={id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={f.source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "inline-flex max-w-[20rem] items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                              f.official
                                ? "border-border bg-card text-foreground/80 hover:border-foreground/25 hover:text-foreground"
                                : "border-saffron/30 bg-saffron-wash text-saffron-ink hover:border-saffron/60",
                            )}
                          >
                            <Icon className="size-3.5 shrink-0" />
                            <span className="truncate">
                              {catById[f.category].label}: {f.question}
                            </span>
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>
                          {f.official ? "Official: from jssuninoida.edu.in" : "General guidance, not on the official site. Worth confirming."}
                        </TooltipContent>
                      </Tooltip>
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="mt-3 flex items-center gap-0.5 text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" onClick={onSpeak} aria-label={speaking ? "Stop reading" : "Read aloud"}>
                    {speaking ? <IconPause /> : <IconSpeak />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{speaking ? "Stop" : "Read aloud"}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" onClick={copy} aria-label="Copy answer">
                    {copied ? <IconCopied className="text-saffron-ink" /> : <IconCopy />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{copied ? "Copied" : "Copy"}</TooltipContent>
              </Tooltip>
              {modeLabel && <span className="ml-2 font-mono text-[11px]">{modeLabel}</span>}
            </div>

            {msg.followUps && msg.followUps.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Related</p>
                <div className="flex flex-wrap gap-1.5">
                  {msg.followUps.map((q) => (
                    <Button key={q} variant="outline" size="sm" className="h-auto rounded-full py-1.5 text-left whitespace-normal" onClick={() => onAsk(q)}>
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
