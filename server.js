// Zero-dependency local server: serves the built app (dist/) and proxies AI calls to
// OpenRouter, so the API key stays in .env on the server and never reaches the browser.
import crypto from "node:crypto"
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

const json = (res, code, body) => {
  res.writeHead(code, { "Content-Type": "application/json" })
  res.end(JSON.stringify(body))
}

async function readBody(req, limit) {
  let body = ""
  for await (const chunk of req) {
    body += chunk
    if (body.length > limit) throw Object.assign(new Error("request too large"), { status: 413 })
  }
  try { return JSON.parse(body || "{}") } catch { throw Object.assign(new Error("invalid JSON"), { status: 400 }) }
}

const readJson = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, "utf8")) } catch { return fallback }
}
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2))
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "")

// ---------- faculty and senior sign-in ----------
// Faculty and seniors prove themselves with a passcode from .env and get an HMAC-signed token (valid 12 h).
const PASSCODES = { faculty: process.env.FACULTY_PASSCODE || "", senior: process.env.SENIOR_PASSCODE || "" }
const SECRET = crypto.createHash("sha256").update(`axon:${PASSCODES.faculty}:${PASSCODES.senior}`).digest()
const sign = (payload) => crypto.createHmac("sha256", SECRET).update(payload).digest("base64url")

function issueToken(user) {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + 12 * 3600e3 })).toString("base64url")
  return `${payload}.${sign(payload)}`
}

/** The signed-in user from the Authorization header, or null. */
function signedIn(req) {
  const [payload, sig] = (req.headers.authorization || "").replace(/^Bearer /, "").split(".")
  if (!payload || !sig) return null
  const expected = sign(payload)
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  const user = JSON.parse(Buffer.from(payload, "base64url").toString())
  return user.exp > Date.now() && Object.hasOwn(PASSCODES, user.role) && PASSCODES[user.role] ? user : null
}
const faculty = (req) => (signedIn(req)?.role === "faculty" ? signedIn(req) : null)

async function loginRoute(req, res) {
  const { role = "faculty", name, dept, passcode } = await readBody(req, 2048)
  if (!Object.hasOwn(PASSCODES, role)) return json(res, 400, { error: "Unknown role" })
  const expected = PASSCODES[role]
  if (!expected) return json(res, 503, { error: `${role === "senior" ? "Senior" : "Faculty"} sign-in is off: set ${role.toUpperCase()}_PASSCODE in .env` })
  const ok = typeof passcode === "string" && passcode.length === expected.length && crypto.timingSafeEqual(Buffer.from(passcode), Buffer.from(expected))
  if (!ok) return json(res, 401, { error: `Wrong ${role} passcode` })
  const user = { role, name: str(name, 80) || (role === "senior" ? "A senior" : "Faculty"), dept: str(dept, 80) }
  json(res, 200, { ...user, token: issueToken(user) })
}

// ---------- knowledge gaps (questions the guidelines couldn't answer) ----------
const GAPS_FILE = path.join(ROOT, "gaps.json")

async function gapsRoute(req, res) {
  if (req.method === "GET") return json(res, 200, readJson(GAPS_FILE, []))
  if (req.method === "DELETE") {
    if (!faculty(req)) return json(res, 401, { error: "Faculty only" })
    fs.rmSync(GAPS_FILE, { force: true })
    return json(res, 200, [])
  }
  if (req.method === "POST") {
    const { question, missing } = await readBody(req, 4096)
    const entry = { question: str(question, 300), missing: str(missing, 120), at: new Date().toISOString() }
    if (!entry.question || !entry.missing) return json(res, 400, { error: "question and missing are required" })
    writeJson(GAPS_FILE, [...readJson(GAPS_FILE, []), entry].slice(-500))
    return json(res, 201, entry)
  }
  json(res, 405, { error: "method not allowed" })
}

// ---------- faculty knowledge: published answers and uploaded source material ----------
const KB_FILE = path.join(ROOT, "knowledge.json")
const readKb = () => ({ answers: [], docs: [], resolved: [], tips: [], ...readJson(KB_FILE, {}) })
const id = (prefix) => `${prefix}-${crypto.randomBytes(4).toString("hex")}`

/** Splits a document into ~900-character chunks along paragraph and sentence breaks. */
function chunk(text) {
  const parts = text.replace(/\r/g, "").split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z0-9])/).map((p) => p.trim()).filter(Boolean)
  const out = []
  let cur = ""
  for (const p of parts) {
    if (cur && cur.length + p.length > 900) {
      out.push(cur)
      cur = ""
    }
    cur = cur ? `${cur}\n${p}` : p
    while (cur.length > 1400) {
      out.push(cur.slice(0, 1200))
      cur = cur.slice(1200)
    }
  }
  if (cur) out.push(cur)
  return out
}

async function knowledgeRoute(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/knowledge") return json(res, 200, readKb())

  // Anyone can mark a senior tip helpful (the browser keeps people from voting twice).
  const helpful = pathname.match(/^\/api\/knowledge\/tips\/([\w-]+)\/helpful$/)
  if (req.method === "POST" && helpful) {
    const kb = readKb()
    const tip = kb.tips.find((t) => t.id === helpful[1])
    if (!tip) return json(res, 404, { error: "not found" })
    tip.helpful = (tip.helpful || 0) + 1
    writeJson(KB_FILE, kb)
    return json(res, 200, { helpful: tip.helpful })
  }

  const user = signedIn(req)
  if (!user) return json(res, 401, { error: "Sign-in required" })
  const kb = readKb()
  const by = user.dept ? `${user.name}, ${user.dept}` : user.name

  // Senior tips: posted by seniors (or faculty); removable by their author or any faculty member.
  if (req.method === "POST" && pathname === "/api/knowledge/tips") {
    const b = await readBody(req, 8192)
    const gapKey = str(b.gapKey, 200)
    const tip = { id: id("tip"), text: str(b.text, 1500), category: str(b.category, 20) || "facilities", by, role: user.role, at: new Date().toISOString(), helpful: 0, ...(gapKey && { gapKey, question: str(b.question, 300) }) }
    if (!tip.text) return json(res, 400, { error: "the tip is empty" })
    kb.tips.push(tip)
    writeJson(KB_FILE, kb)
    return json(res, 201, tip)
  }
  const delTip = pathname.match(/^\/api\/knowledge\/tips\/([\w-]+)$/)
  if (req.method === "DELETE" && delTip) {
    const tip = kb.tips.find((t) => t.id === delTip[1])
    if (!tip) return json(res, 404, { error: "not found" })
    if (user.role !== "faculty" && tip.by !== by) return json(res, 403, { error: "You can only remove your own tips" })
    kb.tips = kb.tips.filter((t) => t.id !== tip.id)
    writeJson(KB_FILE, kb)
    return json(res, 200, { ok: true })
  }

  if (user.role !== "faculty") return json(res, 403, { error: "Faculty only" })

  if (req.method === "POST" && pathname === "/api/knowledge/answers") {
    const b = await readBody(req, 16_384)
    const gapKey = str(b.gapKey, 200)
    const answer = { id: id("fac"), question: str(b.question, 300), answer: str(b.answer, 4000), category: str(b.category, 20) || "facilities", by, at: new Date().toISOString(), ...(gapKey && { gapKey }) }
    if (!answer.question || !answer.answer) return json(res, 400, { error: "question and answer are required" })
    kb.answers.push(answer)
    if (gapKey && !kb.resolved.includes(gapKey)) kb.resolved.push(gapKey)
    writeJson(KB_FILE, kb)
    return json(res, 201, answer)
  }

  if (req.method === "POST" && pathname === "/api/knowledge/docs") {
    const b = await readBody(req, 3_000_000)
    const text = str(b.text, 400_000)
    if (!text) return json(res, 400, { error: "the document has no text" })
    const doc = { id: id("doc"), title: str(b.title, 140) || "Untitled document", filename: str(b.filename, 200), by, at: new Date().toISOString(), chars: text.length, chunks: chunk(text) }
    kb.docs.push(doc)
    writeJson(KB_FILE, kb)
    return json(res, 201, { ...doc, chunks: doc.chunks.length })
  }

  const del = pathname.match(/^\/api\/knowledge\/(answers|docs)\/([\w-]+)$/)
  if (req.method === "DELETE" && del) {
    // Deleting an answer reopens the gap it closed.
    const gone = kb[del[1]].find((x) => x.id === del[2])
    if (gone?.gapKey && !kb.answers.some((a) => a.id !== gone.id && a.gapKey === gone.gapKey)) kb.resolved = kb.resolved.filter((k) => k !== gone.gapKey)
    kb[del[1]] = kb[del[1]].filter((x) => x.id !== del[2])
    writeJson(KB_FILE, kb)
    return json(res, 200, { ok: true })
  }
  json(res, 404, { error: "not found" })
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
      return res.end(JSON.stringify({ ai: Boolean(KEY), model: MODEL, faculty: Boolean(PASSCODES.faculty), senior: Boolean(PASSCODES.senior) }))
    }
    if (url.pathname === "/api/login" && req.method === "POST") return await loginRoute(req, res)
    if (url.pathname === "/api/gaps") return await gapsRoute(req, res)
    if (url.pathname.startsWith("/api/knowledge")) return await knowledgeRoute(req, res, url.pathname)
    if (url.pathname === "/api/chat" && req.method === "POST") {
      if (!KEY) {
        res.writeHead(503, { "Content-Type": "application/json" })
        return res.end(JSON.stringify({ error: { message: "OPENROUTER_API_KEY missing in .env" } }))
      }
      return await proxyChat(req, res)
    }
    serveStatic(url.pathname, res)
  } catch (err) {
    if (!err.status) console.error(err)
    if (!res.headersSent) res.writeHead(err.status || 502, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: String(err.message || err) }))
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
