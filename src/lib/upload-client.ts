"use client";

import { WAVEFORM_PEAK_COUNT } from "@/lib/constants";

/** Reads audio duration in the browser before upload, using an in-memory <audio> element. */
export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      resolve(audio.duration || 0);
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => {
      resolve(0);
      URL.revokeObjectURL(url);
    };
    audio.src = url;
  });
}

/**
 * Decodes the real PCM audio data (Web Audio API) and extracts a downsampled
 * array of amplitude peaks for waveform rendering — not a decorative fake,
 * an actual analysis of the uploaded file's loudness envelope.
 */
export async function getWaveformPeaks(
  file: File,
  peakCount: number = WAVEFORM_PEAK_COUNT
): Promise<number[]> {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const channelCount = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const samplesPerPeak = Math.max(1, Math.floor(length / peakCount));
    const peaks: number[] = [];

    for (let i = 0; i < peakCount; i++) {
      const start = i * samplesPerPeak;
      const end = Math.min(start + samplesPerPeak, length);
      let max = 0;
      for (let ch = 0; ch < channelCount; ch++) {
        const data = audioBuffer.getChannelData(ch);
        for (let j = start; j < end; j++) {
          const abs = Math.abs(data[j]);
          if (abs > max) max = abs;
        }
      }
      peaks.push(max);
    }

    audioContext.close();

    // Normalize so the loudest peak reaches 1.0 — quietly mastered tracks
    // still render a readable waveform instead of a flat line.
    const globalMax = Math.max(...peaks, 0.02);
    return peaks.map((p) => Math.min(1, p / globalMax));
  } catch {
    return [];
  }
}

/** Raw XHR PUT with progress reporting, used to push a file directly to a presigned R2 URL. */
function putWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

interface PresignResponse {
  key: string;
  uploadUrl: string;
  expiresIn: number;
  licenseFileId?: string;
  fileId?: string;
}

/**
 * Uploads a file directly to R2: asks the server for a presigned URL (which
 * also authorizes the upload), PUTs the file straight to R2 (never through
 * the Vercel function), and returns the object key plus whatever id the
 * server generated for it. Throws with a user-facing message on failure.
 */
export async function uploadFileDirectToR2(
  file: File,
  category: string,
  context: Record<string, unknown>,
  onProgress?: (pct: number) => void
): Promise<PresignResponse> {
  const presignRes = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, filename: file.name, contentType: file.type, size: file.size, context }),
  });
  const presignData = await presignRes.json().catch(() => ({}));
  if (!presignRes.ok) {
    throw new Error(presignData.error ?? "Couldn't start the upload");
  }

  await putWithProgress(presignData.uploadUrl, file, onProgress ?? (() => {}));

  return presignData as PresignResponse;
}

/** XHR-based upload so we can report progress — fetch() has no upload progress event. */
export function uploadWithProgress(
  url: string,
  method: "POST" | "PATCH",
  formData: FormData,
  onProgress: (pct: number) => void
): Promise<{ ok: boolean; status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      let data: any = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // non-JSON response
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data });
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
}
