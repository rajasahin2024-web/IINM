/**
 * uploadWithProgress – Upload files via XMLHttpRequest with real-time
 * progress tracking. Unlike fetch(), XHR exposes upload progress events.
 *
 * Automatically injects the X-Device-Token header (same as apiFetch).
 * No timeout — large files (up to 500MB) upload without execution timeout.
 *
 * Usage:
 *   import { uploadWithProgress } from "@/lib/uploadWithProgress";
 *
 *   const { url, ok, data, error } = await uploadWithProgress(
 *     "/api/materials",
 *     formData,
 *     (percent) => setProgress(percent)
 *   );
 */

import { BASE_URL } from "./config";

export function getDeviceToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem("iinm_device_token") ?? "";
  } catch {
    return "";
  }
}

export interface UploadResult {
  ok: boolean;
  status: number;
  data: any;
  error?: string;
}

export function uploadWithProgress(
  url: string,
  body: FormData,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  return new Promise((resolve) => {
    let finalUrl = url;
    if (finalUrl.startsWith("/")) {
      finalUrl = `${BASE_URL}${finalUrl}`;
    } else {
      finalUrl = finalUrl.replace(/https?:\/\/[^\/]+:8000/, BASE_URL);
    }

    const token = getDeviceToken();
    const xhr = new XMLHttpRequest();

    xhr.open("POST", finalUrl, true);

    // Auth header — do NOT set Content-Type, browser sets multipart boundary
    if (token) {
      xhr.setRequestHeader("X-Device-Token", token);
    }

    // No timeout — allow large file uploads
    xhr.timeout = 0;

    // Upload progress
    if (onProgress && xhr.upload) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      });
    }

    xhr.addEventListener("load", () => {
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = xhr.responseText;
      }
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        data,
        error: xhr.status >= 200 && xhr.status < 300 ? undefined : (data?.detail || `HTTP ${xhr.status}`),
      });
    });

    xhr.addEventListener("error", () => {
      resolve({
        ok: false,
        status: 0,
        data: null,
        error: "Network error. Could not upload file.",
      });
    });

    xhr.addEventListener("abort", () => {
      resolve({
        ok: false,
        status: 0,
        data: null,
        error: "Upload aborted.",
      });
    });

    xhr.send(body);
  });
}
