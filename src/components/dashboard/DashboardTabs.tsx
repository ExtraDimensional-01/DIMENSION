"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function DashboardTabs({ role }: { role: string }) {
  const pathname = usePathname();

  const tabs =
    role === "producer"
      ? [
          { href: "/dashboard", label: "Overview" },
          { href: "/dashboard/upload", label: "Upload" },
          { href: "/dashboard/sales", label: "Sales" },
          { href: "/dashboard/orders", label: "Orders" },
          { href: "/dashboard/collabs", label: "Collabs" },
          { href: "/messages", label: "Messages" },
          { href: "/dashboard/settings", label: "Settings" },
        ]
      : [
          { href: "/dashboard", label: "Overview" },
          { href: "/dashboard/orders", label: "Orders" },
          { href: "/dashboard/collabs", label: "Collabs" },
          { href: "/messages", label: "Messages" },
          { href: "/dashboard/settings", label: "Settings" },
        ];

  return (
    <nav className="flex gap-1 border-b border-border">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-3 py-3 text-sm font-medium transition",
              active
                ? "border-accent text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
