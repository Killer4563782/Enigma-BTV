"use client";

import { Fragment, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  CheckSquare2,
  ChevronRight,
  Circle,
  CircleCheck,
  Copy,
  Flag,
  GitBranch,
  GripVertical,
  Hash,
  Layers,
  Link2,
  ListChecks,
  LockKeyhole,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  ConfirmDialog,
  Field,
  IconButton,
  Menu,
  MenuItem,
  Modal,
  PriorityBadge,
  Progress,
  Select,
} from "@/components/ui";
import { useWorkspace } from "@/lib/store";
import { unresolvedDependencies } from "@/lib/operations";
import {
  priorities,
  type Checklist,
  type Label,
  type Task,
} from "@/lib/types";
import { CommentEditor, TaskConversation, TaskRichText } from "./task-comments";
import { TaskAttachments } from "./task-attachments";
import "./task-detail.css";

const id = () => crypto.randomUUID();
const dateText = (date: string, full = false) =>
  date
    ? new Date(date.includes("T") ? date : `${date}T12:00:00`).toLocaleString(
        "en-US",
        {
          month: full ? "long" : "short",
          day: "numeric",
          ...(full
            ? {
                year: "numeric" as const,
                hour: "numeric" as const,
                minute: "2-digit" as const,
              }
            : {}),
        },
      )
    : "Not set";
const colors = [
  "#a78bfa",
  "#f092a4",
  "#f4b86a",
  "#74c6b1",
  "#73ace5",
  "#c58cdc",
  "#9bacbe",
  "#e6d076",
];

function Property({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="task-property">
      <span className="task-property-label">
        {icon}
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

function TaskMemberPicker({
  task,
  editable,
}: {
  task: Task;
  editable: boolean;
}) {
  const { state, setState, user, updateTask, canEditTask } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const people = state.users.filter(
    (person) =>
      person.active && !person.bootstrapOwner && person.name.toLowerCase() !== "enigma" &&
      `${person.name} ${person.username}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  function toggle(personId: string) {
    if (!editable || !canEditTask(task)) return;
    const selected = task.assignees.includes(personId);
    const person = state.users.find((person) => person.id === personId);
    updateTask(
      task.id,
      {
        assignees: selected
          ? task.assignees.filter((item) => item !== personId)
          : [...task.assignees, personId],
      },
      `${selected ? "unassigned" : "assigned"} ${person?.name || "a member"}`,
    );
    if (!selected && personId !== user.id)
      setState((previous) => ({
        ...previous,
        notifications: [
          {
            id: id(),
            userId: personId,
            actorId: user.id,
            title: "You were assigned a task",
            body: `${task.id} · ${task.title}`,
            kind: "Assignment",
            taskId: task.id,
            createdAt: new Date().toISOString(),
            read: false,
          },
          ...previous.notifications,
        ],
      }));
  }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!people.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive(
        (value) =>
          (value + (event.key === "ArrowDown" ? 1 : -1) + people.length) %
          people.length,
      );
    }
    if (event.key === "Enter") {
      event.preventDefault();
      toggle(people[active % people.length].id);
    }
    if (event.key === "Escape") {
      event.stopPropagation();
      setOpen(false);
    }
  }
  return (
    <>
      <div className="task-assignee-value">
        <AvatarGroup
          users={state.users.filter((person) =>
            task.assignees.includes(person.id),
          )}
          max={5}
        />
        {task.assignees.length === 0 && (
          <span className="td-muted">Unassigned</span>
        )}
        {editable && (
          <IconButton label="Assign members" onClick={() => setOpen(true)}>
            <Plus size={14} />
          </IconButton>
        )}
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Assign members"
        description="Bring the right people into this task."
        className="task-picker-modal"
      >
        <div className="td-search">
          <Search size={16} />
          <input
            autoFocus
            placeholder="Search members…"
            aria-label="Search members"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded
            aria-controls="task-member-options"
            aria-activedescendant={
              people.length
                ? `task-member-${people[active % people.length].id}`
                : undefined
            }
          />
        </div>
        <div
          className="task-member-options"
          id="task-member-options"
          role="listbox"
          aria-label="Members"
          aria-multiselectable
        >
          {people.map((person, index) => (
            <button
              key={person.id}
              id={`task-member-${person.id}`}
              role="option"
              aria-selected={task.assignees.includes(person.id)}
              className={`task-member-option ${index === active ? "active" : ""}`}
              onClick={() => toggle(person.id)}
            >
              <Avatar user={person} size={34} showStatus />
              <span>
                <strong>{person.name}</strong>
                <small>
                  @{person.username} · {person.presence}
                </small>
              </span>
              {task.assignees.includes(person.id) ? (
                <span className="member-selected">
                  <Check size={14} />
                </span>
              ) : (
                <span className="member-unselected" />
              )}
            </button>
          ))}
          {people.length === 0 && (
            <p className="td-empty">No members match that search.</p>
          )}
        </div>
        <div className="task-picker-footer">
          <small>
            {task.assignees.length} selected · ↑↓ to navigate, Enter to select
          </small>
          <Button variant="primary" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </Modal>
    </>
  );
}

function TaskLabelPicker({
  task,
  editable,
}: {
  task: Task;
  editable: boolean;
}) {
  const { state, setState, user, updateTask, canEditTask, notify } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [labelEdit, setLabelEdit] = useState<Label | null>(null);
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState(colors[0]);
  const [creating, setCreating] = useState(false);
  function toggle(labelId: string) {
    if (editable && canEditTask(task))
      updateTask(
        task.id,
        {
          labels: task.labels.includes(labelId)
            ? task.labels.filter((item) => item !== labelId)
            : [...task.labels, labelId],
        },
        "updated labels",
      );
  }
  function saveLabel() {
    if ((user.role !== "Admin" && user.role !== "Owner") || !labelName.trim()) return;
    const next: Label = {
      id: labelEdit?.id || id(),
      name: labelName.trim(),
      color: labelColor,
    };
    setState((previous) => ({
      ...previous,
      labels: labelEdit
        ? previous.labels.map((label) => (label.id === next.id ? next : label))
        : [...previous.labels, next],
    }));
    if (!labelEdit)
      updateTask(
        task.id,
        { labels: [...task.labels, next.id] },
        `added label ${next.name}`,
      );
    setCreating(false);
    setLabelEdit(null);
  }
  return (
    <>
      <div className="task-labels">
        {state.labels
          .filter((label) => task.labels.includes(label.id))
          .map((label) => (
            <button
              key={label.id}
              className="task-label-chip"
              disabled={!editable}
              onClick={() => setOpen(true)}
            >
              <Badge color={label.color}>
                <span
                  className="label-dot"
                  style={{ background: label.color }}
                />
                {label.name}
              </Badge>
            </button>
          ))}
        {task.labels.length === 0 && (
          <span className="td-muted">No labels</span>
        )}
        {editable && (
          <IconButton label="Edit labels" onClick={() => setOpen(true)}>
            <Plus size={14} />
          </IconButton>
        )}
      </div>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setCreating(false);
        }}
        title={
          creating ? (labelEdit ? "Edit label" : "Create a label") : "Labels"
        }
        description={
          creating
            ? "Give this label a name and a color."
            : "Make your work easy to find."
        }
        className="task-picker-modal"
      >
        {creating ? (
          <form
            className="td-modal-form"
            onSubmit={(event) => {
              event.preventDefault();
              saveLabel();
            }}
          >
            <Field label="Label name">
              <input
                autoFocus
                required
                value={labelName}
                onChange={(event) => setLabelName(event.target.value)}
                placeholder="e.g. Needs review"
                maxLength={40}
              />
            </Field>
            <fieldset className="label-colors">
              <legend>Color</legend>
              {colors.map((color) => (
                <button
                  type="button"
                  aria-label={`Select ${color}`}
                  aria-pressed={labelColor === color}
                  style={{ background: color }}
                  onClick={() => setLabelColor(color)}
                  key={color}
                >
                  {labelColor === color && <Check size={16} />}
                </button>
              ))}
            </fieldset>
            <div className="label-live-preview">
              <Badge color={labelColor}>{labelName || "Label preview"}</Badge>
            </div>
            <div className="modal-actions">
              {labelEdit && (user.role === "Admin" || user.role === "Owner") && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    setState((previous) => ({
                      ...previous,
                      labels: previous.labels.filter((label) => label.id !== labelEdit.id),
                      tasks: previous.tasks.map((item) => ({
                        ...item,
                        labels: item.labels.filter((labelId) => labelId !== labelEdit.id),
                      })),
                    }));
                    setCreating(false);
                    setLabelEdit(null);
                    notify("Label deleted.");
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </Button>
              )}
              <Button type="button" onClick={() => setCreating(false)}>
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!labelName.trim() || (user.role !== "Admin" && user.role !== "Owner")}
              >
                Save label
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="td-search">
              <Search size={15} />
              <input
                autoFocus
                placeholder="Search labels…"
                aria-label="Search labels"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="task-label-options">
              {state.labels
                .filter((label) =>
                  label.name.toLowerCase().includes(query.toLowerCase()),
                )
                .map((label) => (
                  <div key={label.id}>
                    <button
                      className="label-select"
                      aria-pressed={task.labels.includes(label.id)}
                      onClick={() => toggle(label.id)}
                    >
                      <span
                        className={`label-checkbox ${task.labels.includes(label.id) ? "selected" : ""}`}
                      >
                        {task.labels.includes(label.id) && <Check size={12} />}
                      </span>
                      <Badge color={label.color}>{label.name}</Badge>
                    </button>
                    {(user.role === "Admin" || user.role === "Owner") && (
                      <IconButton
                        label={`Edit ${label.name} label`}
                        onClick={() => {
                          setLabelEdit(label);
                          setLabelName(label.name);
                          setLabelColor(label.color);
                          setCreating(true);
                        }}
                      >
                        <Pencil size={13} />
                      </IconButton>
                    )}
                  </div>
                ))}
            </div>
            <div className="task-picker-footer">
              {(user.role === "Admin" || user.role === "Owner") && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setLabelEdit(null);
                    setLabelName(query);
                    setLabelColor(colors[0]);
                    setCreating(true);
                  }}
                >
                  <Plus size={14} />
                  Create label
                </Button>
              )}
              <Button variant="primary" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

function TaskChecklists({ task, editable }: { task: Task; editable: boolean }) {
  const { state, user, updateTask, canEditTask, showProfile } = useWorkspace();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("Checklist");
  const [childOf, setChildOf] = useState<string | null>(null);
  const [dragged, setDragged] = useState<{
    checklistId: string;
    itemId: string;
  } | null>(null);
  const [thread, setThread] = useState<{ checklistId: string; itemId: string } | null>(null);
  const threadChecklist = task.checklists.find((checklist) => checklist.id === thread?.checklistId);
  const threadItem = threadChecklist?.items.find((item) => item.id === thread?.itemId);
  function patch(
    checklistId: string,
    patch: Partial<Checklist>,
    activity: string,
  ) {
    if (editable && canEditTask(task))
      updateTask(
        task.id,
        {
          checklists: task.checklists.map((checklist) =>
            checklist.id === checklistId
              ? { ...checklist, ...patch }
              : checklist,
          ),
        },
        activity,
      );
  }
  function reorder(checklist: Checklist, itemId: string, targetIndex: number) {
    const from = checklist.items.findIndex((item) => item.id === itemId);
    if (from < 0 || targetIndex < 0 || targetIndex >= checklist.items.length)
      return;
    const items = [...checklist.items];
    items.splice(targetIndex, 0, items.splice(from, 1)[0]);
    patch(checklist.id, { items }, "reordered a checklist");
  }
  return (
    <section className="td-section">
      <div className="td-section-heading">
        <h3>
          <ListChecks size={17} />
          Checklists<span className="td-count">{task.checklists.length}</span>
        </h3>
        {editable && (
          <Button
            variant="ghost"
            onClick={() => {
              setTitle("Checklist");
              setAdding(true);
            }}
          >
            <Plus size={14} />
            Add checklist
          </Button>
        )}
      </div>
      {task.checklists.length === 0 && (
        <p className="td-empty">Break the work into small, satisfying steps.</p>
      )}
      {task.checklists.map((checklist) => {
        const completed = checklist.items.filter((item) => item.done).length;
        const percent = checklist.items.length
          ? (completed / checklist.items.length) * 100
          : 0;
        return (
          <div className="task-checklist" key={checklist.id}>
            <div className="checklist-heading">
              <CheckSquare2 size={16} />
              <input
                key={`${checklist.id}-${checklist.title}`}
                defaultValue={checklist.title}
                aria-label="Checklist title"
                onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                disabled={!editable}
                onBlur={(event) => {
                  const value = event.target.value.trim();
                  if (value && value !== checklist.title)
                    patch(
                      checklist.id,
                      { title: value },
                      "renamed a checklist",
                    );
                  else event.target.value = checklist.title;
                }}
              />
              <span>
                {completed}/{checklist.items.length}
              </span>
              {editable && (
                <Menu label={`Checklist ${checklist.title} options`}>
                  <MenuItem
                    onSelect={() =>
                      patch(
                        checklist.id,
                        {
                          items: checklist.items.map((item) => ({
                            ...item,
                            done: true,
                          })),
                        },
                        "completed all checklist items",
                      )
                    }
                  >
                    <CheckCheck size={14} />
                    Complete all
                  </MenuItem>
                  <MenuItem
                    danger
                    onSelect={() => {
                      if (canEditTask(task))
                        updateTask(
                          task.id,
                          {
                            checklists: task.checklists.filter(
                              (item) => item.id !== checklist.id,
                            ),
                          },
                          "deleted a checklist",
                        );
                    }}
                  >
                    <Trash2 size={14} />
                    Delete checklist
                  </MenuItem>
                </Menu>
              )}
            </div>
            <div className="checklist-progress">
              <span>{Math.round(percent)}%</span>
              <Progress value={percent} />
            </div>
            <div className="checklist-items">
              {checklist.items.map((item, index) => (
                <Fragment key={item.id}>
                <div
                  className={`checklist-item ${item.parentId ? "checklist-sub-item" : ""} ${item.done ? "complete" : ""} ${dragged?.itemId === item.id ? "dragging" : ""}`}
                  draggable={editable}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", item.id);
                    setDragged({ checklistId: checklist.id, itemId: item.id });
                  }}
                  onDragEnd={() => setDragged(null)}
                  onDragOver={(event) => {
                    if (dragged?.checklistId === checklist.id)
                      event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dragged?.checklistId === checklist.id)
                      reorder(checklist, dragged.itemId, index);
                    setDragged(null);
                  }}
                >
                  <GripVertical size={13} className="checklist-grip" />
                  <input
                    type="checkbox"
                    checked={item.done}
                    disabled={!editable}
                    aria-label={`Complete ${item.text}`}
                    onChange={() =>
                      patch(
                        checklist.id,
                        {
                          items: checklist.items.map((entry) =>
                            entry.id === item.id
                              ? { ...entry, done: !entry.done }
                              : entry,
                          ),
                        },
                        `${item.done ? "reopened" : "completed"} checklist item: ${item.text}`,
                      )
                    }
                  />
                  <ChecklistItemText
                    key={item.id}
                    value={item.text}
                    editable={editable}
                    taskId={task.id}
                    onSave={(value) => patch(checklist.id, {
                      items: checklist.items.map((entry) => entry.id === item.id ? { ...entry, text: value } : entry),
                    }, "edited a checklist item")}
                  />
                  <IconButton
                    className={`checklist-thread-button ${item.thread.length ? "has-activity" : ""}`}
                    label={item.thread.length ? `${item.thread.length} messages about ${item.text}` : `Discuss ${item.text}`}
                    onClick={() => setThread({ checklistId: checklist.id, itemId: item.id })}
                  >
                    <MessageSquare size={13} />
                    {item.thread.length > 0 && <span>{item.thread.length}</span>}
                  </IconButton>
                  {editable && (
                    <div className="checklist-item-actions">
                      {!item.parentId && (
                        <IconButton
                          label={`Add sub-item to ${item.text}`}
                          onClick={() => setChildOf(item.id)}
                        >
                          <Plus size={12} />
                        </IconButton>
                      )}
                      <IconButton
                        label={`Move ${item.text} up`}
                        disabled={index === 0}
                        onClick={() => reorder(checklist, item.id, index - 1)}
                      >
                        <ArrowUp size={12} />
                      </IconButton>
                      <IconButton
                        label={`Move ${item.text} down`}
                        disabled={index === checklist.items.length - 1}
                        onClick={() => reorder(checklist, item.id, index + 1)}
                      >
                        <ArrowDown size={12} />
                      </IconButton>
                      <IconButton
                        label={`Delete ${item.text}`}
                        onClick={() =>
                          patch(
                            checklist.id,
                            {
                              items: checklist.items.filter((entry) =>
                                entry.id !== item.id && entry.parentId !== item.id,
                              ),
                            },
                            "deleted a checklist item",
                          )
                        }
                      >
                        <X size={13} />
                      </IconButton>
                    </div>
                  )}
                </div>
                {editable && childOf === item.id && (
                  <form
                    className="checklist-add-item checklist-add-sub-item"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const text = String(
                        new FormData(event.currentTarget).get("subitem") || "",
                      ).trim();
                      if (!text) return;
                      patch(
                        checklist.id,
                        {
                          items: [
                            ...checklist.items.slice(0, index + 1),
                            { id: id(), text, done: false, thread: [], parentId: item.id },
                            ...checklist.items.slice(index + 1),
                          ],
                        },
                        "added a checklist sub-item",
                      );
                      setChildOf(null);
                    }}
                  >
                    <Plus size={14} />
                    <input
                      autoFocus
                      name="subitem"
                      aria-label={`Sub-item for ${item.text}`}
                      placeholder="Add a sub-item…"
                    />
                    <button type="submit" className="btn btn-ghost">Add</button>
                    <IconButton
                      type="button"
                      label="Cancel sub-item"
                      onClick={() => setChildOf(null)}
                    >
                      <X size={13} />
                    </IconButton>
                  </form>
                )}
                </Fragment>
              ))}
            </div>
            {editable && (
              <form
                className="checklist-add-item"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const data = new FormData(form);
                  const text = String(data.get("item") || "").trim();
                  if (text) {
                    patch(
                      checklist.id,
                      {
                        items: [
                          ...checklist.items,
                          { id: id(), text, done: false, thread: [] },
                        ],
                      },
                      "added a checklist item",
                    );
                    form.reset();
                  }
                }}
              >
                <Plus size={14} />
                <input
                  name="item"
                  placeholder="Add an item…"
                  aria-label={`Add item to ${checklist.title}`}
                  autoComplete="off"
                />
                <button type="submit" className="btn btn-ghost">
                  Add
                </button>
              </form>
            )}
          </div>
        );
      })}
      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add a checklist"
        description="Small steps make great things happen."
      >
        <form
          className="td-modal-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (title.trim() && editable && canEditTask(task)) {
              updateTask(
                task.id,
                {
                  checklists: [
                    ...task.checklists,
                    { id: id(), title: title.trim(), items: [] },
                  ],
                },
                "added a checklist",
              );
              setAdding(false);
            }
          }}
        >
          <Field label="Checklist title">
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </Field>
          <div className="modal-actions">
            <Button type="button" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!editable || !title.trim()}
            >
              Add checklist
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={Boolean(threadItem)}
        onClose={() => setThread(null)}
        title={threadItem?.text || "Checklist discussion"}
        description={`${threadChecklist?.title || "Checklist"} · focused discussion`}
        className="checklist-thread-modal"
      >
        {editable && threadChecklist && threadItem ? (
          <CommentEditor
            submitLabel="Send message"
            onSave={(body) => {
              const message = {
                id: id(),
                userId: user.id,
                body,
                createdAt: new Date().toISOString(),
                reactions: {},
              };
              patch(
                threadChecklist.id,
                {
                  items: threadChecklist.items.map((item) =>
                    item.id === threadItem.id
                      ? { ...item, thread: [...item.thread, message] }
                      : item,
                  ),
                },
                `added a message to checklist item: ${threadItem.text}`,
              );
            }}
          />
        ) : (
          <div className="td-lock-note">This discussion is read-only.</div>
        )}
        <div className="checklist-thread-timeline">
          {threadItem?.thread.length ? (
            [...threadItem.thread].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((message) => {
              const author = state.users.find((person) => person.id === message.userId);
              return (
                <article key={message.id} className="checklist-thread-message">
                  <Avatar user={author} size={28} onClick={() => author && showProfile(author.id)} />
                  <div>
                    <header>
                      <strong>{author?.name || "Former member"}</strong>
                      <time>{dateText(message.createdAt, true)}</time>
                    </header>
                    <TaskRichText value={message.body} />
                  </div>
                </article>
              );
            })
          ) : (
            <p className="td-empty">Start a focused discussion about this checklist item.</p>
          )}
        </div>

      </Modal>
    </section>
  );
}

function TaskRelations({ task, editable }: { task: Task; editable: boolean }) {
  const { state, openTask, updateTask, requestNewTask, canEditTask, can } =
    useWorkspace();
  const [relation, setRelation] = useState<"blockedBy" | null>(null);
  const [query, setQuery] = useState("");
  const subtasks = state.tasks.filter(
    (item) => item.parentId === task.id && !item.deleted && !item.archived,
  );
  const blockers = state.tasks.filter(
    (item) =>
      task.blockedBy.includes(item.id) && !item.deleted && !item.archived,
  );
  const blocking = state.tasks.filter(
    (item) =>
      item.blockedBy.includes(task.id) && !item.deleted && !item.archived,
  );
  function wouldCycle(candidateId: string) {
    const seen = new Set<string>();
    function reachesCurrent(currentId: string): boolean {
      if (currentId === task.id) return true;
      if (seen.has(currentId)) return false;
      seen.add(currentId);
      return (
        state.tasks
          .find((item) => item.id === currentId)
          ?.blockedBy.some(reachesCurrent) || false
      );
    }
    return reachesCurrent(candidateId);
  }
  function addRelation(target: Task) {
    if (editable && canEditTask(task) && relation) {
      updateTask(
        task.id,
        { [relation]: [...task[relation], target.id] },
        `is blocked by ${target.id}`,
      );
      setRelation(null);
      setQuery("");
    }
  }
  const candidates = state.tasks.filter(
    (item) =>
      item.id !== task.id &&
      !item.deleted &&
      !item.archived &&
      `${item.id} ${item.title}`.toLowerCase().includes(query.toLowerCase()) &&
      (!relation || !task[relation].includes(item.id)) &&
      !wouldCycle(item.id),
  );
  function row(item: Task, relationKey?: "blockedBy") {
    const done =
      Boolean(item.completedAt) ||
      state.lists.find((list) => list.id === item.listId)?.name === "Done";
    return (
      <div className="related-task-row" key={item.id}>
        <button onClick={() => openTask(item.id)}>
          {done ? (
            <CircleCheck size={16} className="td-complete" />
          ) : (
            <Circle size={16} />
          )}
          <span className="related-task-id">{item.id}</span>
          <strong>{item.title}</strong>
          <PriorityBadge priority={item.priority} compact />
          <AvatarGroup
            users={state.users.filter((person) =>
              item.assignees.includes(person.id),
            )}
            max={2}
          />
          <ChevronRight size={14} />
        </button>
        {editable && relationKey && (
          <IconButton
            label={`Remove relationship to ${item.id}`}
            onClick={() => {
              if (canEditTask(task))
                updateTask(
                  task.id,
                  {
                    [relationKey]: task[relationKey].filter(
                      (targetId) => targetId !== item.id,
                    ),
                  },
                  `unlinked ${item.id}`,
                );
            }}
          >
            <X size={13} />
          </IconButton>
        )}
      </div>
    );
  }
  return (
    <>
      <section className="td-section">
        <div className="td-section-heading">
          <h3>
            <Layers size={17} />
            Subtasks<span className="td-count">{subtasks.length}</span>
          </h3>
          {editable && can("Create Tasks") && (
            <Button
              variant="ghost"
              onClick={() => requestNewTask(task.listId, task.id)}
            >
              <Plus size={14} />
              Add subtask
            </Button>
          )}
        </div>
        {subtasks.length ? (
          <div className="related-task-list">
            {subtasks.map((item) => row(item))}
          </div>
        ) : (
          <p className="td-empty">
            Give larger pieces of work their own space.
          </p>
        )}
      </section>
      <section className="td-section">
        <div className="td-section-heading">
          <h3>
            <GitBranch size={17} />
            Relationships
          </h3>
          {editable && (
            <Button
              variant="ghost"
              onClick={() => {
                setRelation("blockedBy");
                setQuery("");
              }}
            >
              <Plus size={14} />
              Add dependency
            </Button>
          )}
        </div>
        {blockers.length > 0 && (
          <div className="relationship-group">
            <span>
              <ArrowLeft size={13} />
              Blocked by
            </span>
            {blockers.map((item) => row(item, "blockedBy"))}
          </div>
        )}
        {blocking.length > 0 && (
          <div className="relationship-group">
            <span>
              <ArrowRight size={13} />
              Blocking
            </span>
            {blocking.map((item) => row(item))}
          </div>
        )}
        {!blockers.length && !blocking.length && (
          <button
            className="td-empty-button"
            disabled={!editable}
            onClick={() => setRelation("blockedBy")}
          >
            <Link2 size={15} />
            Add a task that must be completed first
          </button>
        )}
      </section>
      <Modal
        open={Boolean(relation)}
        onClose={() => setRelation(null)}
        title="Add a dependency"
        description="Which task needs to be finished before this one?"
        className="task-picker-modal"
      >
        <div className="td-search">
          <Search size={16} />
          <input
            autoFocus
            aria-label="Search tasks to link"
            placeholder="Search by title or task ID…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="task-relation-options">
          {candidates.map((item) => (
            <button key={item.id} onClick={() => addRelation(item)}>
              <span>
                <small>
                  {item.id} ·{" "}
                  {
                    state.boards.find((board) => board.id === item.boardId)
                      ?.name
                  }
                </small>
                <strong>{item.title}</strong>
              </span>
              <PriorityBadge priority={item.priority} compact />
              <Plus size={15} />
            </button>
          ))}
          {!candidates.length && (
            <p className="td-empty">No available tasks match your search.</p>
          )}
        </div>
      </Modal>
    </>
  );
}

function TaskDetailContent({ task }: { task: Task }) {
  const {
    state,
    user,
    updateTask,
    toggleTaskWatch,
    canEditTask,
    can,
    closeTask,
    navigate,
    openTask,
    notify,
    showProfile,
    createTask,
  } = useWorkspace();
  const editable = canEditTask(task);
  const [title, setTitle] = useState(task.title);
  const previousTitle = useRef(task.title);
  useEffect(() => {
    const before = previousTitle.current;
    setTitle((draft) => draft === before ? task.title : draft);
    previousTitle.current = task.title;
  }, [task.title]);
  const [description, setDescription] = useState(task.description);
  const [editingDescription, setEditingDescription] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveBoard, setMoveBoard] = useState(task.boardId);
  const [moveList, setMoveList] = useState(task.listId);
  const board = state.boards.find((item) => item.id === task.boardId);
  const space = state.spaces.find((item) => item.id === board?.spaceId);
  const creator = state.users.find((person) => person.id === task.creatorId);
  const lists = state.lists.filter(
    (list) => list.boardId === task.boardId && !list.deleted && !list.archived,
  );
  const currentList = state.lists.find((list) => list.id === task.listId);
  const completed = Boolean(task.completedAt) || currentList?.name === "Done";
  const today = new Date().toLocaleDateString("en-CA");
  const overdue = Boolean(task.dueDate && task.dueDate < today && !completed);
  const dueToday = task.dueDate === today && !completed;
  const unresolved = unresolvedDependencies(task, state.tasks);
  function patch(patch: Partial<Task>, activity: string) {
    if (editable) updateTask(task.id, patch, activity);
  }
  function changeStatus(listId: string) {
    const next = state.lists.find((list) => list.id === listId);
    if (/^(done|complete|completed)$/i.test(next?.name || "") && unresolved.length) {
      notify("Complete every blocking dependency before finishing this task.", "error");
      return;
    }
    patch(
      {
        listId,
        completedAt:
          next?.name === "Done" ? new Date().toISOString() : undefined,
      },
      `moved task from ${currentList?.name || "previous list"} to ${next?.name}`,
    );
  }
  function toggleComplete() {
    if (!completed && unresolved.length) {
      notify("This task is blocked by unfinished dependencies.", "error");
      return;
    }
    const target = completed
      ? lists.find((list) => list.name === "In Progress") ||
        lists.find((list) => list.name !== "Done")
      : lists.find((list) => list.name === "Done");
    if (target) changeStatus(target.id);
    else
      patch(
        { completedAt: completed ? undefined : new Date().toISOString() },
        completed ? "reopened the task" : "completed the task",
      );
  }
  function saveTitle() {
    const next = title.trim();
    if (next && next !== task.title)
      patch({ title: next }, "updated the title");
    else setTitle(task.title);
  }
  function duplicate() {
    if (!can("Create Tasks")) return;
    const nextId = createTask({
      ...task,
      id: undefined,
      title: `${task.title} (copy)`,
      creatorId: user.id,
      createdAt: undefined,
      updatedAt: undefined,
      completedAt: undefined,
      watcherIds: [user.id],
      comments: [],
      activity: [],
      attachments: task.attachments
        .filter((attachment) => !attachment.url?.startsWith("blob:"))
        .map((attachment) => ({ ...attachment, id: id() })),
      checklists: task.checklists.map((checklist) => ({
        ...checklist,
        id: id(),
        items: checklist.items.map((item) => ({
          ...item,
          id: id(),
          done: false,
          thread: [],
        })),
      })),
      archived: false,
      deleted: false,
    });
    if (nextId) {
      openTask(nextId);
      notify("Task duplicated.");
    }
  }
  return (
    <>
      <div className="task-detail-topline">
        <div className="task-breadcrumb">
          <button
            onClick={() => {
              closeTask();
              navigate("space", space?.id);
            }}
          >
            {space?.name || "Workspace"}
          </button>
          <ChevronRight size={12} />
          <button
            onClick={() => {
              closeTask();
              navigate("board", board?.id);
            }}
          >
            {board?.name || "Board"}
          </button>
          <ChevronRight size={12} />
          <span>{task.id}</span>
        </div>
        <div className="td-inline">
          <IconButton
            label={task.watcherIds.includes(user.id) ? "Stop watching task" : "Watch task"}
            onClick={() => toggleTaskWatch(task.id)}
          >
            {task.watcherIds.includes(user.id) ? <BellOff size={15} /> : <Bell size={15} />}
          </IconButton>
          {task.restricted && (
            <span
              className="task-lock-badge"
              title="Editing is restricted to the creator, moderators, and admins"
            >
              <LockKeyhole size={13} />
              Restricted
            </span>
          )}
          <IconButton
            label="Copy task reference"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(task.id);
                notify("Task reference copied.");
              } catch {
                notify("Clipboard is unavailable in this browser.", "error");
              }
            }}
          >
            <Copy size={15} />
          </IconButton>
          <Menu label="Task actions">
            {can("Create Tasks") && (
              <MenuItem onSelect={duplicate}>
                <Copy size={14} />
                Duplicate task
              </MenuItem>
            )}
            <MenuItem
              disabled={!editable}
              onSelect={() => {
                setMoveBoard(task.boardId);
                setMoveList(task.listId);
                setMoveOpen(true);
              }}
            >
              <ArrowRight size={14} />
              Move to another board
            </MenuItem>
            <MenuItem
              disabled={!editable}
              onSelect={() => {
                patch(
                  { archived: !task.archived },
                  task.archived ? "unarchived the task" : "archived the task",
                );
                closeTask();
                notify(
                  task.archived
                    ? "Task unarchived."
                    : "Task archived. Find it in Trash & archive.",
                );
              }}
            >
              <Archive size={14} />
              {task.archived ? "Unarchive task" : "Archive task"}
            </MenuItem>
            <MenuItem
              disabled={!editable || !can("Delete Tasks")}
              danger
              onSelect={() => setDeleteOpen(true)}
            >
              <Trash2 size={14} />
              Move to trash
            </MenuItem>
          </Menu>
        </div>
      </div>
      {task.parentId && (
        <button
          className="parent-task-link"
          onClick={() => openTask(task.parentId!)}
        >
          <ArrowLeft size={13} />
          Parent task<span>{task.parentId}</span>
          <span>
            {state.tasks.find((item) => item.id === task.parentId)?.title}
          </span>
        </button>
      )}
      <div className="task-detail-layout">
        <main className="task-detail-main">
          <div className="task-title-row">
            <button
              className={`task-complete-button ${completed ? "is-completed" : ""}`}
              disabled={!editable || (!completed && unresolved.length > 0)}
              aria-label={
                unresolved.length && !completed
                  ? "Task is blocked by unfinished dependencies"
                  : completed
                    ? "Reopen task"
                    : "Mark task complete"
              }
              onClick={toggleComplete}
            >
              {completed ? <CircleCheck size={24} /> : <Circle size={24} />}
            </button>
            <textarea
              className="task-title-input"
              aria-label="Task title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={saveTitle}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
                if (event.key === "Escape") {
                  event.stopPropagation();
                  setTitle(task.title);
                }
              }}
              readOnly={!editable}
              rows={title.length > 60 ? 3 : title.length > 31 ? 2 : 1}
            />
          </div>
          {unresolved.length > 0 && !completed && (
            <div className="task-blocked-banner" role="status">
              <LockKeyhole size={17} />
              <div>
                <strong>This task is blocked</strong>
                <span>Complete {unresolved.length === 1 ? "this dependency" : "these dependencies"} before moving it to Done.</span>
                <div>
                  {unresolved.map((dependencyId) => {
                    const dependency = state.tasks.find((item) => item.id === dependencyId);
                    return (
                      <button key={dependencyId} onClick={() => openTask(dependencyId)}>
                        {dependencyId} · {dependency?.title || "Unavailable task"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <div className="task-title-meta">
            <span className="task-id-mark">
              <Hash size={12} />
              {task.id}
            </span>
            {completed ? (
              <Badge color="#73cbb0">
                <Check size={11} />
                Completed
              </Badge>
            ) : unresolved.length > 0 ? (
              <Badge color="#edb66b">
                <LockKeyhole size={11} />
                Blocked by {unresolved.length}{" "}
                {unresolved.length === 1 ? "task" : "tasks"}
              </Badge>
            ) : (
              <span>Let’s move this forward.</span>
            )}
          </div>
          {!editable && (
            <div className="task-readonly-banner">
              <ShieldCheck size={17} />
              <div>
                <strong>This task has restricted editing.</strong>
                <span>
                  {creator?.name || "The creator"}, moderators, and admins can
                  make changes.
                </span>
              </div>
            </div>
          )}
          <section className="td-section task-description">
            <div className="td-section-heading">
              <h3>Description</h3>
              {editable && !editingDescription && (
                <IconButton
                  label="Edit description"
                  onClick={() => {
                    setDescription(task.description);
                    setEditingDescription(true);
                  }}
                >
                  <Pencil size={14} />
                </IconButton>
              )}
            </div>
            {editingDescription ? (
              <div className="task-description-editor">
                <CommentEditor
                  key={task.id}
                  initial={description}
                  label="Task description"
                  allowEmpty
                  placeholder="What needs to happen? Add context, links, or task references…"
                  submitLabel="Save description"
                  onSave={(body) => {
                    patch({ description: body }, "updated the description");
                    setEditingDescription(false);
                  }}
                  onCancel={() => setEditingDescription(false)}
                />
              </div>
            ) : task.description ? (
              <TaskRichText value={task.description} taskId={task.id} />
            ) : (
              <button
                className="description-placeholder"
                disabled={!editable}
                onClick={() => setEditingDescription(true)}
              >
                Add a description, a little context, or a big idea…
              </button>
            )}
          </section>
          <TaskChecklists task={task} editable={editable} />
          <TaskRelations task={task} editable={editable} />
          <TaskAttachments task={task} editable={editable} />
        </main>
        <aside className="task-detail-sidebar">
          <div className="task-conversation-panel">
            <TaskConversation task={task} editable={editable} />
          </div>
          <div className="task-sidebar-heading">
            <span>PROPERTIES</span>
            <MoreHorizontal size={15} />
          </div>
          <div className="task-properties">
            <Property label="Status" icon={<Circle size={15} />}>
              <div className="task-status-control">
                <span
                  className="task-status-dot"
                  style={{ background: currentList?.color || "var(--accent)" }}
                />
                <Select
                  aria-label="Task status"
                  value={task.listId}
                  disabled={!editable}
                  onChange={(event) => changeStatus(event.target.value)}
                >
                  {lists.map((list) => (
                    <option
                      key={list.id}
                      value={list.id}
                      disabled={unresolved.length > 0 && /^(done|complete|completed)$/i.test(list.name)}
                    >
                      {list.name}
                    </option>
                  ))}
                </Select>
              </div>
            </Property>
            <Property label="Priority" icon={<Flag size={15} />}>
              <div className="task-priority-control">
                <PriorityBadge priority={task.priority} compact />
                <Select
                  aria-label="Task priority"
                  value={task.priority}
                  disabled={!editable}
                  onChange={(event) =>
                    patch(
                      { priority: event.target.value as Task["priority"] },
                      `changed priority from ${task.priority} to ${event.target.value}`,
                    )
                  }
                >
                  {priorities.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </Select>
              </div>
            </Property>
            <Property label="Assignees" icon={<UserRound size={15} />}>
              <TaskMemberPicker task={task} editable={editable} />
            </Property>
            <Property label="Labels" icon={<Tag size={15} />}>
              <TaskLabelPicker task={task} editable={editable} />
            </Property>
            <div className="task-property-separator" />
            <Property label="Start date" icon={<CalendarDays size={15} />}>
              <input
                type="date"
                aria-label="Task start date"
                value={task.startDate}
                disabled={!editable}
                max={task.dueDate || undefined}
                onChange={(event) =>
                  patch(
                    { startDate: event.target.value },
                    "updated the start date",
                  )
                }
              />
            </Property>
            <Property label="Due date" icon={<CalendarDays size={15} />}>
              <input
                type="date"
                aria-label="Task due date"
                value={task.dueDate}
                disabled={!editable}
                min={task.startDate || undefined}
                className={overdue ? "overdue" : ""}
                onChange={(event) =>
                  patch({ dueDate: event.target.value }, "updated the due date")
                }
              />
            </Property>
            {task.dueDate && (
              <Property label="Due time" icon={<Circle size={15} />}>
                <input
                  type="time"
                  aria-label="Task due time"
                  disabled={!editable}
                  value={task.dueTime}
                  onChange={(event) =>
                    patch(
                      { dueTime: event.target.value },
                      "updated the due time",
                    )
                  }
                />
              </Property>
            )}
            {(overdue || dueToday || (task.dueDate && !completed)) && (
              <div className={`task-due-message ${overdue ? "overdue" : ""}`}>
                <CalendarDays size={12} />
                {overdue
                  ? `Overdue · ${dateText(task.dueDate)}`
                  : dueToday
                    ? "Due today"
                    : `Upcoming · ${dateText(task.dueDate)}`}
              </div>
            )}
            {task.completedAt && (
              <Property label="Completed" icon={<CircleCheck size={15} />}>
                <span className="td-complete">
                  {dateText(task.completedAt)}
                </span>
              </Property>
            )}
          </div>
          <div className="task-creator">
            <span>Created by</span>
            <button onClick={() => creator && showProfile(creator.id)}>
              <Avatar user={creator} size={29} />
              <span>
                <strong>{creator?.name || "Former member"}</strong>
                <small>@{creator?.username || "unknown"}</small>
              </span>
            </button>
            <p title={dateText(task.createdAt, true)}>
              Created {dateText(task.createdAt, true)}
            </p>
            <p title={dateText(task.updatedAt, true)}>
              Updated {dateText(task.updatedAt, true)}
            </p>
          </div>
          <label
            className={`task-restriction-control ${!editable ? "disabled" : ""}`}
          >
            <input
              type="checkbox"
              checked={task.restricted}
              disabled={!editable}
              onChange={(event) =>
                patch(
                  { restricted: event.target.checked },
                  event.target.checked
                    ? "restricted task editing"
                    : "allowed everyone to edit",
                )
              }
            />
            <span>
              <span>
                <LockKeyhole size={13} />
                Restrict task editing
              </span>
              <small>Only the creator, moderators, and admins can edit.</small>
            </span>
          </label>
          <div className="task-sidebar-note">
            <Sparkles size={15} />
            <p>
              A little clarity goes a long way.
              <br />
              Keep your task up to date.
            </p>
          </div>
        </aside>
      </div>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Move this task to trash?"
        description={`“${task.title}” and its subtasks will remain in Trash until restored or permanently deleted by an admin.`}
        confirmLabel="Move to trash"
        onConfirm={() => {
          if (editable && can("Delete Tasks")) {
            patch({ deleted: true }, "moved the task to trash");
            closeTask();
            notify("Task moved to trash.");
          }
        }}
      />
      <Modal
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        title="Move task"
        description="Choose a destination board and list."
      >
        <div className="td-modal-form">
          <Field label="Board">
            <Select
              value={moveBoard}
              onChange={(event) => {
                setMoveBoard(event.target.value);
                setMoveList(
                  state.lists.find(
                    (list) =>
                      list.boardId === event.target.value &&
                      !list.deleted &&
                      !list.archived,
                  )?.id || "",
                );
              }}
            >
              {state.boards
                .filter(
                  (item) =>
                    !item.deleted &&
                    !state.spaces.find((space) => space.id === item.spaceId)
                      ?.deleted,
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="List">
            <Select
              value={moveList}
              onChange={(event) => setMoveList(event.target.value)}
            >
              {state.lists
                .filter(
                  (list) =>
                    list.boardId === moveBoard &&
                    !list.deleted &&
                    !list.archived,
                )
                .map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
            </Select>
          </Field>
          <div className="modal-actions">
            <Button onClick={() => setMoveOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!moveList || !editable}
              onClick={() => {
                const destination = state.lists.find(
                  (list) => list.id === moveList,
                );
                if (
                  unresolved.length &&
                  /^(done|complete|completed)$/i.test(destination?.name || "")
                ) {
                  notify("Complete every blocking dependency before finishing this task.", "error");
                  return;
                }
                patch(
                  {
                    boardId: moveBoard,
                    listId: moveList,
                    completedAt:
                      destination?.name === "Done"
                        ? new Date().toISOString()
                        : undefined,
                  },
                  `moved task to ${state.boards.find((board) => board.id === moveBoard)?.name} / ${destination?.name}`,
                );
                setMoveOpen(false);
              }}
            >
              Move task
              <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function TaskDetail() {
  const { state, selectedTaskId, closeTask } = useWorkspace();
  const task = state.tasks.find(
    (item) => item.id === selectedTaskId && !item.deleted,
  );
  return (
    <Modal
      open={Boolean(task)}
      onClose={closeTask}
      title={task?.id || "Task details"}
      description="Task details, properties, and conversation"
      className="task-detail-modal"
    >
      {task && <TaskDetailContent key={task.id} task={task} />}
    </Modal>
  );
}

function ChecklistItemText({ value, editable, taskId, onSave }: {
  value: string; editable: boolean; taskId: string; onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const save = (element: HTMLTextAreaElement) => {
    const next = element.value.trim();
    if (next && next !== value) onSave(next);
    setEditing(false);
  };
  if (editing && editable) return <textarea
    autoFocus
    className="checklist-item-text"
    defaultValue={value}
    aria-label="Checklist item"
    ref={(element) => { if (element) { element.style.height = "auto"; element.style.height = element.scrollHeight + "px"; } }}
    onInput={(event) => { event.currentTarget.style.height = "auto"; event.currentTarget.style.height = event.currentTarget.scrollHeight + "px"; }}
    onBlur={(event) => save(event.currentTarget)}
    onKeyDown={(event) => {
      if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.blur(); }
      if (event.key === "Escape") { event.stopPropagation(); setEditing(false); }
    }}
  />;
  return <div className="checklist-item-text" tabIndex={editable ? 0 : undefined}
    role={editable ? "textbox" : undefined} aria-label="Checklist item"
    onClick={(event) => { if (editable && !(event.target as HTMLElement).closest("button, a")) setEditing(true); }}
    onKeyDown={(event) => { if (editable && event.key === "Enter") setEditing(true); }}>
    <TaskRichText value={value} taskId={taskId} />
  </div>;
}
