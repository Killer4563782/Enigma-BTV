import type { AppState } from "@/lib/types";

export function createInitialState(): AppState {
  return {
    revision: 0,
    users: [],
    roles: [
      { id: "owner", name: "Owner", color: "#fbbf24", permissions: [] },
      { id: "admin", name: "Admin", color: "#a78bfa", permissions: [] },
      { id: "user", name: "User", color: "#93c5fd", permissions: ["Create Spaces", "Create Boards", "Create Tasks", "Edit Tasks"] },
    ],
    spaces: [],
    boards: [],
    lists: [],
    tasks: [],
    labels: [],
    notifications: [],
    accessKeys: [],
    currentUserId: "",
    preferences: {
      compact: false,
      motion: true,
      notifications: true,
      sounds: false,
      accent: "#a78bfa",
      density: "Comfortable",
    },
  };
}
