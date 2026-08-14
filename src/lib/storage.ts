import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";

/**
 * Storage abstraction. V1 ships a local-disk adapter that writes outside the
 * source tree (STORAGE_DIR, default ./storage). Swapping to S3/R2 later means
 * writing one new adapter that implements this same interface — nothing else
 * in the app (API routes, upload form, player) needs to change.
 */
export interface StorageAdapter {
  save(buffer: Buffer, kind: StorageKind, extension: string): Promise<string>;
  delete(key: string): Promise<void>;
  absolutePath(key: string): string;
  exists(key: string): Promise<boolean>;
}

export type StorageKind = "audio" | "covers" | "avatars" | "collab" | "license";

// turbopackIgnore: STORAGE_DIR is an env-configured path outside the source
// tree (uploaded files), not a project asset — it must not be traced/bundled.
const STORAGE_ROOT = path.resolve(
  process.cwd(),
  /* turbopackIgnore: true */ process.env.STORAGE_DIR || "./storage"
);

class LocalDiskStorage implements StorageAdapter {
  async save(buffer: Buffer, kind: StorageKind, extension: string): Promise<string> {
    const dir = path.join(/* turbopackIgnore: true */ STORAGE_ROOT, kind);
    await fs.mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    const key = `${kind}/${filename}`;
    await fs.writeFile(path.join(/* turbopackIgnore: true */ STORAGE_ROOT, key), buffer);
    return key;
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.absolutePath(key));
    } catch {
      // already gone — fine
    }
  }

  absolutePath(key: string): string {
    const resolved = path.resolve(/* turbopackIgnore: true */ STORAGE_ROOT, key);
    if (!resolved.startsWith(STORAGE_ROOT)) {
      throw new Error("Invalid storage key");
    }
    return resolved;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.absolutePath(key));
      return true;
    } catch {
      return false;
    }
  }
}

export const storage: StorageAdapter = new LocalDiskStorage();

/** Public URL the browser/audio player uses to fetch a stored file. */
export function fileUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `/api/files/${key}`;
}
