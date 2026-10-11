import type { AccessKey, Task, User } from "@/lib/types";
import type { ReleaseEntry } from "@/lib/changelog";
import { apiRequest, ApiError, getApiToken, setApiToken } from "./client";
import { compactWorkspace, hydrateWorkspace, type CompactWorkspace } from "./workspace-transfer";
import {
  apiPaths,
  type CreateTaskInput,
  type Session,
  type PresenceSnapshot,
  type UpdateTaskInput,
  type WorkspaceSnapshot,
} from "./contracts";

let transportToken: string | null = null;
let compactSupported = false;
let baseline: WorkspaceSnapshot | null = null;
let workspaceGeneration = 0;

function synchronizeTransport() {
  const token = getApiToken();
  if (transportToken !== token) {
    transportToken = token;
    compactSupported = false;
    baseline = null;
    workspaceGeneration++;
  }
  return token;
}

async function getWorkspace(signal?: AbortSignal) {
  const token = synchronizeTransport();
  const generation = workspaceGeneration;
  const result = await apiRequest<WorkspaceSnapshot | null>(apiPaths.workspace, {
    signal, conditional: true,
    onResponse: response => {
      if (getApiToken() === token && workspaceGeneration === generation) {
        compactSupported = response.headers.get("X-Enigma-Workspace-Transport") === "1";
      }
    },
  });
  if (getApiToken() === token && workspaceGeneration === generation) baseline = structuredClone(result);
  return result;
}

async function saveWorkspace(snapshot: WorkspaceSnapshot, signal?: AbortSignal) {
  const token = synchronizeTransport();
  const submitted = structuredClone(snapshot);
  const compact = compactSupported && baseline && baseline.revision === submitted.revision
    ? compactWorkspace(submitted, baseline) : null;
  const generation = ++workspaceGeneration;
  let result: WorkspaceSnapshot;
  try {
    const response = await apiRequest<WorkspaceSnapshot | CompactWorkspace>(apiPaths.workspace, {
      method: "PUT", body: compact ? { transport: 1, ...compact } : submitted, signal,
    });
    result = "snapshot" in response ? hydrateWorkspace(response, submitted) : response;
  } catch (error) {
    // An old backend rejects the envelope at its revision check. Re-read to distinguish
    // a rollback from a real edit conflict before retrying the original full snapshot.
    if (!compact || !(error instanceof ApiError) || error.status !== 409 || error.message !== "Workspace changed elsewhere. Reload before saving again.") throw error;
    const latest = await getWorkspace(signal);
    if (compactSupported || latest?.revision !== submitted.revision) throw error;
    result = await apiRequest<WorkspaceSnapshot>(apiPaths.workspace, { method: "PUT", body: submitted, signal });
  }
  if (getApiToken() === token && workspaceGeneration === generation) baseline = structuredClone(result);
  return result;
}

export const workspaceApi = {
  login: async (email: string, password: string, remember = false, signal?: AbortSignal) => {
    const result = await apiRequest<{ token: string; user: User }>(apiPaths.login, { method: "POST", body: { email, password, remember }, signal });
    setApiToken(result.token, remember);
    return result;
  },

  register: async (name: string, username: string, email: string, password: string, key: string) => {
    const result = await apiRequest<{ token: string; user: User }>(apiPaths.register, {
      method: "POST", body: { name, username, email, password, key },
    });
    setApiToken(result.token);
    return result;
  },

  logout: async (signal?: AbortSignal) => {
    const token = getApiToken();
    try { await apiRequest<null>(apiPaths.logout, { method: "POST", signal }); }
    finally { if (getApiToken() === token) setApiToken(null); }
  },

  getSession: (signal?: AbortSignal) =>
    apiRequest<Session>(apiPaths.session, { signal }),

  heartbeat: (signal?: AbortSignal) =>
    apiRequest<PresenceSnapshot>(apiPaths.presence, { method: "POST", signal, invalidateConditionalCache: false }),

  getWorkspace,

  getChangelog: (signal?: AbortSignal) =>
    apiRequest<{ entries: ReleaseEntry[] }>(apiPaths.changelog, { signal }),

  getAccessKeys: () => apiRequest<AccessKey[]>(apiPaths.accessKeys),
  createAccessKey: (role: string) => apiRequest<AccessKey>(apiPaths.accessKeys, { method: "POST", body: { role } }),
  revokeAccessKey: (id: string) => apiRequest<null>(`${apiPaths.accessKeys}/${encodeURIComponent(id)}`, { method: "DELETE" }),
  deleteAccessKey: (id: string) => apiRequest<null>(`${apiPaths.accessKeys}/${encodeURIComponent(id)}/permanent`, { method: "DELETE" }),
  redeemAccessKey: (key: string) => apiRequest<User>("/auth/redeem-key", { method: "POST", body: { key } }),
  assignActivationKey: (userId: string, keyId: string) => apiRequest<User>(`/users/${encodeURIComponent(userId)}/activation-key`, { method: "PUT", body: { keyId } }),
  updateAccount: (id: string, change: { role?: string; active?: boolean; password?: string; email?: string }) =>
    apiRequest<User>(`${apiPaths.users}/${encodeURIComponent(id)}`, { method: "PATCH", body: change }),
  deleteAccount: (id: string) =>
    apiRequest<null>(`${apiPaths.users}/${encodeURIComponent(id)}`, { method: "DELETE" }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<null>("/auth/password", { method: "POST", body: { currentPassword, newPassword } }),

  saveWorkspace,

  createTask: (input: CreateTaskInput, signal?: AbortSignal) =>
    apiRequest<Task>(apiPaths.tasks, { method: "POST", body: input, signal }),

  updateTask: (id: string, input: UpdateTaskInput, signal?: AbortSignal) =>
    apiRequest<Task>(`${apiPaths.tasks}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: input,
      signal,
    }),
};
