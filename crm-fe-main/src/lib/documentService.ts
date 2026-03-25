import { toast } from "sonner";
import { api, tokens } from "@/lib/api";
import type { EmployeeDocumentDto } from "@/types/hr-documents";

/** Same token source as axios interceptor — no direct localStorage in components. */
export function getAccessToken(): string | null {
  return tokens.accessToken;
}

/**
 * Multipart upload (fetch required). Uses Bearer from shared token store.
 * @param onProgress 0–100
 */
export function uploadHrDocument(
  formData: FormData,
  onProgress?: (pct: number) => void,
  endpoint = "/hr/documents/upload",
): Promise<EmployeeDocumentDto> {
  const base = api.defaults.baseURL || "";
  const token = getAccessToken();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${base}${endpoint}`);
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }
    xhr.upload.onprogress = (ev) => {
      if (!onProgress || !ev.lengthComputable) return;
      const pct = Math.round((ev.loaded / ev.total) * 100);
      onProgress(pct);
    };
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && json.data) {
          resolve(json.data as EmployeeDocumentDto);
          return;
        }
        const msg =
          json?.error?.message ||
          json?.message ||
          (xhr.status === 413
            ? "File too large. Maximum size is 15MB."
            : "Upload failed");
        reject(new Error(msg));
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

export function openDocumentUrl(fileUrl: string | null | undefined): void {
  if (!fileUrl?.trim()) {
    toast.error("File unavailable");
    return;
  }
  try {
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  } catch {
    toast.error("Document link has expired. Refresh the page to get a new link.");
  }
}
