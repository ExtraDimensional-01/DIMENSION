import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { beatInclude } from "@/lib/beat-query";
import { serializeBeat } from "@/lib/serialize";
import { isR2Configured } from "@/lib/storage";
import { EditBeatForm } from "@/components/dashboard/EditBeatForm";
import { LicenseTierManager } from "@/components/dashboard/LicenseTierManager";

export const metadata: Metadata = { title: "Edit beat — DIMENSION" };

export default async function EditBeatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const beatRecord = await db.beat.findUnique({ where: { id }, include: beatInclude });
  if (!beatRecord) notFound();
  if (beatRecord.producerId !== session?.user?.id) redirect("/dashboard");

  const beat = serializeBeat(beatRecord, false, true);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Edit beat</h1>
      <p className="mt-1.5 mb-8 text-sm text-muted">Update your beat&apos;s details.</p>
      <EditBeatForm beat={beat} r2Enabled={isR2Configured()} />

      <div className="mt-10 border-t border-border pt-8">
        <h2 className="text-lg font-semibold tracking-tight">License tiers</h2>
        <p className="mt-1 mb-5 text-sm text-muted">
          Manage the license tiers buyers can purchase for this beat.
        </p>
        <LicenseTierManager
          beatId={beat.id}
          initialLicenses={beat.licenses}
          exclusiveSoldAt={beat.exclusiveSoldAt}
          r2Enabled={isR2Configured()}
        />
      </div>
    </div>
  );
}
