"use client";

import { useState } from "react";
import { ApplyToCollaborateModal } from "@/components/collabs/ApplyToCollaborateModal";

export function ApplyButton({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glow-accent rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
      >
        Apply To Collaborate
      </button>
      {open && <ApplyToCollaborateModal postId={postId} onClose={() => setOpen(false)} />}
    </>
  );
}
