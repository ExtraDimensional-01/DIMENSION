import { auth } from "@/lib/auth";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <DashboardTabs role={session?.user?.role ?? "producer"} />
      <div className="py-8">{children}</div>
    </div>
  );
}
