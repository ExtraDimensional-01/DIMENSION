"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function TagInput({
  tags,
  onChange,
  max = 15,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  max?: number;
}) {
  const [value, setValue] = useState("");

  function commit() {
    const cleaned = value.trim().toLowerCase().replace(/^#/, "");
    if (cleaned && !tags.includes(cleaned) && tags.length < max) {
      onChange([...tags, cleaned]);
    }
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !value && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="input flex flex-wrap items-center gap-1.5 py-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-full bg-surface-hover px-2.5 py-1 text-xs text-foreground"
        >
          #{tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            aria-label={`Remove ${tag}`}
          >
            <X size={11} className="text-muted-2 hover:text-foreground" />
          </button>
        </span>
      ))}
      {tags.length < max && (
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder={tags.length === 0 ? "trap, dark, melodic..." : ""}
          className="min-w-[80px] flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-2 focus:outline-none"
        />
      )}
    </div>
  );
}
