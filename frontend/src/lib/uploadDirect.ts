/**
 * uploadDirect – Upload a raw File via XHR PUT to a presigned URL
 * (Direct-to-R2 flow). Unlike uploadWithProgress (FormData POST to the
 * API), this sends the file blob as the request body with an explicit
 * Content-Type header — exactly what an S3/R2 presigned PUT expects.
 *
 * No timeout — large files (up to 500MB) upload without execution timeout.
 *
 * Usage:
 *   const result = await uploadDirect(presignedUrl, file, (pct) => ...);
 */

export interface DirectUploadResult {
  ok: boolean;
  status: number;
  error?: string;
}

export function uploadDirect(
  url: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<DirectUploadResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.timeout = 0;

    // Presigned URLs are signed with a specific Content-Type — it must match
    xhr.setRequestHeader("Content-Type", contentType || "application/octet-stream");

    if (onProgress && xhr.upload) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.addEventListener("load", () => {
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        error: xhr.status >= 200 && xhr.status < 300 ? undefined : `HTTP ${xhr.status}`,
      });
    });
    xhr.addEventListener("error", () => {
      resolve({ ok: false, status: 0, error: "Network error. Could not upload file." });
    });
    xhr.addEventListener("abort", () => {
      resolve({ ok: false, status: 0, error: "Upload aborted." });
    });

    xhr.send(file);
  });
}
