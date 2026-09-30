import { useCallback, useEffect, useRef, useState } from "react"

/* eslint-disable @typescript-eslint/no-explicit-any */
const SR: any = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null

/**
 * Push-to-toggle dictation. Listening continues through pauses and stumbles;
 * it only stops when the user toggles it off. Browsers end a recognition session
 * after a stretch of silence, so we quietly restart until the user stops.
 */
export function useDictation(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const recRef = useRef<any>(null)
  const wantRef = useRef(false) // user intent: keep listening
  const finalRef = useRef("") // finalized text across restarts
  const cbRef = useRef(onTranscript)
  cbRef.current = onTranscript

  const start = useCallback(() => {
    if (!SR || wantRef.current) return
    speechSynthesis.cancel()
    finalRef.current = ""
    wantRef.current = true
    setListening(true)

    const boot = () => {
      const rec = new SR()
      rec.lang = "en-IN"
      rec.continuous = true
      rec.interimResults = true
      rec.onresult = (e: any) => {
        if (!wantRef.current) return // late results after stop() would refill a box we just sent
        let interim = ""
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript
          if (e.results[i].isFinal) finalRef.current = `${finalRef.current} ${t}`.replace(/\s+/g, " ")
          else interim += t
        }
        cbRef.current(`${finalRef.current} ${interim}`.trim())
      }
      rec.onerror = (e: any) => {
        // "no-speech" and "aborted" are normal during long pauses; real errors end the session.
        if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") {
          wantRef.current = false
          setListening(false)
        }
      }
      rec.onend = () => {
        if (wantRef.current) {
          try {
            boot()
          } catch {
            wantRef.current = false
            setListening(false)
          }
        } else {
          setListening(false)
        }
      }
      recRef.current = rec
      rec.start()
    }
    boot()
  }, [])

  /** Stops listening and returns the full transcript. */
  const stop = useCallback(() => {
    wantRef.current = false
    recRef.current?.stop()
    setListening(false)
    return finalRef.current.trim()
  }, [])

  useEffect(
    () => () => {
      wantRef.current = false
      recRef.current?.abort()
    },
    [],
  )

  return { supported: Boolean(SR), listening, start, stop }
}

/** Read-aloud with a single active utterance across the app. */
export function useSpeaker() {
  const [speakingId, setSpeakingId] = useState<string | null>(null)

  const toggle = useCallback(
    (id: string, text: string) => {
      if (speakingId === id) {
        speechSynthesis.cancel()
        setSpeakingId(null)
        return
      }
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text.replace(/https?:\/\/\S+/g, "the link"))
      u.lang = /[ऀ-ॿ]/.test(text) ? "hi-IN" : "en-IN"
      const voice = speechSynthesis.getVoices().find((v) => v.lang === u.lang)
      if (voice) u.voice = voice
      u.rate = 1.03
      u.onend = u.onerror = () => setSpeakingId((cur) => (cur === id ? null : cur))
      setSpeakingId(id)
      speechSynthesis.speak(u)
    },
    [speakingId],
  )

  useEffect(() => () => speechSynthesis.cancel(), [])
  return { speakingId, toggle }
}
