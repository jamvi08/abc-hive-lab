"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BeeGlyph } from "./sim/glyphs";

const LINKS = [
  { href: "/", label: "Simulator" },
  { href: "/race", label: "ABC vs Random Race" },
  { href: "/verify", label: "Textbook Check" },
  { href: "/learn", label: "Learn ABC" },
];

export function Nav() {
  const path = usePathname();
  const norm = (p: string) => (p.length > 1 ? p.replace(/\/$/, "") : p);
  return (
    <header className="sticky top-0 z-30 border-b border-hive-border bg-hive-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center gap-6 px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          <svg width="30" height="30" viewBox="-15 -15 30 30" aria-hidden>
            <polygon points="0,-14 12,-7 12,7 0,14 -12,7 -12,-7" fill="#fbbf24" opacity="0.18" stroke="#fbbf24" strokeWidth="1.5" />
            <BeeGlyph role="employed" scale={0.8} />
          </svg>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">Hive Lab</div>
            <div className="text-[11px] text-hive-muted">Artificial Bee Colony, step by step</div>
          </div>
        </Link>
        <nav className="flex flex-wrap gap-1">
          {LINKS.map((l) => {
            const active = norm(path) === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  active ? "bg-hive-panel2 text-honey" : "text-hive-muted hover:text-hive-text"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
