---
name: Quentin Courtade · QC-01
description: A 3D scroll-through portfolio told as the log of a stainless-steel ship in orbit.
colors:
  ignition-orange: "#ff5a36"
  telemetry-green: "#3ddc84"
  caution-amber: "#ffb45e"
  security-red: "#ff3348"
  engineering-blue: "#4d9dff"
  comms-orange: "#ff8a3d"
  void-black: "#000000"
  hull-white: "#e9edf2"
  moonlight: "#c8cfd8"
  instrument-gray: "#9aa4b1"
  dim-steel: "#7f8896"
  hairline: "rgba(255, 255, 255, 0.1)"
  hairline-strong: "rgba(255, 255, 255, 0.18)"
  panel-glass: "rgba(12, 14, 20, 0.84)"
  card-ink: "rgba(10, 10, 18, 0.85)"
typography:
  display:
    fontFamily: "Unbounded, Arial Black, sans-serif"
    fontSize: "clamp(2.3rem, 6.1vw, 6.3rem)"
    fontWeight: 900
    lineHeight: 0.94
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Unbounded, Arial Black, sans-serif"
    fontSize: "clamp(1.3rem, 1.9vw, 1.7rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Unbounded, Arial Black, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.375
  body:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "clamp(0.95rem, 1.2vw, 1.1rem)"
    fontWeight: 400
    lineHeight: 1.6
  body-small:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "0.22em"
  card-name:
    fontFamily: "Unbounded, Arial Black, sans-serif"
    fontSize: "30px"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.02em"
rounded:
  row: "12px"
  card: "16px"
  panel: "20px"
  tile: "10px"
  pill: "999px"
spacing:
  gutter: "clamp(1rem, 5.5vw, 6.5rem)"
  card-inset: "20px"
  panel-inset: "1.55rem 1.7rem 1.7rem"
components:
  nav-link:
    textColor: "{colors.instrument-gray}"
    rounded: "{rounded.pill}"
    padding: "0.42rem 0.9rem"
  nav-link-active:
    backgroundColor: "rgba(255, 255, 255, 0.1)"
    textColor: "#ffffff"
  chip:
    backgroundColor: "rgba(255, 255, 255, 0.03)"
    textColor: "{colors.moonlight}"
    rounded: "{rounded.pill}"
    padding: "0.32rem 0.72rem"
  deck-panel:
    backgroundColor: "{colors.panel-glass}"
    textColor: "{colors.hull-white}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-inset}"
  bento-card:
    backgroundColor: "{colors.card-ink}"
    textColor: "#ffffff"
    rounded: "{rounded.card}"
    padding: "{spacing.card-inset}"
  repo-row:
    backgroundColor: "rgba(0, 0, 0, 0.45)"
    textColor: "#ffffff"
    rounded: "{rounded.row}"
    padding: "12px 14px"
---

# Design System: Quentin Courtade · QC-01

## Overview

**Creative North Star: "The Ship's Log"**

The site is the logbook of a ship in orbit. A real-time 3D scene carries the emotion: the stainless-steel hull, the asteroid field, the planet below, then four decks aboard, one per chapter. The HTML layer on top reads like the log's entries and the ship's instruments. It is cinematic in the scene and precise in the interface. The scene is allowed to be spectacular; the interface never competes with it.

Components are treated by layer. The chrome is kept to a minimum: the only fixed element is the deck navigation, bare text links melting into the decor. The Security panel behaves like an instrument: dark tinted glass, hairline borders, mono read-outs, one orange signal. The type speaks in two voices: a heavy, wide display face names things, and a slab-serif mono writes the log. The bento cards on the decks are the owner's live-site cards, kept verbatim with their 8-bit pixel scenes. They are the log's personality, framed by the ship rather than restyled to match it.

The palette is dark only, because the page is a window onto space. Light comes from the 3D scene: sun, planet bounce and deck lighting. The sky is the real one (NASA's Deep Star Maps 2020: Gaia stars and the Milky Way with its dust lanes), with no twinkling, since stars don't twinkle in space. Color in the UI is rationed.

**Key Characteristics:**
- Opening (after igloo.inc): a sparse 3D graph draws itself, the decor appears as a hologram and lands as a white flash from the ship outwards; the interface arrives last.
- Scroll drives a camera flight, and HTML panels fade in sync with it (chapter time `t`).
- Two voices: Unbounded Black for names and headings, IBM Plex Mono for every sentence and read-out (11px floor).
- Instrument chrome: tinted glass, 1px hairlines, one orange signal.
- One ignition orange for what is live or focused; each deck owns one accent.
- Pixel-art bento cards as the playful counterpoint, never redrawn.
- Nothing glows in the UI; depth comes from the scene and one deep ambient shadow.

## Colors

The palette is a black void and cool steel grays, with one ignition orange and one accent per deck.

### Primary
- **Ignition Orange** (#ff5a36): what is live or focused. It appears on the mark under the current deck in the navigation, the focus ring and text selection. It reads on black (6.8:1) and on the lit decks (3:1).

### Secondary
- **Deck accents**, one per floor, shared by the 3D lights and at most one UI mark:
  - **Caution Amber** (#ffb45e), Crew Quarters. It is also the warning tone: the airlock caption and "under construction" status.
  - **Security Red** (#ff3348), Security Ops.
  - **Engineering Blue** (#4d9dff), Engineering Bay.
  - **Comms Orange** (#ff8a3d), Comms Bay.

### Tertiary
- **Telemetry Green** (#3ddc84): availability and "deployed" states only.

### Neutral
- **Void Black** (#000000): page and canvas clear color.
- **Hull White** (#e9edf2): primary text (17:1 on black).
- **Moonlight** (#c8cfd8): secondary text such as the legal lines and chips (12:1).
- **Instrument Gray** (#9aa4b1): muted copy and labels (7.9:1).
- **Dim Steel** (#7f8896): labels, metadata and quiet links (5.9:1). This is the floor, and nothing dimmer carries text.
- **Hairline** (rgba 255/255/255 at 0.10) and **Hairline Strong** (0.18): every border and divider.
- **Panel Glass** (rgba 12/14/20 at 0.84) and **Card Ink** (rgba 10/10/18 at 0.85): surfaces over the scene.

### Named Rules
**The Ignition Rule.** Orange marks the single live thing, whether that is the current deck or the focused control. It is never a fill for a surface, and never two competing marks on the same screen.

**The One Ramp Rule.** UI text uses the neutral ramp tokens (`--foreground`, `--soft`, `--muted`, `--faint`, or `text-soft` / `text-muted` / `text-faint` in Tailwind). No ad-hoc grays and no Tailwind `zinc-*`.

**The Deck Accent Rule.** A deck's accent lives in its 3D lighting. In the UI it appears once, as the panel's top bar and its deck number, and nowhere else.

## Typography

**Display Font:** Unbounded (with Arial Black, sans-serif)
**Body Font:** IBM Plex Mono (with ui-monospace, monospace)
**Label/Mono Font:** IBM Plex Mono

**Character:** Two voices, taken from the owner's reference (a heavy, wide, rounded-square logo over slab-serif mono copy). Unbounded Black is round, wide and loud: it names the ship, its decks and its crew. IBM Plex Mono writes the log. Its small slabs on i, l and r keep sentences readable, and it carries the labels and read-outs too, so the whole interface feels typed on the ship's terminal.

### Hierarchy
- **Display** (Unbounded 900, clamp(1.6rem, 3.1vw, 3rem) on desktop, up to 7.5vw on phones, 0.9, -0.02em, uppercase): the hero name only, the first name alone, with a soft ice-white glow.
- **Headline** (Unbounded 700, clamp(1.3rem, 1.9vw, 1.7rem), 1.1): panel titles; the boarding status uses the same voice.
- **Title** (Unbounded 700, 1.125rem, 1.375): card headings (GitHub Projects, Contact).
- **Body** (Plex Mono 400, clamp(0.95rem, 1.2vw, 1.1rem), 1.6): the hero tagline and panel lead copy, at up to 38rem.
- **Label** (Plex Mono 400, 11px, 0.18–0.22em, uppercase): the deck navigation, panel meta and card section labels.
- **Card Name** (Unbounded 900, 30px, uppercase): the About card's name.
- **Logo** (Unbounded 700, 14px, 0.3em): "QC-01" on the loader only. In 3D, the wall signs ("DECK 0N") and the hull decals ("QC-01", "CREW ACCESS") use Unbounded too.

### Named Rules
**The Two Voices Rule.** Unbounded names things: the hero name, headings, the logo, the 3D signs. IBM Plex Mono says everything else, from sentences to buttons, nav and read-outs. There is no third family.

**The 11px Floor.** No functional text is smaller than 11px, including tracked micro-labels, status pills and read-outs.

**The Width Budget.** Unbounded is about twice as wide as a regular sans. Size display text by the line it must fit (the hero name tops out at 3rem), never by habit, and check the narrowest phone.

## Layout

The page is six tall chapters (`<section data-chapter>`): hero 120vh, boarding 150vh, three decks at 250vh (230vh on phones) and contact at 160vh. The chapter heights set the pacing of the flight. Each chapter's content sticks to the viewport (`.sticky-screen`, 100svh) and fades with the chapter time.

- **Hero:** two blocks along the top, under the navigation, both with left-aligned lines. Top-left: the name, the focus line (Cybersecurity · AI) and the legal lines (// Copyright © 2026 / Quentin EI / All Rights Reserved.). Top-right: “////// Manifesto” (set at the size of the lines, only bolder) and the six-line manifesto (its line breaks are part of the copy). Where the ship comes close to the top-right corner (≤1220px wide up to 16:9, or any screen squarer than 7:5, phones included) the manifesto moves under the name block. There is no call-to-action button: scrolling is the action, invited by the scroll hint at the bottom centre (dropped on phones). On portrait screens the camera frames the ship right of centre so the text column stays clear. Corner shades and a bottom scrim keep the text legible.
- **Desktop:** panels sit on the left gutter (`clamp(1rem, 5.5vw, 6.5rem)`), vertically centered, leaving the right two-thirds to the 3D. The HUD is only the deck navigation, centred at the top.
- **Phones (≤767px):** panels are full width and anchored to the bottom, under the 3D. The deck navigation spreads across the top with 44px targets.
- **Short screens (≤560px tall):** landscape phones, small windows and 200% zoom. The chrome is reduced, and cards and panels scroll inside instead of being cut.
- Cards cap at 24rem (About), 30rem (Projects) and 31rem (Security panel).

## Elevation & Depth

Depth belongs to the 3D scene. UI surfaces are tinted glass over it (panel glass with `blur(18px) saturate(130%)`, card ink with `blur(12px)`). They are lifted by a single deep ambient shadow and a 1px inner top highlight. Nothing in the UI emits light.

### Shadow Vocabulary
- **Deep ambient** (`box-shadow: 0 30px 80px -24px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)`): the deck panels.
- **Title halo** (`text-shadow: 0 1px 14px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.6)`): any text set directly on the scene, for legibility rather than glow.
- **Hover ring** (`0 0 0 1px rgba(255,255,255,0.25)`, fading out): the bento card's hover acknowledgement.

### Named Rules
**The No-Halo Rule.** No colored zero-offset glows on dots, pips, bars or borders. A status dot is a flat dot. The one exception is the hero name: a soft lit sign in ice white (`text-shadow: 0 0 14px / 38px`, low alpha), at the owner's request.

**The Scrim Rule.** Text that must sit on bright scene areas, such as the planet limb, gets a dark gradient scrim or a tinted pill behind it, never a brighter color.

## Shapes

Controls are pills: chips and the buttons inside the cards. The navigation has no container at all. Surfaces step down in radius as they nest: panels at 20px, cards at 16px, rows inside cards at 12px, icon tiles at 10px. Borders are always 1px hairlines. The Security panel adds 14px corner brackets in its deck accent, its one ornament.

## Components

### Buttons
The page has no primary call to action: scrolling is the action, invited by the scroll hint. Buttons live inside the bento cards (the Contact card's email button, the GitHub card's Retry) and keep the live site's styling. Focus uses the global 2px orange ring at a 3px offset.

### Chips
- **Style:** white at 3% fill, hairline-strong border, Moonlight 12.5px text, pill radius. They are static tags and not interactive.

### Cards / Containers
- **Deck panel (instrument):** 20px radius, panel glass, hairline border, deep ambient shadow. A 2px accent bar sits on the top edge and accent corner brackets at 55%. The header row carries the deck id in mono.
- **Bento card (log entry):** 16px radius, card ink, hairline border, 20px inset, and a full-bleed pixel scene under a dark gradient. It scales to 1.012 on hover with a brief ring flash.
- **Repo row:** 12px radius, black at 45%, hairline border, which brightens on hover. Three lines: name with stars, a one-line description, then language and topics.

### Navigation
- **Deck navigation:** bare uppercase mono links (11px, 0.18em) centred at the top, with no bar, border or blur, so they melt into the decor. A soft top shade (black at 50% fading out) and a dark text halo keep them legible on the lit decks. Links are hull white at 72%; hover and the current deck are full white, and the current deck gets a 4px ignition-orange square under its name, with `aria-current="location"`. The links are real anchors (`#about`…). A plain click flies the camera and moves focus to the section.

### Opening reveal (signature)
The opening is the one authored moment, after igloo.inc, and it lives in 3D. As the loader fades, a sparse graph draws itself outwards from the ship: points at several depths joined to their two nearest neighbours by thin straight segments, with small numbers (32, 41, 54…) beside some points, mostly dim and a few bright (`three/IntroGraph.tsx`, its own render pass over the image). Meanwhile world positions are rebuilt from the depth buffer (`three/Reveal.tsx`). Ahead of the front the decor is a hologram on black: glowing outlines from depth and luminance edges, rim light and a faint fine mesh. At the front, voxel by voxel in a stair-stepped edge ordered by real distance from the ship, each surface lands as an ice-white flash that settles into the real image while its outlines linger; the sky comes up from black last, in square blocks. It takes 3.8s: the interface fades in as the decor settles and the graph fades out. Both passes sit before bloom so the lines glow, and switch off once done. Reduced motion skips it all.

### Bento pixel scenes (signature)
Hand-placed SVG pixel art (`shape-rendering: crispEdges`): the control room, the forest and the city. Their loops are CSS (`.px-twinkle`, `.px-rise`, `.px-ping`) so they cost nothing per frame. They pause while their card is faded out (`[data-idle]`) and stop under reduced motion.

## Do's and Don'ts

### Do:
- **Do** fade chapter content with `useScrollFade` (opacity plus lift), and keep faded text in the accessibility tree. Focus landing inside flies the camera there.
- **Do** keep every functional text at 11px or larger, and pick its color from the ramp tokens.
- **Do** use the global orange `:focus-visible` ring (2px, 3px offset) and keep 44px targets on touch.
- **Do** put a scrim or tinted pill behind text that crosses bright parts of the scene.
- **Do** give every loop a paused state (offscreen) and a reduced-motion state.
- **Do** keep the deck palette in one module (`components/decks.ts`), shared by the HUD and the 3D.

### Don't:
- **Don't** put an eyebrow or kicker above the hero title. The name carries the page.
- **Don't** add colored glows to UI marks, or light the interface brighter than the scene.
- **Don't** redraw or restyle the bento cards' pixel scenes, name block or missions list. They are pinned from the live site.
- **Don't** introduce grays outside the ramp, Tailwind `zinc-*`, or text under 11px.
- **Don't** repeat the same fact across layers (deck name on a tag, in the HUD and on the wall). One read-out per fact.
- **Don't** add fixed chrome over the scene (logo, progress rail, location read-out, bars): the deck navigation is the only fixed element.
- **Don't** block the page behind the loader: a timeout and a no-JS rule must always let the content through.
