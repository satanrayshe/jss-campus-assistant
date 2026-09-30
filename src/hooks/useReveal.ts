import gsap from "gsap"
import { useLayoutEffect, type RefObject } from "react"

/** Fades a freshly mounted element up into place. Skipped under reduced motion. */
export function useReveal(ref: RefObject<HTMLElement | null>, opts: { y?: number; delay?: number } = {}) {
  useLayoutEffect(() => {
    if (!ref.current) return
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(ref.current, { autoAlpha: 0, y: opts.y ?? 10, duration: 0.45, delay: opts.delay ?? 0, ease: "power3.out" })
    })
    return () => mm.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
