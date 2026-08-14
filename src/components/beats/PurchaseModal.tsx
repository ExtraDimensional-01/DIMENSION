"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import { PAYMENT_METHODS } from "@/lib/constants";
import { cn, formatFileSize, formatPrice } from "@/lib/utils";
import type { BeatLicenseInfo } from "@/types";

function formatLimit(n: number | null): string {
  return n == null ? "Unlimited" : n.toLocaleString();
}

function PermissionRow({ label, allowed }: { label: string; allowed: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <span className="text-muted">{label}</span>
      <span className={allowed ? "font-medium text-success" : "font-medium text-danger"}>
        {allowed ? "Allowed" : "Not Allowed"}
      </span>
    </div>
  );
}

export function PurchaseModal({
  license,
  producerId,
  onClose,
}: {
  license: BeatLicenseInfo;
  producerId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"terms" | "payment">("terms");
  const [agreed, setAgreed] = useState(false);
  const [method, setMethod] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!method) {
      setError("Choose a payment method");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseId: license.id, paymentMethod: method }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to start this order");
        setSubmitting(false);
        return;
      }
      router.push(`/messages/${producerId}`);
    } catch {
      setError("Something went wrong. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="animate-fade-in flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            {step === "payment" && (
              <button
                onClick={() => setStep("terms")}
                className="text-muted-2 hover:text-foreground"
                aria-label="Back"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h3 className="text-base font-semibold text-foreground">
              {step === "terms" ? "License terms" : "How will you pay?"}
            </h3>
          </div>
          <button onClick={onClose} className="text-muted-2 hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {step === "terms" ? (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{license.name}</p>
                  {license.isExclusive && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                      Exclusive
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-accent">{formatPrice(license.priceCents)}</span>
              </div>

              {license.terms && (
                <p className="mb-4 text-xs leading-relaxed text-muted">{license.terms}</p>
              )}

              <div className="rounded-lg border border-border p-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-2">
                  Formats included
                </p>
                <p className="mb-3 text-xs text-foreground">
                  {license.includedFormats.length > 0
                    ? license.includedFormats.join(", ")
                    : license.fileFormat.toUpperCase()}
                  <span className="ml-1 text-muted-2">({formatFileSize(license.fileSize)})</span>
                </p>

                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-2">
                  Permissions
                </p>
                <div className="mb-3 divide-y divide-border/60">
                  <PermissionRow label="Commercial use" allowed={license.commercialUse} />
                  <PermissionRow label="Distribution (streaming/digital)" allowed={license.distributionAllowed} />
                  <PermissionRow label="Music video use" allowed={license.musicVideoAllowed} />
                  <PermissionRow label="Live performance/broadcast" allowed={license.performanceAllowed} />
                  <PermissionRow label="Social media/content use" allowed={license.socialMediaAllowed} />
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-2">Stream limit</p>
                    <p className="text-xs text-foreground">{formatLimit(license.streamLimit)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-2">Sales limit</p>
                    <p className="text-xs text-foreground">{formatLimit(license.salesLimit)}</p>
                  </div>
                </div>

                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-2">Producer credit</p>
                <p className="mb-3 text-xs text-foreground">
                  {license.creditRequired
                    ? license.creditText.trim() || "Required — credit the producer when using this instrumental."
                    : "Not required"}
                </p>

                {license.otherRestrictions.trim() && (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-2">
                      Additional restrictions
                    </p>
                    <p className="text-xs text-foreground">{license.otherRestrictions}</p>
                  </>
                )}
              </div>

              <label className="mt-4 flex items-start gap-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-border accent-accent"
                />
                I have read and agree to the license terms above. A permanent copy of these exact terms
                will be attached to my order and license PDF.
              </label>
            </div>

            <div className="border-t border-border px-6 py-4">
              <button
                onClick={() => setStep("payment")}
                disabled={!agreed}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-40"
              >
                <Check size={15} />
                Continue to payment
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <p className="mb-4 text-sm text-muted">
                Choose how you&apos;ll send payment for the &ldquo;{license.name}&rdquo; license (
                {formatPrice(license.priceCents)}). This starts a message with the producer so you can
                coordinate — DIMENSION doesn&apos;t process the payment itself.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-sm font-medium transition",
                      method === m
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border text-foreground hover:border-muted-2"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {error && (
                <p className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              )}
            </div>

            <div className="border-t border-border px-6 py-4">
              <button
                onClick={submit}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
              >
                {submitting && <Loader2 size={15} className="animate-spin" />}
                Message the producer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
