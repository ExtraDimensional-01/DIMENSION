export function BeatCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-transparent bg-surface p-3">
      <div className="mb-3 aspect-square w-full animate-shimmer rounded-lg" />
      <div className="mb-1.5 h-3.5 w-3/4 animate-shimmer rounded" />
      <div className="mb-2.5 h-3 w-1/2 animate-shimmer rounded" />
      <div className="flex gap-1.5">
        <div className="h-5 w-14 animate-shimmer rounded-full" />
        <div className="h-5 w-12 animate-shimmer rounded-full" />
        <div className="h-5 w-16 animate-shimmer rounded-full" />
      </div>
    </div>
  );
}

export function BeatGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <BeatCardSkeleton key={i} />
      ))}
    </div>
  );
}
