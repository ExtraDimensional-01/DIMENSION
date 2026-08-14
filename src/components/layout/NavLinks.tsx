"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/collabs", label: "Collabs" },
  { href: "/producers", label: "Producers" },
  { href: "/about", label: "About" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-7 md:flex">
      {LINKS.map((link, i) => {
        const isActive = link.href === "/" ? pathname === "/" : pathname === link.href;
        return (
          <Link
            key={link.label + i}
            href={link.href}
            className={cn(
              "relative flex items-center gap-1.5 py-1 font-display text-xs font-semibold uppercase tracking-[0.14em] transition",
              isActive ? "text-foreground [text-shadow:0_0_14px_var(--accent-glow)]" : "text-muted hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "h-1 w-1 rotate-45 bg-accent transition-opacity",
                isActive ? "opacity-100 shadow-[0_0_6px_var(--accent-glow)]" : "opacity-0"
              )}
            />
            {link.label}
            <span
              className={cn(
                "absolute -bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 bg-accent shadow-[0_0_8px_var(--accent-glow)] transition-transform duration-200",
                isActive && "scale-x-100"
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
