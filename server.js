// Zero-dependency local server: serves the built app (dist/) and proxies AI calls to
// OpenRouter, so the API key stays in .env on the server and never reaches the browser.
import fs from "node:fs"
import http from "node:http"
import path from "node:path"

const ROOT = import.meta.dirname
const DIST = path.join(ROOT, "dist")

try { process.loadEnvFile(path.join(ROOT, ".env")) } catch { /* no .env: offline mode */ }

const KEY = process.env.OPENROUTER_API_KEY || ""
const MODEL = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-super-120b-a12b:free"
const PORT = Number(process.env.PORT) || 3000
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".png": "image/png",
  ".json": "application/json",
}

if (!fs.existsSync(path.join(DIST, "index.html"))) {
  console.error("No build found. Run `npm start` (it builds first) or `npm run build`.")
  process.exit(1)
}

async function proxyChat(req, res) {
  let body = ""
  for await (const chunk of req) body += chunk
  const payload = JSON.parse(body || "{}")
  // The browser picks the fallback chain; the primary model comes from .env.
  payload.models = [MODEL, ...(payload.models || []).filter((m) => m !== MODEL)].slice(0, 3)

  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": `http://localhost:${PORT}`,
      "X-Title": "Axon Campus Assistant",
    },
    body: JSON.stringify(payload),
  })
  res.writeHead(upstream.status, { "Content-Type": upstream.headers.get("content-type") || "application/json" })
  for await (const chunk of upstream.body) res.write(chunk)
  res.end()
}

// Knowledge gaps: questions the guidelines couldn't answer, shared by everyone using this server.
const GAPS_FILE = path.join(ROOT, "gaps.json")
const readGaps = () => {
  try { return JSON.parse(fs.readFileSync(GAPS_FILE, "utf8")) } catch { return [] }
}

async function gapsRoute(req, res) {
  const json = (code, body) => {
    res.writeHead(code, { "Content-Type": "application/json" })
    res.end(JSON.stringify(body))
  }
  if (req.method === "GET") return json(200, readGaps())
  if (req.method === "DELETE") {
    fs.rmSync(GAPS_FILE, { force: true })
    return json(200, [])
  }
  if (req.method === "POST") {
    let body = ""
    for await (const chunk of req) {
      body += chunk
      if (body.length > 4096) return json(413, { error: "too large" })
    }
    const { question, missing } = JSON.parse(body || "{}")
    if (typeof question !== "string" || typeof missing !== "string" || !question.trim() || !missing.trim()) {
      return json(400, { error: "question and missing are required" })
    }
    const entry = { question: question.trim().slice(0, 300), missing: missing.trim().slice(0, 120), at: new Date().toISOString() }
    fs.writeFileSync(GAPS_FILE, JSON.stringify([...readGaps(), entry].slice(-500), null, 2))
    return json(201, entry)
  }
  json(405, { error: "method not allowed" })
}

function serveStatic(pathname, res) {
  // Resolve inside dist/ only; anything else (including .env) is unreachable.
  const file = path.normalize(path.join(DIST, decodeURIComponent(pathname)))
  const target = file.startsWith(DIST + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(DIST, "index.html")
  const type = TYPES[path.extname(target)] || "application/octet-stream"
  const cache = target.includes(`${path.sep}assets${path.sep}`) ? "public, max-age=31536000, immutable" : "no-cache"
  res.writeHead(200, { "Content-Type": type, "Cache-Control": cache })
  fs.createReadStream(target).pipe(res)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost")
  try {
    if (url.pathname === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ ai: Boolean(KEY), model: MODEL }))
    }
    if (url.pathname === "/api/gaps") return await gapsRoute(req, res)
    if (url.pathname === "/api/chat" && req.method === "POST") {
      if (!KEY) {
        res.writeHead(503, { "Content-Type": "application/json" })
        return res.end(JSON.stringify({ error: { message: "OPENROUTER_API_KEY missing in .env" } }))
      }
      return await proxyChat(req, res)
    }
    serveStatic(url.pathname, res)
  } catch (err) {
    console.error(err)
    if (!res.headersSent) res.writeHead(502, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: { message: String(err.message || err) } }))
  }
})

// If the port is taken (e.g. another copy is already running), try the next one.
function listen(port) {
  server.once("error", (err) => {
    if (err.code === "EADDRINUSE" && port < PORT + 10) {
      console.log(`Port ${port} is busy, trying ${port + 1}...`)
      return listen(port + 1)
    }
    throw err
  })
  server.listen(port)
}
server.once("listening", () => {
  const { port } = server.address()
  console.log(`Axon running at http://localhost:${port}  (${KEY ? `AI: ${MODEL}` : "offline mode: no key in .env"})`)
})
listen(PORT)
