import type { CreatorProfileSummary } from "@/types";
import { CreatorCard } from "@/components/collabs/CreatorCard";

export function CreatorGrid({ creators }: { creators: CreatorProfileSummary[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {creators.map((c) => (
        <CreatorCard key={c.userId} creator={c} />
      ))}
    </div>
  );
}
