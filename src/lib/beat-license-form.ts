/**
 * Shared FormData -> plain-object parsing for the beat-license create/update
 * routes, so the two routes can't drift out of sync on how each structured
 * field is decoded. Returns `undefined` for any field absent from the
 * FormData (meaning "not provided" — callers pass the result to a zod
 * schema where PATCH uses `.partial()` semantics and POST fills required
 * fields separately).
 */
export function parseLicenseFormFields(formData: FormData): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  const name = formData.get("name");
  if (name !== null) fields.name = name;

  const terms = formData.get("terms");
  if (terms !== null) fields.terms = terms;

  const otherRestrictions = formData.get("otherRestrictions");
  if (otherRestrictions !== null) fields.otherRestrictions = otherRestrictions;

  const creditText = formData.get("creditText");
  if (creditText !== null) fields.creditText = creditText;

  for (const key of [
    "isExclusive",
    "isActive",
    "commercialUse",
    "distributionAllowed",
    "musicVideoAllowed",
    "performanceAllowed",
    "socialMediaAllowed",
    "creditRequired",
  ] as const) {
    const raw = formData.get(key);
    if (raw !== null) fields[key] = raw === "true";
  }

  for (const key of ["streamLimit", "salesLimit"] as const) {
    const raw = formData.get(key);
    if (raw !== null) {
      if (typeof raw !== "string" || raw.trim() === "") {
        fields[key] = null; // explicitly cleared = unlimited
      } else {
        const n = Number(raw);
        fields[key] = Number.isFinite(n) ? Math.trunc(n) : null;
      }
    }
  }

  const formatsRaw = formData.get("includedFormats");
  if (formatsRaw !== null && typeof formatsRaw === "string") {
    try {
      const arr = JSON.parse(formatsRaw);
      fields.includedFormats = Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
    } catch {
      fields.includedFormats = [];
    }
  }

  return fields;
}
