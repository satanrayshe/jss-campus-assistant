// Zero-dependency local server: serves the app and proxies AI calls to OpenRouter,
// so the API key stays in .env on the server and never reaches the browser.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

try { process.loadEnvFile(path.join(__dirname, ".env")); } catch { /* no .env: offline mode */ }

const KEY = process.env.OPENROUTER_API_KEY || "";
const MODEL = process.env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free";
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC = new Set(["index.html", "styles.css", "app.js", "faq.js"]);
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };

async function proxyChat(req, res) {
  let body = "";
  for await (const chunk of req) body += chunk;
  const payload = JSON.parse(body || "{}");
  // The browser picks the fallback chain; the primary model comes from .env.
  payload.models = [MODEL, ...(payload.models || []).filter((m) => m !== MODEL)].slice(0, 3);

  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": `http://localhost:${PORT}`,
      "X-Title": "Axon Campus Assistant",
    },
    body: JSON.stringify(payload),
  });
  res.writeHead(upstream.status, { "Content-Type": upstream.headers.get("content-type") || "application/json" });
  for await (const chunk of upstream.body) res.write(chunk);
  res.end();
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    try {
      if (url.pathname === "/api/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ ai: Boolean(KEY), model: MODEL }));
      }
      if (url.pathname === "/api/chat" && req.method === "POST") {
        if (!KEY) {
          res.writeHead(503, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: { message: "OPENROUTER_API_KEY missing in .env" } }));
        }
        return await proxyChat(req, res);
      }
      const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      if (!PUBLIC.has(file)) {
        res.writeHead(404);
        return res.end("Not found");
      }
      res.writeHead(200, { "Content-Type": `${TYPES[path.extname(file)]}; charset=utf-8` });
      fs.createReadStream(path.join(__dirname, file)).pipe(res);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: String(err.message || err) } }));
    }
  })
  .listen(PORT, () => {
    console.log(`Axon running at http://localhost:${PORT}  (${KEY ? `AI: ${MODEL}` : "offline mode: no key in .env"})`);
  });
