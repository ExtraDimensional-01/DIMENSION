"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { PurchaseModal } from "@/components/beats/PurchaseModal";
import type { BeatLicenseInfo } from "@/types";

export function BuyButton({ license, producerId }: { license: BeatLicenseInfo; producerId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glow-accent flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground transition hover:bg-accent-hover"
      >
        <ShoppingCart size={13} />
        Buy
      </button>
      {open && <PurchaseModal license={license} producerId={producerId} onClose={() => setOpen(false)} />}
    </>
  );
}
