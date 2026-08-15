"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shares (or copies) the full shareable URL for `path` (e.g. a producer profile or beat page). Uses the native share sheet on devices that support it, otherwise copies to the clipboard. */
export function CopyLinkButton({
  path,
  label = "Copy link",
  shareTitle,
  className,
}: {
  path: string;
  label?: string;
  /** When set, tries navigator.share first (mobile share sheet) before falling back to clipboard copy. */
  shareTitle?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}${path}`;

    if (shareTitle && typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url });
        return;
      } catch (err) {
        // User cancelled the share sheet — do nothing, don't surprise them
        // with a clipboard copy they didn't ask for. Any other failure
        // falls through to the clipboard fallback below.
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — fall back to a
      // temporary, invisible textarea + the legacy copy command.
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } catch {
        // Give up silently — nothing more we can do.
      }
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-muted-2",
        className
      )}
    >
      {copied ? <Check size={14} className="text-success" /> : <Link2 size={14} />}
      {copied ? "Link copied" : label}
    </button>
  );
}
