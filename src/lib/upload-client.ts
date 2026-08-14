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
