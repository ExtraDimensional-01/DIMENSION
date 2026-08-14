import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { DollarSign, FileText, Music2, Receipt, Tag } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeOrderListItem } from "@/lib/serialize";
import { formatPrice } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Sales & licensing — DIMENSION" };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted-2/15 text-muted-2",
  confirmed: "bg-accent/15 text-accent",
  declined: "bg-danger/15 text-danger",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Awaiting your confirmation",
  confirmed: "Confirmed",
  declined: "Declined",
};

export default async function SalesDashboardPage() {
  const session = await auth();
  if (session?.user?.role !== "producer") {
    redirect("/dashboard");
  }
  const userId = session.user.id;

  const [ordersRaw, tierCount] = await Promise.all([
    db.order.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        beat: { select: { title: true, coverKey: true } },
        buyer: { select: { id: true, producerName: true, profileImage: true } },
        seller: { select: { id: true, producerName: true, profileImage: true } },
      },
    }),
    db.beatLicense.count({ where: { beat: { producerId: userId } } }),
  ]);

  const orders = ordersRaw.map(serializeOrderListItem);
  const confirmed = orders.filter((o) => o.status === "confirmed");
  const pending = orders.filter((o) => o.status === "pending");
  const totalRevenueCents = confirmed.reduce((sum, o) => sum + o.priceCents, 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sales &amp; licensing</h1>
        <p className="mt-1 text-sm text-muted">
          Every license purchase across your catalog, plus the license documents DIMENSION generated for
          them.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:max-w-2xl sm:grid-cols-4">
        <StatCard icon={DollarSign} label="Total revenue" value={formatPrice(totalRevenueCents) ?? "$0.00"} />
        <StatCard icon={Receipt} label="Confirmed sales" value={confirmed.length.toLocaleString()} />
        <StatCard icon={Tag} label="Awaiting you" value={pending.length.toLocaleString()} />
        <StatCard icon={Music2} label="License tiers" value={tierCount.toLocaleString()} />
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No purchases yet"
          description="Once a buyer purchases one of your license tiers, the order and generated license will show up here."
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
                    {order.licenseName} · Bought by {order.buyer.producerName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-2">
                    Order {order.orderNumber} · {formatDate(order.createdAt)} · {formatPrice(order.priceCents)}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:ml-4">
                {order.status === "pending" ? (
                  <Link
                    href={`/messages/${order.buyerId}`}
                    className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition hover:bg-accent-hover"
                  >
                    Review in messages
                  </Link>
                ) : order.status === "confirmed" ? (
                  <a
                    href={`/api/orders/${order.id}/license`}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-muted-2"
                  >
                    <FileText size={12} />
                    License PDF
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-background text-muted">
        <Icon size={15} />
      </div>
      <p className="text-xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-2">{label}</p>
    </div>
  );
}
