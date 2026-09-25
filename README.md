<div align="center">

# Quentin Courtade

**Developer & Editor**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![three.js](https://img.shields.io/badge/three.js-r186-000000?logo=threedotjs&logoColor=white)](https://threejs.org)

[quentincourtade.com](https://quentincourtade.com)

</div>

---

## Overview

Personal portfolio told as a 3D scroll story. You arrive in orbit next to a stainless-steel ship surrounded by asteroids; scrolling flies the camera to the airlock, boards the ship and descends its four decks — one per section: **About → Cybersecurity → GitHub Projects → Contact**.

### Features

- **Opening** — After igloo.inc: a 3D point graph draws itself while the decor appears as a hologram (outlines from the depth buffer) and lands as a white flash from the ship outwards; the interface arrives last
- **Scrollytelling camera** — Scroll position drives a spline camera path (Lenis smooth scroll), synced with sticky HTML panels
- **Procedural ship** — Lathe-built hull with a stainless-steel shader (weld seams, panel tint, heat tint), aft fins, engines, portholes with real openings, animated airlock, nav lights and RCS gas puffs
- **Space** — Pre-rendered Milky Way / nebula sky, twinkling star field, procedural ocean planet with clouds, night lights and atmosphere, crater-covered asteroids (instanced)
- **Four decks** — Crew quarters (memoji hologram), security ops (server racks, holo shield), engineering bay (git graph hologram, live repo screens), comms bay (transmitter) — each with its own lighting mood
- **Zero gravity** — Props float and tumble; sweep the cursor through them to push them around
- **GitHub integration** — Live repositories via the GitHub API (5 min cache), shown in the panel and on 3D screens
- **Everything procedural** — No 3D model or texture downloads: geometry, shaders and canvas textures are generated at load

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| 3D | three.js · React Three Fiber · drei · postprocessing |
| Scroll | Lenis |
| Animations | Framer Motion 12 (/clients) |
| Fonts | Unbounded (display) & IBM Plex Mono (text) |

## Project Structure

```
src/app/
├── page.tsx                 # Home — the six scroll chapters
├── layout.tsx               # Root layout, metadata, fonts
├── globals.css              # Theme, panels, HUD, loader
├── data.ts                  # Profile, missions, security, contact, YouTube data
├── clients/page.tsx         # YouTube clients page
└── components/
    ├── scroll/              # Lenis setup + scroll → chapter time store
    ├── ui/                  # HUD, loader, story sections (HTML panels)
    ├── github.ts            # GitHub repos store (shared by HTML + 3D)
    ├── decks.ts             # Deck names + accents (shared by HUD + 3D)
    ├── three/
    │   ├── Experience.tsx   # Canvas, quality detection, error fallback
    │   ├── Scene.tsx        # Environment, post-processing, shader precompile
    │   ├── cameraPath.ts    # Camera keyframes per chapter
    │   ├── config.ts        # Ship layout (hull, decks, windows, airlock)
    │   ├── space/           # Sky, planet, sun, asteroids, space dust
    │   ├── rocket/          # Hull material, rocket exterior, RCS puffs
    │   └── interior/        # Deck shells, props, centerpieces, lights
    ├── SpaceBackground.tsx  # /clients — canvas stars, planets, rocket
    └── StageScene.tsx       # /clients — stage pixel scene
```

Pacing is set by the chapter heights (`.chapter--*` in `globals.css`); camera framing by the keyframes in `cameraPath.ts`. Texts live in `data.ts`. The visual system (tokens, rules, components) is documented in [`DESIGN.md`](DESIGN.md).

### Accessibility

- Faded-out panels stay readable by screen readers; keyboard focus landing in one flies the camera to its deck, and the deck links (`#about`, `#contact`…) move focus to the section.
- One orange focus ring everywhere, 44px touch targets, 11px minimum text size.
- `prefers-reduced-motion`: no smooth scroll or panel lift, pixel-scene loops stop, and the 3D ambient motion runs at 15%.
- Short screens (landscape phones, 200% zoom) get compact chrome and panels that scroll inside instead of being cut.

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [localhost:3000](http://localhost:3000) to view.

## Deployment

Deployed on [Vercel](https://vercel.com). Push to `main` triggers automatic builds.

## License

All rights reserved.
