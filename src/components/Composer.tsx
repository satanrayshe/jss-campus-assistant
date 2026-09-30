import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { toast } from "sonner"
import IconMic from "~icons/solar/microphone-3-linear"
import IconMicLive from "~icons/solar/microphone-3-bold"
import IconSend from "~icons/solar/plain-bold"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDictation } from "@/hooks/useSpeech"
import { cn } from "@/lib/utils"

export function Composer({ onSend, busy }: { onSend: (q: string) => void; busy: boolean }) {
  const [text, setText] = useState("")
  const area = useRef<HTMLTextAreaElement>(null)
  const dictation = useDictation(setText)

  // Grow with content, up to about five lines.
  useEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [text])

  const send = (value = text) => {
    const q = value.trim()
    if (!q || busy) return
    onSend(q)
    setText("")
  }

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (dictation.listening) dictation.stop()
    send()
  }

  const toggleMic = () => {
    if (!dictation.supported) {
      toast("Voice input needs Chrome or Edge", { description: "You can still type your question." })
      return
    }
    if (dictation.listening) {
      dictation.stop()
      send() // what's on screen includes the last interim words, which may not be finalised yet
    } else {
      setText("")
      dictation.start()
    }
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) submit(e)
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-5">
      <div
        className={cn(
          "rounded-2xl border bg-card p-2 shadow-[0_1px_2px_oklch(0.24_0.055_265/0.05),0_10px_30px_-14px_oklch(0.24_0.055_265/0.25)] transition-colors focus-within:border-foreground/20",
          dictation.listening && "border-saffron/50",
        )}
      >
        {dictation.listening && (
          <p className="flex items-center gap-2 px-2 pt-1 pb-1.5 text-xs font-medium text-saffron-ink" role="status">
            <span className="size-1.5 rounded-full bg-saffron motion-safe:animate-pulse" aria-hidden />
            Listening. Take your time, then tap the mic again to send.
          </p>
        )}
        <div className="flex items-end gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={dictation.listening ? "default" : "ghost"}
                size="icon-lg"
                onClick={toggleMic}
                aria-pressed={dictation.listening}
                aria-label={dictation.listening ? "Stop listening and send" : "Ask by voice"}
                className={cn(
                  "rounded-xl text-muted-foreground [&_svg:not([class*='size-'])]:size-5",
                  dictation.listening && "mic-live bg-saffron text-white hover:bg-saffron/90",
                )}
              >
                {dictation.listening ? <IconMicLive /> : <IconMic />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{dictation.listening ? "Stop and send" : "Ask by voice"}</TooltipContent>
          </Tooltip>

          <label htmlFor="question" className="sr-only">
            Your question
          </label>
          <textarea
            id="question"
            ref={area}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            readOnly={dictation.listening}
            placeholder={dictation.listening ? "Speak now…" : "Ask a campus question…"}
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-snug outline-none placeholder:text-muted-foreground/80"
          />

          <Button type="submit" size="icon-lg" disabled={busy || !text.trim()} aria-label="Send" className="rounded-xl [&_svg:not([class*='size-'])]:size-[18px]">
            <IconSend />
          </Button>
        </div>
      </div>
      <p className="mt-2 hidden text-center text-[11px] text-muted-foreground md:block">
        <Kbd>Enter</Kbd> to send · <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd> for a new line · Answers come from jssuninoida.edu.in
      </p>
    </form>
  )
}
