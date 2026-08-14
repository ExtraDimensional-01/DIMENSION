"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import type { CollabFile } from "@/types";
import { CollabFileList } from "@/components/collabs/CollabFileList";

export function CollabProjectFiles({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<CollabFile[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch(`/api/collab-projects/${projectId}/files`);
    const data = await res.json();
    setFiles(data.files ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    try {
      const res = await fetch(`/api/collab-projects/${projectId}/files`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      setFiles((prev) => [data.file, ...(prev ?? [])]);
    } finally {
      setUploading(false);
    }
  }

  if (!files) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={20} className="animate-spin text-muted-2" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onClick={() => fileInputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border px-4 py-6 text-center transition hover:border-muted-2"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />
        {uploading ? (
          <Loader2 size={18} className="animate-spin text-muted-2" />
        ) : (
          <>
            <UploadCloud size={18} className="text-muted-2" />
            <p className="text-xs text-muted-2">
              WAV, MP3, STEMS, MIDI, ZIP, artwork, lyrics, documents — click to upload
            </p>
          </>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {files.length === 0 ? (
        <p className="text-sm text-muted-2">No files uploaded yet.</p>
      ) : (
        <CollabFileList files={files} />
      )}
    </div>
  );
}
