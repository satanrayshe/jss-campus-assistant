// Extracts text from an uploaded PDF in the browser. pdf.js is loaded only when a PDF is picked.
export async function pdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist")
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default
  pdfjs.GlobalWorkerOptions.workerSrc = worker
  const task = pdfjs.getDocument({ data: await file.arrayBuffer() })
  const doc = await task.promise
  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent()
    pages.push(content.items.map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : "")).join(""))
  }
  await task.destroy()
  return pages.join("\n\n").replace(/[ \t]+\n/g, "\n").trim()
}

export async function fileText(file: File): Promise<string> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return pdfText(file)
  return file.text()
}
