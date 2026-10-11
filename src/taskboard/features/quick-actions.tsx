"use client";
import { useEffect, useState, useRef } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  Blocks,
  Check,
  ChevronRight,
  CornerDownLeft,
  FileText,
  Flag,
  Home,
  LayoutGrid,
  Plus,
  Search,
  Settings,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { useWorkspace } from "@/lib/store";
import {
  Avatar,
  AutoResizeTextarea,
  Badge,
  Button,
  Field,
  Modal,
  PriorityBadge,
  Select,
} from "@/components/ui";
import { priorities, type Task, type View } from "@/lib/types";
import { visibleTasks } from "@/lib/operations";

const templates: Record<
  string,
  { description: string; priority: Task["priority"]; labels: string[] }
> = {
  "Blank task": { description: "", priority: "None", labels: [] },
  "Bug Report": {
    description:
      "## What happened?\nDescribe the issue and the expected behavior.\n\n## Steps to reproduce\n1. \n2. \n3. \n\n## Environment\nPlugin version and server details.",
    priority: "High",
    labels: [],
  },
  "Feature Request": {
    description:
      "## The idea\nWhat would make the experience better?\n\n## Why it matters\nWho will benefit, and how?\n\n## Acceptance criteria\n- ",
    priority: "Medium",
    labels: [],
  },
  "Plugin Proposal": {
    description:
      "## Plugin concept\nWhat should this plugin do?\n\n## Player experience\nDescribe the flow.\n\n## Scope\n- ",
    priority: "Medium",
    labels: [],
  },
  Implementation: {
    description:
      "## Implementation plan\nOutline the approach.\n\n## Acceptance criteria\n- \n\n## Verification\n- ",
    priority: "Medium",
    labels: [],
  },
  Release: {
    description:
      "## Release overview\nVersion and target date.\n\n## Changelog\n### Features\n- \n### Fixes\n- \n\n## Release checks\n- ",
    priority: "High",
    labels: [],
  },
  "Development Task": {
    description:
      "## Goal\nWhat are we building?\n\n## Details\n\n## Done when\n- ",
    priority: "Medium",
    labels: [],
  },
};
export function NewTaskDialog() {
  const { state, view, entityId, createTask, openTask, can } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("Blank task");
  const [boardId, setBoardId] = useState("plugin");
  const [listId, setListId] = useState("");
  const [parentId, setParentId] = useState<string | undefined>();
  const [priority, setPriority] = useState<Task["priority"]>("None");
  const [dueDate, setDueDate] = useState("");
  const [restricted, setRestricted] = useState(false);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  useEffect(() => {
    const handler = (event: Event) => {
      if (!can("Create Tasks")) return;
      const detail = (event as CustomEvent).detail;
      const parent = state.tasks.find((t) => t.id === detail?.parentId);
      const list = state.lists.find((l) => l.id === detail?.listId);
      const id =
        parent?.boardId ||
        list?.boardId ||
        (view === "board"
          ? entityId
          : state.boards.find((b) => !b.deleted)?.id) ||
        "";
      setBoardId(id);
      setListId(
        detail?.listId ||
          state.lists.find((l) => l.boardId === id && !l.deleted && !l.archived)
            ?.id ||
          "",
      );
      setParentId(detail?.parentId);
      setTitle("");
      setDescription("");
      setTemplate("Blank task");
      setPriority("None");
      setDueDate("");
      setRestricted(false);
      setAssignees([]);
      setLabels([]);
      setOpen(true);
    };
    window.addEventListener("enigma:new-task", handler);
    return () => window.removeEventListener("enigma:new-task", handler);
  }, [state.tasks, state.lists, state.boards, view, entityId, can]);
  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title={
        parentId
          ? "Break it into a smaller step"
          : "What’s the next good thing?"
      }
      description={
        parentId
          ? `Create a subtask of ${parentId}.`
          : "Every bit of progress starts with a task."
      }
      className="new-task-modal"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || !listId) return;
          const id = createTask({
            title,
            description,
            boardId,
            listId,
            parentId,
            priority,
            dueDate,
            restricted,
            assignees,
            labels,
          });
          if (id) {
            setOpen(false);
            openTask(id);
          }
        }}
      >
        <div className="template-select">
          <FileText size={15} />
          <Select
            aria-label="Task template"
            value={template}
            onChange={(e) => {
              setTemplate(e.target.value);
              const t = templates[e.target.value];
              setDescription(t.description);
              setPriority(t.priority);
              setLabels(t.labels);
            }}
          >
            {Object.keys(templates).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
          <span>A head start, if you need one</span>
        </div>
        <Field label="Task title">
          <input
            className="task-title-input"
            autoFocus
            required
            maxLength={180}
            placeholder="Give your task a clear, useful name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Description">
          <AutoResizeTextarea
            rows={3}
            placeholder="A little context goes a long way…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label="Board">
            <Select
              value={boardId}
              disabled={!!parentId}
              onChange={(e) => {
                setBoardId(e.target.value);
                setListId(
                  state.lists.find(
                    (l) =>
                      l.boardId === e.target.value && !l.deleted && !l.archived,
                  )?.id || "",
                );
              }}
            >
              {state.boards
                .filter(
                  (b) =>
                    !b.deleted &&
                    !state.spaces.some((s) => s.id === b.spaceId && s.deleted),
                )
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={listId} onChange={(e) => setListId(e.target.value)}>
              {state.lists
                .filter(
                  (l) => l.boardId === boardId && !l.deleted && !l.archived,
                )
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Priority">
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Task["priority"])}
            >
              {priorities.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Due date">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
        </div>
        <fieldset className="picker-fieldset">
          <legend>Assignees</legend>
          <div className="member-options">
            {state.users
              .filter((u) => u.active && !u.bootstrapOwner && u.name.toLowerCase() !== "enigma")
              .map((u) => (
                <label
                  className={assignees.includes(u.id) ? "selected" : ""}
                  key={u.id}
                >
                  <input
                    type="checkbox"
                    checked={assignees.includes(u.id)}
                    onChange={(e) =>
                      setAssignees(
                        e.target.checked
                          ? [...assignees, u.id]
                          : assignees.filter((id) => id !== u.id),
                      )
                    }
                  />
                  <Avatar user={u} size={23} />
                  <span>{u.name.split(" ")[0]}</span>
                  {assignees.includes(u.id) && <Check size={12} />}
                </label>
              ))}
          </div>
        </fieldset>
        <fieldset className="picker-fieldset">
          <legend>Labels</legend>
          <div className="label-options">
            {state.labels.map((l) => (
              <label
                key={l.id}
                className={labels.includes(l.id) ? "selected" : ""}
              >
                <input
                  type="checkbox"
                  checked={labels.includes(l.id)}
                  onChange={(e) =>
                    setLabels(
                      e.target.checked
                        ? [...labels, l.id]
                        : labels.filter((id) => id !== l.id),
                    )
                  }
                />
                <Badge color={l.color}>
                  {l.name}
                  {labels.includes(l.id) && <Check size={10} />}
                </Badge>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="restriction-check">
          <input
            type="checkbox"
            checked={restricted}
            onChange={(e) => setRestricted(e.target.checked)}
          />
          <span>
            Restrict task editing
            <small>Only the creator, moderators, and admins can edit.</small>
          </span>
        </label>
        <div className="modal-actions">
          <Button type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={!listId}>
            <Plus size={15} />
            Create task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { state, user, navigate, openTask, requestNewTask, showProfile } =
    useWorkspace();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);
  const commands: {
    id: string;
    title: string;
    detail: string;
    icon: React.ReactNode;
    action: () => void;
  }[] = [
    {
      id: "create",
      title: "Create task",
      detail: "A new step forward",
      icon: <Plus />,
      action: () => requestNewTask(),
    },
    ...(
      [
        ["home", "Home", Home],
        ["my-tasks", "My Tasks", Check],
        ["notifications", "Notifications", Bell],
        ["settings", "Settings", Settings],
        ["releases", "Plugin releases", Flag],
      ] as const
    ).map(([id, title, Icon]) => ({
      id,
      title,
      detail: "Go to page",
      icon: <Icon />,
      action: () => navigate(id as View),
    })),
    {
      id: "profile",
      title: "Open profile",
      detail: user.name,
      icon: <UserRound />,
      action: () => showProfile(user.id),
    },
    {
      id: "members",
      title: "Invite / Members",
      detail: "People in your workspace",
      icon: <Users />,
      action: () => navigate("space", state.spaces.find((s) => !s.deleted)?.id),
    },
    ...state.boards
      .filter(
        (b) =>
          !b.deleted &&
          !state.spaces.some((s) => s.id === b.spaceId && s.deleted),
      )
      .map((b) => ({
        id: b.id,
        title: b.name,
        detail: "Board",
        icon: <LayoutGrid />,
        action: () => navigate("board", b.id),
      })),
    ...state.spaces
      .filter((s) => !s.deleted)
      .map((s) => ({
        id: s.id,
        title: s.name,
        detail: "Space",
        icon: <Blocks />,
        action: () => navigate("space", s.id),
      })),
    ...visibleTasks(state).map((t) => ({
      id: t.id,
      title: t.title,
      detail: t.id,
      icon: <PriorityBadge priority={t.priority} compact />,
      action: () => openTask(t.id),
    })),
    ...state.users
      .filter((u) => u.active)
      .map((u) => ({
        id: "user-" + u.id,
        title: u.name,
        detail: "@" + u.username,
        icon: <Avatar user={u} size={28} showStatus />,
        action: () => showProfile(u.id),
      })),
  ];
  const fuzzy = (text: string, q: string) => {
    let i = 0;
    for (const c of text.toLowerCase()) {
      if (c === q[i]) i++;
    }
    return i === q.length;
  };
  const results = commands
    .filter(
      (c) =>
        !query || fuzzy(c.title + " " + c.detail, query.toLowerCase().trim()),
    )
    .slice(0, query ? 15 : 9);
  const select = (index: number) => {
    const command = results[index];
    if (command) {
      onClose();
      command.action();
    }
  };
  useEffect(() => {
    container.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Find your next move"
      className="command-modal"
    >
      <div className="command-input">
        <Search size={20} />
        <input
          autoFocus
          placeholder="Search tasks, boards, people, or commands…"
          aria-label="Search workspace"
          role="combobox"
          aria-expanded="true"
          aria-controls="command-results"
          aria-activedescendant={
            results[active] ? `command-${results[active].id}` : undefined
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((prev) => (prev + 1) % Math.max(1, results.length));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive(
                (prev) =>
                  (prev - 1 + results.length) % Math.max(1, results.length),
              );
            }
            if (e.key === "Enter") {
              e.preventDefault();
              select(active);
            }
          }}
        />
        <kbd>esc</kbd>
      </div>
      <div
        className="command-results"
        id="command-results"
        role="listbox"
        ref={container}
      >
        <span className="eyebrow">
          {query ? "SEARCH RESULTS" : "JUMP RIGHT IN"}
        </span>
        {results.length === 0 && (
          <div className="command-empty">
            <Search size={28} />
            <p>No results for “{query}”</p>
            <span>Try a task ID, a teammate, or a shorter search.</span>
          </div>
        )}
        {results.map((c, i) => (
          <button
            id={`command-${c.id}`}
            data-index={i}
            key={c.id}
            role="option"
            aria-selected={i === active}
            className={i === active ? "active" : ""}
            onPointerMove={() => setActive(i)}
            onClick={() => select(i)}
          >
            {c.icon}
            <span>
              <strong>{c.title}</strong>
              <small>{c.detail}</small>
            </span>
            {i === active ? (
              <CornerDownLeft size={15} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
        ))}
      </div>
      <div className="command-footer">
        <span>
          <kbd>
            <ArrowUp size={10} />
          </kbd>
          <kbd>
            <ArrowDown size={10} />
          </kbd>{" "}
          to navigate
        </span>
        <span>
          <kbd>↵</kbd> to open
        </span>
        <span>
          <Sparkles size={12} />
          Enigma, at your fingertips
        </span>
      </div>
    </Modal>
  );
}
