# CAIE Module Practice Engine

A mobile-friendly computer-based testing (CBT) engine for practicing the **USAII Certified Artificial Intelligence Examiner (CAIE)** exam, built from a 248-question practice bank mapped to the official CAIE course modules.

This is a sister app to [caie-exam-engine](https://github.com/Jude-Ufoh/caie-exam-engine), which covers the same exam using a separate, larger 450-question bank. Same features, different question source — pick whichever (or both).

Static site — vanilla HTML/CSS/JS, no build step, no backend. Runs entirely in the browser and deploys as a free GitHub Pages site, so it's just a link you can share (e.g. on WhatsApp) and open on any phone.

## Features

- **Welcome page** introducing the two study modes.
- **Sign up / log in** — lightweight, on-device accounts (username + password, password hashed with SHA-256 via WebCrypto). No email or server involved.
- **Dashboard** — tests taken, average/best score, and a full history table of past attempts.
- **Exam mode** — 60 random questions, 100-minute countdown, answers and explanations hidden until you submit (or time runs out).
- **Learning mode** — pick any number of questions and any time limit (or none), and check the answer + explanation after each question as you go.
- **Full review** at the end of every attempt: correct/incorrect/skipped breakdown with explanations.

## ⚠️ Data lives on your device

Accounts and test history are stored in the browser's `localStorage`, not on a server. That means:
- No sign-up/login required beyond picking a username — nothing leaves your device.
- History **does not sync** across devices or browsers. Clearing browser data / site storage erases it.
- This is intentional for a zero-backend, instantly-shareable static site. If cross-device sync is ever needed, swap `assets/js/storage.js` for a real backend (e.g. Firebase Auth + Firestore) — the rest of the app talks to it through that one module.

## Running locally

No build step — just serve the folder:

```bash
npx serve .
# or
python -m http.server 8000
```

Then open the printed local URL.

## Project structure

```
index.html               SPA shell
assets/css/styles.css    Design system
assets/js/storage.js     Accounts, sessions, history (localStorage)
assets/js/app.js         Router + views + test engine
assets/data/questions.js 248-question bank (module-aligned practice bank; see file header for provenance/answer-key notes)
manifest.json            PWA manifest (add-to-home-screen on mobile)
```

## Deploying

This repo is set up for GitHub Pages: push to `main`, enable Pages (source: `main` / root) in the repo settings, and the site is live at `https://<username>.github.io/<repo>/`.
