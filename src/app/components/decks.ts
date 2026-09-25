// ═══════════════════════════════════════════════════════════════
// DECKS — one entry per floor of the ship, shared by the HTML layer
// (HUD, panels) and the 3D scene (signs, light strips). Kept free of
// three.js so the UI bundle doesn't pull it in.
// ═══════════════════════════════════════════════════════════════

export const DECKS = [
  { id: "about", n: "01", nav: "About", label: "Crew Quarters", accent: "#ffb45e", light: "#ffe2bf" },
  { id: "security", n: "02", nav: "Security", label: "Security Ops", accent: "#ff3348", light: "#d8e6ff" },
  { id: "projects", n: "03", nav: "Projects", label: "Engineering Bay", accent: "#4d9dff", light: "#e6efff" },
  { id: "contact", n: "04", nav: "Contact", label: "Comms Bay", accent: "#ff8a3d", light: "#ffe9d2" },
] as const;

/** Chapter index of a deck (chapters 0 and 1 are open space and the airlock). */
export const deckChapter = (deck: number) => deck + 2;
