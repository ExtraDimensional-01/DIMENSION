import { fileUrl } from "@/lib/storage";
import { parseLicenseSnapshot } from "@/lib/license-snapshot";
import type { BeatDetail, BeatSummary, OrderListItem } from "@/types";

type BeatLicenseRow = {
  id: string;
  name: string;
  priceCents: number;
  terms: string;
  fileFormat: string;
  fileSize: number;
  isExclusive: boolean;
  isActive: boolean;
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
  otherRestrictions: string;
};

type BeatWithRelations = {
  id: string;
  title: string;
  bpm: number;
  key: string;
  genre: string;
  mood: string | null;
  description: string;
  audioKey: string;
  audioFormat: string;
  audioSize: number;
  coverKey: string | null;
  durationSec: number | null;
  waveformPeaks: string | null;
  playCount: number;
  isPublic: boolean;
  exclusiveSoldAt: Date | null;
  createdAt: Date;
  producerId: string;
  producer: { id: string; producerName: string; profileImage: string | null };
  tags: { tag: { name: string } }[];
  licenses: BeatLicenseRow[];
};

function parseWaveform(raw: string | null): number[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseFormats(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((f) => typeof f === "string") : [];
  } catch {
    return [];
  }
}

/**
 * `viewerIsOwner` controls whether disabled (isActive: false) tiers are
 * included — buyers browsing publicly should never see a tier the producer
 * turned off, but the producer's own edit/management views need to see and
 * re-enable them.
 */
export function serializeBeat(
  beat: BeatWithRelations,
  unlockedForViewer = false,
  viewerIsOwner = false
): BeatDetail {
  const visibleLicenseRows = viewerIsOwner ? beat.licenses : beat.licenses.filter((l) => l.isActive);
  const licenses = visibleLicenseRows.map((l) => serializeBeatLicense(l));
  const activeLicenses = licenses.filter((l) => l.isActive);

  return {
    id: beat.id,
    title: beat.title,
    bpm: beat.bpm,
    key: beat.key,
    genre: beat.genre,
    mood: beat.mood,
    description: beat.description,
    tags: beat.tags.map((t) => t.tag.name),
    audioUrl: fileUrl(beat.audioKey)!,
    audioFormat: beat.audioFormat,
    audioSize: beat.audioSize,
    coverUrl: fileUrl(beat.coverKey),
    durationSec: beat.durationSec,
    waveformPeaks: parseWaveform(beat.waveformPeaks),
    playCount: beat.playCount,
    isPublic: beat.isPublic,
    licenses,
    startingPriceCents:
      activeLicenses.length > 0 ? Math.min(...activeLicenses.map((l) => l.priceCents)) : null,
    exclusiveSoldAt: beat.exclusiveSoldAt ? beat.exclusiveSoldAt.toISOString() : null,
    unlockedForViewer,
    createdAt: beat.createdAt.toISOString(),
    producer: {
      id: beat.producer.id,
      producerName: beat.producer.producerName,
      profileImageUrl: fileUrl(beat.producer.profileImage),
    },
  };
}

export function serializeBeatSummary(
  beat: BeatWithRelations,
  unlockedForViewer = false,
  viewerIsOwner = false
): BeatSummary {
  const { description: _description, ...summary } = serializeBeat(beat, unlockedForViewer, viewerIsOwner);
  return summary;
}

type OrderWithRelations = {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  priceCents: number;
  licenseSnapshot: string;
  createdAt: Date;
  confirmedAt: Date | null;
  beatId: string;
  licenseId: string;
  buyerId: string;
  sellerId: string;
  beat: { title: string; coverKey: string | null };
  buyer: { id: string; producerName: string; profileImage: string | null };
  seller: { id: string; producerName: string; profileImage: string | null };
};

/** Used by the buyer orders page and producer sales dashboard — reads the license name from the immutable snapshot, never the live BeatLicense row. */
export function serializeOrderListItem(order: OrderWithRelations): OrderListItem {
  const snapshot = parseLicenseSnapshot(order.licenseSnapshot);
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    priceCents: order.priceCents,
    createdAt: order.createdAt.toISOString(),
    confirmedAt: order.confirmedAt ? order.confirmedAt.toISOString() : null,
    beatId: order.beatId,
    beatTitle: order.beat.title,
    licenseId: order.licenseId,
    licenseName: snapshot.name,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    beatCoverUrl: fileUrl(order.beat.coverKey),
    buyer: {
      id: order.buyer.id,
      producerName: order.buyer.producerName,
      profileImageUrl: fileUrl(order.buyer.profileImage),
    },
    seller: {
      id: order.seller.id,
      producerName: order.seller.producerName,
      profileImageUrl: fileUrl(order.seller.profileImage),
    },
  };
}

export function serializeBeatLicense(license: BeatLicenseRow) {
  return {
    id: license.id,
    name: license.name,
    priceCents: license.priceCents,
    terms: license.terms,
    fileFormat: license.fileFormat,
    fileSize: license.fileSize,
    isExclusive: license.isExclusive,
    isActive: license.isActive,
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
    otherRestrictions: license.otherRestrictions,
  };
}
