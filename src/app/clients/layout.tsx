import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clients — Quentin Courtade",
  description:
    "YouTube channels I work with — AzpazTV (750K), Meliow (85K), Sigma Club (12K). Growth editing & creative direction.",
  openGraph: {
    title: "Clients — Quentin Courtade",
    description:
      "YouTube channels I work with — AzpazTV (750K), Meliow (85K), Sigma Club (12K).",
    url: "https://quentincourtade.com/clients",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
