import { FileArchive, FileAudio, FileImage, FileText, Music2 } from "lucide-react";
import type { CollabFile } from "@/types";
import { formatFileSize } from "@/lib/utils";

const ICONS: Record<CollabFile["category"], typeof Music2> = {
  wav: FileAudio,
  mp3: FileAudio,
  midi: Music2,
  zip: FileArchive,
  image: FileImage,
  document: FileText,
  other: FileText,
};

export function CollabFileList({ files }: { files: CollabFile[] }) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {files.map((file) => {
        const Icon = ICONS[file.category];
        const isAudio = file.category === "wav" || file.category === "mp3";
        return (
          <div key={file.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                <Icon size={15} className="shrink-0 text-muted-2" />
                <span className="truncate">{file.fileName}</span>
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-2">{formatFileSize(file.fileSize)}</span>
                <a
                  href={file.url}
                  download={file.fileName}
                  className="text-xs font-medium text-accent hover:text-accent-hover"
                >
                  Download
                </a>
              </div>
            </div>
            {isAudio && (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <audio controls src={file.url} className="h-9 w-full" preload="none" />
            )}
          </div>
        );
      })}
    </div>
  );
}
