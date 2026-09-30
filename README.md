# Axon: JSS University Noida Campus Assistant

An AI FAQ assistant that helps new students at **JSS University Noida** with questions about classes, attendance, the hostel, the library, clubs, the fest, safety and campus facilities.

**Live demo:** https://satanrayshe.github.io/jss-campus-assistant/

## What it does

- **22 predefined Q&As in 7 categories**, taken from the university's official site (jssuninoida.edu.in): the 75% attendance rule, CIE and SEE exams, hostel curfews (boys 10:00 PM, girls 8:30 PM), library holdings, clubs (IEEE, JCSI, SAE Team VEGA and others), Zealicon, anti-ragging, the student portal, placements and contacts.
- **AI-generated answers grounded in that data.** Every question goes to an LLM through OpenRouter together with the full knowledge base. The model answers in plain language, can combine several entries in one reply, and must cite the entries it used. It's told never to invent timings, numbers or contacts.
- **Hindi and Hinglish.** The assistant replies in the language you ask in.
- **Source chips.** 📄 marks an official fact; 💡 marks general guidance to double-check.
- **Chat UI** with category browsing, suggested starter questions and follow-up questions after each answer.
- **Voice input** (🎤, Web Speech API, en-IN) and **read aloud** (🔊).
- **Offline fallback.** With no key, or if the API fails, keyword retrieval still returns the best-matching official answer, so a live demo keeps working.

## Run it

**Recommended: local server with `.env`.** The key stays on the server and never reaches the browser.

```bash
cp .env.example .env     # then paste your OpenRouter key into .env
npm start                # http://localhost:3000
```

`server.js` has no dependencies (Node 20.12+). It reads `.env`, serves the app and proxies `/api/chat` to OpenRouter. It uses **free OpenRouter models** only: `google/gemma-4-31b-it:free`, then `nvidia/nemotron-3-super-120b-a12b:free`, then `openrouter/free`. OpenRouter moves to the next model automatically when one is rate-limited. Free models have daily request caps, so add a few dollars of OpenRouter credit before a big demo to raise the limit.

**Static hosting (GitHub Pages).** There's no server, so the page runs in offline mode until you click **⚙️ AI settings** and paste a key. That key is stored only in the browser's localStorage.

Voice input needs Chrome or Edge.

## Files

| File | Purpose |
| --- | --- |
| `faq.js` | Campus knowledge base: categories, Q&As, keywords and source links |
| `app.js` | Chat logic, OpenRouter streaming, offline retrieval, voice |
| `index.html`, `styles.css` | UI |
| `server.js` | Optional local server: reads `.env` and proxies AI calls |

## Sources

- [Campus Facilities](https://jssuninoida.edu.in/campus-facilities)
- [Student Life](https://jssuninoida.edu.in/student-life)
- [Academic Regulations & Policies](https://jssuninoida.edu.in/academics-regulations-policies)
- [Student Resources](https://jssuninoida.edu.in/student-resources)
- [Library & Information Centre](https://jssuninoida.edu.in/library-information-centre)
