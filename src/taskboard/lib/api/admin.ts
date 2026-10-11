import { getApiToken, setApiToken } from "./client";

const configuredOrigin =
  (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env
    ?.VITE_API_URL || "";
const baseUrl = `${configuredOrigin.replace(/\/+$/, "")}/api/admin`;

type AdminRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

export async function adminRequest<T>(
  path: `/${string}`,
  options: AdminRequestOptions = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        ...(getApiToken()
          ? { Authorization: `Bearer ${getApiToken()}` }
          : {}),
        ...(options.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new Error(
      "Cannot reach the content service. Check the backend connection and try again.",
    );
  }

  const payload =
    response.status === 204
      ? {}
      : await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) {
    if (response.status === 401) setApiToken(null);
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `Request failed (${response.status}).`;
    throw new Error(message);
  }
  return payload as T;
}

export function downloadJson(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
