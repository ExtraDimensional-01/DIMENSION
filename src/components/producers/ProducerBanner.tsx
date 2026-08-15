import Image from "next/image";
import Link from "next/link";
import { Pencil } from "lucide-react";

/**
 * Full-width banner behind the producer identity. When the producer hasn't
 * uploaded one, this renders a DIMENSION-branded generated backdrop instead
 * of an empty rectangle or a "no banner set" message — it should never look
 * unfinished. The edit affordance is pure CSS opacity-on-hover (no client
 * JS needed) so this stays a server component.
 */
export function ProducerBanner({
  bannerUrl,
  isOwner,
}: {
  bannerUrl: string | null;
  isOwner: boolean;
}) {
  return (
    <div className="group relative h-40 w-full overflow-hidden border border-border bg-surface sm:h-56 lg:h-64">
      {bannerUrl ? (
        <>
          <Image src={bannerUrl} alt="" fill sizes="1600px" priority className="object-cover" />
          {/* Readability gradient — stronger toward the bottom, where the avatar/name/bio sit */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-transparent" />
        </>
      ) : (
        <FallbackBanner />
      )}

      {isOwner && (
        <Link
          href="/dashboard/settings"
          className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-[11px] font-medium text-white opacity-0 backdrop-blur transition group-hover:opacity-100"
        >
          <Pencil size={11} />
          Edit banner
        </Link>
      )}
    </div>
  );
}

function FallbackBanner() {
  return (
    <div className="relative h-full w-full bg-background">
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 700px 300px at 20% 0%, rgba(155,77,255,0.22), transparent 60%), radial-gradient(ellipse 500px 260px at 90% 100%, rgba(155,77,255,0.14), transparent 55%), repeating-linear-gradient(115deg, transparent 0 60px, rgba(255,255,255,0.02) 60px 61px, transparent 61px 120px)",
        }}
      />
      {/* Faint concentric dimensional rings, echoing the DIMENSION mark */}
      <svg
        className="absolute -right-16 -top-16 h-72 w-72 opacity-20 sm:h-96 sm:w-96"
        viewBox="0 0 200 200"
        fill="none"
      >
        <circle cx="100" cy="100" r="99" stroke="var(--accent)" strokeWidth="0.5" />
        <circle cx="100" cy="100" r="76" stroke="var(--accent)" strokeWidth="0.5" />
        <circle cx="100" cy="100" r="53" stroke="var(--accent)" strokeWidth="0.5" />
        <line x1="100" y1="0" x2="100" y2="200" stroke="var(--accent)" strokeWidth="0.4" />
        <line x1="0" y1="100" x2="200" y2="100" stroke="var(--accent)" strokeWidth="0.4" />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
    </div>
  );
}
