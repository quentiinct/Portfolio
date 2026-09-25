import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Unbounded } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";

// Two voices: Unbounded (variable, 200–900) for names and headings, IBM Plex Mono for everything else.
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// One line for search results and link previews: what the home page shows first, then the editing work.
const DESCRIPTION =
  "Full-stack developer building AI tools and secure systems for real-world use, and video editor for YouTube creators from 7K to 750K subs.";

export const metadata: Metadata = {
  metadataBase: new URL("https://quentincourtade.com"),
  icons: { icon: "/favicon.svg" },
  title: "Quentin Courtade · Developer & Editor",
  description: DESCRIPTION,
  openGraph: {
    title: "Quentin Courtade · Developer & Editor",
    description: DESCRIPTION,
    url: "https://quentincourtade.com",
    siteName: "Quentin Courtade",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quentin Courtade · Developer & Editor",
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Font variables on <html> so :root tokens (--display, --mono) can reference them.
    <html lang="en" className={`${unbounded.variable} ${plexMono.variable}`}>
      <body className="antialiased">
        {/* Without JavaScript the 3D scene never loads: don't leave the page behind the loader. */}
        <noscript>
          <style>{".loader{display:none}"}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
