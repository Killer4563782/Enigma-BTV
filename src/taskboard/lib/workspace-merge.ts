import type { AppState, Attachment } from "./types";

export function normalizeAttachmentReferences(attachments: Attachment[], preferred: Attachment[] = []) {
  const references = new Map<string, number>();
  const used = new Set<number>();
  let next = Math.max(0, ...attachments.map((item, index) => item.reference || index + 1));
  const assign = (item: Attachment, fallback: number) => {
    if (references.has(item.id)) return;
    let reference = item.reference || fallback;
    if (used.has(reference)) reference = ++next;
    used.add(reference);
    references.set(item.id, reference);
  };
  preferred.forEach((item, index) => {
    if (attachments.some((attachment) => attachment.id === item.id)) assign(item, index + 1);
  });
  attachments.forEach((item, index) => assign(item, index + 1));
  return attachments.map((item) => ({ ...item, reference: references.get(item.id)! }));
}

const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// Rebase only locally changed fields onto the newest server snapshot. Lists of
// records merge by ID so concurrent comments, attachments and checklist edits survive.
export function mergeValue(base: unknown, local: unknown, remote: unknown): unknown {
  if (equal(base, local)) return remote;
  if (equal(base, remote) || equal(local, remote)) return local;
  if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
    const records = [...base, ...local, ...remote];
    if (records.every((item) => object(item) && typeof item.id === "string")) {
      const before = new Map(base.map((item) => [item.id, item]));
      const mine = new Map(local.map((item) => [item.id, item]));
      const theirs = new Map(remote.map((item) => [item.id, item]));
      const localOrderChanged = !equal(base.map((item) => item.id), local.map((item) => item.id));
      const order = localOrderChanged ? [...mine.keys(), ...theirs.keys()] : [...theirs.keys(), ...mine.keys()];
      return [...new Set(order)].flatMap((id) => {
        if (before.has(id) && (!mine.has(id) || !theirs.has(id))) return [];
        return [mergeValue(before.get(id), mine.get(id) ?? theirs.get(id), theirs.get(id) ?? mine.get(id))];
      });
    }
    if (records.every((item) => typeof item === "string")) {
      const removed = new Set(base.filter((item) => !local.includes(item)));
      return [...new Set([...remote.filter((item) => !removed.has(item)), ...local.filter((item) => !base.includes(item))])];
    }
  }
  if (object(base) && object(local) && object(remote)) {
    return Object.fromEntries([...new Set([...Object.keys(remote), ...Object.keys(local)])]
      .map((key) => [key, mergeValue(base[key], local[key], remote[key])]));
  }
  return local;
}

export function mergeWorkspace(base: AppState, local: AppState, remote: AppState): AppState {
  const occupied = new Set([...local.tasks, ...remote.tasks].map((task) => task.id));
  const renamed = new Map<string, string>();
  let number = Math.max(0, ...[...occupied].map((id) => Number(id.match(/^ENIGMA-(\d+)$/)?.[1]) || 0));
  for (const task of local.tasks) {
    const other = remote.tasks.find((candidate) => candidate.id === task.id);
    if (!base.tasks.some((candidate) => candidate.id === task.id) && other &&
        (other.createdAt !== task.createdAt || other.creatorId !== task.creatorId)) {
      renamed.set(task.id, `ENIGMA-${++number}`);
    }
  }
  const id = (value: string) => renamed.get(value) || value;
  const rebasedLocal = renamed.size ? {
    ...local,
    tasks: local.tasks.map((task) => ({
      ...task,
      id: id(task.id),
      parentId: task.parentId ? id(task.parentId) : undefined,
      blockedBy: task.blockedBy.map(id),
      relatedIds: task.relatedIds.map(id),
      attachments: task.attachments.map((attachment) => ({
        ...attachment,
        ...(attachment.taskId ? { taskId: id(attachment.taskId) } : {}),
      })),
    })),
    notifications: local.notifications.map((notification) => ({
      ...notification,
      ...(notification.taskId ? { taskId: id(notification.taskId) } : {}),
    })),
  } : local;
  const merged = mergeValue(base, rebasedLocal, remote) as AppState;
  return {
    ...merged,
    tasks: merged.tasks.map((task) => {
      const remoteAttachments = remote.tasks.find((item) => item.id === task.id)?.attachments;
      if (equal(task.attachments, remoteAttachments)) return task;
      return {
        ...task,
        attachments: normalizeAttachmentReferences(task.attachments, remoteAttachments),
      };
    }),
    revision: remote.revision,
    currentUserId: local.currentUserId,
  };
}
