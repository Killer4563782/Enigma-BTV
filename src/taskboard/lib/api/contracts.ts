import type { AppState, Presence, Task, User } from "@/lib/types";

export interface ApiFailure {
  error: {
    code: string;
    message: string;
  };
}

// Reuse the existing frontend models until the backend defines its DTOs.
export type WorkspaceSnapshot = AppState;
export interface Session {
  user: User | null;
  session?: { email: string; expiresAt: number };
}
export interface PresenceSnapshot {
  users: Array<Pick<User, "id" | "lastActive"> & { presence: Presence }>;
}

// Identity, timestamps, activity, and completion history belong to the server.
export type CreateTaskInput = Pick<Task, "title" | "boardId" | "listId"> &
  Partial<
    Pick<
      Task,
      | "description"
      | "priority"
      | "labels"
      | "assignees"
      | "parentId"
      | "startDate"
      | "dueDate"
      | "dueTime"
      | "restricted"
    >
  >;

export type UpdateTaskInput = Partial<CreateTaskInput>;

export const apiPaths = {
  session: "/auth/session",
  login: "/auth/login",
  presence: "/presence",
  changelog: "/changelog",
  logout: "/auth/logout",
  setup: "/auth/setup",
  register: "/auth/register",
  workspace: "/workspace",
  users: "/users",
  roles: "/roles",
  spaces: "/spaces",
  boards: "/boards",
  lists: "/lists",
  tasks: "/tasks",
  labels: "/labels",
  notifications: "/notifications",
  accessKeys: "/access-keys",
  preferences: "/preferences",
  releases: "/releases",
  integrations: "/integrations",
} as const;
