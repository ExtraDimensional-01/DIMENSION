"use client";

import { useState } from "react";
import { InviteToCollaborateModal } from "@/components/collabs/InviteToCollaborateModal";

export function InviteButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glow-accent rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
      >
        Invite To Collaborate
      </button>
      {open && <InviteToCollaborateModal inviteeId={userId} onClose={() => setOpen(false)} />}
    </>
  );
}
