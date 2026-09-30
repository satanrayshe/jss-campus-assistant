# Axon: JSS University Noida campus assistant

An AI assistant for new students at **JSS University Noida**. It answers first-week questions about attendance, exams, the hostel, the library, clubs, the fest, safety and campus facilities, using only the university's own guidelines.

**Live demo:** https://satanrayshe.github.io/jss-campus-assistant/

## What makes it different

**1. It knows your semester, not just the rulebook.** Paste the timetable your class rep shared, as messy WhatsApp text or a copied table. Axon's AI turns it into your courses and weekly class times. From then on:
- **My semester** shows your next class with a countdown and room, today's classes with one-tap present/absent, and a card per course.
- Each card applies the **official 75% rule** to your own numbers: *"Safe, you can skip 2 more"* or *"Below 75%, attend the next 4 to get back"*.
- The chat answers from your data. "Can I bunk physics tomorrow?", "what's my next class?" and "kal kitni classes hain?" get answers built on your real numbers, in the language you asked in.
- Log attendance by typing. "attended PPS, skipped maths" or "aaj maths chhodi aur physics attend kiya" updates the tracker instantly, even offline.
- **Hands-free mode** reads every answer aloud. Tap the mic, speak (it waits through pauses), tap again, and listen to the reply.

**2. Knowledge-gap radar.** Most campus bots either guess or give up quietly when they don't know something. Axon tells the student the guidelines don't cover it, then **logs the gap**. The **Gaps** panel groups these by topic and counts them ("college bus from the metro, asked 14×"). One click exports a CSV, or copies an email draft for the admin office. So every unanswered question becomes a to-do item for whoever maintains the guidelines.

**3. My first-week plan.** Three taps (hostel or day scholar, programme, interests) build a personal checklist from the knowledge base:
- your exact curfew
- the 75% attendance rule
- the anti-ragging helpline
- SAE Team VEGA if you're into cars, JCSI and IEEE if you code

Every item cites its source. You can tick items off (progress is saved) and print the plan.

**4. Grounded answers with sources.** Each answer shows the entries it drew on. 📄 marks an official fact, 💡 marks general guidance worth confirming. The model is instructed not to add tips or details that aren't in the knowledge base.

## Features

- 22 Q&As in 7 categories, taken from jssuninoida.edu.in (Sep 2026), in `src/data/faq.ts`.
- Answers from **free OpenRouter models**, streamed as they're written: Nemotron 3 Super, then Nemotron 3 Ultra, then `openrouter/free`. OpenRouter moves down the list automatically when a model is rate-limited.
- **English, Hindi and Hinglish.** Axon replies in the language and script you write in.
- **Voice input** that keeps listening through pauses until you tap the mic again, plus **read aloud**.
- **Offline fallback.** With no key, or if the AI fails, keyword matching still returns the right official answer.
- Topic browser, suggested starter questions and related follow-ups.

## Run it

```bash
npm install
cp .env.example .env      # paste your OpenRouter key into .env
npm start                 # builds, then serves http://localhost:3000
```

`server.js` has no dependencies. It serves the build, keeps the API key on the server (`/api/chat` proxy) and stores knowledge gaps in `gaps.json`, so everyone using that server feeds one shared list. If port 3000 is busy it moves to the next free port.

For development, run `npm run serve` for the API and `npm run dev` for Vite with hot reload.

**GitHub Pages** builds automatically on every push (`.github/workflows/pages.yml`). There's no server there, so it runs in offline mode until you add a key under the model pill → AI settings. The key is stored only in that browser, and gaps are logged locally.

Voice input needs Chrome or Edge.

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui (Radix), GSAP, Solar icons (Iconify), Geist and Fraunces fonts.

## Sources

- [Campus Facilities](https://jssuninoida.edu.in/campus-facilities)
- [Student Life](https://jssuninoida.edu.in/student-life)
- [Academic Regulations & Policies](https://jssuninoida.edu.in/academics-regulations-policies)
- [Student Resources](https://jssuninoida.edu.in/student-resources)
- [Library & Information Centre](https://jssuninoida.edu.in/library-information-centre)
- Zealicon dates: [knowafest](https://www.knowafest.com/explore/college/JSS-Academy-of-Technical-Education-Noida) (marked as guidance)
