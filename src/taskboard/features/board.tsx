"use client";
import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensors,
  useSensor,
  closestCorners,
  type DragEndEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  SlidersHorizontal,
  ArrowDownUp,
  LayoutGrid,
  List,
  CalendarDays,
  Star,
  ChevronRight,
  Circle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  CircleDot,
  MessageSquare,
  Paperclip,
  ListChecks,
  LockKeyhole,
  GripVertical,
  Archive,
  Trash2,
  Pencil,
  ChevronsRight,
  ChevronLeft,
  Copy,
  X,
  Flag,
  Blocks,
  Bug,
  Code2,
  Globe2,
  Lightbulb,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { useWorkspace } from "@/lib/store";
import type { Task, TaskList } from "@/lib/types";
import {
  AvatarGroup,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  IconButton,
  Menu,
  MenuItem,
  Modal,
  PriorityBadge,
  Select,
} from "@/components/ui";
import {
  checklistProgress,
  dateLabel,
  filterTasks,
  isTaskBlocked,
  moveTask,
  priorityRank,
  today,
  uid,
  visibleTasks,
  type TaskFilters,
} from "@/lib/operations";

export function BoardPage() {
  const ctx = useWorkspace();
  const {
    state,
    setState,
    entityId,
    user,
    can,
    notify,
    requestNewTask,
    navigate,
  } = ctx;
  const board = state.boards.find((b) => b.id === entityId && !b.deleted);
  const space = state.spaces.find((s) => s.id === board?.spaceId && !s.deleted);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState("Manual");
  const [mode, setMode] = useState("board");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editList, setEditList] = useState<TaskList | null>(null);
  const [newList, setNewList] = useState(false);
  const [listName, setListName] = useState("");
  const [deleteList, setDeleteList] = useState<TaskList | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 7 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const lists = state.lists.filter(
    (l) => l.boardId === board?.id && !l.deleted && !l.archived,
  );
  const allTasks = visibleTasks(state).filter((t) => t.boardId === board?.id);
  const tasks = filterTasks(allTasks, filters)
    .filter((t) => !t.parentId)
    .sort((a, b) =>
      sort === "Priority"
        ? priorityRank[b.priority] - priorityRank[a.priority]
        : sort === "Due date"
          ? (a.dueDate || "9999").localeCompare(b.dueDate || "9999")
          : sort === "Created date"
            ? b.createdAt.localeCompare(a.createdAt)
            : sort === "Updated date"
              ? b.updatedAt.localeCompare(a.updatedAt)
              : 0,
    );
  const activeTask = state.tasks.find((t) => t.id === activeId);
  const filterCount = Object.values(filters).filter(Boolean).length;
  const collision: CollisionDetection = (args) =>
    closestCorners({
      ...args,
      droppableContainers: args.droppableContainers.filter((c) =>
        args.active.data.current?.type === "list"
          ? c.data.current?.type === "list"
          : true,
      ),
    });
  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (active.data.current?.type === "list") {
      if (!can("Create Boards")) return;
      const from = state.lists.findIndex((l) => l.id === active.id);
      const to = state.lists.findIndex((l) => l.id === over.id);
      if (from >= 0 && to >= 0)
        setState((prev) => ({
          ...prev,
          lists: arrayMove(prev.lists, from, to),
        }));
    } else {
      const task = state.tasks.find((t) => t.id === active.id);
      if (!task || !ctx.canEditTask(task)) return;
      const targetTask = state.tasks.find((t) => t.id === over.id);
      const targetList = lists.find(
        (l) => l.id === (targetTask?.listId || over.id),
      );
      if (!targetList) return;
      if (/done|complete/i.test(targetList.name) && isTaskBlocked(task, state.tasks)) {
        notify("This task is blocked by unfinished dependencies.", "error");
        return;
      }
      const moved = task.listId !== targetList.id;
      setState((prev) => ({
        ...prev,
        tasks: moveTask(
          prev.tasks,
          task.id,
          targetList.id,
          targetTask?.id,
          /done|complete/i.test(targetList.name),
        ).map((t) =>
          t.id === task.id && moved
            ? {
                ...t,
                activity: [
                  {
                    id: uid("activity"),
                    userId: user.id,
                    text: `moved this task to ${targetList.name}`,
                    createdAt: new Date().toISOString(),
                  },
                  ...t.activity,
                ],
              }
            : t,
        ),
      }));
      if (moved) notify(`Task moved to ${targetList.name}`);
    }
  };
  if (!board || !space)
    return (
      <EmptyState
        title="Board unavailable"
        description="This board may be in Trash, or the link may be out of date."
        action={<Button onClick={() => navigate("home")}>Back to Home</Button>}
      />
    );
  const completed = allTasks.filter((t) => t.completedAt && !t.parentId).length;
  return (
    <div className="board-page">
      <div className="board-heading">
        <div className="board-eyebrow">
          <span className="mini-board-icon">
            {board.icon.startsWith("text:") ? (
              <span className="board-custom-icon">{board.icon.slice(5)}</span>
            ) : board.icon === "bug" ? (
              <Bug size={17} />
            ) : board.icon === "code" ? (
              <Code2 size={17} />
            ) : board.icon === "globe" ? (
              <Globe2 size={17} />
            ) : board.icon === "bulb" ? (
              <Lightbulb size={17} />
            ) : board.icon === "star" ? (
              <Star size={17} />
            ) : board.icon === "calendar" ? (
              <CalendarDays size={17} />
            ) : board.icon === "check" ? (
              <CheckCircle2 size={17} />
            ) : (
              <Blocks size={17} />
            )}
          </span>
          <span>BOARD</span>
          <span className="board-private">
            <LockKeyhole size={11} />
            Private board
          </span>
        </div>
        <div className="board-title-row">
          <div>
            <h1>
              {board.name}
              <button
                className={`favorite-button ${board.favorite ? "is-favorite" : ""}`}
                aria-label={
                  board.favorite
                    ? "Remove board from favorites"
                    : "Favorite board"
                }
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    boards: prev.boards.map((b) =>
                      b.id === board.id ? { ...b, favorite: !b.favorite } : b,
                    ),
                  }))
                }
              >
                <Star
                  size={19}
                  fill={board.favorite ? "currentColor" : "none"}
                />
              </button>
            </h1>
            <p>{board.description}</p>
          </div>
          <div className="board-team">
            <AvatarGroup
              users={state.users
                .filter((u) => space.members.includes(u.id))
                .slice(0, 4)}
              onSelect={ctx.showProfile}
            />
            <Button onClick={() => setMembersOpen(true)}>
              <Users size={14} />
              <span>Members</span>
            </Button>
            <Menu label="Board options">
              <MenuItem
                onSelect={() => {
                  navigator.clipboard
                    ?.writeText(window.location.href)
                    .then(() => notify("Board link copied"))
                    .catch(() => notify("Unable to copy this link", "error"));
                }}
              >
                <Copy size={14} />
                Copy board link
              </MenuItem>
              <MenuItem onSelect={() => navigate("space", space.id)}>
                <ArrowUpRight size={14} />
                Space settings
              </MenuItem>
              <MenuItem onSelect={() => navigate("releases")}>
                <Flag size={14} />
                Plugin releases
              </MenuItem>
            </Menu>
          </div>
        </div>
        <div className="board-meta">
          <span className="status-pulse" />
          Progress
          <span className="meta-divider" />
          <span>{allTasks.filter((t) => !t.parentId).length} tasks</span>
          <span className="meta-divider" />
          <span>{completed} completed</span>
          <span className="board-progress">
            <span
              style={{
                width: `${(completed / Math.max(1, allTasks.filter((t) => !t.parentId).length)) * 100}%`,
              }}
            />
          </span>
        </div>
      </div>
      <div className="board-toolbar">
        <div className="view-tabs" role="group" aria-label="Board view">
          <button
            aria-pressed={mode === "board"}
            className={mode === "board" ? "active" : ""}
            onClick={() => setMode("board")}
          >
            <LayoutGrid size={15} />
            Board
          </button>
          <button
            aria-pressed={mode === "list"}
            className={mode === "list" ? "active" : ""}
            onClick={() => setMode("list")}
          >
            <List size={15} />
            List
          </button>
          <button
            aria-pressed={mode === "calendar"}
            className={mode === "calendar" ? "active" : ""}
            onClick={() => setMode("calendar")}
          >
            <CalendarDays size={15} />
            Calendar
          </button>
        </div>
        <div className="toolbar-actions">
          <button
            aria-pressed={filters.member === user.id}
            className={`toolbar-button only-me ${filters.member === user.id ? "selected" : ""}`}
            onClick={() =>
              setFilters({
                ...filters,
                member: filters.member === user.id ? "" : user.id,
              })
            }
          >
            <span className="tiny-avatar">{user.name[0]}</span>My tasks
          </button>
          <span className="toolbar-divider" />
          <button
            className={`toolbar-button ${filterOpen || filterCount ? "selected" : ""}`}
            aria-expanded={filterOpen}
            aria-controls="board-filters"
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <SlidersHorizontal size={14} />
            Filter
            {filterCount > 0 && (
              <span className="count-pill">{filterCount}</span>
            )}
          </button>
          <Menu
            trigger={
              <>
                <ArrowDownUp size={14} />
                <span className="sort-label">
                  {sort === "Manual" ? "Sort" : sort}
                </span>
              </>
            }
          >
            {[
              "Manual",
              "Priority",
              "Due date",
              "Created date",
              "Updated date",
            ].map((item) => (
              <MenuItem key={item} onSelect={() => setSort(item)}>
                {item}
                {sort === item && <CheckCircle2 size={13} />}
              </MenuItem>
            ))}
          </Menu>
          <Button
            variant="primary"
            onClick={() => requestNewTask()}
            disabled={!can("Create Tasks")}
          >
            <Plus size={16} />
            New task<span className="key-hint">N</span>
          </Button>
        </div>
      </div>
      {filterOpen && (
        <div id="board-filters" className="filter-panel">
          {(
            ["member", "label", "priority", "status", "creator", "due"] as const
          ).map((key) => (
            <Field
              key={key}
              label={
                {
                  member: "Member",
                  label: "Label",
                  priority: "Priority",
                  status: "Status",
                  creator: "Creator",
                  due: "Due date",
                }[key]
              }
            >
              <Select
                aria-label={
                  {
                    member: "Member",
                    label: "Label",
                    priority: "Priority",
                    status: "Status",
                    creator: "Creator",
                    due: "Due date",
                  }[key]
                }
                value={filters[key] || ""}
                onChange={(e) =>
                  setFilters({ ...filters, [key]: e.target.value })
                }
              >
                <option value="">Any</option>
                {(key === "member" || key === "creator"
                  ? state.users.map((u) => [u.id, u.name])
                  : key === "label"
                    ? state.labels.map((l) => [l.id, l.name])
                    : key === "status"
                      ? lists.map((l) => [l.id, l.name])
                      : key === "priority"
                        ? ["None", "Low", "Medium", "High", "Urgent"].map(
                            (p) => [p, p],
                          )
                        : [
                            ["overdue", "Overdue"],
                            ["today", "Due today"],
                            ["upcoming", "Upcoming"],
                          ]
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          ))}
          <div className="filter-checks">
            {(["attachments", "subtasks", "completed"] as const).map((key) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={!!filters[key]}
                  onChange={(e) =>
                    setFilters({ ...filters, [key]: e.target.checked })
                  }
                />
                {
                  {
                    attachments: "Has attachments",
                    subtasks: "Has open subtasks",
                    completed: "Completed",
                  }[key]
                }
              </label>
            ))}
          </div>
          <Button variant="ghost" onClick={() => setFilters({})}>
            <X size={14} />
            Clear filters
          </Button>
        </div>
      )}
      {mode === "board" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={collision}
          onDragStart={(e) => setActiveId(String(e.active.id))}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={lists.map((l) => l.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="kanban" aria-label="Task board">
              {lists.map((list) => (
                <KanbanColumn
                  key={list.id}
                  list={list}
                  tasks={tasks.filter((t) => t.listId === list.id)}
                  onRename={() => {
                    setEditList(list);
                    setListName(list.name);
                  }}
                  onDelete={() => setDeleteList(list)}
                  onArchive={() => {
                    setState((prev) => ({
                      ...prev,
                      lists: prev.lists.map((l) =>
                        l.id === list.id ? { ...l, archived: true } : l,
                      ),
                    }));
                    notify("List archived. Find it in Trash.");
                  }}
                />
              ))}
              {can("Create Boards") && (
                <button
                  className="add-list"
                  onClick={() => {
                    setNewList(true);
                    setListName("");
                  }}
                >
                  <Plus size={16} />
                  Add list
                </button>
              )}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeTask && (
              <div className="drag-card">
                <TaskCard task={activeTask} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : mode === "list" ? (
        <div className="board-list-view">
          <div className="task-table-head">
            <span>Task</span>
            <span>Status</span>
            <span>Priority</span>
            <span>Assignees</span>
            <span>Due date</span>
          </div>
          {tasks.map((task) => (
            <div key={task.id} className="task-table-row">
              <button onClick={() => ctx.openTask(task.id)}>
                <span className="task-id">{task.id}</span>
                <strong>{task.title}</strong>
              </button>
              <Badge>{lists.find((l) => l.id === task.listId)?.name}</Badge>
              <PriorityBadge priority={task.priority} />
              <AvatarGroup
                users={state.users.filter((u) => task.assignees.includes(u.id))}
              />
              <span>{dateLabel(task.dueDate)}</span>
            </div>
          ))}
          {tasks.length === 0 && (
            <EmptyState
              title="No matching tasks"
              description="Try adjusting your filters."
            />
          )}
        </div>
      ) : (
        <BoardCalendar tasks={tasks} />
      )}
      <div className="board-footer">
        <span>
          <LockKeyhole size={11} />
          Your team’s space to build what’s next.
        </span>
        <span>
          <span className="status-pulse" />
          Synced with Enigma Backend
          <span className="meta-divider" />
          Server workspace
        </span>
      </div>
      <Modal
        open={newList || !!editList}
        onClose={() => {
          setNewList(false);
          setEditList(null);
        }}
        title={editList ? "Rename list" : "Create list"}
        description="Keep your workflow clear with a descriptive list name."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!listName.trim()) return;
            setState((prev) => ({
              ...prev,
              lists: editList
                ? prev.lists.map((l) =>
                    l.id === editList.id ? { ...l, name: listName.trim() } : l,
                  )
                : [
                    ...prev.lists,
                    {
                      id: uid("list"),
                      boardId: board.id,
                      name: listName.trim(),
                      color: "#a78bfa",
                    },
                  ],
            }));
            setNewList(false);
            setEditList(null);
            notify(editList ? "List renamed" : "List created");
          }}
        >
          <Field label="List name">
            <input
              autoFocus
              required
              maxLength={60}
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="e.g. Ready to ship"
            />
          </Field>
          <div className="modal-actions">
            <Button
              type="button"
              onClick={() => {
                setNewList(false);
                setEditList(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editList ? "Save name" : "Create list"}
            </Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={!!deleteList}
        onClose={() => setDeleteList(null)}
        title="Move this list to Trash?"
        description="The list and its tasks will be hidden from this board. You can restore them at any time."
        confirmLabel="Move to Trash"
        onConfirm={() => {
          setState((prev) => ({
            ...prev,
            lists: prev.lists.map((l) =>
              l.id === deleteList?.id ? { ...l, deleted: true } : l,
            ),
          }));
          notify("List moved to Trash");
        }}
      />
      <Modal
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        title="Board members"
        description={`${space.name} · ${space.members.length} members`}
      >
        <div className="board-member-list">
          {state.users
            .filter((u) => space.members.includes(u.id))
            .map((member) => (
              <button
                key={member.id}
                onClick={() => {
                  setMembersOpen(false);
                  ctx.showProfile(member.id);
                }}
              >
                <AvatarGroup users={[member]} />
                <span>
                  <strong>{member.name}</strong>
                  <small>
                    @{member.username} · {member.presence}
                  </small>
                </span>
                <Badge>{member.role}</Badge>
                <ChevronRight size={15} />
              </button>
            ))}
        </div>
        {can("Manage Members") && (
          <Button
            onClick={() => {
              setMembersOpen(false);
              navigate("space", space.id);
            }}
          >
            Manage space members
            <ArrowUpRight size={14} />
          </Button>
        )}
      </Modal>
    </div>
  );
}

function KanbanColumn({
  list,
  tasks,
  onRename,
  onDelete,
  onArchive,
}: {
  list: TaskList;
  tasks: Task[];
  onRename: () => void;
  onDelete: () => void;
  onArchive: () => void;
}) {
  const { can, setState, requestNewTask } = useWorkspace();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: list.id,
    data: { type: "list" },
    disabled: !can("Create Boards"),
  });
  const StatusIcon = /done/i.test(list.name)
    ? CheckCircle2
    : /progress/i.test(list.name)
      ? CircleDot
      : /review/i.test(list.name)
        ? Clock3
        : /backlog/i.test(list.name)
          ? CircleDashed
          : Circle;
  return (
    <section
      ref={setNodeRef}
      style={
        {
          transform: CSS.Transform.toString(transform),
          transition,
          "--column-color": list.color,
        } as React.CSSProperties
      }
      className={`kanban-column ${isDragging ? "dragging" : ""} ${isOver ? "drag-over" : ""} ${list.collapsed ? "collapsed-column" : ""}`}
      aria-label={`${list.name} list`}
    >
      <div className="column-heading">
        <button
          className="list-drag-handle"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${list.name} list`}
          disabled={!can("Create Boards")}
        >
          <StatusIcon size={15} />
        </button>
        <h2>{list.name}</h2>
        <span className="column-count">{tasks.length}</span>
        <button
          className="list-collapse-toggle"
          aria-label={`${list.collapsed ? "Expand" : "Collapse"} ${list.name} list`}
          aria-expanded={!list.collapsed}
          onClick={() => setState((prev) => ({
            ...prev,
            lists: prev.lists.map((item) =>
              item.id === list.id
                ? { ...item, collapsed: !item.collapsed }
                : item,
            ),
          }))}
        >
          {list.collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
        <div className="column-actions">
          <Menu label={`${list.name} list options`}>
            <MenuItem onSelect={onRename} disabled={!can("Create Boards")}>
              <Pencil size={14} />
              Rename list
            </MenuItem>
            <MenuItem
              onSelect={() =>
                setState((prev) => ({
                  ...prev,
                  lists: prev.lists.map((l) =>
                    l.id === list.id ? { ...l, collapsed: !l.collapsed } : l,
                  ),
                }))
              }
            >
              <ChevronsRight size={14} />
              {list.collapsed ? "Expand" : "Collapse"} list
            </MenuItem>
            <MenuItem onSelect={onArchive} disabled={!can("Create Boards")}>
              <Archive size={14} />
              Archive list
            </MenuItem>
            <MenuItem
              onSelect={onDelete}
              danger
              disabled={!can("Create Boards")}
            >
              <Trash2 size={14} />
              Delete list
            </MenuItem>
          </Menu>
          <IconButton
            label={`Add task to ${list.name}`}
            onClick={() => requestNewTask(list.id)}
            disabled={!can("Create Tasks")}
          >
            <Plus size={15} />
          </IconButton>
        </div>
      </div>
      {!list.collapsed && (
        <>
          <SortableContext
            items={tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="column-tasks">
              {tasks.map((task) => (
                <SortableTask key={task.id} task={task} />
              ))}
              {tasks.length === 0 && (
                <div className="empty-column">
                  <span>No tasks</span>
                  <small>Drop a task here or add one below.</small>
                </div>
              )}
            </div>
          </SortableContext>
          <button
            className="add-task"
            onClick={() => requestNewTask(list.id)}
            disabled={!can("Create Tasks")}
          >
            <Plus size={14} />
            Add task
          </button>
        </>
      )}
    </section>
  );
}
function SortableTask({ task }: { task: Task }) {
  const { canEditTask } = useWorkspace();
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
    attributes,
    listeners,
  } = useSortable({
    id: task.id,
    data: { type: "task", listId: task.listId },
    disabled: !canEditTask(task),
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "task-is-dragging" : ""}
    >
      <TaskCard
        task={task}
        dragAttributes={canEditTask(task) ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  );
}
export function TaskCard({
  task,
  dragAttributes,
}: {
  task: Task;
  dragAttributes?: Record<string, unknown>;
}) {
  const { state, openTask, showProfile } = useWorkspace();
  const progress = checklistProgress(task);
  const overdue = task.dueDate && task.dueDate < today() && !task.completedAt;
  const dueToday = task.dueDate === today() && !task.completedAt;
  const blocked = isTaskBlocked(task, state.tasks);
  return (
    <article
      className={`task-card ${task.completedAt ? "task-completed" : ""}`}
      data-task-id={task.id}
      {...dragAttributes}
      onClick={(event) => {
        if (event.defaultPrevented || (event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
        openTask(task.id);
      }}
    >
      {task.cover && (
        <button
          className={`task-cover cover-${task.cover}`}
          onClick={() => openTask(task.id)}
          aria-label={`Open ${task.title}`}
        >
          <span className="cover-orbit orbit-one" />
          <span className="cover-orbit orbit-two" />
          <span className="cover-art">
            <Blocks size={23} />
            <span>
              {task.cover === "inventory"
                ? "A better view."
                : "Make it feel Enigma."}
              <small>
                {task.cover === "inventory"
                  ? "INVENTORY, REIMAGINED"
                  : "DESIGN EXPLORATION · 02"}
              </small>
            </span>
          </span>
          <span className="cover-dot-grid" />
        </button>
      )}
      <div className="task-card-body">
        <button className="task-title" onClick={() => openTask(task.id)}>
          {task.title}
        </button>
        <div className="card-top">
          <span className="task-id">{task.id}</span>
          <span className="card-top-right">
            {task.restricted && (
              <LockKeyhole size={11} aria-label="Restricted task" />
            )}
            <PriorityBadge priority={task.priority} />
            {dragAttributes && <GripVertical size={14} className="task-drag-handle" aria-hidden="true" />}
          </span>
        </div>
        {blocked && (
          <span className="blocked-label">
            <LockKeyhole size={10} />
            Blocked
          </span>
        )}
        <div className="card-labels">
          {task.labels.slice(0, 3).map((id) => {
            const label = state.labels.find((l) => l.id === id);
            return (
              label && (
                <Badge key={id} color={label.color}>
                  {label.name}
                </Badge>
              )
            );
          })}
          {task.labels.length > 3 && (
            <span className="subtle">+{task.labels.length - 3}</span>
          )}
        </div>
        <div className="card-footer">
          <AvatarGroup
            users={state.users.filter((u) => task.assignees.includes(u.id))}
            onSelect={showProfile}
            max={3}
          />
          <div className="card-details">
            {progress.total > 0 && (
              <span
                data-tooltip="Checklist progress"
                data-tooltip-placement="top"
                className={
                  progress.done === progress.total ? "checklist-done" : ""
                }
              >
                <ListChecks size={12} />
                {progress.done}/{progress.total}
              </span>
            )}
            {task.comments.length > 0 && (
              <span data-tooltip="Comments" data-tooltip-placement="top">
                <MessageSquare size={12} />
                {task.comments.length}
              </span>
            )}
            {task.attachments.length > 0 && (
              <span data-tooltip="Attachments" data-tooltip-placement="top">
                <Paperclip size={12} />
                {task.attachments.length}
              </span>
            )}
          </div>
        </div>
        {task.dueDate && (
          <div
            className={`card-date ${overdue ? "overdue" : dueToday ? "due-today" : ""}`}
          >
            {task.completedAt ? (
              <CheckCircle2 size={11} />
            ) : (
              <CalendarDays size={11} />
            )}
            <span>
              {task.completedAt
                ? "Completed"
                : dueToday
                  ? "Today"
                  : dateLabel(task.dueDate)}
            </span>
            {overdue && <span className="overdue-label">Overdue</span>}
          </div>
        )}
      </div>
    </article>
  );
}
function BoardCalendar({ tasks }: { tasks: Task[] }) {
  const { openTask } = useWorkspace();
  const [monthOffset, setMonthOffset] = useState(0);
  const date = new Date();
  date.setMonth(date.getMonth() + monthOffset, 1);
  const month = date.getMonth();
  const start = new Date(date);
  start.setDate(1 - ((date.getDay() + 6) % 7));
  return (
    <div className="board-calendar">
      <div className="calendar-heading">
        <h2>
          {date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h2>
        <div>
          <Button onClick={() => setMonthOffset(monthOffset - 1)}>
            Previous
          </Button>
          <Button onClick={() => setMonthOffset(0)}>Today</Button>
          <Button onClick={() => setMonthOffset(monthOffset + 1)}>Next</Button>
        </div>
      </div>
      <div className="calendar-grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className="calendar-day-name">
            {day}
          </div>
        ))}
        {Array.from({ length: 35 }, (_, i) => {
          const day = new Date(start);
          day.setDate(start.getDate() + i);
          const key = day.toLocaleDateString("en-CA");
          return (
            <div
              key={key}
              className={`calendar-day ${day.getMonth() !== month ? "other-month" : ""} ${key === today() ? "is-today" : ""}`}
            >
              <span>{day.getDate()}</span>
              {tasks
                .filter((t) => t.dueDate === key)
                .map((task) => (
                  <button key={task.id} onClick={() => openTask(task.id)}>
                    <PriorityBadge priority={task.priority} compact />
                    <span>{task.title}</span>
                  </button>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
