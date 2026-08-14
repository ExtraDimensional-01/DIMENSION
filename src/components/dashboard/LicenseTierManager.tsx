"use client";

import { useRef, useState } from "react";
import { Loader2, Music2, Trash2 } from "lucide-react";
import { LICENSE_PRESETS } from "@/lib/constants";
import { formatFileSize } from "@/lib/utils";
import {
  LicenseTierEditor,
  LicenseFieldsBody,
  newDraftLicense,
  type DraftLicense,
} from "@/components/dashboard/LicenseTierEditor";
import type { BeatLicenseInfo } from "@/types";

interface EditableLicense extends BeatLicenseInfo {
  price: string;
  streamLimitStr: string;
  salesLimitStr: string;
  newFile: File | null;
  saving: boolean;
  deleting: boolean;
  error: string | null;
}

function toEditable(l: BeatLicenseInfo): EditableLicense {
  return {
    ...l,
    price: (l.priceCents / 100).toFixed(2),
    streamLimitStr: l.streamLimit != null ? String(l.streamLimit) : "",
    salesLimitStr: l.salesLimit != null ? String(l.salesLimit) : "",
    newFile: null,
    saving: false,
    deleting: false,
    error: null,
  };
}

function appendLicenseFields(
  formData: FormData,
  fields: {
    includedFormats: string[];
    commercialUse: boolean;
    distributionAllowed: boolean;
    musicVideoAllowed: boolean;
    performanceAllowed: boolean;
    socialMediaAllowed: boolean;
    streamLimitStr: string;
    salesLimitStr: string;
    creditRequired: boolean;
    creditText: string;
    otherRestrictions: string;
  }
) {
  formData.set("includedFormats", JSON.stringify(fields.includedFormats));
  formData.set("commercialUse", String(fields.commercialUse));
  formData.set("distributionAllowed", String(fields.distributionAllowed));
  formData.set("musicVideoAllowed", String(fields.musicVideoAllowed));
  formData.set("performanceAllowed", String(fields.performanceAllowed));
  formData.set("socialMediaAllowed", String(fields.socialMediaAllowed));
  formData.set("streamLimit", fields.streamLimitStr.trim());
  formData.set("salesLimit", fields.salesLimitStr.trim());
  formData.set("creditRequired", String(fields.creditRequired));
  formData.set("creditText", fields.creditText.trim());
  formData.set("otherRestrictions", fields.otherRestrictions.trim());
}

export function LicenseTierManager({
  beatId,
  initialLicenses,
  exclusiveSoldAt,
}: {
  beatId: string;
  initialLicenses: BeatLicenseInfo[];
  exclusiveSoldAt: string | null;
}) {
  const [licenses, setLicenses] = useState<EditableLicense[]>(initialLicenses.map(toEditable));
  const [draft, setDraft] = useState<DraftLicense[]>([]);
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  function patch(id: string, changes: Partial<EditableLicense>) {
    setLicenses((prev) => prev.map((l) => (l.id === id ? { ...l, ...changes } : l)));
  }

  async function saveLicense(license: EditableLicense) {
    if (!license.name.trim()) {
      patch(license.id, { error: "Name is required" });
      return;
    }
    if (!license.price.trim() || Number.isNaN(Number(license.price)) || Number(license.price) < 0) {
      patch(license.id, { error: "Enter a valid price" });
      return;
    }
    patch(license.id, { saving: true, error: null });

    const formData = new FormData();
    formData.set("name", license.name.trim());
    formData.set("price", license.price.trim());
    formData.set("terms", license.terms.trim());
    formData.set("isExclusive", String(license.isExclusive));
    formData.set("isActive", String(license.isActive));
    appendLicenseFields(formData, license);
    if (license.newFile) formData.set("file", license.newFile);

    try {
      const res = await fetch(`/api/beat-licenses/${license.id}`, { method: "PATCH", body: formData });
      const data = await res.json();
      if (!res.ok) {
        patch(license.id, { saving: false, error: data.error ?? "Failed to save" });
        return;
      }
      patch(license.id, {
        saving: false,
        error: null,
        newFile: null,
        fileFormat: data.license.fileFormat,
        fileSize: data.license.fileSize,
        priceCents: data.license.priceCents,
      });
    } catch {
      patch(license.id, { saving: false, error: "Something went wrong. Try again." });
    }
  }

  async function deleteLicense(id: string) {
    patch(id, { deleting: true, error: null });
    try {
      const res = await fetch(`/api/beat-licenses/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        patch(id, { deleting: false, error: data.error ?? "Failed to delete" });
        return;
      }
      setLicenses((prev) => prev.filter((l) => l.id !== id));
    } catch {
      patch(id, { deleting: false, error: "Something went wrong. Try again." });
    }
  }

  async function addLicense() {
    const pending = draft[0];
    if (!pending) return;
    if (!pending.name.trim()) {
      setAddError("Name is required");
      return;
    }
    if (!pending.price.trim() || Number.isNaN(Number(pending.price)) || Number(pending.price) < 0) {
      setAddError("Enter a valid price");
      return;
    }
    if (!pending.file) {
      setAddError("Attach a deliverable file");
      return;
    }
    setAddError(null);
    setAdding(true);

    const formData = new FormData();
    formData.set("beatId", beatId);
    formData.set("name", pending.name.trim());
    formData.set("price", pending.price.trim());
    formData.set("terms", pending.terms.trim());
    formData.set("isExclusive", String(pending.isExclusive));
    formData.set("file", pending.file);
    appendLicenseFields(formData, {
      ...pending,
      streamLimitStr: pending.streamLimit,
      salesLimitStr: pending.salesLimit,
    });

    try {
      const res = await fetch("/api/beat-licenses", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error ?? "Failed to add license");
        setAdding(false);
        return;
      }
      setLicenses((prev) => [...prev, toEditable(data.license)]);
      setDraft([]);
      setAdding(false);
    } catch {
      setAddError("Something went wrong. Try again.");
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {exclusiveSoldAt && (
        <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
          Exclusive rights to this beat have been sold — it can no longer be purchased under any tier.
        </p>
      )}

      {licenses.map((license) => (
        <ExistingLicenseRow
          key={license.id}
          license={license}
          onChange={(changes) => patch(license.id, changes)}
          onSave={() => saveLicense(license)}
          onDelete={() => deleteLicense(license.id)}
        />
      ))}

      {!exclusiveSoldAt && (
        <div className="rounded-xl border border-dashed border-border p-4">
          {draft.length === 0 ? (
            <button
              type="button"
              onClick={() => setDraft([newDraftLicense()])}
              className="text-sm font-medium text-accent hover:text-accent-hover"
            >
              + Add license tier
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <LicenseTierEditor licenses={draft} onChange={setDraft} />
              {addError && <p className="text-xs text-danger">{addError}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addLicense}
                  disabled={adding}
                  className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
                >
                  {adding && <Loader2 size={12} className="animate-spin" />}
                  Add tier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft([]);
                    setAddError(null);
                  }}
                  className="text-xs text-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExistingLicenseRow({
  license,
  onChange,
  onSave,
  onDelete,
}: {
  license: EditableLicense;
  onChange: (changes: Partial<EditableLicense>) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            license.isActive ? "bg-accent/15 text-accent" : "bg-muted-2/15 text-muted-2"
          }`}
        >
          {license.isActive ? "Active" : "Disabled"}
        </span>
        <label className="flex items-center gap-2 text-xs text-foreground">
          <input
            type="checkbox"
            checked={license.isActive}
            onChange={(e) => onChange({ isActive: e.target.checked })}
            className="h-3.5 w-3.5 rounded border-border accent-accent"
          />
          Available for purchase
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground">Preset</label>
          <select
            value={LICENSE_PRESETS.some((p) => p.name === license.name) ? license.name : ""}
            onChange={(e) => {
              const preset = LICENSE_PRESETS.find((p) => p.name === e.target.value);
              if (!preset) {
                onChange({ name: e.target.value });
                return;
              }
              onChange({
                name: e.target.value,
                terms: preset.defaultTerms,
                includedFormats: [...preset.includedFormats],
                commercialUse: preset.commercialUse,
                distributionAllowed: preset.distributionAllowed,
                musicVideoAllowed: preset.musicVideoAllowed,
                performanceAllowed: preset.performanceAllowed,
                socialMediaAllowed: preset.socialMediaAllowed,
                streamLimitStr: preset.streamLimit != null ? String(preset.streamLimit) : "",
                salesLimitStr: preset.salesLimit != null ? String(preset.salesLimit) : "",
                creditRequired: preset.creditRequired,
                creditText: preset.creditText,
              });
            }}
            className="input"
          >
            <option value="" disabled={LICENSE_PRESETS.some((p) => p.name === license.name)}>
              Custom
            </option>
            {LICENSE_PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground">Name</label>
          <input
            value={license.name}
            onChange={(e) => onChange({ name: e.target.value })}
            maxLength={60}
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground">Price</label>
          <div className="input flex items-center gap-1.5 py-2.5">
            <span className="text-muted-2">$</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={license.price}
              onChange={(e) => onChange({ price: e.target.value })}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-2 focus:outline-none"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-foreground">
          <input
            type="checkbox"
            checked={license.isExclusive}
            onChange={(e) => onChange({ isExclusive: e.target.checked })}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          Exclusive rights
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-foreground">Usage terms</label>
        <textarea
          value={license.terms}
          onChange={(e) => onChange({ terms: e.target.value })}
          maxLength={2000}
          rows={3}
          className="input resize-none text-xs"
        />
      </div>

      <div className="h-px bg-border" />

      <LicenseFieldsBody
        includedFormats={license.includedFormats}
        commercialUse={license.commercialUse}
        distributionAllowed={license.distributionAllowed}
        musicVideoAllowed={license.musicVideoAllowed}
        performanceAllowed={license.performanceAllowed}
        socialMediaAllowed={license.socialMediaAllowed}
        streamLimit={license.streamLimitStr}
        salesLimit={license.salesLimitStr}
        creditRequired={license.creditRequired}
        creditText={license.creditText}
        otherRestrictions={license.otherRestrictions}
        onChange={({ streamLimit, salesLimit, ...rest }) =>
          onChange({
            ...rest,
            ...(streamLimit !== undefined ? { streamLimitStr: streamLimit } : {}),
            ...(salesLimit !== undefined ? { salesLimitStr: salesLimit } : {}),
          })
        }
      />

      <div className="flex items-center gap-2 text-xs">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 transition hover:border-muted-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.zip,audio/mpeg,audio/wav,audio/x-wav,application/zip"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onChange({ newFile: e.target.files[0] })}
          />
          <Music2 size={14} className="shrink-0 text-muted-2" />
          {license.newFile ? (
            <span className="truncate text-foreground">
              Replacing with: {license.newFile.name} ({formatFileSize(license.newFile.size)})
            </span>
          ) : (
            <span className="truncate text-muted-2">
              Current file: {license.fileFormat.toUpperCase()} · {formatFileSize(license.fileSize)} — click to
              replace
            </span>
          )}
        </div>
      </div>

      {license.error && <p className="text-xs text-danger">{license.error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={license.saving || license.deleting}
          className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
        >
          {license.saving && <Loader2 size={12} className="animate-spin" />}
          Save
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={license.saving || license.deleting}
          className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground transition hover:border-danger/40 hover:text-danger disabled:opacity-60"
        >
          {license.deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          Delete
        </button>
      </div>
    </div>
  );
}
