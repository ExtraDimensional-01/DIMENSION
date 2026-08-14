"use client";

import Image from "next/image";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { initials } from "@/lib/utils";

interface ProducerResult {
  id: string;
  producerName: string;
  profileImageUrl: string | null;
  beatCount: number;
}

export function NavSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [results, setResults] = useState<ProducerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleChange(next: string) {
    setValue(next);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = next.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    setOpen(true);
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      try {
        const res = await fetch(`/api/producers?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (requestId !== requestIdRef.current) return; // a newer request already superseded this one
        setResults(data.producers ?? []);
      } catch {
        if (requestId === requestIdRef.current) setResults([]);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, 300);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    router.push(`/${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <form onSubmit={onSubmit}>
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 transition focus-within:border-muted-2">
          <Search size={15} className="shrink-0 text-muted-2" />
          <input
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => value.trim().length >= 2 && setOpen(true)}
            placeholder="Search beats, producers, tags..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-2 focus:outline-none"
          />
          {loading && <Loader2 size={14} className="shrink-0 animate-spin text-muted-2" />}
        </div>
      </form>

      {open && results.length > 0 && (
        <div className="animate-fade-in absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-surface shadow-xl shadow-black/40">
          <p className="px-3.5 pb-1 pt-3 font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">
            Producers
          </p>
          {results.map((p) => (
            <Link
              key={p.id}
              href={`/producers/${p.id}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 transition hover:bg-surface-hover"
            >
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-accent">
                {p.profileImageUrl ? (
                  <Image src={p.profileImageUrl} alt="" fill sizes="32px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-accent-foreground">
                    {initials(p.producerName)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{p.producerName}</p>
                <p className="truncate text-xs text-muted-2">
                  {p.beatCount} beat{p.beatCount === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {open && !loading && value.trim().length >= 2 && results.length === 0 && (
        <div className="animate-fade-in absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-border bg-surface px-3.5 py-3 text-xs text-muted-2 shadow-xl shadow-black/40">
          No producers found for &ldquo;{value.trim()}&rdquo;
        </div>
      )}
    </div>
  );
}
