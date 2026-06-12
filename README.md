# 🎈 Pop Pop Popper!

A kid-friendly, web-based balloon popping game you play **with your hands through the camera** — on a laptop or a phone. Pinch or grab balloons to pop them, rack up combos, and watch out for the bombs floating up on little grey balloons!

Built with **TypeScript + Vite + MediaPipe Hands** and a hand-rolled Canvas 2D engine. No game framework, no sound assets (everything is synthesised with the Web Audio API).

## ✨ Features

- **Two hand gestures**, recognised in real time for up to two hands:
  - 🤏 **Pinch** — squeeze thumb + index to pop a balloon
  - ✊ **Grab** — close a fist to smash a whole area at once
- 🖐️ **Live tracking guide** — a glowing hand skeleton drawn over the camera preview shows exactly what the tracker sees, and lights up when a gesture registers
- 👆 **Touch/mouse fallback** — fully playable without a camera
- 💣 **Bombs** cost a heart and blast nearby balloons (scoreless chaos)
- ⭐ **Golden balloons**, combo chains, floating score popups, confetti
- 🔊 Synthesised sound effects, screen shake, mute toggle (persisted)
- 📱 Works on mobile — responsive HUD, safe-area insets, DPR-capped canvas
- 🔒 Privacy-friendly: all hand tracking runs **on-device**; no video leaves the browser

## 🚀 Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` — the camera works there without any certificate fuss, because browsers treat `localhost` as a secure context.

**Testing from a phone** on the same Wi-Fi is the one case that needs HTTPS (browsers only allow camera access on secure origins, and your LAN IP isn't one):

```bash
npm run dev:https
```

then open the printed `https://192.168.x.x:5173` Network URL on the phone and accept the self-signed certificate warning once.

Other scripts:

```bash
npm run build          # typecheck + production build → dist/
npm run preview        # serve the production build locally (http)
npm run preview:https  # serve the build over self-signed https (phone testing)
npm run typecheck      # tsc --noEmit only
```

The build is fully static — deploy `dist/` to any static host (GitHub Pages, Netlify, Vercel…). The MediaPipe **WASM runtime is bundled locally** (imported from `node_modules` with Vite `?url` imports, so it always matches the installed package version). Only the hand landmark model (~7.8 MB) is fetched from Google's model CDN on the first "Play with Camera" click, then cached by the browser.

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
```

Design principles: entities only know how to move and draw themselves; all rules live in `Game`; the DOM layer holds zero game logic; and anything you'd want to tweak while balancing is a named constant in `config.ts`.

## 🎮 Tuning the game

Open `src/config.ts` and play:

- Gestures feel too eager/too stubborn? Adjust `hand.pinchOn/Off`, `grabOn/Off`.
- Too hard for little hands? Raise the `pop.*` hit radii or lower `spawn.bombChanceMax`.
- Want a frantic party mode? Drop `spawn.minIntervalMs` and `rampSeconds`.

## 🛠️ Troubleshooting

- **"Couldn't start the camera"** — another app may be using it, or permission was denied. The 👆 touch mode always works.
- **Camera blocked on a phone via LAN IP** — make sure you're on the `https://` URL; browsers only allow camera on secure origins.
- **Sluggish tracking on old devices** — the tracker tries the GPU delegate first and falls back to CPU automatically; closing other tabs helps.
