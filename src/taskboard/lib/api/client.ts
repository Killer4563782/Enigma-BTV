import type { ApiFailure } from "./contracts";
import { getSessionToken, setSessionToken } from "@enigma/session";

const configuredOrigin = (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || "";
const baseUrl = `${configuredOrigin.replace(/\/+$/, "")}/api/v1`;
export const getApiToken = getSessionToken;
export const setApiToken = setSessionToken;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  conditional?: boolean;
  onResponse?: (response: Response) => void;
  invalidateConditionalCache?: boolean;
}

// Private, session-scoped memory only. Authenticated responses never enter a CDN cache.
const responseCache = new Map<string, { token: string | null; etag: string; data: unknown }>();
let cacheToken: string | null = null;
let cacheGeneration = 0;

function synchronizeCache(token: string | null) {
  if (token !== cacheToken) {
    responseCache.clear();
    cacheToken = token;
    cacheGeneration++;
  }
}

function isApiFailure(value: unknown): value is ApiFailure {
  if (!value || typeof value !== "object" || !("error" in value)) return false;
  const error = value.error;
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string"
  );
}

function flatApiError(value: unknown) {
  if (!value || typeof value !== "object" || !("error" in value)) return null;
  return typeof value.error === "string" ? value.error : null;
}

// Browser-side JSON transport. Nothing is requested until a service is called.
export async function apiRequest<T>(
  path: `/${string}`,
  options: RequestOptions = {},
): Promise<T> {
  const token = getApiToken();
  synchronizeCache(token);
  const method = options.method || "GET";
  if (method !== "GET" && options.invalidateConditionalCache !== false) {
    responseCache.clear();
    cacheGeneration++;
  }
  const generation = cacheGeneration;
  const cached = options.conditional && method === "GET" ? responseCache.get(path) : undefined;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cached ? { "If-None-Match": cached.etag } : {}),
      ...(options.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
    },
    credentials: "same-origin",
    cache: "no-store",
    signal: options.signal,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (getApiToken() !== token) {
    throw new ApiError(409, "SESSION_CHANGED", "The signed-in session changed during this request.");
  }
  if (response.status === 304 && cached) {
    options.onResponse?.(response);
    return structuredClone(cached.data) as T;
  }

  if (response.status === 204) return null as T;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    if (getApiToken() !== token) throw new ApiError(409, "SESSION_CHANGED", "The signed-in session changed during this request.");
    throw new ApiError(
      response.status,
      "INVALID_RESPONSE",
      "The API did not return a JSON response.",
    );
  }

  if (getApiToken() !== token) throw new ApiError(409, "SESSION_CHANGED", "The signed-in session changed during this request.");
  if (response.status === 401) {
    setApiToken(null);
    synchronizeCache(null);
  }

  if (isApiFailure(payload)) {
    throw new ApiError(
      response.status,
      payload.error.code,
      payload.error.message,
    );
  }
  if (!response.ok) {
    const message = flatApiError(payload);
    throw new ApiError(
      response.status,
      "REQUEST_FAILED",
      message || `API request failed (${response.status}).`,
    );
  }
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new ApiError(
      response.status,
      "INVALID_RESPONSE",
      "The API response is missing its data field.",
    );
  }

  options.onResponse?.(response);
  const etag = response.headers.get("ETag");
  if (options.conditional && method === "GET" && etag && cacheGeneration === generation && getApiToken() === token) {
    responseCache.set(path, { token, etag, data: structuredClone(payload.data) });
  }
  return payload.data as T;
}
