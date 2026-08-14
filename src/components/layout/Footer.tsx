import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";

const LINKS = [
  { href: "/collabs", label: "Collabs" },
  { href: "/producers", label: "Producers" },
  { href: "/about", label: "About" },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-5 px-6 py-8 sm:flex-row">
        <Link href="/" className="flex items-center gap-2 text-muted">
          <BrandMark size={22} className="rounded-full" />
          <span className="font-display text-sm tracking-[0.08em]">
            <span className="text-foreground font-semibold">DIMENSION</span>
          </span>
        </Link>

        <nav className="flex items-center gap-5">
          {LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-muted transition hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="font-display text-[10px] uppercase tracking-[0.18em] text-muted-2">
          &copy; {new Date().getFullYear()} DIMENSION
        </p>
      </div>
    </footer>
  );
}
