/**
 * apiFetch – a drop-in wrapper around `fetch` that automatically injects the
 * `X-Device-Token` header required by the backend security layer.
 *
 * Usage (identical to normal fetch):
 *   import { apiFetch } from "@/lib/apiFetch";
 *
 *   const res = await apiFetch("/api/courses", { method: "POST", body: ... });
 *
 * For FormData uploads the Content-Type header must NOT be set manually –
 * the browser sets it automatically with the correct multipart boundary.
 */

import { BASE_URL } from "./config";

export function getDeviceToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("iinm_device_token") ?? "";
}

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getDeviceToken();

  let finalUrl = url;
  if (finalUrl.startsWith("/")) {
    finalUrl = `${BASE_URL}${finalUrl}`;
  } else {
    // Dynamically replace any hardcoded 8000 ports with the configured BASE_URL
    finalUrl = finalUrl.replace(/https?:\/\/[^\/]+:8000/, BASE_URL);
  }

  // Merge headers: preserve caller-supplied headers, add X-Device-Token.
  // We must NOT set Content-Type when the body is FormData – the browser
  // needs to set it itself (with the multipart boundary).
  const isFormData = options.body instanceof FormData;

  const headers = new Headers(options.headers as HeadersInit | undefined);
  if (token) {
    headers.set("X-Device-Token", token);
  }

  // Only set JSON content-type when the body is a plain string/object and
  // the caller has not already provided Content-Type.
  if (!isFormData && !headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  return fetch(finalUrl, {
    ...options,
    headers,
  });
}
