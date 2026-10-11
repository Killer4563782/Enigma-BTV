import { apiRequest } from "./api/client";
import type { Attachment } from "./types";

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const CHUNK_BYTES = 384 * 1024;
const pending = new Map<string, Promise<string>>();
const MAX_CONCURRENT_UPLOADS = 2;
let activeUploads = 0;
const uploadQueue: Array<() => void> = [];

async function acquireUploadSlot(signal?: AbortSignal) {
  signal?.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const start = () => {
      signal?.removeEventListener("abort", abort);
      activeUploads++;
      resolve();
    };
    const abort = () => {
      const index = uploadQueue.indexOf(start);
      if (index !== -1) uploadQueue.splice(index, 1);
      reject(signal?.reason || new DOMException("Upload cancelled.", "AbortError"));
    };
    if (activeUploads < MAX_CONCURRENT_UPLOADS) {
      start();
    } else {
      uploadQueue.push(start);
      signal?.addEventListener("abort", abort, { once: true });
    }
  });
  return () => {
    activeUploads--;
    uploadQueue.shift()?.();
  };
}

export async function uploadAttachment(
  file: File,
  taskId: string,
  progress: (value: number) => void,
  signal?: AbortSignal,
): Promise<Attachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error("Files must be 10 MB or smaller.");
  const storageId = crypto.randomUUID();
  const chunks = Math.max(1, Math.ceil(file.size / CHUNK_BYTES));
  const release = await acquireUploadSlot(signal);
  try {
    for (let index = 0; index < chunks; index++) {
      signal?.throwIfAborted();
      const bytes = new Uint8Array(await file.slice(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES).arrayBuffer());
      signal?.throwIfAborted();
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 8192) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      }
      await apiRequest(`/attachments/${storageId}/${index}`, {
        method: "PUT",
        body: { taskId, chunks, bytes: file.size, content: btoa(binary) },
        signal,
        invalidateConditionalCache: false,
      });
      signal?.throwIfAborted();
      progress(Math.round(((index + 1) / chunks) * 100));
    }
  } finally {
    release();
  }
  let mimeType = file.type;
  if (!mimeType) {
    if (/\.png$/i.test(file.name)) mimeType = "image/png";
    else if (/\.jpe?g$/i.test(file.name)) mimeType = "image/jpeg";
    else mimeType = "application/octet-stream";
  }
  return {
    id: storageId,
    storageId,
    chunks,
    bytes: file.size,
    name: file.name,
    type: mimeType.startsWith("image/") ? "image" : "file",
    mimeType,
    size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
  };
}

export async function attachmentUrl(attachment: Attachment): Promise<string> {
  if (!attachment.storageId) return attachment.content || attachment.url || "";
  const existing = pending.get(attachment.storageId);
  if (existing) return existing;
  const download = (async () => {
    const parts: Uint8Array<ArrayBuffer>[] = [];
    for (let index = 0; index < (attachment.chunks || 1); index++) {
      const result = await apiRequest<{ content: string }>(`/attachments/${attachment.storageId}/${index}`);
      const binary = atob(result.content);
      parts.push(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
    }
    return URL.createObjectURL(new Blob(parts, { type: attachment.mimeType || "application/octet-stream" }));
  })();
  pending.set(attachment.storageId, download);
  download.catch(() => pending.delete(attachment.storageId!));
  return download;
}
