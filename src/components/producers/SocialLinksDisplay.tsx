import { Globe } from "lucide-react";
import type { SocialPlatform } from "@/lib/constants";

export interface SocialLinkInfo {
  platform: SocialPlatform;
  url: string;
  displayName: string;
}

// lucide-react (the only icon library already in this project) doesn't ship
// brand/logo icons — rather than pulling in a second icon package for this,
// each platform gets a small monogram badge in DIMENSION's own visual
// language instead of a literal (and trademarked) logo mark.
const PLATFORM_MONOGRAM: Record<SocialPlatform, string> = {
  instagram: "IG",
  tiktok: "TT",
  youtube: "YT",
  twitter: "X",
  soundcloud: "SC",
  spotify: "SP",
  twitch: "TW",
  discord: "DC",
  website: "",
};

export function SocialLinksDisplay({ links, className }: { links: SocialLinkInfo[]; className?: string }) {
  if (links.length === 0) return null;

  return (
    <div className={className ?? "flex flex-wrap gap-2"}>
      {links.map((link) => (
        <a
          key={link.platform}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          title={link.displayName || link.url}
          aria-label={`${link.platform}${link.displayName ? `: ${link.displayName}` : ""}`}
          className="corner-frame flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-[10px] font-bold tracking-wide text-muted transition hover:border-accent/50 hover:text-accent hover:shadow-[0_0_16px_-4px_var(--accent-glow)]"
        >
          {link.platform === "website" ? <Globe size={15} /> : PLATFORM_MONOGRAM[link.platform]}
        </a>
      ))}
    </div>
  );
}
