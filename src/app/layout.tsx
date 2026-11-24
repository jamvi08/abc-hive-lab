import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Nav } from "@/components/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hive Lab · Artificial Bee Colony, step by step",
  description:
    "An interactive visualizer that teaches the Artificial Bee Colony (ABC) optimization algorithm: step through employed, onlooker and scout phases, quiz yourself, race ABC against random search, and check it against the textbook example.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Nav />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-hive-border px-6 py-4 text-xs text-hive-muted">
          Hive Lab · a teaching tool for the Artificial Bee Colony algorithm (Karaboga, 2005) · Next.js + TypeScript
        </footer>
      </body>
    </html>
  );
}
