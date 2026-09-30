import type { ReactNode } from "react"

// Tiny markdown subset the model is asked to use: paragraphs, "- " lists, **bold**, *italic*, links.
const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|https?:\/\/[^\s)]+[^\s).,]|\*[^*\n]+\*)/g

function inline(text: string, key: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const k = `${key}-${i}`
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={k} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    const link = part.match(/^\[([^\]]+)\]\((.+)\)$/)
    if (link || /^https?:\/\//.test(part)) {
      const href = link ? link[2] : part
      return (
        <a
          key={k}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-saffron-ink underline decoration-saffron/40 underline-offset-3 hover:decoration-saffron"
        >
          {link ? link[1] : part.replace(/^https?:\/\//, "")}
        </a>
      )
    }
    if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) return <em key={k}>{part.slice(1, -1)}</em>
    return part
  })
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: ReactNode[] = []
  const flush = () => {
    if (!list.length) return
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="my-2 space-y-1.5 pl-1">
        {list}
      </ul>,
    )
    list = []
  }
  text.split("\n").forEach((raw, i) => {
    const line = raw.trim()
    const item = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)/)
    if (item) {
      list.push(
        <li key={i} className="flex gap-2.5">
          <span aria-hidden className="mt-[11px] size-1 shrink-0 rounded-full bg-saffron" />
          <span>{inline(item[1], `li${i}`)}</span>
        </li>,
      )
      return
    }
    flush()
    if (line) {
      blocks.push(
        <p key={i} className="my-2 first:mt-0 last:mb-0">
          {inline(line.replace(/^#+\s*/, ""), `p${i}`)}
        </p>,
      )
    }
  })
  flush()
  return <>{blocks}</>
}

/** Plain text for copy and read-aloud. */
export const plainText = (md: string) =>
  md
    .replace(/\*\*|\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-•]\s*/gm, "")
