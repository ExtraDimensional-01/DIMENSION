import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { UploadForm } from "@/components/dashboard/UploadForm";

export const metadata: Metadata = { title: "Upload a beat — DIMENSION" };

export default async function UploadPage() {
  const session = await auth();
  if (session?.user?.role !== "producer") {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Upload a beat</h1>
      <p className="mt-1.5 mb-8 text-sm text-muted">
        Share a new instrumental with the community.
      </p>
      <UploadForm />
    </div>
  );
}
