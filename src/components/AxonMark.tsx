import { cn } from "@/lib/utils"

/** The Axon monogram: ink tile, saffron serif "A". */
export function AxonMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-lg bg-primary font-display text-[15px] leading-none font-semibold text-saffron italic",
        className,
      )}
    >
      A
    </span>
  )
}
