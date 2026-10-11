import type { AppState, Priority, Task, User } from "./types";

export const uid = (prefix = "item") =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
export const today = () => new Date().toLocaleDateString("en-CA");
export function dateLabel(value: string) {
  return value
    ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "No date";
}
export function canEdit(task: Task, user: User) {
  return (
    user.active &&
    (!task.restricted ||
      task.creatorId === user.id ||
      ["Admin", "Moderator"].includes(user.role))
  );
}
export function unresolvedDependencies(task: Task, tasks: Task[]) {
  return task.blockedBy.filter((id) => {
    const dependency = tasks.find(
      (candidate) => candidate.id === id && !candidate.deleted && !candidate.archived,
    );
    return Boolean(dependency && !dependency.completedAt);
  });
}
export function isTaskBlocked(task: Task, tasks: Task[]) {
  return unresolvedDependencies(task, tasks).length > 0;
}
export function visibleTasks(state: AppState) {
  const deletedSpaces = new Set(state.spaces.filter(s => s.deleted).map(s => s.id));
  const hiddenBoards = new Set(state.boards.filter(b => b.deleted || deletedSpaces.has(b.spaceId)).map(b => b.id));
  const hiddenLists = new Set(state.lists.filter(l => l.deleted || l.archived).map(l => l.id));
  const hiddenParents = new Set<string | undefined>(state.tasks.filter(t => t.deleted || t.archived).map(t => t.id));
  return state.tasks.filter(task =>
    !task.deleted && !task.archived && !hiddenBoards.has(task.boardId) &&
    !hiddenLists.has(task.listId) && !hiddenParents.has(task.parentId),
  );
}
export interface TaskFilters {
  search?: string;
  member?: string;
  label?: string;
  priority?: string;
  status?: string;
  creator?: string;
  due?: string;
  attachments?: boolean;
  subtasks?: boolean;
  completed?: boolean;
}
export function filterTasks(
  tasks: Task[],
  filters: TaskFilters,
  now = today(),
) {
  const search = filters.search?.toLowerCase();
  const parents = filters.subtasks
    ? new Set(tasks.filter(t => !t.completedAt).map(t => t.parentId))
    : undefined;
  return tasks.filter(
    (t) =>
      (!search ||
        `${t.id} ${t.title}`
          .toLowerCase()
          .includes(search)) &&
      (!filters.member || t.assignees.includes(filters.member)) &&
      (!filters.label || t.labels.includes(filters.label)) &&
      (!filters.priority || t.priority === filters.priority) &&
      (!filters.status || t.listId === filters.status) &&
      (!filters.creator || t.creatorId === filters.creator) &&
      (!filters.attachments || t.attachments.length > 0) &&
      (!filters.subtasks ||
        parents!.has(t.id)) &&
      (!filters.completed || !!t.completedAt) &&
      (!filters.due ||
        (filters.due === "overdue"
          ? !!t.dueDate && t.dueDate < now && !t.completedAt
          : filters.due === "today"
            ? t.dueDate === now && !t.completedAt
            : !!t.dueDate && t.dueDate > now && !t.completedAt)),
  );
}
export function moveTask(
  tasks: Task[],
  id: string,
  listId: string,
  beforeId?: string,
  complete = false,
) {
  const found = tasks.find((t) => t.id === id);
  if (!found) return tasks;
  if (complete && isTaskBlocked(found, tasks)) return tasks;
  const moved = {
    ...found,
    listId,
    completedAt: complete
      ? found.completedAt || new Date().toISOString()
      : undefined,
    updatedAt: new Date().toISOString(),
  };
  const rest = tasks.filter((t) => t.id !== id);
  const index = beforeId ? rest.findIndex((t) => t.id === beforeId) : -1;
  if (index >= 0) rest.splice(index, 0, moved);
  else rest.push(moved);
  return rest;
}
export const priorityRank: Record<Priority, number> = {
  Urgent: 4,
  High: 3,
  Medium: 2,
  Low: 1,
  None: 0,
};
export function checklistProgress(task: Task) {
  let done = 0, total = 0;
  for (const checklist of task.checklists)
    for (const item of checklist.items) { total++; if (item.done) done++; }
  return { done, total };
}
