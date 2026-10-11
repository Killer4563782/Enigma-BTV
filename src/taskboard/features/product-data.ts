import type { AppState, Task } from "@/lib/types";

export type TrashKind = "Task" | "List" | "Board" | "Space";
export interface TrashItem {
  id: string;
  kind: TrashKind;
  name: string;
  location: string;
}

export function activeTasks(state: AppState): Task[] {
  // Index once per selection instead of scanning the workspace for every task.
  const boards = new Map(state.boards.map(board => [board.id, board]));
  const lists = new Map(state.lists.map(list => [list.id, list]));
  const tasks = new Map(state.tasks.map(task => [task.id, task]));
  const spaces = new Set(state.spaces.filter(space => !space.deleted).map(space => space.id));
  return state.tasks.filter((task) => {
    if (task.deleted || task.archived) return false;
    const board = boards.get(task.boardId);
    const list = lists.get(task.listId);
    if (!board || board.deleted || !list || list.deleted || list.archived)
      return false;
    if (!spaces.has(board.spaceId)) return false;
    if (!task.parentId) return true;
    const visited = new Set<string>([task.id]);
    let parentId: Task["parentId"] = task.parentId;
    while (parentId) {
      if (visited.has(parentId)) return false;
      visited.add(parentId);
      const parent = tasks.get(parentId);
      if (!parent || parent.deleted || parent.archived) return false;
      parentId = parent.parentId;
    }
    return true;
  });
}

export function isComplete(task: Task, state: AppState) {
  return (
    Boolean(task.completedAt) ||
    /^(done|complete|completed)$/i.test(
      state.lists.find((item) => item.id === task.listId)?.name || "",
    )
  );
}

export function trashItems(state: AppState): TrashItem[] {
  const boardName = (id: string) =>
    state.boards.find((item) => item.id === id)?.name || "Deleted board";
  return [
    ...state.tasks
      .filter((item) => item.deleted)
      .map((item) => ({
        id: item.id,
        kind: "Task" as const,
        name: item.title,
        location: boardName(item.boardId),
      })),
    ...state.lists
      .filter((item) => item.deleted)
      .map((item) => ({
        id: item.id,
        kind: "List" as const,
        name: item.name,
        location: boardName(item.boardId),
      })),
    ...state.boards
      .filter((item) => item.deleted)
      .map((item) => ({
        id: item.id,
        kind: "Board" as const,
        name: item.name,
        location:
          state.spaces.find((space) => space.id === item.spaceId)?.name ||
          "Deleted space",
      })),
    ...state.spaces
      .filter((item) => item.deleted)
      .map((item) => ({
        id: item.id,
        kind: "Space" as const,
        name: item.name,
        location: "Workspace",
      })),
  ];
}

export function restoreItem(
  state: AppState,
  item: Pick<TrashItem, "id" | "kind">,
): AppState {
  const tasks = new Set<string>();
  const lists = new Set<string>();
  const boards = new Set<string>();
  const spaces = new Set<string>();
  const includeBoard = (id: string) => {
    boards.add(id);
    const board = state.boards.find((value) => value.id === id);
    if (board) spaces.add(board.spaceId);
  };
  const includeTask = (id: string) => {
    if (tasks.has(id)) return;
    tasks.add(id);
    const task = state.tasks.find((value) => value.id === id);
    if (!task) return;
    lists.add(task.listId);
    includeBoard(task.boardId);
    if (task.parentId) includeTask(task.parentId);
  };
  if (item.kind === "Task") includeTask(item.id);
  if (item.kind === "List") {
    lists.add(item.id);
    const list = state.lists.find((value) => value.id === item.id);
    if (list) includeBoard(list.boardId);
  }
  if (item.kind === "Board") includeBoard(item.id);
  if (item.kind === "Space") spaces.add(item.id);
  return {
    ...state,
    tasks: state.tasks.map((value) =>
      tasks.has(value.id)
        ? { ...value, deleted: false, archived: false }
        : value,
    ),
    lists: state.lists.map((value) =>
      lists.has(value.id)
        ? { ...value, deleted: false, archived: false }
        : value,
    ),
    boards: state.boards.map((value) =>
      boards.has(value.id) ? { ...value, deleted: false } : value,
    ),
    spaces: state.spaces.map((value) =>
      spaces.has(value.id) ? { ...value, deleted: false } : value,
    ),
  };
}

export function permanentlyDeleteItem(
  state: AppState,
  item: Pick<TrashItem, "id" | "kind">,
): AppState {
  const spaces = new Set(item.kind === "Space" ? [item.id] : []);
  const boards = new Set(
    state.boards
      .filter(
        (value) =>
          spaces.has(value.spaceId) ||
          (item.kind === "Board" && value.id === item.id),
      )
      .map((value) => value.id),
  );
  const lists = new Set(
    state.lists
      .filter(
        (value) =>
          boards.has(value.boardId) ||
          (item.kind === "List" && value.id === item.id),
      )
      .map((value) => value.id),
  );
  const tasks = new Set(
    state.tasks
      .filter(
        (value) =>
          boards.has(value.boardId) ||
          lists.has(value.listId) ||
          (item.kind === "Task" && value.id === item.id),
      )
      .map((value) => value.id),
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const task of state.tasks)
      if (task.parentId && tasks.has(task.parentId) && !tasks.has(task.id)) {
        tasks.add(task.id);
        changed = true;
      }
  }
  return {
    ...state,
    spaces: state.spaces.filter((value) => !spaces.has(value.id)),
    boards: state.boards.filter((value) => !boards.has(value.id)),
    lists: state.lists.filter((value) => !lists.has(value.id)),
    tasks: state.tasks
      .filter((value) => !tasks.has(value.id))
      .map((value) => ({
        ...value,
        blockedBy: value.blockedBy.filter((id) => !tasks.has(id)),
        relatedIds: value.relatedIds.filter((id) => !tasks.has(id)),
      })),
    notifications: state.notifications.filter(
      (value) => !value.taskId || !tasks.has(value.taskId),
    ),
  };
}
