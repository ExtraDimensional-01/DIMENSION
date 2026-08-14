import fs from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from "pdf-lib";
import type { LicenseSnapshot } from "@/lib/license-snapshot";

export interface LicensePdfParams {
  orderNumber: string;
  beatTitle: string;
  producerName: string;
  buyerName: string;
  buyerEmail: string;
  purchaseDate: Date;
  priceCentsPaid: number;
  snapshot: LicenseSnapshot;
}

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const VALUE_COLUMN_X = MARGIN + 230;

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function formatLimit(n: number | null): string {
  return n == null ? "Unlimited" : n.toLocaleString();
}

async function loadLogo(doc: PDFDocument): Promise<PDFImage | null> {
  try {
    const bytes = await fs.readFile(path.join(process.cwd(), "public", "brand", "logo.png"));
    return await doc.embedPng(bytes);
  } catch {
    return null;
  }
}

export async function generateLicensePdf(params: LicensePdfParams): Promise<Uint8Array> {
  const { snapshot } = params;
  const doc = await PDFDocument.create();
  doc.setTitle(`${params.beatTitle} — ${snapshot.name} License Agreement`);
  doc.setProducer("DIMENSION");
  doc.setSubject("Instrumental License Agreement");

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await loadLogo(doc);

  const textColor = rgb(0.1, 0.1, 0.12);
  const mutedColor = rgb(0.42, 0.42, 0.47);
  const accentColor = rgb(0.42, 0.2, 0.85);
  const allowColor = rgb(0.11, 0.5, 0.24);
  const denyColor = rgb(0.7, 0.16, 0.16);
  const ruleColor = rgb(0.85, 0.85, 0.88);

  let page: PDFPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function newPage() {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  }

  function ensureSpace(lineHeight: number) {
    if (y - lineHeight < MARGIN) newPage();
  }

  function drawText(
    text: string,
    x: number,
    {
      font = regular,
      size = 10,
      color = textColor,
    }: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb> } = {}
  ) {
    page.drawText(text, { x, y, font, size, color });
  }

  function drawLine(
    text: string,
    { font = regular, size = 11, color = textColor, gap = 16 }: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; gap?: number } = {}
  ) {
    ensureSpace(gap);
    drawText(text, MARGIN, { font, size, color });
    y -= gap;
  }

  function drawParagraph(text: string, { font = regular, size = 10, color = textColor, lineGap = 14 }: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; lineGap?: number } = {}) {
    const lines = wrapText(text, font, size, CONTENT_WIDTH);
    for (const line of lines) {
      ensureSpace(lineGap);
      if (line) drawText(line, MARGIN, { font, size, color });
      y -= lineGap;
    }
  }

  function drawSectionHeading(text: string) {
    y -= 6;
    ensureSpace(22);
    drawText(text.toUpperCase(), MARGIN, { font: bold, size: 11.5, color: accentColor });
    y -= 20;
  }

  function drawRule(color = ruleColor) {
    ensureSpace(18);
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1, color });
    y -= 18;
  }

  function drawKeyValue(label: string, value: string, { valueColor = textColor }: { valueColor?: ReturnType<typeof rgb> } = {}) {
    ensureSpace(17);
    drawText(label, MARGIN, { font: regular, size: 10, color: mutedColor });
    const valueLines = wrapText(value, bold, 10.5, PAGE_WIDTH - MARGIN - VALUE_COLUMN_X);
    drawText(valueLines[0] ?? "", VALUE_COLUMN_X, { font: bold, size: 10.5, color: valueColor });
    y -= 17;
    for (const extra of valueLines.slice(1)) {
      ensureSpace(15);
      drawText(extra, VALUE_COLUMN_X, { font: bold, size: 10.5, color: valueColor });
      y -= 15;
    }
  }

  function drawPermissionRow(label: string, allowed: boolean) {
    drawKeyValue(label, allowed ? "Allowed" : "Not Allowed", { valueColor: allowed ? allowColor : denyColor });
  }

  // --- Header / branding ---
  if (logo) {
    const logoHeight = 30;
    const logoWidth = (logo.width / logo.height) * logoHeight;
    page.drawImage(logo, { x: MARGIN, y: y - logoHeight + 6, width: logoWidth, height: logoHeight });
    drawText("DIMENSION", MARGIN + logoWidth + 10, { font: bold, size: 18, color: textColor });
  } else {
    drawText("DIMENSION", MARGIN, { font: bold, size: 18, color: textColor });
  }
  y -= 34;
  drawLine("Instrumental License Agreement", { font: bold, size: 13, color: accentColor, gap: 20 });
  drawLine(`Order ${params.orderNumber} · Issued ${formatDate(params.purchaseDate)}`, {
    font: regular,
    size: 9,
    color: mutedColor,
    gap: 20,
  });
  drawRule(accentColor);

  // --- Parties & transaction ---
  drawSectionHeading("Transaction Details");
  drawKeyValue("Instrumental", params.beatTitle);
  drawKeyValue("License Tier", snapshot.name);
  drawKeyValue("Licensor (Producer)", params.producerName);
  drawKeyValue("Licensee (Buyer)", params.buyerName);
  drawKeyValue("Buyer Email", params.buyerEmail);
  drawKeyValue("Order Number", params.orderNumber);
  drawKeyValue("Payment Confirmed", formatDate(params.purchaseDate));
  drawKeyValue("Amount Paid", formatPrice(params.priceCentsPaid));
  drawKeyValue("License Type", snapshot.isExclusive ? "Exclusive" : "Non-Exclusive");

  y -= 4;
  drawRule();

  // --- Ownership ---
  drawSectionHeading("Ownership & Copyright");
  drawParagraph(
    snapshot.isExclusive
      ? `Full ownership and copyright of "${params.beatTitle}" transfer directly from the Licensor to the Licensee under this Exclusive license, effective upon the Licensor's confirmation that payment was received directly from the Licensee. Once confirmed, the Licensor may no longer license this instrumental to any other party. DIMENSION is a platform only — it does not own, sell, or hold any rights to this instrumental, and is not a party to this transfer.`
      : `The Licensor (${params.producerName}) retains full ownership and copyright of "${params.beatTitle}". This is a non-exclusive license: the Licensor may continue to license this instrumental to other parties under separate agreements. DIMENSION is a platform only — it does not own, and does not claim any ownership of, this instrumental. DIMENSION's role is limited to providing the platform and licensing infrastructure, recording this transaction, and generating this license document based on terms set by the Licensor and accepted by the Licensee.`,
    { lineGap: 14 }
  );

  y -= 4;
  drawRule();

  // --- Permissions & restrictions ---
  drawSectionHeading("Permissions & Restrictions");
  drawPermissionRow("Commercial Use", snapshot.commercialUse);
  drawPermissionRow("Distribution (streaming / digital platforms)", snapshot.distributionAllowed);
  drawPermissionRow("Music Video Use", snapshot.musicVideoAllowed);
  drawPermissionRow("Live Performance / Broadcast", snapshot.performanceAllowed);
  drawPermissionRow("Social Media / Content Use", snapshot.socialMediaAllowed);
  drawKeyValue("Stream Limit", formatLimit(snapshot.streamLimit));
  drawKeyValue("Sales/Copies Limit", formatLimit(snapshot.salesLimit));
  drawKeyValue(
    "Formats Included",
    snapshot.includedFormats.length > 0 ? snapshot.includedFormats.join(", ") : snapshot.fileFormat.toUpperCase()
  );

  y -= 4;
  drawRule();

  // --- Credit requirement ---
  drawSectionHeading("Producer Credit");
  drawParagraph(
    snapshot.creditRequired
      ? snapshot.creditText.trim() || "The Licensee must credit the producer when using this instrumental."
      : "No producer credit is required for this license.",
    { lineGap: 14 }
  );

  // --- Additional / other restrictions ---
  if (snapshot.otherRestrictions.trim()) {
    y -= 4;
    drawRule();
    drawSectionHeading("Additional Restrictions");
    drawParagraph(snapshot.otherRestrictions.trim(), { lineGap: 14 });
  }

  // --- Usage notes (legacy free-text terms) ---
  if (snapshot.terms.trim()) {
    y -= 4;
    drawRule();
    drawSectionHeading("Usage Notes");
    drawParagraph(snapshot.terms.trim(), { lineGap: 14 });
  }

  // --- Acceptance ---
  y -= 4;
  drawRule();
  drawSectionHeading("Acceptance");
  drawParagraph(
    `This license is granted directly by the Licensor to the Licensee — the Producer and the Buyer are the parties to this agreement. The Licensee reviewed and accepted the terms described above before this order was placed. The Licensor then confirmed that payment was received directly from the Licensee. DIMENSION recorded that confirmation and generated this document based on the terms set by the Licensor and accepted by the Licensee; DIMENSION is not a party to this license agreement.`,
    { lineGap: 14 }
  );
  y -= 10;
  ensureSpace(40);
  drawText(`Licensor: ${params.producerName}`, MARGIN, { font: bold, size: 10 });
  drawText(`Confirmed receipt of payment on ${formatDate(params.purchaseDate)} — recorded via DIMENSION`, MARGIN, {
    font: regular,
    size: 8.5,
    color: mutedColor,
  });
  y -= 28;
  ensureSpace(40);
  drawText(`Licensee: ${params.buyerName}`, MARGIN, { font: bold, size: 10 });
  drawText(`Accepted these license terms on ${formatDate(params.purchaseDate)} — recorded via DIMENSION`, MARGIN, {
    font: regular,
    size: 8.5,
    color: mutedColor,
  });
  y -= 20;

  y -= 10;
  drawRule();
  drawParagraph(
    "DIMENSION is not the seller or licensor of this instrumental, does not own or claim any rights to it, and does not process, hold, or transmit payment between the parties. The transaction and payment occur directly between the Producer (Licensor) and the Buyer (Licensee). DIMENSION's role is limited to providing the platform and licensing infrastructure: displaying the Licensor's license terms, recording the Licensor's confirmation that payment was received directly from the Licensee, and generating this document as a permanent record of the terms the Licensee accepted. This document reflects those terms exactly as they existed at the time of that confirmation; it does not change if the Licensor later edits their license offering. Any dispute concerning the license, payment, ownership, or use of this instrumental is between the Licensor and the Licensee.",
    { font: regular, size: 8, color: mutedColor, lineGap: 11 }
  );

  return doc.save();
}
