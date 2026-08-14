/**
 * A permanent, immutable copy of a BeatLicense's full terms at the moment an
 * Order was placed. Stored as JSON on Order.licenseSnapshot. If the producer
 * edits the live BeatLicense afterward (price, permissions, terms, etc.),
 * this snapshot — and therefore the buyer's PDF/receipt — must never change.
 */
export interface LicenseSnapshot {
  name: string;
  priceCents: number;
  isExclusive: boolean;
  includedFormats: string[];
  commercialUse: boolean;
  distributionAllowed: boolean;
  musicVideoAllowed: boolean;
  performanceAllowed: boolean;
  socialMediaAllowed: boolean;
  streamLimit: number | null;
  salesLimit: number | null;
  creditRequired: boolean;
  creditText: string;
  terms: string;
  otherRestrictions: string;
  fileFormat: string;
}

type BeatLicenseLike = {
  name: string;
  priceCents: number;
  isExclusive: boolean;
  includedFormats: string;
  commercialUse: boolean;
  distributionAllowed: boolean;
  musicVideoAllowed: boolean;
  performanceAllowed: boolean;
  socialMediaAllowed: boolean;
  streamLimit: number | null;
  salesLimit: number | null;
  creditRequired: boolean;
  creditText: string;
  terms: string;
  otherRestrictions: string;
  fileFormat: string;
};

function parseFormats(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((f) => typeof f === "string") : [];
  } catch {
    return [];
  }
}

/** Serializes a BeatLicense row's current terms into a JSON string ready for Order.licenseSnapshot. */
export function buildLicenseSnapshot(license: BeatLicenseLike): string {
  const snapshot: LicenseSnapshot = {
    name: license.name,
    priceCents: license.priceCents,
    isExclusive: license.isExclusive,
    includedFormats: parseFormats(license.includedFormats),
    commercialUse: license.commercialUse,
    distributionAllowed: license.distributionAllowed,
    musicVideoAllowed: license.musicVideoAllowed,
    performanceAllowed: license.performanceAllowed,
    socialMediaAllowed: license.socialMediaAllowed,
    streamLimit: license.streamLimit,
    salesLimit: license.salesLimit,
    creditRequired: license.creditRequired,
    creditText: license.creditText,
    terms: license.terms,
    otherRestrictions: license.otherRestrictions,
    fileFormat: license.fileFormat,
  };
  return JSON.stringify(snapshot);
}

const FALLBACK_SNAPSHOT: LicenseSnapshot = {
  name: "License",
  priceCents: 0,
  isExclusive: false,
  includedFormats: [],
  commercialUse: true,
  distributionAllowed: true,
  musicVideoAllowed: true,
  performanceAllowed: true,
  socialMediaAllowed: true,
  streamLimit: null,
  salesLimit: null,
  creditRequired: false,
  creditText: "",
  terms: "",
  otherRestrictions: "",
  fileFormat: "",
};

/** Parses Order.licenseSnapshot back into a typed object. Never throws — falls back to safe defaults on malformed data. */
export function parseLicenseSnapshot(json: string): LicenseSnapshot {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null) return FALLBACK_SNAPSHOT;
    return { ...FALLBACK_SNAPSHOT, ...parsed };
  } catch {
    return FALLBACK_SNAPSHOT;
  }
}
