import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fileUrl } from "@/lib/storage";
import { BrandMark } from "@/components/layout/BrandMark";
import { UserMenu } from "@/components/layout/UserMenu";
import { NavSearch } from "@/components/layout/NavSearch";
import { NavLinks } from "@/components/layout/NavLinks";
import { NotificationBell } from "@/components/collabs/NotificationBell";
import { BackgroundMusicWidget } from "@/components/providers/BackgroundMusicWidget";

export async function Navbar() {
  const session = await auth();

  const currentUser = session?.user?.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: { producerName: true, profileImage: true, role: true },
      })
    : null;

  const [unreadCount, unreadNotificationCount] = await Promise.all([
    session?.user?.id
      ? db.message.count({ where: { recipientId: session.user.id, readAt: null } })
      : Promise.resolve(0),
    session?.user?.id
      ? db.notification.count({ where: { userId: session.user.id, readAt: null } })
      : Promise.resolve(0),
  ]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="energy-line absolute inset-x-0 top-0 opacity-50" />
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <BrandMark size={38} className="glow-accent rounded-full ring-1 ring-accent/50 transition group-hover:ring-accent" />
          <span
            data-text="DIMENSION"
            className="text-glitch hidden font-display text-lg font-bold tracking-[0.1em] text-foreground sm:block"
          >
            DIMENSION
          </span>
        </Link>

        <NavLinks />

        <div className="hidden flex-1 justify-center lg:flex">
          <NavSearch />
        </div>

        <nav className="ml-auto flex items-center gap-3">
          <BackgroundMusicWidget />
          {session?.user && currentUser ? (
            <>
              <NotificationBell initialUnreadCount={unreadNotificationCount} />
              <UserMenu
                producerName={currentUser.producerName}
                image={fileUrl(currentUser.profileImage)}
                role={currentUser.role}
                unreadCount={unreadCount}
              />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-sm px-3.5 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="glow-accent rounded-sm bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-foreground transition hover:bg-accent-hover"
              >
                Sign up
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
