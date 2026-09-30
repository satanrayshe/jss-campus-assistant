import { useState, type ComponentType, type SVGProps } from "react"
import IconAcademics from "~icons/solar/square-academic-cap-2-linear"
import IconLibrary from "~icons/solar/book-bookmark-linear"
import IconHostel from "~icons/solar/bed-linear"
import IconCampus from "~icons/solar/buildings-2-linear"
import IconClubs from "~icons/solar/confetti-minimalistic-linear"
import IconSafety from "~icons/solar/shield-check-linear"
import IconContact from "~icons/solar/phone-calling-linear"
import IconArrow from "~icons/solar/arrow-right-linear"
import { CAMPUS, type CategoryId } from "@/data/faq"
import { cn } from "@/lib/utils"

export const CATEGORY_ICON: Record<CategoryId, ComponentType<SVGProps<SVGSVGElement>>> = {
  academics: IconAcademics,
  library: IconLibrary,
  hostel: IconHostel,
  facilities: IconCampus,
  clubs: IconClubs,
  wellbeing: IconSafety,
  contact: IconContact,
}

/** Browse-by-topic list. Each topic expands in place to show its questions. */
export function Topics({ onAsk, asked }: { onAsk: (q: string) => void; asked: Set<string> }) {
  const [open, setOpen] = useState<CategoryId | null>(null)

  return (
    <nav aria-label="Browse questions by topic" className="flex flex-col gap-0.5">
      {CAMPUS.categories.map((c) => {
        const Icon = CATEGORY_ICON[c.id]
        const items = CAMPUS.faqs.filter((f) => f.category === c.id)
        const isOpen = open === c.id
        return (
          <div key={c.id}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`topic-${c.id}`}
              onClick={() => setOpen(isOpen ? null : c.id)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50",
                isOpen && "bg-sidebar-accent",
              )}
            >
              <Icon className={cn("size-[18px] shrink-0 text-muted-foreground transition-colors", isOpen && "text-saffron-ink")} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{c.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{c.blurb}</span>
              </span>
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{items.length}</span>
            </button>
            {isOpen && (
              <ul id={`topic-${c.id}`} className="mt-0.5 mb-2 ml-[21px] border-l border-sidebar-border pl-2">
                {items.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => onAsk(f.question)}
                      className="group/q flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-[13px] leading-snug text-foreground/80 transition-colors outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <span className={cn("flex-1", asked.has(f.question) && "text-muted-foreground")}>{f.question}</span>
                      <IconArrow className="mt-0.5 size-3.5 shrink-0 opacity-0 transition-opacity group-hover/q:opacity-100 group-focus-visible/q:opacity-100" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )
}
