"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  ExternalLink,
  File,
  ImageIcon,
  Link2,
  LoaderCircle,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Field,
  IconButton,
  Modal,
  Progress,
} from "@/components/ui";
import { useWorkspace } from "@/lib/store";
import type { Attachment, Task } from "@/lib/types";
import { attachmentUrl, MAX_ATTACHMENT_BYTES, uploadAttachment } from "@/lib/attachment-storage";
import { safeWebUrl } from "./task-comments";

type Upload = {
  id: string;
  file: globalThis.File;
  progress: number;
  failed: boolean;
};
export function TaskAttachments({
  task,
  editable,
}: {
  task: Task;
  editable: boolean;
}) {
  const workspace = useWorkspace();
  const { state, updateTask, canEditTask, notify, openTask } = workspace;
  const latest = useRef(workspace);
  useEffect(() => {
    latest.current = workspace;
  }, [workspace]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");
  const [taskLinkOpen, setTaskLinkOpen] = useState(false);
  const [taskQuery, setTaskQuery] = useState("");
  const [preview, setPreview] = useState<Attachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const uploadControllers = useRef(new Map<string, AbortController>());
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const controllers = uploadControllers.current;
    return () => {
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    };
  }, []);

  async function startUpload(upload: Upload) {
    if (!editable || !canEditTask(task) || uploadControllers.current.has(upload.id)) return;
    const controller = new AbortController();
    uploadControllers.current.set(upload.id, controller);
    setUploads((previous) => [
      ...previous.filter((item) => item.id !== upload.id),
      { ...upload, progress: 0, failed: false },
    ]);
    try {
      // A newly created task must exist on the server before its file chunks.
      const savedState = await latest.current.flushWorkspace();
      controller.signal.throwIfAborted();
      const matchesTask = (item: Task) => item.creatorId === task.creatorId && item.createdAt === task.createdAt;
      const savedTask = savedState.tasks.find((item) => item.id === task.id && matchesTask(item)) ||
        savedState.tasks.find(matchesTask);
      if (!savedTask || savedTask.deleted) throw new Error("The task is no longer available for attachments.");
      const attachment = await uploadAttachment(
        upload.file,
        savedTask.id,
        (progress) => {
          setUploads((previous) => previous.map((item) => item.id === upload.id ? { ...item, progress } : item));
        },
        controller.signal,
      );
      controller.signal.throwIfAborted();
      const current = latest.current.state.tasks.find((item) => item.id === savedTask.id);
      if (current && !current.deleted && latest.current.canEditTask(current)) {
        latest.current.updateTask(savedTask.id, (currentTask) => {
          const reference = Math.max(0, ...currentTask.attachments.map((item) => item.reference || 0), currentTask.attachments.length) + 1;
          return { attachments: [...currentTask.attachments, { ...attachment, reference }] };
        }, `attached ${attachment.name}`);
      }
      setUploads((previous) => previous.filter((item) => item.id !== upload.id));
    } catch (error) {
      if (controller.signal.aborted) return;
      setUploads((previous) => previous.map((item) => item.id === upload.id ? { ...item, failed: true } : item));
      notify(error instanceof Error ? error.message : "Upload failed. Retry the file.", "error");
    } finally {
      uploadControllers.current.delete(upload.id);
    }
  }
  function addFiles(files: FileList | null) {
    if (!files || !editable) return;
    Array.from(files).forEach((file) => {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        notify(`${file.name} is larger than the 10 MB attachment limit.`, "error");
        return;
      }
      void startUpload({ id: crypto.randomUUID(), file, progress: 0, failed: false });
    });
    if (fileInput.current) fileInput.current.value = "";
  }
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      if (!editable || !event.clipboardData?.files.length) return;
      const files = event.clipboardData.files;
      if (!Array.from(files).some((file) => file.type.startsWith("image/"))) return;
      event.preventDefault();
      addFiles(files);
    };
    document.addEventListener("paste", paste);
    return () => document.removeEventListener("paste", paste);
  }, [editable, task.id]);
  useEffect(() => {
    let active = true;
    setPreviewUrl(undefined);
    if (preview) void attachmentUrl(preview).then((url) => {
      if (active) setPreviewUrl(url);
    }).catch((error) => notify(error.message, "error"));
    return () => { active = false; };
  }, [preview]);
  function drop(event: DragEvent) {
    event.preventDefault();
    setDragOver(false);
    if (editable) addFiles(event.dataTransfer.files);
  }
  function remove(attachment: Attachment) {
    if (!editable || !canEditTask(task)) return;
    updateTask(
      task.id,
      {
        attachments: task.attachments.filter(
          (item) => item.id !== attachment.id,
        ),
      },
      `removed attachment ${attachment.name}`,
    );
    if (preview?.id === attachment.id) setPreview(null);
  }
  function saveLink() {
    if (!editable || !canEditTask(task)) return;
    const url = safeWebUrl(linkUrl);
    if (!url) {
      setLinkError("Enter a valid link starting with https:// or http://.");
      return;
    }
    updateTask(
      task.id,
      {
        attachments: [
          ...task.attachments,
          {
            id: crypto.randomUUID(),
            name: linkTitle.trim() || new URL(url).hostname,
            type: "link",
            url,
          },
        ],
      },
      "attached a link",
    );
    setLinkOpen(false);
    setLinkTitle("");
    setLinkUrl("");
    setLinkError("");
  }
  function attachTask(target: Task) {
    if (!editable || !canEditTask(task)) return;
    updateTask(
      task.id,
      {
        attachments: [
          ...task.attachments,
          { id: crypto.randomUUID(), name: `${target.id} · ${target.title}`, type: "task", taskId: target.id },
        ],
      },
      `linked task ${target.id}`,
    );
    setTaskLinkOpen(false);
    setTaskQuery("");
  }
  return (
    <section className="td-section">
      <div className="td-section-heading">
        <h3>
          <Paperclip size={17} />
          Attachments<span className="td-count">{task.attachments.length}</span>
        </h3>
        {editable && (
          <div className="td-inline">
            <Button variant="ghost" onClick={() => setLinkOpen(true)}>
              <Link2 size={14} />
              Add link
            </Button>
            <Button variant="ghost" onClick={() => setTaskLinkOpen(true)}>
              <Link2 size={14} />
              Link task
            </Button>
            <Button variant="ghost" onClick={() => fileInput.current?.click()}>
              <Plus size={14} />
              Upload
            </Button>
          </div>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(event) => addFiles(event.target.files)}
      />
      <div
        className={`task-attachment-zone ${dragOver ? "drag-over" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (editable) setDragOver(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node))
            setDragOver(false);
        }}
        onDrop={drop}
      >
        {task.attachments.length > 0 && (
          <div className="task-attachment-grid">
            {task.attachments.map((attachment) => {
              const url = attachment.content || safeWebUrl(attachment.url);
              return (
                <div className="task-attachment" key={attachment.id}>
                  <button
                    className={`attachment-open attachment-${attachment.type}`}
                    onClick={() =>
                      attachment.type === "task" && attachment.taskId
                        ? openTask(attachment.taskId)
                        : setPreview(attachment)
                    }
                  >
                    {attachment.type === "image" && (url || attachment.storageId) ? (
                      <AttachmentImage attachment={attachment} />
                    ) : (
                      <span className="attachment-icon">
                        {attachment.type === "task" ? (
                          <Link2 size={21} />
                        ) : attachment.type === "link" ? (
                          <Link2 size={21} />
                        ) : attachment.type === "image" ? (
                          <ImageIcon size={23} />
                        ) : (
                          <File size={23} />
                        )}
                      </span>
                    )}
                    <span>
                      <strong>{attachment.type === "image" ? `!${String(attachment.reference || task.attachments.indexOf(attachment) + 1).padStart(3, "0")} · ` : ""}{attachment.name}</strong>
                      <small>
                        {attachment.type === "task"
                          ? "Linked task · Opens immediately"
                          : attachment.type === "link"
                          ? (() => {
                              try {
                                return url ? new URL(url).hostname : "Web link";
                              } catch {
                                return "Web link";
                              }
                            })()
                          : `${attachment.size || "Preview"} · ${attachment.type === "image" ? "Image" : "File"}`}
                      </small>
                    </span>
                  </button>
                  {editable && (
                    <IconButton
                      label={`Remove ${attachment.name}`}
                      className="attachment-remove"
                      onClick={() => remove(attachment)}
                    >
                      <X size={13} />
                    </IconButton>
                  )}
                  <IconButton
                    label={`Copy reference to ${attachment.name}`}
                    className="attachment-copy"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(attachment.type === "image" ? `!${String(attachment.reference || task.attachments.indexOf(attachment) + 1).padStart(3, "0")}` : `@attachment:${attachment.id}`);
                        notify("Attachment reference copied.");
                      } catch {
                        notify("Clipboard is unavailable in this browser.", "error");
                      }
                    }}
                  >
                    <Copy size={13} />
                  </IconButton>
                </div>
              );
            })}
          </div>
        )}
        {uploads.map((upload) => (
          <div
            className={`task-upload ${upload.failed ? "failed" : ""}`}
            key={upload.id}
          >
            {upload.failed ? (
              <AlertCircle size={18} />
            ) : (
              <LoaderCircle size={18} className="spin" />
            )}
            <div>
              <strong>{upload.file.name}</strong>
              <Progress value={upload.progress} />
              <small>
                {upload.failed
                  ? "Upload failed. Your file is ready to retry."
                  : `Preparing preview · ${upload.progress}%`}
              </small>
            </div>
            {upload.failed && (
              <IconButton
                label={`Retry ${upload.file.name}`}
                onClick={() => void startUpload(upload)}
                disabled={!editable}
              >
                <RotateCcw size={16} />
              </IconButton>
            )}
            <IconButton
              label={`Cancel ${upload.file.name}`}
              onClick={() => {
                uploadControllers.current.get(upload.id)?.abort();
                setUploads((previous) =>
                  previous.filter((item) => item.id !== upload.id),
                );
              }}
            >
              <X size={15} />
            </IconButton>
          </div>
        ))}
        {editable && (
          <button
            className="attachment-drop-target"
            onClick={() => fileInput.current?.click()}
          >
            <UploadCloud size={18} />
            <span>
              Drop files here or <strong>browse files</strong>
            </span>
            <small>Images, documents, and anything your task needs</small>
          </button>
        )}
      </div>
      <small className="td-muted">Up to 10 MB per file · Paste clipboard images with Ctrl + V</small>
      <Modal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Attach a link"
        description="Keep useful resources close to the work."
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            saveLink();
          }}
          className="td-modal-form"
        >
          <Field label="URL">
            <input
              autoFocus
              value={linkUrl}
              placeholder="https://…"
              onChange={(event) => {
                setLinkUrl(event.target.value);
                setLinkError("");
              }}
              required
            />
          </Field>
          <Field label="Display title">
            <input
              value={linkTitle}
              placeholder="Design exploration, technical notes…"
              onChange={(event) => setLinkTitle(event.target.value)}
            />
          </Field>
          {linkError && (
            <p className="inline-error" role="alert">
              {linkError}
            </p>
          )}
          <div className="modal-actions">
            <Button type="button" onClick={() => setLinkOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!editable}>
              <Link2 size={15} />
              Attach link
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={taskLinkOpen}
        onClose={() => setTaskLinkOpen(false)}
        title="Link another task"
        description="Linked tasks are shortcuts, not dependencies."
        className="task-picker-modal"
      >
        <div className="td-search">
          <Search size={16} />
          <input
            autoFocus
            value={taskQuery}
            onChange={(event) => setTaskQuery(event.target.value)}
            placeholder="Search by task ID or title…"
            aria-label="Search tasks to attach"
          />
        </div>
        <div className="task-relation-options">
          {state.tasks
            .filter(
              (candidate) =>
                candidate.id !== task.id &&
                !candidate.deleted &&
                !candidate.archived &&
                !task.attachments.some((item) => item.type === "task" && item.taskId === candidate.id) &&
                `${candidate.id} ${candidate.title}`.toLowerCase().includes(taskQuery.toLowerCase()),
            )
            .slice(0, 20)
            .map((candidate) => (
              <button key={candidate.id} onClick={() => attachTask(candidate)}>
                <span>
                  <small>{candidate.id}</small>
                  <strong>{candidate.title}</strong>
                </span>
                <Plus size={15} />
              </button>
            ))}
        </div>
      </Modal>
      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.name || "Attachment preview"}
        description={preview?.size}
        className="attachment-preview-modal"
      >
        {preview && (
          <div className="attachment-preview-body">
            {preview.type === "image" && previewUrl ? (
              <img
                className="attachment-full-image"
                src={previewUrl}
                alt={preview.name}
              />
            ) : (
              <div className="attachment-file-preview">
                {preview.type === "link" ? (
                  <Link2 size={44} />
                ) : (
                  <File size={44} />
                )}
                <h3>{preview.name}</h3>
                <p>
                  {preview.type === "link"
                    ? previewUrl
                    : previewUrl
                      ? "This file is ready to open or download."
                      : "This sample attachment shows how file previews will appear."}
                </p>
                <Badge>
                  {preview.type === "link"
                    ? "Linked resource"
                    : preview.size || "Sample attachment"}
                </Badge>
              </div>
            )}
            <div className="attachment-preview-actions">
              {editable && (
                <Button variant="ghost" onClick={() => remove(preview)}>
                  <Trash2 size={15} />
                  Remove
                </Button>
              )}
              {previewUrl ? (
                <a
                  className="btn btn-primary"
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={preview.type !== "link" ? preview.name : undefined}
                >
                  {preview.type === "link" ? (
                    <ExternalLink size={15} />
                  ) : (
                    <Download size={15} />
                  )}{" "}
                  {preview.type === "link" ? "Open link" : "Download file"}
                </a>
              ) : (
                <Button
                  onClick={() => {
                    notify(
                      "This is a sample attachment. Upload a file to try a real browser preview.",
                      "info",
                    );
                  }}
                >
                  <Check size={15} />
                  Sample preview
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}

function AttachmentImage({ attachment }: { attachment: Attachment }) {
  const [url, setUrl] = useState<string>();
  const placeholder = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let active = true;
    let requested = false;
    const load = () => {
      if (!active || requested) return;
      requested = true;
      void attachmentUrl(attachment)
        .then((value) => { if (active) setUrl(value); })
        .catch(() => undefined);
    };
    const element = placeholder.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      load();
      return () => { active = false; };
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      load();
    }, { rootMargin: "100px" });
    observer.observe(element);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [attachment.id, attachment.storageId, attachment.content, attachment.url]);
  return url ? (
    <img src={url} alt={attachment.name} loading="lazy" />
  ) : (
    <span ref={placeholder} className="attachment-icon" aria-hidden="true">
      <ImageIcon size={23} />
    </span>
  );
}
