"use client";
import { ProfileBanner } from "@/components/profile-banner";

import { useState, type ReactNode, type CSSProperties } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BellOff,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleDashed,
  Clock3,
  Code2,
  Folder,
  GitBranch,
  Github,
  Layers3,
  LayoutGrid,
  ListTodo,
  MessageSquare,
  Pencil,
  Plus,
  Rocket,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trash2,
  Undo2,
  Users,
  X,
} from "lucide-react";
import {
  Avatar,
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
  PageHeading,
  PriorityBadge,
  Progress,
  Select,
  Tabs,
} from "@/components/ui";
import { useWorkspace } from "@/lib/store";
import type { Activity, Board, Notification, Task } from "@/lib/types";
import {
  activeTasks,
  isComplete,
  permanentlyDeleteItem,
  restoreItem,
  trashItems,
  type TrashItem,
} from "./product-data";
import "./product-pages.css";

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function formatDate(value: string, full = false) {
  if (!value) return "No date";
  return new Date(
    value.length === 10 ? `${value}T12:00:00` : value,
  ).toLocaleDateString("en-US", {
    month: full ? "long" : "short",
    day: "numeric",
    ...(full ? { year: "numeric" as const } : {}),
  });
}
function timeAgo(value: string) {
  if (!value) return "No recent activity";
  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 60000),
  );
  return minutes < 1
    ? "Just now"
    : minutes < 60
      ? `${minutes}m ago`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)}h ago`
        : `${Math.floor(minutes / 1440)}d ago`;
}
function nextId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
function BoardGlyph({
  board,
  large = false,
}: {
  board: Pick<Board, "color" | "name" | "icon">;
  large?: boolean;
}) {
  return (
    <span
      className={`product-board-glyph ${large ? "large" : ""}`}
      style={{ "--board-color": board.color } as CSSProperties}
    >
      {board.icon.startsWith("text:") ? (
        <span className="product-board-custom-icon">{board.icon.slice(5)}</span>
      ) : /code|plugin/i.test(board.icon) ? (
        <Code2 size={large ? 24 : 18} />
      ) : /bug/i.test(board.icon) ? (
        <Target size={large ? 24 : 18} />
      ) : /web|globe/i.test(board.icon) ? (
        <Layers3 size={large ? 24 : 18} />
      ) : board.icon === "star" ? (
        <Star size={large ? 24 : 18} />
      ) : board.icon === "calendar" ? (
        <CalendarDays size={large ? 24 : 18} />
      ) : board.icon === "check" ? (
        <Check size={large ? 24 : 18} />
      ) : board.icon === "bulb" ? (
        <Sparkles size={large ? 24 : 18} />
      ) : (
        <LayoutGrid size={large ? 24 : 18} />
      )}
    </span>
  );
}

function TaskRows({
  tasks,
  editable = false,
  showBoard = true,
}: {
  tasks: Task[];
  editable?: boolean;
  showBoard?: boolean;
}) {
  const { state, openTask, canEditTask, updateTask, notify } = useWorkspace();
  return (
    <div className="product-task-rows">
      {tasks.map((task) => {
        const list = state.lists.find((item) => item.id === task.listId);
        const board = state.boards.find((item) => item.id === task.boardId);
        const done = isComplete(task, state);
        const overdue = Boolean(
          task.dueDate && task.dueDate < today() && !done,
        );
        const dueToday = task.dueDate === today() && !done;
        return (
          <div
            key={task.id}
            className={`product-task-row ${done ? "is-complete" : ""}`}
          >
            <button
              className="product-task-name"
              onClick={() => openTask(task.id)}
            >
              {done ? (
                <CheckCircle2 size={17} className="product-success" />
              ) : list?.name === "In Progress" ? (
                <CircleDashed size={17} className="product-accent" />
              ) : (
                <Circle size={17} />
              )}
              <span>
                <span className="product-task-title">{task.title}</span>
                <span className="product-task-subtitle">
                  {task.id}
                  {showBoard && board && (
                    <>
                      {" "}
                      <span>·</span> {board.name}
                    </>
                  )}
                </span>
              </span>
            </button>
            <div className="product-task-row-meta">
              <PriorityBadge priority={task.priority} compact />
              {editable && canEditTask(task) ? (
                <Select
                  className="product-status-select"
                  aria-label={`Status for ${task.title}`}
                  value={task.listId}
                  onChange={(event) => {
                    const destination = state.lists.find(
                      (item) => item.id === event.target.value,
                    );
                    if (
                      /^(done|complete|completed)$/i.test(destination?.name || "") &&
                      task.blockedBy.some((id) =>
                        state.tasks.some(
                          (candidate) => candidate.id === id && !candidate.completedAt && !candidate.deleted,
                        ),
                      )
                    ) {
                      notify("This task is blocked by unfinished dependencies.", "error");
                      return;
                    }
                    updateTask(
                      task.id,
                      {
                        listId: event.target.value,
                        completedAt: /^(done|complete|completed)$/i.test(
                          destination?.name || "",
                        )
                          ? new Date().toISOString()
                          : undefined,
                      },
                      `moved this task to ${destination?.name}`,
                    );
                  }}
                >
                  {state.lists
                    .filter(
                      (item) =>
                        item.boardId === task.boardId &&
                        !item.deleted &&
                        !item.archived,
                    )
                    .map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                        disabled={
                          /^(done|complete|completed)$/i.test(item.name) &&
                          task.blockedBy.some((id) =>
                            state.tasks.some(
                              (candidate) => candidate.id === id && !candidate.completedAt && !candidate.deleted,
                            ),
                          )
                        }
                      >
                        {item.name}
                      </option>
                    ))}
                </Select>
              ) : (
                <span className="product-list-status">
                  <i style={{ background: list?.color || "var(--muted)" }} />
                  {list?.name}
                </span>
              )}
              {task.dueDate && (
                <span
                  className={`product-date ${overdue ? "overdue" : dueToday ? "today" : ""}`}
                >
                  <CalendarDays size={12} />
                  {dueToday ? "Today" : formatDate(task.dueDate)}
                </span>
              )}
              <AvatarGroup
                users={state.users.filter((member) =>
                  task.assignees.includes(member.id),
                )}
                max={2}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActivityFeed({
  activities,
  limit = 5,
}: {
  activities: Activity[];
  limit?: number;
}) {
  const { state, showProfile, openTask } = useWorkspace();
  return activities.length ? (
    <div className="product-activity">
      {activities.slice(0, limit).map((activity, index) => {
        const actor = state.users.find(
          (member) => member.id === activity.userId,
        );
        return (
          <div
            className="product-activity-item"
            key={`${activity.id}-${index}`}
          >
            <Avatar
              user={actor}
              size={29}
              onClick={() => showProfile(activity.userId)}
            />
            <div>
              <p>
                <strong>
                  {actor?.name || actor?.username || "A teammate"}
                </strong>{" "}
                {activity.text}
              </p>
              {activity.taskId && (
                <button
                  className="product-text-link"
                  onClick={() => openTask(activity.taskId!)}
                >
                  {activity.taskId}
                  <ArrowUpRight size={11} />
                </button>
              )}
              <time>{timeAgo(activity.createdAt)}</time>
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <p className="product-subtle-empty">
      Activity will appear as your team makes progress.
    </p>
  );
}

export function HomePage() {
  const { state, user, navigate, requestNewTask, can } = useWorkspace();
  const tasks = activeTasks(state);
  const mine = tasks.filter((task) => task.assignees.includes(user.id));
  const completed = mine.filter((task) => isComplete(task, state));
  const pending = mine.filter((task) => !isComplete(task, state));
  const overdue = pending.filter(
    (task) => task.dueDate && task.dueDate < today(),
  );
  const dueToday = pending.filter((task) => task.dueDate === today());
  const inProgress = pending.filter((task) =>
    /progress/i.test(
      state.lists.find((list) => list.id === task.listId)?.name || "",
    ),
  );
  const boards = state.boards
    .filter(
      (board) =>
        !board.deleted &&
        state.spaces.some(
          (space) =>
            space.id === board.spaceId &&
            !space.deleted &&
            space.members.includes(user.id),
        ),
    )
    .sort((a, b) => Number(b.favorite) - Number(a.favorite))
    .slice(0, 3);
  const upcoming = pending
    .filter((task) => task.dueDate && task.dueDate >= today())
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3);
  const completion = mine.length
    ? Math.round((completed.length / mine.length) * 100)
    : 0;
  const hour = new Date().getHours();
  return (
    <div className="product-page product-home">
      <PageHeading
        eyebrow={new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
        title={`Good ${hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}, ${user.name.split(" ")[0] || user.username}`}
        description="A little clarity. A lot of possibility. Let's move things forward."
        actions={
          can("Create Tasks") && (
            <Button variant="primary" onClick={() => requestNewTask()}>
              <Plus size={16} />
              Create task
            </Button>
          )
        }
      />
      <div className="product-overview-strip">
        {[
          {
            label: "Overdue",
            target: "overdue",
            value: overdue.length,
            icon: Clock3,
            color: "#f18b91",
            detail: "Needs your attention",
          },
          {
            label: "Due today",
            target: "due-today",
            value: dueToday.length,
            icon: CalendarDays,
            color: "#e6b874",
            detail: "On your radar",
          },
          {
            label: "In progress",
            target: "in-progress",
            value: inProgress.length,
            icon: CircleDashed,
            color: "var(--accent-light)",
            detail: "Moving things forward",
          },
          {
            label: "Completed",
            target: "completed",
            value: completed.length,
            icon: CheckCircle2,
            color: "#78c9a6",
            detail: "One step closer",
          },
        ].map((metric) => (
          <button
            key={metric.label}
            className="product-metric"
            onClick={() => navigate("my-tasks", metric.target)}
          >
            <span className="product-metric-top">
              <metric.icon size={16} style={{ color: metric.color }} />
              {metric.label}
              <ArrowUpRight size={13} />
            </span>
            <strong>{metric.value.toString().padStart(2, "0")}</strong>
            <small>{metric.detail}</small>
          </button>
        ))}
      </div>
      <div className="product-home-columns">
        <div className="product-home-main">
          <section className="product-section">
            <div className="product-section-heading">
              <h2>
                Your focus <span>{pending.length}</span>
              </h2>
              <button
                className="product-text-link"
                onClick={() => navigate("my-tasks")}
              >
                View my tasks
                <ArrowRight size={14} />
              </button>
            </div>
            <div className="product-focus-note">
              <span className="product-tiny-star">
                <Sparkles size={14} />
              </span>
              <span>
                {overdue.length
                  ? `${overdue.length} ${overdue.length === 1 ? "task needs" : "tasks need"} a little extra attention. A good place to start.`
                  : "Make room for your most meaningful work today."}
              </span>
            </div>
            {pending.length ? (
              <TaskRows
                tasks={[...pending]
                  .sort((a, b) =>
                    (a.dueDate || "9999").localeCompare(b.dueDate || "9999"),
                  )
                  .slice(0, 5)}
              />
            ) : (
              <EmptyState
                title="A clear runway"
                description="You're all caught up. Create a task when inspiration strikes."
                action={
                  can("Create Tasks") && (
                    <Button onClick={() => requestNewTask()}>
                      <Plus size={14} />
                      Create task
                    </Button>
                  )
                }
              />
            )}
          </section>
          <section className="product-section">
            <div className="product-section-heading">
              <h2>Your boards</h2>
              <span className="product-caption">
                Pick up where you left off
              </span>
            </div>
            <div className="product-board-grid product-home-boards">
              {boards.map((board) => {
                const boardTasks = tasks.filter(
                  (task) => task.boardId === board.id,
                );
                const done = boardTasks.filter((task) =>
                  isComplete(task, state),
                ).length;
                return (
                  <button
                    key={board.id}
                    className="product-board-card"
                    onClick={() => navigate("board", board.id)}
                  >
                    <div
                      className="product-board-art"
                      style={{ "--board-color": board.color } as CSSProperties}
                    >
                      <BoardGlyph board={board} large />
                      {board.favorite && <Star size={13} />}
                      <span className="product-art-line one" />
                      <span className="product-art-line two" />
                      <span className="product-art-line three" />
                    </div>
                    <div className="product-board-card-body">
                      <span className="product-board-space">
                        {
                          state.spaces.find(
                            (space) => space.id === board.spaceId,
                          )?.name
                        }
                      </span>
                      <h3>
                        {board.name}
                        <ArrowUpRight size={15} />
                      </h3>
                      <div className="product-board-summary">
                        <span>{boardTasks.length} tasks</span>
                        <span>{done} completed</span>
                      </div>
                      <Progress
                        value={
                          boardTasks.length
                            ? (done / boardTasks.length) * 100
                            : 0
                        }
                      />
                    </div>
                  </button>
                );
              })}
            </div>
            {!boards.length && (
              <EmptyState
                title="Your workspace starts here"
                description="Create a space from the sidebar to bring your projects together."
              />
            )}
          </section>
        </div>
        <aside className="product-home-aside">
          <section className="product-progress-card">
            <div className="product-section-heading">
              <h2>Your momentum</h2>
              <Target size={17} />
            </div>
            <div className="product-progress-visual">
              <div
                className="product-progress-ring"
                style={{ "--progress": `${completion}%` } as CSSProperties}
              >
                <span>
                  <strong>
                    {completion}
                    <small>%</small>
                  </strong>
                  <span>completed</span>
                </span>
              </div>
              <div>
                <strong>
                  {completed.length} of {mine.length}
                </strong>
                <span>
                  assigned tasks
                  <br />
                  brought across the line
                </span>
              </div>
            </div>
            <p>
              {completion >= 60
                ? "Good things happen one task at a time. Keep it going."
                : "Every small step counts. You have everything you need."}
            </p>
          </section>
          <section className="product-section product-deadlines">
            <div className="product-section-heading">
              <h2>Coming up</h2>
              <CalendarDays size={15} />
            </div>
            {upcoming.length ? (
              upcoming.map((task) => <DeadlineRow key={task.id} task={task} />)
            ) : (
              <p className="product-subtle-empty">
                No upcoming deadlines. Room to think ahead.
              </p>
            )}
          </section>

        </aside>
      </div>
    </div>
  );
}

function DeadlineRow({ task }: { task: Task }) {
  const { openTask, state } = useWorkspace();
  const date = new Date(`${task.dueDate}T12:00:00`);
  return (
    <button className="product-deadline" onClick={() => openTask(task.id)}>
      <span
        className={`product-date-tile ${task.dueDate === today() ? "is-today" : ""}`}
      >
        <small>{date.toLocaleDateString("en-US", { month: "short" })}</small>
        <strong>{date.getDate()}</strong>
      </span>
      <span>
        <strong>{task.title}</strong>
        <small>
          {state.boards.find((board) => board.id === task.boardId)?.name}
        </small>
      </span>
      <ChevronRight size={13} />
    </button>
  );
}

export function SpacePage() {
  const { state, setState, entityId, navigate, can, notify, showProfile } =
    useWorkspace();
  const space = state.spaces.find(
    (item) => item.id === entityId && !item.deleted,
  );
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const [tab, setTab] = useState<"Overview" | "Members" | "Activity">(
    "Overview",
  );
  const [editor, setEditor] = useState<"space" | "board" | null>(null);
  const [editingBoard, setEditingBoard] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#a78bfa");
  const [icon, setIcon] = useState("layout");
  const [members, setMembers] = useState<string[]>([]);
  const [remove, setRemove] = useState<{
    kind: "Board" | "Space";
    id: string;
    name: string;
  } | null>(null);
  if (!space)
    return (
      <div className="product-page">
        <EmptyState
          title="This space isn't available"
          description="It may have been moved to Trash."
          action={<Button onClick={() => navigate("home")}>Back home</Button>}
        />
      </div>
    );
  const spaceBoards = state.boards.filter(
    (board) => board.spaceId === space.id && !board.deleted,
  );
  const tasks = activeTasks(state).filter((task) =>
    spaceBoards.some((board) => board.id === task.boardId),
  );
  const completed = tasks.filter((task) => isComplete(task, state)).length;
  const activities = tasks
    .flatMap((task) =>
      task.activity.map((activity) => ({
        ...activity,
        taskId: activity.taskId || task.id,
      })),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const openEditor = (board?: Board) => {
    setEditor("board");
    setEditingBoard(board?.id || null);
    setName(board?.name || "");
    setDescription(board?.description || "");
    setColor(board?.color || space.color);
    setIcon(board?.icon || "layout");
  };
  const save = () => {
    if (!name.trim()) return;
    if (editor === "space" && can("Manage Settings"))
      setState((previous) => ({
        ...previous,
        spaces: previous.spaces.map((value) =>
          value.id === space.id
            ? {
                ...value,
                name: name.trim(),
                description: description.trim(),
                color,
                ...(can("Manage Members") ? { members } : {}),
              }
            : value,
        ),
      }));
    if (editor === "board" && can("Create Boards")) {
      const id = editingBoard || nextId("board");
      setState((previous) => ({
        ...previous,
        boards: editingBoard
          ? previous.boards.map((value) =>
              value.id === id
                ? {
                    ...value,
                    name: name.trim(),
                    description: description.trim(),
                    color,
                    icon,
                  }
                : value,
            )
          : [
              ...previous.boards,
              {
                id,
                spaceId: space.id,
                name: name.trim(),
                description: description.trim(),
                color,
                icon,
                favorite: false,
              },
            ],
        lists: editingBoard
          ? previous.lists
          : [
              ...previous.lists,
              ...["Backlog", "To Do", "In Progress", "Review", "Done"].map(
                (listName, index) => ({
                  id: nextId("list"),
                  boardId: id,
                  name: listName,
                  color: [
                    "#797583",
                    "#a4a0af",
                    "#a78bfa",
                    "#dfb876",
                    "#79c6a4",
                  ][index],
                }),
              ),
            ],
      }));
    }
    notify(
      editor === "space"
        ? "Space updated"
        : editingBoard
          ? "Board updated"
          : "Board created",
    );
    setEditor(null);
  };
  return (
    <div className="product-page">
      <div className="product-space-heading">
        <span
          className="product-space-emblem"
          style={{
            color: space.color,
            background: `color-mix(in srgb, ${space.color} 12%, transparent)`,
          }}
        >
          <Layers3 size={29} />
        </span>
        <PageHeading
          eyebrow="WORKSPACE / SPACES"
          title={space.name}
          description={space.description}
          actions={
            <>
              <AvatarGroup
                users={state.users.filter((member) =>
                  space.members.includes(member.id),
                )}
                onSelect={showProfile}
              />
              {can("Manage Settings") && (
                <IconButton
                  label="Space settings"
                  onClick={() => {
                    setEditor("space");
                    setName(space.name);
                    setDescription(space.description);
                    setColor(space.color);
                    setMembers(space.members);
                  }}
                >
                  <Settings2 size={17} />
                </IconButton>
              )}
              {can("Create Boards") && (
                <Button variant="primary" onClick={() => openEditor()}>
                  <Plus size={16} />
                  New board
                </Button>
              )}
            </>
          }
        />
      </div>
      <div className="product-space-meta">
        <span>
          <LayoutGrid size={14} />
          {spaceBoards.length} boards
        </span>
        <span>
          <Users size={14} />
          {space.members.length} members
        </span>
        <span>
          <CheckCircle2 size={14} />
          {completed} of {tasks.length} tasks completed
        </span>
      </div>
      <Tabs
        items={["Overview", "Members", "Activity"]}
        value={tab}
        onChange={setTab}
      />
      {tab === "Overview" && (
        <>
          <div className="product-section-heading product-space-section-heading">
            <h2>
              Boards <span>{spaceBoards.length}</span>
            </h2>
            <span className="product-caption">One space. Shared momentum.</span>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
            if (!over || active.id === over.id || !can("Create Boards")) return;
            setState((previous) => {
              const ordered = previous.boards.filter((board) => board.spaceId === space.id && !board.deleted);
              const moved = arrayMove(ordered, ordered.findIndex((board) => board.id === active.id), ordered.findIndex((board) => board.id === over.id));
              let index = 0;
              return { ...previous, boards: previous.boards.map((board) => board.spaceId === space.id && !board.deleted ? moved[index++] : board) };
            });
          }}>
          <SortableContext items={spaceBoards.map((board) => board.id)} strategy={rectSortingStrategy}>
          <div className="product-board-grid product-space-boards">
            {spaceBoards.map((board) => {
              const boardTasks = tasks.filter(
                (task) => task.boardId === board.id,
              );
              const done = boardTasks.filter((task) =>
                isComplete(task, state),
              ).length;
              const participants = state.users.filter((member) =>
                boardTasks.some((task) => task.assignees.includes(member.id)),
              );
              return (
                <SortableBoard key={board.id} board={board} editable={can("Create Boards")} open={() => navigate("board", board.id)}>
                  <div className="product-space-board-top">
                    <BoardGlyph board={board} large />
                    <div>
                      <IconButton
                        label={
                          board.favorite
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                        onClick={() =>
                          setState((previous) => ({
                            ...previous,
                            boards: previous.boards.map((value) =>
                              value.id === board.id
                                ? { ...value, favorite: !value.favorite }
                                : value,
                            ),
                          }))
                        }
                      >
                        <Star
                          size={15}
                          fill={board.favorite ? "currentColor" : "none"}
                          className={board.favorite ? "product-gold" : ""}
                        />
                      </IconButton>
                      {(can("Create Boards") || can("Delete Boards")) && (
                        <Menu label={`Options for ${board.name}`}>
                          {can("Create Boards") && (
                            <>
                              <MenuItem onSelect={() => openEditor(board)}>
                                <Pencil size={14} />
                                Edit board
                              </MenuItem>
                            </>
                          )}
                          {can("Delete Boards") && (
                            <MenuItem
                              danger
                              onSelect={() =>
                                setRemove({
                                  kind: "Board",
                                  id: board.id,
                                  name: board.name,
                                })
                              }
                            >
                              <Trash2 size={14} />
                              Move to Trash
                            </MenuItem>
                          )}
                        </Menu>
                      )}
                    </div>
                  </div>
                  <button
                    className="product-board-title-button"
                    onClick={() => navigate("board", board.id)}
                  >
                    <h3>{board.name}</h3>
                    <ArrowUpRight size={16} />
                  </button>
                  <p>
                    {board.description ||
                      "A shared place to turn ideas into progress."}
                  </p>
                  <div className="product-board-summary">
                    <span>{boardTasks.length} tasks</span>
                    <span>
                      {boardTasks.length
                        ? Math.round((done / boardTasks.length) * 100)
                        : 0}
                      % complete
                    </span>
                  </div>
                  <Progress
                    value={
                      boardTasks.length ? (done / boardTasks.length) * 100 : 0
                    }
                  />
                  <div className="product-space-board-footer">
                    <AvatarGroup users={participants} onSelect={showProfile} />
                    <button
                      className="product-text-link"
                      onClick={() => navigate("board", board.id)}
                    >
                      Open board
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </SortableBoard>
              );
            })}
            {can("Create Boards") && (
              <button
                className="product-new-board"
                onClick={() => openEditor()}
              >
                <span>
                  <Plus size={23} />
                </span>
                <strong>Create a board</strong>
                <small>Give your next idea a home</small>
              </button>
            )}
          </div>
          </SortableContext>
          </DndContext>
          <section className="product-section product-space-activity">
            <div className="product-section-heading">
              <h2>Recent activity</h2>
              <button
                className="product-text-link"
                onClick={() => setTab("Activity")}
              >
                View all
                <ArrowRight size={13} />
              </button>
            </div>
            <ActivityFeed activities={activities} limit={4} />
          </section>
        </>
      )}
      {tab === "Members" && (
        <section className="product-members-section">
          <div className="product-section-heading">
            <h2>The people behind the progress</h2>
            {can("Manage Settings") && can("Manage Members") && (
              <Button
                onClick={() => {
                  setEditor("space");
                  setName(space.name);
                  setDescription(space.description);
                  setColor(space.color);
                  setMembers(space.members);
                }}
              >
                <Users size={14} />
                Manage members
              </Button>
            )}
          </div>
          <div className="product-member-grid">
            {state.users
              .filter((member) => space.members.includes(member.id))
              .map((member) => (
                <button
                  key={member.id}
                  className="product-member-card"
                  onClick={() => showProfile(member.id)}
                >
                  <Avatar user={member} size={43} showStatus />
                  <span>
                    <strong>{member.name || member.username}</strong>
                    <small>@{member.username}</small>
                    <span className="product-member-status">
                      {member.presence}
                    </span>
                  </span>
                  <Badge
                    color={
                      state.roles.find((role) => role.name === member.role)
                        ?.color
                    }
                  >
                    {member.role}
                  </Badge>
                </button>
              ))}
          </div>
        </section>
      )}
      {tab === "Activity" && (
        <section className="product-section product-space-activity">
          <div className="product-section-heading">
            <h2>Space activity</h2>
            <span className="product-caption">Across all boards</span>
          </div>
          <ActivityFeed activities={activities} limit={25} />
        </section>
      )}
      <Modal
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        title={
          editor === "space"
            ? "Space settings"
            : editingBoard
              ? "Edit board"
              : "Create a board"
        }
        description={
          editor === "space"
            ? "Keep your shared space organized."
            : "A focused place for your team and its next big idea."
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
          className="product-editor-form"
        >
          <Field label={editor === "space" ? "Space name" : "Board name"}>
            <input
              autoFocus
              required
              maxLength={70}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Plugin Development"
            />
          </Field>
          <Field label="Description">
            <textarea
              rows={3}
              maxLength={500}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What will happen here?"
            />
          </Field>
          <Field label="Color">
            <div className="product-color-picker">
              {[
                "#a78bfa",
                "#7d9fef",
                "#72c8b0",
                "#e7b66e",
                "#e58eae",
                "#9ba3b5",
              ].map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-label={`Choose ${value}`}
                  aria-pressed={color === value}
                  style={{ background: value }}
                  onClick={() => setColor(value)}
                >
                  {color === value && <Check size={16} />}
                </button>
              ))}
            </div>
          </Field>
          {editor === "board" && (
            <Field label="Board icon">
              <div className="product-board-icon-picker">
                {["layout", "code", "bug", "globe", "bulb", "star", "calendar", "check", "text:1", "text:#", "text:★"].map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-label={`Use ${value.replace("text:", "")} icon`}
                    aria-pressed={icon === value}
                    onClick={() => setIcon(value)}
                  >
                    <BoardGlyph board={{ color, name: "", icon: value }} />
                  </button>
                ))}
                <input
                  aria-label="Custom board symbol, emoji, or number"
                  maxLength={3}
                  placeholder="Emoji or #"
                  value={icon.startsWith("text:") ? icon.slice(5) : ""}
                  onChange={(event) => setIcon(event.target.value ? `text:${event.target.value}` : "layout")}
                />
              </div>
            </Field>
          )}
          {editor === "space" && can("Manage Members") && (
            <fieldset className="product-member-picker">
              <legend>Members</legend>
              {state.users
                .filter((member) => member.active)
                .map((member) => (
                  <label key={member.id}>
                    <input
                      type="checkbox"
                      checked={members.includes(member.id)}
                      onChange={() =>
                        setMembers((previous) =>
                          previous.includes(member.id)
                            ? previous.filter((id) => id !== member.id)
                            : [...previous, member.id],
                        )
                      }
                    />
                    <Avatar user={member} size={25} />
                    <span>{member.name || member.username}</span>
                    <small>{member.role}</small>
                  </label>
                ))}
            </fieldset>
          )}
          <div className="modal-actions">
            {editor === "space" &&
              can("Create Spaces") &&
              can("Delete Boards") && (
                <Button
                  type="button"
                  variant="danger"
                  className="product-push-left"
                  onClick={() => {
                    setEditor(null);
                    setRemove({
                      kind: "Space",
                      id: space.id,
                      name: space.name,
                    });
                  }}
                >
                  <Trash2 size={14} />
                  Delete space
                </Button>
              )}
            <Button type="button" onClick={() => setEditor(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!name.trim()}>
              {editor === "board" && !editingBoard
                ? "Create board"
                : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(remove)}
        onClose={() => setRemove(null)}
        title={`Move ${remove?.kind.toLowerCase()} to Trash?`}
        description={`“${remove?.name}” and its contents will be hidden from the workspace. You can restore them from Trash at any time.`}
        confirmLabel="Move to Trash"
        onConfirm={() => {
          if (!remove || !can("Delete Boards")) return;
          setState((previous) => ({
            ...previous,
            boards:
              remove.kind === "Board"
                ? previous.boards.map((value) =>
                    value.id === remove.id
                      ? { ...value, deleted: true }
                      : value,
                  )
                : previous.boards,
            spaces:
              remove.kind === "Space"
                ? previous.spaces.map((value) =>
                    value.id === remove.id
                      ? { ...value, deleted: true }
                      : value,
                  )
                : previous.spaces,
          }));
          notify(`${remove.kind} moved to Trash`);
          if (remove.kind === "Space") navigate("home");
        }}
      />
    </div>
  );
}

export function MyTasksPage() {
  const { state, user, entityId, can, requestNewTask } = useWorkspace();
  const [tab, setTab] = useState<
    "Assigned to me" | "Created by me" | "Completed"
  >(entityId === "completed" ? "Completed" : "Assigned to me");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(
    entityId === "overdue"
      ? "Overdue"
      : entityId === "due-today"
        ? "Due today"
        : entityId === "in-progress"
          ? "In progress"
          : "All statuses",
  );
  const [sort, setSort] = useState("Due date");
  const all = activeTasks(state);
  const mine = all.filter((task) => task.assignees.includes(user.id));
  const rows = all
    .filter(
      (task) =>
        (tab === "Created by me"
          ? task.creatorId === user.id
          : task.assignees.includes(user.id)) &&
        (tab === "Completed"
          ? isComplete(task, state)
          : !isComplete(task, state)),
    )
    .filter(
      (task) =>
        !query ||
        `${task.id} ${task.title}`.toLowerCase().includes(query.toLowerCase()),
    )
    .filter(
      (task) =>
        status === "All statuses" ||
        (status === "Overdue"
          ? Boolean(
              task.dueDate &&
              task.dueDate < today() &&
              !isComplete(task, state),
            )
          : status === "Due today"
            ? task.dueDate === today()
            : status === "In progress"
              ? /progress/i.test(
                  state.lists.find((list) => list.id === task.listId)?.name || "",
                )
            : state.lists.find((list) => list.id === task.listId)?.name ===
              status),
    )
    .sort((a, b) =>
      sort === "Priority"
        ? ["Urgent", "High", "Medium", "Low", "None"].indexOf(a.priority) -
          ["Urgent", "High", "Medium", "Low", "None"].indexOf(b.priority)
        : sort === "Recently updated"
          ? b.updatedAt.localeCompare(a.updatedAt)
          : (a.dueDate || "9999").localeCompare(b.dueDate || "9999"),
    );
  return (
    <div className="product-page">
      <PageHeading
        eyebrow="YOUR PERSONAL WORKSPACE"
        title="My tasks"
        description="Everything on your plate, in one place."
        actions={
          can("Create Tasks") && (
            <Button variant="primary" onClick={() => requestNewTask()}>
              <Plus size={16} />
              Create task
            </Button>
          )
        }
      />
      <div className="product-personal-summary">
        <span>
          <span className="product-summary-dot" />
          {mine.filter((task) => !isComplete(task, state)).length} open tasks
        </span>
        <span>
          <CheckCircle2 size={14} />
          {mine.filter((task) => isComplete(task, state)).length} completed
        </span>
        <span className="product-accent">
          <Sparkles size={14} />
          Make space for what matters
        </span>
      </div>
      <Tabs
        items={["Assigned to me", "Created by me", "Completed"]}
        value={tab}
        onChange={(value) => {
          setTab(value);
          setStatus("All statuses");
        }}
      />
      <div className="product-filter-bar">
        <label className="product-search">
          <Search size={15} />
          <input
            aria-label="Search my tasks"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tasks..."
          />
          {query && (
            <button aria-label="Clear search" onClick={() => setQuery("")}>
              <X size={13} />
            </button>
          )}
        </label>
        <Select
          aria-label="Filter tasks by status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option>All statuses</option>
          <option>Overdue</option>
          <option>Due today</option>
          <option>In progress</option>
          {Array.from(
            new Set(
              state.lists
                .filter((list) => !list.deleted && !list.archived)
                .map((list) => list.name),
            ),
          ).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </Select>
        <Select
          aria-label="Sort tasks"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
        >
          <option>Due date</option>
          <option>Priority</option>
          <option>Recently updated</option>
        </Select>
      </div>
      <section className="product-my-task-section">
        <div className="product-table-heading">
          <span>
            {tab} <small>{rows.length}</small>
          </span>
          <span>
            Priority <i /> Status <i /> Due date <i /> Assignees
          </span>
        </div>
        {rows.length ? (
          <TaskRows tasks={rows} editable />
        ) : (
          <EmptyState
            icon={<CheckCheck size={28} />}
            title={
              query || status !== "All statuses"
                ? "No matching tasks"
                : tab === "Completed"
                  ? "Good things take a little work"
                  : "You're all caught up"
            }
            description={
              query || status !== "All statuses"
                ? "Try another search or adjust your filters."
                : tab === "Completed"
                  ? "Tasks you complete will find a home here."
                  : "Your next task will appear here when it is assigned to you."
            }
            action={
              (query || status !== "All statuses") && (
                <Button
                  onClick={() => {
                    setQuery("");
                    setStatus("All statuses");
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        )}
      </section>
      <p className="product-page-footnote">
        <CircleDashed size={13} />
        Open a task to see the full picture, or change its status right here.
      </p>
    </div>
  );
}

const notificationIcons = {
  Mention: MessageSquare,
  Assignment: Users,
  Comment: MessageSquare,
  Reply: MessageSquare,
  "Due date": CalendarDays,
  "Task update": ListTodo,
  Checklist: CheckCheck,
  GitHub: Github,
  Forum: BookOpen,
};
export function NotificationsPage() {
  const { state, setState, user, openTask, notify, showProfile } =
    useWorkspace();
  const [tab, setTab] = useState<"All" | "Unread" | "Mentions" | "Assigned">(
    "All",
  );
  const [kind, setKind] = useState("All activity");
  const all = state.notifications
    .filter((item) => item.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = all.filter((item) => !item.read).length;
  const shown = all.filter(
    (item) =>
      (tab === "All" ||
        (tab === "Unread" && !item.read) ||
        (tab === "Mentions" && item.kind === "Mention") ||
        (tab === "Assigned" && item.kind === "Assignment")) &&
      (kind === "All activity" || item.kind === kind),
  );
  const setRead = (id: string, read: boolean) =>
    setState((previous) => ({
      ...previous,
      notifications: previous.notifications.map((item) =>
        item.id === id && item.userId === user.id ? { ...item, read } : item,
      ),
    }));
  const open = (notification: Notification) => {
    setRead(notification.id, true);
    if (notification.taskId) {
      if (activeTasks(state).some((task) => task.id === notification.taskId))
        openTask(notification.taskId);
      else
        notify(
          "This task is archived or in Trash. Restore it to see its details.",
          "info",
        );
    } else showProfile(notification.actorId);
  };
  return (
    <div className="product-page product-notifications-page">
      <PageHeading
        eyebrow="STAY IN THE LOOP"
        title="Inbox"
        description={
          unread
            ? `You have ${unread} unread ${unread === 1 ? "notification" : "notifications"}. Here's what's happening.`
            : "You're all caught up. Good work travels together."
        }
        actions={
          <Button
            disabled={!unread}
            onClick={() => {
              setState((previous) => ({
                ...previous,
                notifications: previous.notifications.map((item) =>
                  item.userId === user.id ? { ...item, read: true } : item,
                ),
              }));
              notify("All notifications marked as read");
            }}
          >
            <CheckCheck size={15} />
            Mark all as read
          </Button>
        }
      />
      <div className="product-inbox-tabs">
        <Tabs
          items={["All", "Unread", "Mentions", "Assigned"]}
          value={tab}
          onChange={setTab}
        />
        <Select
          aria-label="Filter notification activity"
          value={kind}
          onChange={(event) => setKind(event.target.value)}
        >
          <option>All activity</option>
          {Object.keys(notificationIcons).map((value) => (
            <option key={value}>{value}</option>
          ))}
        </Select>
      </div>
      <div className="product-inbox-list">
        {shown.length ? (
          shown.map((notification, index) => {
            const actor = state.users.find(
              (member) => member.id === notification.actorId,
            );
            const Icon = notificationIcons[notification.kind];
            const date = formatDate(notification.createdAt);
            const previousDate = index
              ? formatDate(shown[index - 1].createdAt)
              : "";
            return (
              <div key={notification.id}>
                {date !== previousDate && (
                  <div className="product-inbox-date">
                    {notification.createdAt.startsWith(today())
                      ? "Today"
                      : date}
                  </div>
                )}
                <article
                  className={`product-notification ${notification.read ? "" : "is-unread"}`}
                >
                  <div className="product-notification-avatar">
                    <Avatar
                      user={actor}
                      size={37}
                      onClick={() => showProfile(notification.actorId)}
                    />
                    <span>
                      <Icon size={10} />
                    </span>
                  </div>
                  <button
                    className="product-notification-content"
                    onClick={() => open(notification)}
                  >
                    <span className="product-notification-title">
                      {notification.title}
                      {!notification.read && (
                        <span className="product-unread-dot" />
                      )}
                    </span>
                    <p>{notification.body}</p>
                    <span className="product-notification-context">
                      {notification.taskId && (
                        <span>{notification.taskId}</span>
                      )}
                      <span>{notification.kind}</span>
                      <time>{timeAgo(notification.createdAt)}</time>
                    </span>
                  </button>
                  <IconButton
                    label={
                      notification.read ? "Mark as unread" : "Mark as read"
                    }
                    onClick={() => setRead(notification.id, !notification.read)}
                  >
                    {notification.read ? (
                      <Bell size={15} />
                    ) : (
                      <Check size={16} />
                    )}
                  </IconButton>
                </article>
              </div>
            );
          })
        ) : (
          <EmptyState
            icon={<BellOff size={29} />}
            title={
              tab === "Unread"
                ? "A wonderfully quiet inbox"
                : "Nothing here just yet"
            }
            description={
              tab === "Unread"
                ? "You're up to date with your team. We'll keep the next update here."
                : "Activity matching this filter will appear here."
            }
            action={
              kind !== "All activity" && (
                <Button onClick={() => setKind("All activity")}>
                  Show all activity
                </Button>
              )
            }
          />
        )}
      </div>
      <p className="product-page-footnote">
        <ShieldCheck size={14} />
        Only activity relevant to you. All in one place.
      </p>
    </div>
  );
}

export function TrashPage({ embedded = false }: { embedded?: boolean }) {
  const { state, setState, user, can, notify } = useWorkspace();
  const [tab, setTab] = useState<
    "All items" | "Tasks" | "Lists" | "Boards" | "Spaces"
  >("All items");
  const [query, setQuery] = useState("");
  const [remove, setRemove] = useState<TrashItem | null>(null);
  const items = trashItems(state);
  const rows = items.filter(
    (item) =>
      (tab === "All items" || `${item.kind}s` === tab) &&
      (!query ||
        `${item.name} ${item.id} ${item.location}`
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  const canRestore = can("Restore Tasks");
  const canDelete = user.role === "Admin" || user.role === "Owner";
  return (
    <div className={`product-page ${embedded ? "product-trash-embedded" : ""}`}>
      {!embedded && (
        <PageHeading
          eyebrow="WORKSPACE"
          title="Trash"
          description="A second chance for things you thought you didn't need."
        />
      )}
      <div className="product-trash-note">
        <span>
          <Undo2 size={18} />
        </span>
        <div>
          <strong>Nothing disappears before you&apos;re ready.</strong>
          <p>
            Deleted items stay here indefinitely. Restore an item together with
            any parent space, board, or list it needs.
          </p>
        </div>
        <Badge>
          {items.length} {items.length === 1 ? "item" : "items"}
        </Badge>
      </div>
      <Tabs
        items={["All items", "Tasks", "Lists", "Boards", "Spaces"]}
        value={tab}
        onChange={setTab}
      />
      <div className="product-filter-bar">
        <label className="product-search">
          <Search size={15} />
          <input
            aria-label="Search Trash"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search deleted items..."
          />
        </label>
        <span className="product-caption">
          {canDelete
            ? "Only administrators can permanently delete items."
            : "An administrator can permanently delete items."}
        </span>
      </div>
      <div className="product-trash-list">
        {rows.length ? (
          rows.map((item) => {
            const Icon =
              item.kind === "Task"
                ? ListTodo
                : item.kind === "List"
                  ? Layers3
                  : item.kind === "Board"
                    ? LayoutGrid
                    : Folder;
            return (
              <div
                key={`${item.kind}-${item.id}`}
                className="product-trash-row"
              >
                <span className="product-trash-item-icon">
                  <Icon size={19} />
                </span>
                <div className="product-trash-item-title">
                  <strong>{item.name}</strong>
                  <small>
                    {item.kind === "Task" && (
                      <>
                        {item.id}
                        <span>·</span>
                      </>
                    )}
                    {item.location}
                  </small>
                </div>
                <Badge>{item.kind}</Badge>
                <div className="product-trash-actions">
                  {canRestore && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (!can("Restore Tasks")) return;
                        setState((previous) => restoreItem(previous, item));
                        notify(`${item.kind} restored`);
                      }}
                    >
                      <Undo2 size={14} />
                      Restore
                    </Button>
                  )}
                  {canDelete && (
                    <IconButton
                      label={`Permanently delete ${item.name}`}
                      onClick={() => setRemove(item)}
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState
            icon={<Trash2 size={28} />}
            title={
              query
                ? "No matching items"
                : items.length
                  ? "Nothing in this category"
                  : "A clean slate"
            }
            description={
              query
                ? "Try a different title or task ID."
                : "Items you delete will wait here until you need them again."
            }
          />
        )}
      </div>
      {!canRestore && (
        <p className="product-page-footnote">
          Your role does not have permission to restore items. An administrator
          can help.
        </p>
      )}
      <ConfirmDialog
        open={Boolean(remove)}
        onClose={() => setRemove(null)}
        title={`Permanently delete ${remove?.kind.toLowerCase()}?`}
        description={`“${remove?.name}”${remove?.kind !== "Task" ? " and everything inside it" : " and its subtasks"} will be permanently removed. This action cannot be undone.`}
        confirmLabel="Delete permanently"
        onConfirm={() => {
          if (!remove || (user.role !== "Admin" && user.role !== "Owner")) return;
          setState((previous) => permanentlyDeleteItem(previous, remove));
          notify(`${remove.kind} permanently deleted`);
        }}
      />
    </div>
  );
}

export function ProfilePage() {
  const { state, user, entityId, navigate } = useWorkspace();
  const member = state.users.find(value => value.id === entityId) || user;
  const [tab, setTab] = useState<"Overview" | "Assigned tasks" | "Activity">(
    "Overview",
  );
  const tasks = activeTasks(state);
  const assigned = tasks.filter((task) => task.assignees.includes(member.id));
  const completed = assigned.filter((task) => isComplete(task, state));
  const created = tasks.filter((task) => task.creatorId === member.id);
  const activities = tasks
    .flatMap((task) =>
      task.activity
        .filter((activity) => activity.userId === member.id)
        .map((activity) => ({
          ...activity,
          taskId: activity.taskId || task.id,
        })),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const spaces = state.spaces.filter(
    (space) => !space.deleted && space.members.includes(member.id),
  );
  return (
    <div className="product-page product-profile-page">
      <ProfileBanner color={member.bannerColor} image={member.bannerImage} />
      <div className="product-profile-heading">
        <Avatar user={member} size={88} showStatus />
        <div>
          <div className="product-profile-name">
            <h1>{member.name || member.username}</h1>
            <Badge
              color={
                state.roles.find((role) => role.name === member.role)?.color
              }
            >
              {member.role}
            </Badge>
          </div>
          <p>
            @{member.username}
            <span>·</span>
            {member.presence}
          </p>
        </div>
        {member.id === user.id && (
          <Button onClick={() => navigate("settings")}>
            <Pencil size={14} />
            Edit profile
          </Button>
        )}
      </div>
      <div className="product-profile-layout">
        <aside className="product-profile-about">
          <h2>About</h2>
          <p>
            {member.bio ||
              "A member of the Enigma community, building something great together."}
          </p>
          {member.status && (
            <div className="product-custom-status">
              <CircleDashed size={15} />
              {member.status}
            </div>
          )}
          <dl>
            <div>
              <dt>
                <CalendarDays size={14} />
                Joined
              </dt>
              <dd>{formatDate(member.joined, true)}</dd>
            </div>
            <div>
              <dt>
                <Clock3 size={14} />
                Last active
              </dt>
              <dd>
                {member.presence !== "Offline"
                  ? "Active now"
                  : timeAgo(member.lastActive)}
              </dd>
            </div>
            <div>
              <dt>
                <ShieldCheck size={14} />
                Role
              </dt>
              <dd>{member.role}</dd>
            </div>
          </dl>
          <h2>Spaces</h2>
          <div className="product-profile-spaces">
            {spaces.map((space) => (
              <button
                key={space.id}
                onClick={() => navigate("space", space.id)}
              >
                <span style={{ background: space.color }} />
                <strong>{space.name}</strong>
                <ChevronRight size={13} />
              </button>
            ))}
          </div>
        </aside>
        <div className="product-profile-content">
          <div className="product-profile-stats">
            <div>
              <ListTodo size={17} />
              <strong>{assigned.length}</strong>
              <span>Assigned tasks</span>
            </div>
            <div>
              <CheckCircle2 size={17} />
              <strong>{completed.length}</strong>
              <span>Completed</span>
            </div>
            <div>
              <Sparkles size={17} />
              <strong>{created.length}</strong>
              <span>Tasks created</span>
            </div>
          </div>
          <Tabs
            items={["Overview", "Assigned tasks", "Activity"]}
            value={tab}
            onChange={setTab}
          />
          {tab === "Overview" && (
            <>
              <section className="product-section">
                <div className="product-section-heading">
                  <h2>Currently working on</h2>
                  <button
                    className="product-text-link"
                    onClick={() => setTab("Assigned tasks")}
                  >
                    View all
                    <ArrowRight size={13} />
                  </button>
                </div>
                {assigned.some((task) => !isComplete(task, state)) ? (
                  <TaskRows
                    tasks={assigned
                      .filter((task) => !isComplete(task, state))
                      .slice(0, 4)}
                  />
                ) : (
                  <EmptyState
                    title="All caught up"
                    description="Open assigned tasks will appear here."
                  />
                )}
              </section>
              <section className="product-section">
                <div className="product-section-heading">
                  <h2>Recent activity</h2>
                </div>
                <ActivityFeed activities={activities} limit={5} />
              </section>
            </>
          )}
          {tab === "Assigned tasks" &&
            (assigned.length ? (
              <TaskRows tasks={assigned} />
            ) : (
              <EmptyState
                title="No assigned tasks"
                description="This person's work will appear here."
              />
            ))}
          {tab === "Activity" && (
            <ActivityFeed activities={activities} limit={30} />
          )}
        </div>
      </div>
    </div>
  );
}

interface Release {
  version: string;
  name: string;
  date: string;
  status: string;
  description: string;
  features: string[];
  fixes: string[];
  changelog: string;
}
const releases: Release[] = [];

export function ReleasesPage() {
  const { state, openTask, navigate, notify } = useWorkspace();
  const [selected, setSelected] = useState(releases[0]?.version || "");
  const [tab, setTab] = useState<"Overview" | "Changelog" | "Related tasks">(
    "Overview",
  );
  const [preview, setPreview] = useState(false);
  const release = releases.find((item) => item.version === selected);
  const pluginBoard = state.boards.find(
    (board) => !board.deleted && /plugin/i.test(board.name),
  );
  const related = activeTasks(state)
    .filter((task) =>
      task.attachments.some(
        (attachment) =>
          attachment.type === "link" &&
          `${attachment.name} ${attachment.url || ""}`.includes(selected),
      ),
    )
    .slice(0, 8);
  const complete = related.filter((task) => isComplete(task, state)).length;
  if (!release)
    return (
      <div className="product-page product-releases-page">
        <PageHeading
          title="Releases"
          description="Track versions and release notes."
        />
        <EmptyState
          title="No releases yet"
          description="Releases will appear here when they are available."
        />
      </div>
    );
  return (
    <div className="product-page product-releases-page">
      <PageHeading
        eyebrow="ENIGMA / PLUGIN DEVELOPMENT"
        title="Releases"
        description="Every version is a little progress, made together."
        actions={
          <Button onClick={() => setPreview(true)}>
            <Github size={15} />
            Repository preview
            <ArrowUpRight size={13} />
          </Button>
        }
      />
      <div className="product-releases-layout">
        <aside className="product-release-list">
          <span className="product-eyebrow">VERSION HISTORY</span>
          {releases.map((item) => (
            <button
              className={selected === item.version ? "active" : ""}
              key={item.version}
              onClick={() => {
                setSelected(item.version);
                setTab("Overview");
              }}
            >
              <span className="product-release-list-icon">
                {item.status === "Released" ? (
                  <CheckCircle2 size={17} />
                ) : (
                  <Rocket size={17} />
                )}
              </span>
              <span>
                <strong>v{item.version}</strong>
                <small>
                  {formatDate(item.date)}
                  <span>·</span>
                  {item.status}
                </small>
              </span>
              <ChevronRight size={14} />
            </button>
          ))}
          <div className="product-release-aside-note">
            <GitBranch size={17} />
            <p>
              Small improvements.
              <br />
              Meaningful releases.
            </p>
          </div>
        </aside>
        <section className="product-release-detail">
          <div className="product-release-hero">
            <div className="product-release-hero-top">
              <Badge
                color={release.status === "Released" ? "#79c6a4" : "#b79af4"}
              >
                <span className="product-summary-dot" />
                {release.status}
              </Badge>
              <span>
                <CalendarDays size={13} />
                {release.status === "Released" ? "Released" : "Target"}{" "}
                {formatDate(release.date, true)}
              </span>
            </div>
            <span className="product-version">v{release.version}</span>
            <h2>{release.name}</h2>
            <p>{release.description}</p>
            <div className="product-release-hero-bottom">
              <span>
                <Code2 size={14} />
                Enigma Plugin
              </span>
              <span>
                <GitBranch size={14} />
                {release.status === "Released"
                  ? `tag/v${release.version}`
                  : `release/${release.version}`}
              </span>
            </div>
          </div>
          <Tabs
            items={["Overview", "Changelog", "Related tasks"]}
            value={tab}
            onChange={setTab}
          />
          {tab === "Overview" && (
            <div className="product-release-overview">
              <div className="product-release-progress">
                <div>
                  <h3>Release readiness</h3>
                  <span>
                    {related.length
                      ? `${complete} of ${related.length} linked tasks completed`
                      : release.status === "Released"
                        ? "Published release"
                        : "Planning the next milestones"}
                  </span>
                </div>
                <strong>
                  {release.status === "Released"
                    ? 100
                    : related.length
                      ? Math.round((complete / related.length) * 100)
                      : 0}
                  %
                </strong>
                <Progress
                  value={
                    release.status === "Released"
                      ? 100
                      : related.length
                        ? (complete / related.length) * 100
                        : 0
                  }
                />
              </div>
              <ReleaseChanges release={release} />
              <div className="product-release-links">
                <button onClick={() => setPreview(true)}>
                  <Github size={21} />
                  <span>
                    <strong>GitHub release</strong>
                    <small>Release notes and repository reference</small>
                  </span>
                  <ArrowUpRight size={15} />
                </button>
                {pluginBoard && (
                  <button onClick={() => navigate("board", pluginBoard.id)}>
                    <LayoutGrid size={21} />
                    <span>
                      <strong>Development board</strong>
                      <small>Follow the work behind this version</small>
                    </span>
                    <ArrowUpRight size={15} />
                  </button>
                )}
              </div>
            </div>
          )}
          {tab === "Changelog" && (
            <div className="product-release-changelog">
              <span className="product-eyebrow">
                WHAT&apos;S NEW IN {release.version}
              </span>
              <h3>{release.name}</h3>
              <p>{release.changelog}</p>
              <ReleaseChanges release={release} />
              <p className="product-changelog-thanks">
                With thanks to everyone who tested, reported, and helped shape
                this release.
              </p>
            </div>
          )}
          {tab === "Related tasks" &&
            (related.length ? (
              <TaskRows tasks={related} showBoard={false} />
            ) : (
              <EmptyState
                icon={<GitBranch size={26} />}
                title="No linked tasks"
                description="Attach a release link to a task to connect it with this version."
              />
            ))}
        </section>
      </div>
      <Modal
        open={preview}
        onClose={() => setPreview(false)}
        title="Repository reference"
        description="A preview of the connected GitHub experience. No external account is connected."
      >
        <div className="product-github-preview">
          <Github size={34} />
          <h3>Enigma / Plugin</h3>
          <p>Plugin development for the Enigma community.</p>
          <div>
            <Badge>
              <GitBranch size={12} />
              release/{release.version}
            </Badge>
            <Badge>v{release.version}</Badge>
            <Badge>Mock reference</Badge>
          </div>
          <section>
            <h4>{release.name}</h4>
            <p>{release.changelog}</p>
            {related.slice(0, 3).map((task) => (
              <button
                key={task.id}
                className="product-text-link"
                onClick={() => {
                  setPreview(false);
                  openTask(task.id);
                }}
              >
                {task.id} · {task.title}
                <ArrowUpRight size={12} />
              </button>
            ))}
          </section>
          <div className="modal-actions">
            <Button
              onClick={() => {
                setPreview(false);
                navigate("settings");
                notify(
                  "GitHub connection settings are available under Integrations.",
                  "info",
                );
              }}
            >
              <Settings2 size={14} />
              Integration settings
            </Button>
            <Button variant="primary" onClick={() => setPreview(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ReleaseChanges({ release }: { release: (typeof releases)[number] }) {
  return (
    <div className="product-release-changes">
      <section>
        <h3>
          <Sparkles size={16} />
          Features <span>{release.features.length}</span>
        </h3>
        <ul>
          {release.features.map((value) => (
            <li key={value}>
              <Plus size={13} />
              {value}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>
          <CheckCircle2 size={16} />
          Fixes & improvements <span>{release.fixes.length}</span>
        </h3>
        <ul>
          {release.fixes.map((value) => (
            <li key={value}>
              <Check size={13} />
              {value}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SortableBoard({ board, editable, open, children }: {
  board: Board;
  editable: boolean;
  open: () => void;
  children: ReactNode;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: board.id, disabled: !editable });
  return (
    <article
      ref={setNodeRef}
      className="product-space-board"
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest("button, a, input, select")) open();
      }}
    >
      {editable && (
        <button
          className="board-drag-handle icon-button"
          {...attributes}
          {...listeners}
          aria-label={`Move ${board.name}`}
        >
          <GripVertical size={16} />
        </button>
      )}
      {children}
    </article>
  );
}
