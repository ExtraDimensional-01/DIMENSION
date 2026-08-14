import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Download, FileText, Music2, ReceiptText } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeOrderListItem } from "@/lib/serialize";
import { formatPrice } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Your orders — DIMENSION" };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted-2/15 text-muted-2",
  confirmed: "bg-accent/15 text-accent",
  declined: "bg-danger/15 text-danger",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  declined: "Declined",
};

export default async function BuyerOrdersPage() {
  const session = await auth();
  const userId = session!.user.id;

  const ordersRaw = await db.order.findMany({
    where: { buyerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      beat: { select: { title: true, coverKey: true } },
      buyer: { select: { id: true, producerName: true, profileImage: true } },
      seller: { select: { id: true, producerName: true, profileImage: true } },
    },
  });

  const orders = ordersRaw.map(serializeOrderListItem);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your orders</h1>
        <p className="mt-1 text-sm text-muted">Every license you&apos;ve purchased, with files and PDFs.</p>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No orders yet"
          description="When you buy a license, it'll show up here with your order number, files, and license PDF."
          action={
            <Link
              href="/"
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
            >
              Browse beats
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background text-muted-2">
                  {order.beatCoverUrl ? (
                    <Image
                      src={order.beatCoverUrl}
                      alt=""
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Music2 size={18} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={`/beats/${order.beatId}`}
                      className="truncate text-sm font-semibold text-foreground hover:text-accent"
                    >
                      {order.beatTitle}
                    </Link>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        STATUS_STYLES[order.status] ?? STATUS_STYLES.pending
                      }`}
                    >
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {order.licenseName} · Sold by {order.seller.producerName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-2">
                    Order {order.orderNumber} · {formatDate(order.createdAt)} · {formatPrice(order.priceCents)}
                  </p>
                </div>
              </div>

              {order.status === "confirmed" && (
                <div className="flex shrink-0 items-center gap-2 sm:ml-4">
                  <a
                    href={`/api/orders/${order.id}/download`}
                    className="flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/25"
                  >
                    <Download size={12} />
                    Files
                  </a>
                  <a
                    href={`/api/orders/${order.id}/license`}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-muted-2"
                  >
                    <FileText size={12} />
                    License PDF
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
