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

It's a static site with no build step:

```bash
npx serve .        # or: python -m http.server 8000
```

Open the page, click **⚙️ AI settings** and paste an OpenRouter key. The key is stored only in your browser's localStorage. The default model is `~google/gemini-flash-latest`, with automatic fallback to other models.

To skip typing the key during a demo, create a git-ignored `config.local.js`:

```js
window.AXON_CONFIG = { key: "sk-or-v1-...", model: "~google/gemini-flash-latest" };
```

Voice input needs Chrome or Edge.

## Files

| File | Purpose |
| --- | --- |
| `faq.js` | Campus knowledge base: categories, Q&As, keywords and source links |
| `app.js` | Chat logic, OpenRouter streaming, offline retrieval, voice |
| `index.html`, `styles.css` | UI |

## Sources

- [Campus Facilities](https://jssuninoida.edu.in/campus-facilities)
- [Student Life](https://jssuninoida.edu.in/student-life)
- [Academic Regulations & Policies](https://jssuninoida.edu.in/academics-regulations-policies)
- [Student Resources](https://jssuninoida.edu.in/student-resources)
- [Library & Information Centre](https://jssuninoida.edu.in/library-information-centre)
