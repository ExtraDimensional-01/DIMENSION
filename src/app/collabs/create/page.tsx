import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CreateCollabForm } from "@/components/collabs/CreateCollabForm";

export const metadata: Metadata = { title: "Create a Collaboration — DIMENSION" };

export default async function CreateCollabPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/collabs/create");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <span className="kicker mb-2">New Collaboration</span>
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
          Create Collaboration
        </h1>
        <p className="mt-2 text-sm text-muted">
          Post what you're looking for and let creators come to you. Save as a draft if you're not ready to publish.
        </p>
      </div>
      <CreateCollabForm />
    </div>
  );
}
