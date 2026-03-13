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
    since: "??? 2024",                                // ← Ex : "Janvier 2024"
    role: "Montage & Motion Design",
    subsStart: "???K",                                // ← Abonnés au début
    subsCurrent: "???K",                              // ← Abonnés aujourd'hui
    growth: "+??%",                                   // ← (actuel - début) / début × 100
    featuredVideo: {
      title: "Titre de la vidéo mise en avant",       // ← Mets à jour
      url: "https://youtu.be/VIDEO_ID",               // ← Lien YouTube complet
      videoId: "VIDEO_ID",                            // ← Remplace par l'ID réel
    },
  },
  {
    id: "meliow",
    name: "Meliow",
    channelUrl: "https://www.youtube.com/@meliow",
    since: "??? 2024",
    role: "Montage & Direction Créative",
    subsStart: "???K",
    subsCurrent: "???K",
    growth: "+??%",
    featuredVideo: {
      title: "Titre de la vidéo mise en avant",
      url: "https://youtu.be/VIDEO_ID",
      videoId: "VIDEO_ID",
    },
  },
  {
    id: "sigmaclub",
    name: "Sigma Club",
    channelUrl: "https://www.youtube.com/@sigmaclub",
    since: "??? 2024",
    role: "Montage & Storytelling",
    subsStart: "???K",
    subsCurrent: "???K",
    growth: "+??%",
    featuredVideo: {
      title: "Titre de la vidéo mise en avant",
      url: "https://youtu.be/VIDEO_ID",
      videoId: "VIDEO_ID",
    },
  },
];
