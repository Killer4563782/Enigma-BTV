"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  AtSign,
  Bold,
  Italic,
  Underline,
  List,
  ListIndentIncrease,
  Heading1,
  Heading2,
  Code2,
  ImagePlus,
  Link2,
  MessageSquare,
  Pencil,
  Reply,
  Send,
  Trash2,
  X,
} from "lucide-react";
import {
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Modal,
  PriorityBadge,
  Progress,
  Tabs,
} from "@/components/ui";
import { useWorkspace } from "@/lib/store";
import { attachmentUrl } from "@/lib/attachment-storage";
import type { Attachment, Comment, Task, User } from "@/lib/types";

const makeId = () => crypto.randomUUID();
const timestamp = (date: string) =>
  new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
export function safeWebUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function TaskReference({ id }: { id: string }) {
  const { state, openTask } = useWorkspace();
  const task = state.tasks.find(
    (item) => item.id === id && !item.deleted && !item.archived,
  );
  if (!task) return <span>{id}</span>;
  const items = task.checklists.flatMap((checklist) => checklist.items);
  const progress = items.length
    ? (items.filter((item) => item.done).length / items.length) * 100
    : 0;
  return (
    <span className="task-reference-wrap">
      <button className="task-reference" onClick={() => openTask(id)}>
        {id}
      </button>
      <span className="task-reference-preview" role="tooltip">
        <span className="td-muted">{id}</span>
        <strong>{task.title}</strong>
        <span className="td-inline">
          <PriorityBadge priority={task.priority} />
          <Badge>
            {state.lists.find((list) => list.id === task.listId)?.name}
          </Badge>
        </span>
        <AvatarGroup
          users={state.users.filter((user) => task.assignees.includes(user.id))}
        />
        {items.length > 0 && (
          <span className="reference-progress">
            <Progress value={progress} />
            <small>{Math.round(progress)}% complete</small>
          </span>
        )}
      </span>
    </span>
  );
}

function AttachmentReference({ id, label }: { id: string; label?: string }) {
  const { state, openTask } = useWorkspace();
  const owner = state.tasks.find((task) =>
    task.attachments.some((attachment) => attachment.id === id),
  );
  const attachment = owner?.attachments.find((item) => item.id === id);
  if (!attachment) return <span className="missing-reference">@attachment:{id}</span>;
  if (attachment.type === "task" && attachment.taskId)
    return (
      <button className="attachment-reference" onClick={() => openTask(attachment.taskId!)}>
        <Link2 size={12} />
        {attachment.name}
      </button>
    );
  const href = attachment.content || safeWebUrl(attachment.url);
  if (attachment.storageId) return <StoredAttachmentReference attachment={attachment} label={label} />;
  return href ? (
    <a
      className="attachment-reference"
      href={href}
      target="_blank"
      rel="noreferrer"
      download={attachment.type === "file" ? attachment.name : undefined}
    >
      <Link2 size={12} />
      {label || attachment.name}
    </a>
  ) : (
    <span className="attachment-reference">
      <Link2 size={12} />
      {label || attachment.name}
    </span>
  );
}

function StoredAttachmentReference({ attachment, label }: { attachment: Attachment; label?: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    let active = true;
    void attachmentUrl(attachment).then((value) => {
      if (active) setUrl(value);
    }).catch((failure) => {
      if (active) setError(failure.message);
    });
    return () => { active = false; };
  }, [open, attachment.id]);
  return <>
    <button className="attachment-reference" onClick={() => setOpen(true)} title={attachment.name}>
      <ImagePlus size={13} />{label || attachment.name}
    </button>
    <Modal open={open} onClose={() => setOpen(false)} title={attachment.name} className="attachment-preview-modal">
      {error ? <p role="alert">{error}</p> : !url ? <p role="status">Loading attachment…</p> : <>
        {attachment.type === "image" && <img className="attachment-full-image" src={url} alt={attachment.name} />}
        <a className="btn btn-primary" href={url} download={attachment.name}>Download file</a>
      </>}
    </Modal>
  </>;
}

export function TaskRichText({ value, taskId }: { value: string; taskId?: string }) {
  const { state, showProfile, selectedTaskId } = useWorkspace();
  function inline(text: string): ReactNode[] {
    const tokens = text.split(
      /(!?\[[^\]]*\]\(https?:\/\/[^\s)]+\)|\*\*[^*]+\*\*|\+\+[^+]+\+\+|\*[^*\n]+\*|`[^`]+`|!\d{3}\b|@attachment:[\w-]+|@[\w.-]+|\b[A-Z][A-Z0-9]*-\d+\b|https?:\/\/[^\s<>]+)/g,
    );
    return tokens.map((token, index) => {
      const link = token.match(/^(!?)\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/);
      if (link)
        return link[1] ? (
          <img
            key={index}
            className="comment-image"
            src={safeWebUrl(link[3])}
            alt={link[2] || "Comment image"}
            loading="lazy"
          />
        ) : (
          <a
            key={index}
            href={safeWebUrl(link[3])}
            target="_blank"
            rel="noreferrer"
          >
            {link[2] || link[3]}
          </a>
        );
      if (token.startsWith("**") && token.endsWith("**"))
        return <strong key={index}>{token.slice(2, -2)}</strong>;
      if (token.startsWith("++") && token.endsWith("++"))
        return <u key={index}>{token.slice(2, -2)}</u>;
      if (token.startsWith("*") && token.endsWith("*"))
        return <em key={index}>{token.slice(1, -1)}</em>;
      if (token.startsWith("`") && token.endsWith("`"))
        return <code key={index}>{token.slice(1, -1)}</code>;
      if (/^!\d{3}$/.test(token)) {
        const owner = state.tasks.find((task) => task.id === (taskId || selectedTaskId));
        const number = Number(token.slice(1));
        const attachment = owner?.attachments.find((item, index) => item.type === "image" && (item.reference || index + 1) === number);
        return attachment ? <AttachmentReference key={index} id={attachment.id} label={token} /> : token;
      }
      if (token.startsWith("@attachment:"))
        return <AttachmentReference key={index} id={token.slice(12)} />;
      if (/^@[\w.-]+$/.test(token)) {
        const person = state.users.find(
          (user) =>
            user.username.toLowerCase() === token.slice(1).toLowerCase(),
        );
        if (person)
          return (
            <button
              key={index}
              className="mention"
              onClick={() => showProfile(person.id)}
            >
              {token}
            </button>
          );
      }
      if (/^[A-Z][A-Z0-9]*-\d+$/.test(token))
        return <TaskReference key={index} id={token} />;
      if (/^https?:\/\//.test(token))
        return (
          <a
            key={index}
            href={safeWebUrl(token)}
            target="_blank"
            rel="noreferrer"
          >
            {token}
          </a>
        );
      return token;
    });
  }
  return (
    <div className="task-rich-text">
      {value.split(/(```[\s\S]*?```)/g).map((block, index) =>
        block.startsWith("```") ? (
          <pre key={index}>
            <code>{block.slice(3, -3).replace(/^\w*\n/, "")}</code>
          </pre>
        ) : (
          <div key={index}>
            {block.split("\n").map((line, lineIndex) => {
              const heading = line.match(/^(#{1,2})\s+(.*)$/);
              const bullet = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
              const content = heading?.[2] ?? bullet?.[3] ?? line;
              return (
                <div
                  className={heading ? `markdown-heading markdown-heading-${heading[1].length}` : bullet ? "markdown-bullet" : ""}
                  style={bullet ? { paddingLeft: `${9 + Math.min(bullet[1].length, 8) * 8}px` } : undefined}
                  key={lineIndex}
                >
                  {bullet && <span aria-hidden="true">{/^\d/.test(bullet[2]) ? bullet[2] : "•"} </span>}
                  {inline(content)}
                  {!line && <br />}
                </div>
              );
            })}
          </div>
        ),
      )}
    </div>
  );
}

export function CommentEditor({
  initial = "",
  onSave,
  onCancel,
  onTyping,
  submitLabel = "Comment",
  placeholder = "Share an update, @mention someone…",
  label = "Write a comment",
  allowEmpty = false,
}: {
  initial?: string;
  onSave: (body: string) => void;
  onCancel?: () => void;
  onTyping?: () => void;
  submitLabel?: string;
  placeholder?: string;
  label?: string;
  allowEmpty?: boolean;
}) {
  const { state } = useWorkspace();
  const [value, setValue] = useState(initial);
  const [preview, setPreview] = useState(false);
  const [mention, setMention] = useState<{
    start: number;
    end: number;
    query: string;
  } | null>(null);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = input.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.max(100, element.scrollHeight)}px`;
  }, [value, preview]);
  const suggestions = mention
    ? state.users
        .filter(
          (user) =>
            user.active &&
            `${user.name} ${user.username}`
              .toLowerCase()
              .includes(mention.query.toLowerCase()),
        )
        .slice(0, 6)
    : [];
  function update(next: string, cursor: number) {
    setValue(next);
    onTyping?.();
    const match = next.slice(0, cursor).match(/(?:^|\s)@([\w.-]*)$/);
    setMention(
      match
        ? { start: cursor - match[1].length - 1, end: cursor, query: match[1] }
        : null,
    );
    setActive(0);
  }
  function insertUser(user: User) {
    if (!mention) return;
    const before = value.slice(0, mention.start) + `@${user.username} `;
    setValue(before + value.slice(mention.end));
    setMention(null);
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(before.length, before.length);
    });
  }
  function insert(before: string, after = "", placeholder = "") {
    const start = input.current?.selectionStart ?? value.length;
    const end = input.current?.selectionEnd ?? start;
    const selected = value.slice(start, end) || placeholder;
    const next =
      value.slice(0, start) + before + selected + after + value.slice(end);
    update(next, start + before.length + selected.length);
    setPreview(false);
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    });
  }
  function submit() {
    if (!value.trim() && !allowEmpty) return;
    onSave(value.trim());
    setValue("");
    setMention(null);
    setPreview(false);
  }
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (mention && suggestions.length) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setActive(
          (index) =>
            (index +
              (event.key === "ArrowDown" ? 1 : -1) +
              suggestions.length) %
            suggestions.length,
        );
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        insertUser(suggestions[active % suggestions.length]);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setMention(null);
      }
      return;
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      submit();
    }
  }
  return (
    <div className="comment-editor">
      <div className="comment-editor-tabs">
        <button
          className={!preview ? "active" : ""}
          onClick={() => setPreview(false)}
        >
          Write
        </button>
        <button
          className={preview ? "active" : ""}
          onClick={() => setPreview(true)}
        >
          Preview
        </button>
        <span>Markdown supported</span>
      </div>
      {preview ? (
        <div className="comment-preview">
          {value ? (
            <TaskRichText value={value} />
          ) : (
            <span className="td-muted">Nothing to preview yet.</span>
          )}
        </div>
      ) : (
        <div className="comment-input-wrap">
          <textarea
            ref={input}
            aria-label={label}
            placeholder={placeholder}
            value={value}
            onChange={(event) =>
              update(event.target.value, event.target.selectionStart)
            }
            onKeyDown={keyDown}
            role="combobox"
            aria-expanded={Boolean(mention && suggestions.length)}
            aria-controls={
              mention && suggestions.length ? "task-mention-list" : undefined
            }
            aria-activedescendant={
              mention && suggestions.length
                ? `mention-${suggestions[active % suggestions.length].id}`
                : undefined
            }
          />
          {mention && suggestions.length > 0 && (
            <div
              className="mention-picker"
              id="task-mention-list"
              role="listbox"
              aria-label="Mention a member"
            >
              {suggestions.map((person, index) => (
                <button
                  id={`mention-${person.id}`}
                  key={person.id}
                  role="option"
                  aria-selected={index === active}
                  className={index === active ? "active" : ""}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insertUser(person)}
                >
                  <Avatar user={person} size={28} showStatus />
                  <span>
                    <strong>{person.name}</strong>
                    <small>@{person.username}</small>
                  </span>
                  <small>{person.presence}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="comment-toolbar">
        <div>
          <IconButton
            label="Bold text"
            onClick={() => insert("**", "**", "bold text")}
          >
            <Bold size={15} />
          </IconButton>
          <IconButton label="Italic text" onClick={() => insert("*", "*", "italic text")}><Italic size={15} /></IconButton>
          <IconButton label="Underline text" onClick={() => insert("++", "++", "underlined text")}><Underline size={15} /></IconButton>
          <IconButton label="Bullet point" onClick={() => insert("- ", "", "list item")}><List size={15} /></IconButton>
          <IconButton label="Sub-bullet point" onClick={() => insert("  - ", "", "sub-item")}><ListIndentIncrease size={15} /></IconButton>
          <IconButton label="Large heading" onClick={() => insert("# ", "", "heading")}><Heading1 size={15} /></IconButton>
          <IconButton label="Small heading" onClick={() => insert("## ", "", "heading")}><Heading2 size={15} /></IconButton>
          <IconButton
            label="Code block"
            onClick={() => insert("```\n", "\n```", "your code")}
          >
            <Code2 size={16} />
          </IconButton>
          <IconButton
            label="Add link"
            onClick={() => insert("[", "](https://example.com)", "link text")}
          >
            <Link2 size={16} />
          </IconButton>
          <IconButton
            label="Add image URL"
            onClick={() =>
              insert(
                "![",
                "](https://example.com/image.png)",
                "image description",
              )
            }
          >
            <ImagePlus size={16} />
          </IconButton>
          <IconButton label="Mention a member" onClick={() => insert("@")}>
            <AtSign size={16} />
          </IconButton>
        </div>
        <div>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button variant="primary" disabled={!value.trim() && !allowEmpty} onClick={submit}>
            <Send size={14} />
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TaskConversation({
  task,
  editable,
}: {
  task: Task;
  editable: boolean;
}) {
  const {
    state,
    setState,
    user,
    updateTask,
    can,
    canEditTask,
    showProfile,
    notify,
  } = useWorkspace();
  const [filter, setFilter] = useState<"All" | "Comments" | "Activity">("Comments");
  const [editing, setEditing] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  function saveComment(body: string, edited?: Comment) {
    if (!editable || !canEditTask(task)) return;
    const comment: Comment = edited
      ? { ...edited, body, edited: true }
      : {
          id: makeId(),
          body,
          userId: user.id,
          createdAt: new Date().toISOString(),
          reactions: {},
          ...(replyTo ? { replyTo: replyTo.id } : {}),
        };
    updateTask(
      task.id,
      {
        comments: edited
          ? task.comments.map((item) =>
              item.id === edited.id ? comment : item,
            )
          : [...task.comments, comment],
      },
      edited ? "edited a comment" : "added a comment",
    );
    const mentioned = [...body.matchAll(/@([\w.-]+)/g)].map((match) =>
      match[1].toLowerCase(),
    );
    const recipients = state.users.filter(
      (person) =>
        person.id !== user.id &&
        mentioned.includes(person.username.toLowerCase()),
    );
    const replying =
      replyTo && replyTo.userId !== user.id
        ? state.users.find((person) => person.id === replyTo.userId)
        : undefined;
    setState((previous) => {
      const directRecipientIds = new Set([
        ...recipients.map((person) => person.id),
        ...(replying ? [replying.id] : []),
      ]);
      return {
        ...previous,
        notifications: [
        ...recipients.map((person) => ({
          id: makeId(),
          userId: person.id,
          actorId: user.id,
          title: `${user.name} mentioned you`,
          body: `${task.id} · ${body.slice(0, 110)}`,
          taskId: task.id,
          kind: "Mention" as const,
          createdAt: comment.createdAt,
          read: false,
        })),
        ...(replying && !recipients.some((person) => person.id === replying.id)
          ? [
              {
                id: makeId(),
                userId: replying.id,
                actorId: user.id,
                title: `${user.name} replied to your comment`,
                body: `${task.id} · ${body.slice(0, 110)}`,
                taskId: task.id,
                kind: "Reply" as const,
                createdAt: comment.createdAt,
                read: false,
              },
            ]
          : []),
          ...previous.notifications.filter(
            (notification) =>
              !(
                notification.kind === "Task update" &&
                notification.taskId === task.id &&
                notification.actorId === user.id &&
                directRecipientIds.has(notification.userId)
              ),
          ),
        ],
      };
    });
    setEditing(null);
    setReplyTo(null);
    if (recipients.length)
      notify(
        `Comment posted. ${recipients.length} ${recipients.length === 1 ? "member" : "members"} notified.`,
      );
  }
  function react(comment: Comment, emoji: string) {
    if (!editable || !canEditTask(task)) return;
    const ids = comment.reactions[emoji] || [];
    updateTask(
      task.id,
      {
        comments: task.comments.map((item) =>
          item.id === comment.id
            ? {
                ...item,
                reactions: {
                  ...item.reactions,
                  [emoji]: ids.includes(user.id)
                    ? ids.filter((id) => id !== user.id)
                    : [...ids, user.id],
                },
              }
            : item,
        ),
      },
      `reacted ${emoji} to a comment`,
    );
  }
  const timeline = [
    ...(filter !== "Activity"
      ? task.comments.map((comment) => ({
          type: "comment" as const,
          date: comment.createdAt,
          item: comment,
        }))
      : []),
    ...(filter !== "Comments"
      ? task.activity
          .filter(
            (activity) =>
              !/^(added|edited|deleted) a comment$/.test(activity.text),
          )
          .map((activity) => ({
            type: "activity" as const,
            date: activity.createdAt,
            item: activity,
          }))
      : []),
  ].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section className="td-section task-conversation">
      <div className="td-section-heading">
        <h3>
          <MessageSquare size={17} />
          Conversation<span className="td-count">{task.comments.length}</span>
        </h3>
        <Tabs
          items={["All", "Comments", "Activity"]}
          value={filter}
          onChange={setFilter}
        />
      </div>
      {editable ? (
        <div className="new-task-comment" id="new-task-comment">
          <Avatar user={user} size={30} />
          <div>
            {replyTo && (
              <div className="reply-indicator">
                <Reply size={13} />
                Replying to{" "}
                {
                  state.users.find((person) => person.id === replyTo.userId)
                    ?.name
                }
                <IconButton
                  label="Cancel reply"
                  onClick={() => setReplyTo(null)}
                >
                  <X size={13} />
                </IconButton>
              </div>
            )}
            <CommentEditor
              onSave={(body) => {
                saveComment(body);
              }}
            />
            <small className="comment-shortcut">
              Use @ to mention · Paste task IDs or !001 screenshot references · Ctrl + Enter to post
            </small>
          </div>
        </div>
      ) : (
        <div className="td-lock-note">
          Comments are read-only while this task is restricted.
        </div>
      )}
      <div className="task-timeline">
        {timeline.length === 0 && (
          <p className="td-empty">
            {filter === "Activity"
              ? "Task updates will appear here."
              : "Good work starts with a conversation. Add the first update."}
          </p>
        )}
        {timeline.map((entry) => {
          const person = state.users.find(
            (person) => person.id === entry.item.userId,
          );
          if (entry.type === "activity")
            return (
              <div key={entry.item.id} className="task-activity">
                <span className="activity-dot" />
                <div>
                  <strong>{person?.name || "Former member"}</strong>{" "}
                  <TaskRichText value={entry.item.text} />
                  <time dateTime={entry.date}>{timestamp(entry.date)}</time>
                </div>
              </div>
            );
          const comment = entry.item;
          const replied = task.comments.find(
            (item) => item.id === comment.replyTo,
          );
          const canManage =
            editable &&
            (comment.userId === user.id || can("Moderate Comments"));
          return (
            <article
              className={`task-comment ${comment.replyTo ? "is-reply" : ""}`}
              key={comment.id}
            >
              <Avatar
                user={person}
                size={30}
                onClick={() => person && showProfile(person.id)}
              />
              <div className="comment-main">
                <header>
                  <strong>{person?.name || "Former member"}</strong>
                  <time dateTime={comment.createdAt}>
                    {timestamp(comment.createdAt)}
                  </time>
                  {comment.edited && <small>edited</small>}
                  {canManage && (
                    <Menu label="Comment actions">
                      <MenuItem onSelect={() => setEditing(comment.id)}>
                        <Pencil size={14} />
                        Edit comment
                      </MenuItem>
                      <MenuItem
                        danger
                        onSelect={() => {
                          if (canEditTask(task))
                            updateTask(
                              task.id,
                              {
                                comments: task.comments
                                  .filter((item) => item.id !== comment.id)
                                  .map((item) =>
                                    item.replyTo === comment.id
                                      ? { ...item, replyTo: undefined }
                                      : item,
                                  ),
                              },
                              "deleted a comment",
                            );
                        }}
                      >
                        <Trash2 size={14} />
                        Delete comment
                      </MenuItem>
                    </Menu>
                  )}
                </header>
                {replied && (
                  <div className="comment-reply-context">
                    <Reply size={12} />
                    {
                      state.users.find((person) => person.id === replied.userId)
                        ?.name
                    }
                    : {replied.body.slice(0, 75)}
                  </div>
                )}
                {editing === comment.id ? (
                  <CommentEditor
                    initial={comment.body}
                    onSave={(body) => saveComment(body, comment)}
                    onCancel={() => setEditing(null)}
                    submitLabel="Save changes"
                  />
                ) : (
                  <TaskRichText value={comment.body} />
                )}
                <div className="comment-reactions">
                  {Object.entries(comment.reactions)
                    .filter(([, ids]) => ids.length)
                    .map(([emoji, ids]) => (
                      <button
                        key={emoji}
                        disabled={!editable}
                        className={ids.includes(user.id) ? "selected" : ""}
                        onClick={() => react(comment, emoji)}
                        data-tooltip={ids
                          .map(
                            (id) =>
                              state.users.find((person) => person.id === id)
                                ?.name,
                          )
                          .filter(Boolean)
                          .join(", ")}
                        data-tooltip-placement="top"
                        aria-label={`${emoji}, ${ids.length} reactions${ids.includes(user.id) ? ", you reacted" : ""}`}
                      >
                        {emoji}
                        <span>{ids.length}</span>
                      </button>
                    ))}
                  {editable && (
                    <>
                      <Menu label="Add reaction">
                        <MenuItem onSelect={() => react(comment, "👍")}>
                          👍 &nbsp; Thumbs up
                        </MenuItem>
                        <MenuItem onSelect={() => react(comment, "💜")}>
                          💜 &nbsp; Love this
                        </MenuItem>
                        <MenuItem onSelect={() => react(comment, "🚀")}>
                          🚀 &nbsp; Let’s ship it
                        </MenuItem>
                        <MenuItem onSelect={() => react(comment, "👀")}>
                          👀 &nbsp; Taking a look
                        </MenuItem>
                      </Menu>
                      <button
                        className="comment-reply-button"
                        onClick={() => {
                          setReplyTo(comment);
                          document
                            .getElementById("new-task-comment")
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                        }}
                      >
                        <Reply size={13} />
                        Reply
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

    </section>
  );
}
