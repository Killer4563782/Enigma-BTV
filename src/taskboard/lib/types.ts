export type Presence = "Online" | "Away" | "Do Not Disturb" | "Offline";
export type Priority = "None" | "Low" | "Medium" | "High" | "Urgent";
export type Permission =
  | "Create Spaces"
  | "Create Boards"
  | "Delete Boards"
  | "Create Tasks"
  | "Edit Tasks"
  | "Edit Any Task"
  | "Delete Tasks"
  | "Restore Tasks"
  | "Permanently Delete Items"
  | "Manage Members"
  | "Manage Roles"
  | "Generate Access Keys"
  | "Manage Integrations"
  | "Moderate Comments"
  | "Manage Settings";
export interface User {
  id: string;
  email?: string;
  username: string;
  name: string;
  bio: string;
  role: string;
  color: string;
  presence: Presence;
  status: string;
  joined: string;
  lastActive: string;
  avatar?: string;
  bannerColor?: string;
  bannerImage?: string;
  active: boolean;
  siteAdmin?: boolean;
  bootstrapOwner?: boolean;
  activationKeyId?: string;
  pendingActivationKeyId?: string;
}
export interface Role {
  id: string;
  name: string;
  color: string;
  permissions: Permission[];
}
export interface Space {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  members: string[];
  deleted?: boolean;
}
export interface Board {
  id: string;
  spaceId: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  favorite: boolean;
  deleted?: boolean;
}
export interface TaskList {
  id: string;
  boardId: string;
  name: string;
  color: string;
  collapsed?: boolean;
  deleted?: boolean;
  archived?: boolean;
}
export interface Label {
  id: string;
  name: string;
  color: string;
}
export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  thread: Comment[];
  parentId?: string;
}
export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}
export interface Attachment {
  id: string;
  name: string;
  type: "image" | "file" | "link" | "task";
  url?: string;
  size?: string;
  mimeType?: string;
  content?: string;
  taskId?: string;
  storageId?: string;
  chunks?: number;
  bytes?: number;
  reference?: number;
}
export interface Comment {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
  reactions: Record<string, string[]>;
  replyTo?: string;
  edited?: boolean;
}
export interface Activity {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
  taskId?: string;
}
export interface Task {
  id: string;
  boardId: string;
  listId: string;
  title: string;
  description: string;
  priority: Priority;
  labels: string[];
  assignees: string[];
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  startDate: string;
  dueDate: string;
  dueTime: string;
  completedAt?: string;
  restricted: boolean;
  parentId?: string;
  blockedBy: string[];
  relatedIds: string[];
  watcherIds: string[];
  checklists: Checklist[];
  attachments: Attachment[];
  comments: Comment[];
  activity: Activity[];
  cover?: string;
  deleted?: boolean;
  archived?: boolean;
}
export interface Notification {
  id: string;
  userId: string;
  actorId: string;
  title: string;
  body: string;
  kind:
    | "Mention"
    | "Assignment"
    | "Comment"
    | "Reply"
    | "Due date"
    | "Task update"
    | "Checklist"
    | "GitHub"
    | "Forum";
  taskId?: string;
  createdAt: string;
  read: boolean;
}
export interface AccessKey {
  id: string;
  key: string;
  role: string;
  status: "Active" | "Reserved" | "Used" | "Revoked";
  createdAt: string;
  usedBy?: string;
  reservedBy?: string;
}
export interface Preferences {
  compact: boolean;
  motion: boolean;
  notifications: boolean;
  sounds: boolean;
  accent: string;
  density: string;
}
export interface AppState {
  revision?: number;
  users: User[];
  roles: Role[];
  spaces: Space[];
  boards: Board[];
  lists: TaskList[];
  tasks: Task[];
  labels: Label[];
  notifications: Notification[];
  accessKeys: AccessKey[];
  currentUserId: string;
  preferences: Preferences;
}
export type View =
  | "home"
  | "board"
  | "space"
  | "my-tasks"
  | "notifications"
  | "trash"
  | "settings"
  | "admin"
  | "profile"
  | "releases"
  | "changelog";
export type AuthMode = "login" | "register" | "setup";
export const priorities: Priority[] = [
  "None",
  "Low",
  "Medium",
  "High",
  "Urgent",
];
export const permissions: Permission[] = [
  "Create Spaces",
  "Create Boards",
  "Delete Boards",
  "Create Tasks",
  "Edit Tasks",
  "Edit Any Task",
  "Delete Tasks",
  "Restore Tasks",
  "Permanently Delete Items",
  "Manage Members",
  "Manage Roles",
  "Generate Access Keys",
  "Manage Integrations",
  "Moderate Comments",
  "Manage Settings",
];
