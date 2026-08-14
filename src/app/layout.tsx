import type { Metadata } from "next";
import { Geist, Geist_Mono, Chakra_Petch } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ClickSound } from "@/components/providers/ClickSound";
import { PlayerProvider } from "@/components/player/PlayerContext";
import { PlayerBar } from "@/components/player/PlayerBar";
import { BackgroundMusicProvider } from "@/components/providers/BackgroundMusicContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "DIMENSION — Discover instrumental beats",
  description:
    "A platform for producers to upload instrumental beats and for artists to discover new sounds.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${chakraPetch.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SessionProvider>
          <ClickSound />
          <PlayerProvider>
            <BackgroundMusicProvider>
              <Navbar />
              <main className="flex-1 pb-24">{children}</main>
              <Footer />
              <PlayerBar />
            </BackgroundMusicProvider>
          </PlayerProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
