<div align="center">

<img src="branding/icon.svg" alt="Pop Pop Popper!" width="128">

# 🎈 Pop Pop Popper!

### Pop balloons with your bare hands, right through the camera

A free, private, installable browser game you play with hand gestures. Pinch or grab balloons to
pop them, chain combos, grab golden balloons — and dodge the bombs floating up on little grey strings.

[**▶&nbsp; Play now**](https://popr.sindbug.com/) &nbsp;·&nbsp; [Quick start](#-quick-start) &nbsp;·&nbsp; [How to play](#-how-to-play) &nbsp;·&nbsp; [How tracking works](#-how-hand-tracking-works)

[![Play](https://img.shields.io/badge/play-popr.sindbug.com-69c8ff?style=flat-square)](https://popr.sindbug.com/)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Hands-00897B?style=flat-square&logo=google&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable%20%26%20offline-5A0FC8?style=flat-square&logo=pwa&logoColor=white)
![Static](https://img.shields.io/badge/100%25-static%20%C2%B7%20no%20backend-2ea043?style=flat-square)
![Privacy](https://img.shields.io/badge/tracking-on--device-2ea043?style=flat-square)

</div>

---

Built with **TypeScript + Vite + MediaPipe Hands** and a hand-rolled Canvas 2D engine — no game
framework, and no sound assets (every effect is synthesised with the Web Audio API). The whole thing
is **100% static** and **private by design**: all hand tracking runs on-device, so no video ever
leaves the browser.

```
pinch (thumb + index) ──▶ pop one balloon
grab (close your fist) ──▶ smash a whole cluster
no camera?             ──▶ tap / click to pop
```

## Contents

- [Highlights](#-highlights)
- [How to play](#-how-to-play)
- [Quick start](#-quick-start) · [Scripts](#scripts)
- [Deployment](#-deployment)
- [SEO, social & PWA](#-seo-social--pwa)
- [How hand tracking works](#-how-hand-tracking-works)
- [Project structure](#-project-structure)
- [Tuning the game](#-tuning-the-game)
- [Troubleshooting](#-troubleshooting)
- [Tech stack](#-tech-stack)
- [License](#-license)

---

## ✨ Highlights

- 🤏 **Two real-time gestures** — *pinch* to pop one balloon, *grab* (closed fist) to smash a whole cluster, tracked for up to two hands at once.
- 🖐️ **Live tracking guide** — a glowing hand skeleton over the camera preview shows exactly what the tracker sees and lights up when a gesture registers.
- 👆 **Touch / mouse fallback** — fully playable with no camera at all.
- 💣 **Bombs** cost a heart and blast nearby balloons; ⭐ **golden balloons**, combo chains, floating score popups and confetti reward fast hands.
- 🔊 **Synthesised audio** — SFX, screen shake, and a persisted mute toggle, with zero audio files.
- 📱 **Mobile-ready** — responsive HUD, safe-area insets, DPR-capped canvas.
- 🔒 **Private by design** — all hand tracking runs **on-device**; no video ever leaves the browser.
- ⚡ **Installable & offline** — a real PWA you can add to your home screen and play without a connection.

---

## 🎮 How to play

| Action | Input | Result |
| --- | --- | --- |
| Pop a single balloon | 🤏 **Pinch** thumb + index | +points, with a satisfying burst |
| Smash a whole bunch | ✊ **Grab** (close your fist) | clears everything in range |
| No camera? | 👆 **Tap / click** | same popping, touch-controlled |
| Watch out | 💣 **Bomb** (grey balloon) | costs a heart — don't pop it! |
| Go for it | ⭐ **Golden balloon** | big bonus points |

Chain pops within the combo window to stack a multiplier. You have **3 hearts** — lose them all and it's game over (your best score is remembered).

---

## 🚀 Quick start

This project uses **Yarn** (Yarn 1.x — Classic).

```bash
yarn install
yarn dev
```

Open **`http://localhost:5173`** — the camera works there with no certificate fuss, because browsers treat `localhost` as a secure context.

**Testing from a phone** on the same Wi-Fi is the one case that needs HTTPS (browsers only allow camera access on secure origins, and your LAN IP isn't one):

```bash
yarn dev:https
```

then open the printed `https://192.168.x.x:5173` Network URL on the phone and accept the self-signed certificate warning once.

### Scripts

| Script | What it does |
| --- | --- |
| `yarn dev` | Dev server on `http://localhost:5173` |
| `yarn dev:https` | Dev server over self-signed HTTPS (phone camera testing) |
| `yarn build` | Generate assets → typecheck → production build into `dist/` |
| `yarn preview` | Serve the production build locally (HTTP) |
| `yarn preview:https` | Serve the build over self-signed HTTPS |
| `yarn generate:assets` | Rebuild icons + OG image from `branding/*.svg` |
| `yarn typecheck` | `tsc --noEmit` only |

---

## 📦 Deployment

The build is **fully static** — deploy `dist/` to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages…).

- The MediaPipe **WASM runtime is bundled locally** (imported from `node_modules` with Vite `?url` imports, so it always matches the installed package version).
- Only the hand-landmark **model (~7.8 MB)** is fetched from Google's model CDN on the first "Play with Camera" click, then cached by the browser (and by the service worker — see below).
- Set your canonical origin in **`.env`** (`VITE_SITE_URL`) before building so all absolute SEO/social URLs resolve correctly.

> `vite.config.ts` sets `base: '/'` for the root-domain deploy. For **subfolder** hosting (e.g. GitHub Pages project sites), switch it back to `'./'` and adjust the PWA `scope` / `start_url` to the subpath.

---

## 🔎 SEO, social & PWA

The game ships a full discoverability layer — search metadata, social share previews, structured data, and an installable, offline-capable PWA.

**One setting — the canonical origin.** `.env` is the single source of truth:

```bash
VITE_SITE_URL=https://popr.sindbug.com   # no trailing slash
```

Vite substitutes `%VITE_SITE_URL%` into `index.html` at build time for the `canonical` link, Open Graph / Twitter tags, and the JSON-LD. **Deploying elsewhere?** Change this value, then update the literal URLs in `public/robots.txt`, `public/sitemap.xml` and `public/.well-known/security.txt` to match.

**Auto-generated assets.** Every raster asset is produced from two tracked SVG sources (`branding/icon.svg`, `branding/og-image.svg`) by `scripts/seo-assets.mjs` (via `sharp`). It runs automatically on `prebuild`, or on demand with `yarn generate:assets`, emitting into `public/` (gitignored, rebuilt each build):

- `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`
- `favicon.ico` (16/32/48) — the crisp tab icon stays `public/favicon.svg`
- `og-image.png` — the 1200×630 social share card

**In the `<head>`** (`index.html`): an SEO-tuned `<title>` + description, `canonical`, `robots`, full Open Graph + Twitter cards, iOS/Android web-app metas, a `<noscript>` fallback, and JSON-LD (`VideoGame` + `WebSite` + `FAQPage`, FAQ rich-result eligible). A `google-site-verification` placeholder is included — paste your Search Console token after deploying (or remove it), then submit `sitemap.xml`.

**Installable + offline.** `vite-plugin-pwa` (config in `vite.config.ts`) generates `manifest.webmanifest` and a Workbox service worker (`registerType: 'autoUpdate'`, auto-registered). The app shell is precached; Google Fonts, the MediaPipe WASM, and the model CDN are runtime-cached. So **touch mode plays fully offline**, and after one online camera session the model is cached for offline camera play too — only the model's *first* download needs the network (it's cross-origin and can't be precached). The SW is off in `vite dev`; test it with `yarn preview`.

**Other discovery files** in `public/`: `robots.txt` (with `Sitemap:`), `sitemap.xml` (with image extension), `humans.txt`, and `.well-known/security.txt` (RFC 9116).

---

## 🧠 How hand tracking works

[`@mediapipe/tasks-vision`](https://www.npmjs.com/package/@mediapipe/tasks-vision)'s `HandLandmarker` returns 21 landmarks per hand per video frame. From those, `src/hand/gestures.ts` derives gestures using distances **normalised by hand size** (wrist → middle knuckle), so everything works at any distance from the camera:

| Gesture | Rule |
| --- | --- |
| Pinch | thumb tip ↔ index tip ratio `< 0.42` (releases at `0.6` — hysteresis stops flicker) |
| Grab | average fingertip → wrist ratio `< 1.3` (a closed fist) |

Coordinates are mirrored to match the selfie view and exponentially smoothed. Pinch and grab fire **once on the closing frame**. Three extra stability tricks:

- The cursor rides the **palm centre** (average of wrist + finger bases) — far steadier than any fingertip, which moves while the hand opens and closes.
- Hand identity is kept across frames by **palm proximity**, never by MediaPipe's handedness label, which can flip frame-to-frame and would reset smoothing and gesture state.
- **Grab wins over pinch** (a closing fist passes through a pinch-like shape), and a held grab only releases once the hand is fully open — fist *and* pinch — so tracking jitter can't end it early.

The camera preview overlays a live skeleton of the 21 landmarks (`src/ui/handGuide.ts`), so players can see the tracker working in real time.

---

## 🗂️ Project structure

```
src/
├── main.ts               # App entry: screens, buttons, game ↔ UI wiring
├── config.ts             # Every gameplay & tracking tunable in one place
├── types.ts              # Shared types + tiny math helpers
├── audio/
│   └── SoundManager.ts   # Web Audio synthesised SFX (no asset files)
├── hand/
│   ├── HandTracker.ts    # MediaPipe wrapper: camera, model, smoothing, events
│   └── gestures.ts       # Pure gesture math from raw landmarks
├── game/
│   ├── Game.ts           # Game loop, state machine, popping & scoring rules
│   ├── entities.ts       # Balloon / GoldenBalloon / Bomb (move + draw only)
│   ├── spawner.ts        # What spawns when; difficulty ramping
│   ├── particles.ts      # Shards, confetti, smoke, rings, score text
│   └── background.ts     # Candy sky: sun, parallax clouds, hills
└── ui/
    ├── hud.ts            # Thin DOM layer: screens, counters, toasts
    └── handGuide.ts      # Hand-skeleton overlay on the camera preview

branding/                 # SVG sources for the icon & social card
scripts/seo-assets.mjs    # Generates icons, favicon.ico & og-image.png
public/                   # robots.txt, sitemap.xml, security.txt, favicon.svg …
```

Design principles: entities only know how to move and draw themselves; all rules live in `Game`; the DOM layer holds zero game logic; and anything you'd want to tweak while balancing is a named constant in `config.ts`.

---

## 🎛️ Tuning the game

Open `src/config.ts` and play:

- Gestures feel too eager / too stubborn? Adjust `hand.pinchOn/Off`, `grabOn/Off`.
- Too hard for little hands? Raise the `pop.*` hit radii or lower `spawn.bombChanceMax`.
- Want a frantic party mode? Drop `spawn.minIntervalMs` and `rampSeconds`.

---

## 🛠️ Troubleshooting

- **"Couldn't start the camera"** — another app may be using it, or permission was denied. The 👆 touch mode always works.
- **Camera blocked on a phone via LAN IP** — make sure you're on the `https://` URL (`yarn dev:https`); browsers only allow camera on secure origins.
- **Sluggish tracking on old devices** — the tracker tries the GPU delegate first and falls back to CPU automatically; closing other tabs helps.

---

## 🧰 Tech stack

- **[TypeScript](https://www.typescriptlang.org/)** (strict) + **[Vite](https://vitejs.dev/)** — build & dev server
- **[MediaPipe Tasks Vision](https://www.npmjs.com/package/@mediapipe/tasks-vision)** — on-device `HandLandmarker`
- **Canvas 2D** — hand-rolled rendering & particle engine
- **[Web Audio API](https://developer.mozilla.org/docs/Web/API/Web_Audio_API)** — synthesised sound, no assets
- **[vite-plugin-pwa](https://vite-pwa-org.netlify.app/)** + **[sharp](https://sharp.pixelplumbing.com/)** — PWA, service worker & asset generation

---

## 📄 License

No license file is included yet. If you plan to share or fork this, add one — [MIT](https://choosealicense.com/licenses/mit/) is a sensible default for a project like this.

© Rayhan

---

<p align="center">Bugged by <img src="public/SINDBUG.gif" alt="SINDBUG" height="24"></p>
