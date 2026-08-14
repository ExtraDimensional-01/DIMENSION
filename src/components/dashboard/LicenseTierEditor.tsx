"use client";

import { useRef } from "react";
import { Music2, Plus, UploadCloud, X } from "lucide-react";
import { LICENSE_PRESETS, LICENSE_FORMAT_OPTIONS } from "@/lib/constants";
import { formatFileSize, cn } from "@/lib/utils";

export interface DraftLicense {
  tempId: string;
  name: string;
  price: string;
  terms: string;
  isExclusive: boolean;
  file: File | null;
  includedFormats: string[];
  commercialUse: boolean;
  distributionAllowed: boolean;
  musicVideoAllowed: boolean;
  performanceAllowed: boolean;
  socialMediaAllowed: boolean;
  streamLimit: string; // "" = unlimited
  salesLimit: string; // "" = unlimited
  creditRequired: boolean;
  creditText: string;
  otherRestrictions: string;
}

export function newDraftLicense(): DraftLicense {
  const preset = LICENSE_PRESETS[0];
  return {
    tempId: crypto.randomUUID(),
    name: preset.name,
    price: "",
    terms: preset.defaultTerms,
    isExclusive: false,
    file: null,
    includedFormats: [...preset.includedFormats],
    commercialUse: preset.commercialUse,
    distributionAllowed: preset.distributionAllowed,
    musicVideoAllowed: preset.musicVideoAllowed,
    performanceAllowed: preset.performanceAllowed,
    socialMediaAllowed: preset.socialMediaAllowed,
    streamLimit: preset.streamLimit != null ? String(preset.streamLimit) : "",
    salesLimit: preset.salesLimit != null ? String(preset.salesLimit) : "",
    creditRequired: preset.creditRequired,
    creditText: preset.creditText,
    otherRestrictions: "",
  };
}

export function LicenseTierEditor({
  licenses,
  onChange,
}: {
  licenses: DraftLicense[];
  onChange: (licenses: DraftLicense[]) => void;
}) {
  function update(tempId: string, patch: Partial<DraftLicense>) {
    onChange(licenses.map((l) => (l.tempId === tempId ? { ...l, ...patch } : l)));
  }

  function remove(tempId: string) {
    onChange(licenses.filter((l) => l.tempId !== tempId));
  }

  function add() {
    onChange([...licenses, newDraftLicense()]);
  }

  return (
    <div className="flex flex-col gap-4">
      {licenses.map((license) => (
        <LicenseRow
          key={license.tempId}
          license={license}
          onChange={(patch) => update(license.tempId, patch)}
          onRemove={() => remove(license.tempId)}
        />
      ))}

      <button
        type="button"
        onClick={add}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2.5 text-sm font-medium text-muted transition hover:border-muted-2 hover:text-foreground"
      >
        <Plus size={14} />
        Add license tier
      </button>
    </div>
  );
}

/** Shared body for both the "new tier" draft flow and the "existing tier" manage flow. */
export function LicenseFieldsBody({
  includedFormats,
  commercialUse,
  distributionAllowed,
  musicVideoAllowed,
  performanceAllowed,
  socialMediaAllowed,
  streamLimit,
  salesLimit,
  creditRequired,
  creditText,
  otherRestrictions,
  onChange,
}: {
  includedFormats: string[];
  commercialUse: boolean;
  distributionAllowed: boolean;
  musicVideoAllowed: boolean;
  performanceAllowed: boolean;
  socialMediaAllowed: boolean;
  streamLimit: string;
  salesLimit: string;
  creditRequired: boolean;
  creditText: string;
  otherRestrictions: string;
  onChange: (patch: {
    includedFormats?: string[];
    commercialUse?: boolean;
    distributionAllowed?: boolean;
    musicVideoAllowed?: boolean;
    performanceAllowed?: boolean;
    socialMediaAllowed?: boolean;
    streamLimit?: string;
    salesLimit?: string;
    creditRequired?: boolean;
    creditText?: string;
    otherRestrictions?: string;
  }) => void;
}) {
  function toggleFormat(format: string) {
    onChange({
      includedFormats: includedFormats.includes(format)
        ? includedFormats.filter((f) => f !== format)
        : [...includedFormats, format],
    });
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-foreground">Formats included</label>
        <div className="flex flex-wrap gap-1.5">
          {LICENSE_FORMAT_OPTIONS.map((format) => (
            <button
              key={format}
              type="button"
              onClick={() => toggleFormat(format)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                includedFormats.includes(format)
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-muted hover:border-muted-2"
              )}
            >
              {format}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-foreground">Permissions</label>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <PermissionToggle label="Commercial use" checked={commercialUse} onChange={(v) => onChange({ commercialUse: v })} />
          <PermissionToggle
            label="Distribution (streaming/digital)"
            checked={distributionAllowed}
            onChange={(v) => onChange({ distributionAllowed: v })}
          />
          <PermissionToggle
            label="Music video use"
            checked={musicVideoAllowed}
            onChange={(v) => onChange({ musicVideoAllowed: v })}
          />
          <PermissionToggle
            label="Live performance/broadcast"
            checked={performanceAllowed}
            onChange={(v) => onChange({ performanceAllowed: v })}
          />
          <PermissionToggle
            label="Social media/content use"
            checked={socialMediaAllowed}
            onChange={(v) => onChange({ socialMediaAllowed: v })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground">Stream limit</label>
          <input
            type="number"
            min={0}
            value={streamLimit}
            onChange={(e) => onChange({ streamLimit: e.target.value })}
            placeholder="Unlimited"
            className="input text-xs"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground">Sales/copies limit</label>
          <input
            type="number"
            min={0}
            value={salesLimit}
            onChange={(e) => onChange({ salesLimit: e.target.value })}
            placeholder="Unlimited"
            className="input text-xs"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={creditRequired}
            onChange={(e) => onChange({ creditRequired: e.target.checked })}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          Require producer credit
        </label>
        {creditRequired && (
          <input
            value={creditText}
            onChange={(e) => onChange({ creditText: e.target.value })}
            maxLength={300}
            placeholder='e.g. "Prod. by YourName"'
            className="input text-xs"
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-foreground">Other restrictions</label>
        <textarea
          value={otherRestrictions}
          onChange={(e) => onChange({ otherRestrictions: e.target.value })}
          maxLength={2000}
          rows={2}
          placeholder="Optional — anything else buyers should know"
          className="input resize-none text-xs"
        />
      </div>
    </>
  );
}

function PermissionToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-xs text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-border accent-accent"
      />
      {label}
    </label>
  );
}

function LicenseRow({
  license,
  onChange,
  onRemove,
}: {
  license: DraftLicense;
  onChange: (patch: Partial<DraftLicense>) => void;
  onRemove: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePresetSelect(presetName: string) {
    const preset = LICENSE_PRESETS.find((p) => p.name === presetName);
    if (!preset) {
      onChange({ name: presetName });
      return;
    }
    onChange({
      name: presetName,
      terms: preset.defaultTerms,
      includedFormats: [...preset.includedFormats],
      commercialUse: preset.commercialUse,
      distributionAllowed: preset.distributionAllowed,
      musicVideoAllowed: preset.musicVideoAllowed,
      performanceAllowed: preset.performanceAllowed,
      socialMediaAllowed: preset.socialMediaAllowed,
      streamLimit: preset.streamLimit != null ? String(preset.streamLimit) : "",
      salesLimit: preset.salesLimit != null ? String(preset.salesLimit) : "",
      creditRequired: preset.creditRequired,
      creditText: preset.creditText,
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-2">License tier</span>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-2 transition hover:text-danger"
          aria-label="Remove license tier"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground">Preset</label>
          <select
            value={LICENSE_PRESETS.some((p) => p.name === license.name) ? license.name : ""}
            onChange={(e) => handlePresetSelect(e.target.value)}
            className="input"
          >
            <option value="" disabled>
              Choose a starting point...
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
            placeholder="e.g. WAV Lease"
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
              placeholder="0.00"
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
          Exclusive rights (removes the beat from sale once purchased)
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-foreground">Usage terms summary</label>
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
        streamLimit={license.streamLimit}
        salesLimit={license.salesLimit}
        creditRequired={license.creditRequired}
        creditText={license.creditText}
        otherRestrictions={license.otherRestrictions}
        onChange={onChange}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-foreground">
          Deliverable file <span className="text-danger">*</span>
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-xs transition hover:border-muted-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.zip,audio/mpeg,audio/wav,audio/x-wav,application/zip"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onChange({ file: e.target.files[0] })}
          />
          {license.file ? (
            <>
              <Music2 size={14} className="shrink-0 text-accent" />
              <span className="truncate text-foreground">{license.file.name}</span>
              <span className="shrink-0 text-muted-2">{formatFileSize(license.file.size)}</span>
            </>
          ) : (
            <>
              <UploadCloud size={14} className="shrink-0 text-muted-2" />
              <span className="text-muted-2">Click to attach MP3, WAV, or ZIP</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
