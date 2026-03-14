// ═══════════════════════════════════════════════════════════════
// DONNÉES PARTAGÉES — utilisées dans page.tsx et clients/page.tsx
// Modifie ici pour mettre à jour les chaînes partout à la fois.
// ═══════════════════════════════════════════════════════════════

export type Channel = {
  id: string;
  name: string;
  channelUrl: string;   // URL complète de la chaîne YouTube
  since: string;        // Ex : "Janvier 2024"
  role: string;         // Ce que tu fais pour eux
  subsStart: string;    // Abonnés quand tu as commencé (ex : "45K")
  subsCurrent: string;  // Abonnés aujourd'hui (ex : "180K")
  growth: string;       // Croissance affichée (ex : "+300%")
  featuredVideo: {
    title: string;      // Titre de la vidéo mise en avant
    url: string;        // Lien complet YouTube
    videoId: string;    // Seulement l'ID (ex : "dQw4w9WgXcQ")
  };
};

export const CHANNELS: Channel[] = [
  {
    id: "azpaztv",
    name: "AzpazTV",
    channelUrl: "https://www.youtube.com/@AzpazTV",  // ← Vérifie l'URL exacte
    since: "November 2022",                                // ← Ex : "Janvier 2024"
    role: "YouTube editing with growth-oriented iteration",
    subsStart: "350K",                                // ← Abonnés au début
    subsCurrent: "750K",                              // ← Abonnés aujourd'hui
    growth: "+114%",                                   // ← (actuel - début) / début × 100
    featuredVideo: {
      title: "J'ai volé TOUS les Minerais de Mon Pote sur Minecraft !",       // ← Mets à jour
      url: "https://www.youtube.com/watch?v=vWD3lpeQonc&t",               // ← Lien YouTube complet
      videoId: "vWD3lpeQonc",                            // ← Remplace par l'ID réel
    },
  },
  {
    id: "meliow",
    name: "Meliow",
    channelUrl: "https://www.youtube.com/@meliow",
    since: "January 2026",
    role: "Short-form editing focused on maximizing retention.",
    subsStart: "60K",
    subsCurrent: "85K",
    growth: "+33%",
    featuredVideo: {
      title: "Combien de temps tu SURVIS ? 🤣",
      url: "https://www.youtube.com/shorts/IRhSmncLWOg",
      videoId: "IRhSmncLWOg",
    },
  },
  {
    id: "sigmaclub",
    name: "Sigma Club",
    channelUrl: "https://www.youtube.com/@SigmaClub_eth",
    since: "June 2023",
    role: "Long-form editing, pacing and motion support",
    subsStart: "7K",
    subsCurrent: "12K",
    growth: "+71%",
    featuredVideo: {
      title: "BITURE AU MONT BATUR LA PRESSION MONTE 🌋🍻",
      url: "https://www.youtube.com/watch?v=J_fsm8S6aEg",
      videoId: "J_fsm8S6aEg",
    },
  },
];
