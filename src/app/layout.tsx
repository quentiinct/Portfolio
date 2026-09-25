import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Without JavaScript the 3D scene never loads: don't leave the page behind the loader. */}
        <noscript>
          <style>{".loader{display:none}"}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
