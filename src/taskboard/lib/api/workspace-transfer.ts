import type { WorkspaceSnapshot } from "./contracts";

export type OmittedImage =
  | { kind: "user"; id: string; field: "avatar" | "bannerImage" }
  | { kind: "attachment"; taskId: string; id: string; field: "content" };

export interface CompactWorkspace {
  snapshot: WorkspaceSnapshot;
  omittedImages: OmittedImage[];
}

export function compactWorkspace(snapshot: WorkspaceSnapshot, previous: WorkspaceSnapshot): CompactWorkspace {
  const compact = structuredClone(snapshot);
  const omittedImages: OmittedImage[] = [];
  for (const user of compact.users) {
    const original = previous.users.find(value => value.id === user.id);
    for (const field of ["avatar", "bannerImage"] as const) {
      if (user[field] && user[field] === original?.[field]) {
        omittedImages.push({ kind: "user", id: user.id, field });
        delete user[field];
      }
    }
  }
  for (const task of compact.tasks) {
    const original = previous.tasks.find(value => value.id === task.id);
    for (const attachment of task.attachments) {
      if (attachment.content && attachment.content === original?.attachments.find(value => value.id === attachment.id)?.content) {
        omittedImages.push({ kind: "attachment", taskId: task.id, id: attachment.id, field: "content" });
        delete attachment.content;
      }
    }
  }
  return { snapshot: compact, omittedImages };
}

export function hydrateWorkspace(result: CompactWorkspace, submitted: WorkspaceSnapshot): WorkspaceSnapshot {
  const snapshot = structuredClone(result.snapshot);
  for (const image of result.omittedImages) {
    if (image.kind === "user") {
      const source = submitted.users.find(user => user.id === image.id);
      const target = snapshot.users.find(user => user.id === image.id);
      if (!source || !target || typeof source[image.field] !== "string") throw new Error("Missing saved profile image.");
      target[image.field] = source[image.field];
    } else {
      const source = submitted.tasks.find(task => task.id === image.taskId)?.attachments.find(item => item.id === image.id);
      const target = snapshot.tasks.find(task => task.id === image.taskId)?.attachments.find(item => item.id === image.id);
      if (!source || !target || typeof source.content !== "string") throw new Error("Missing saved attachment.");
      target.content = source.content;
    }
  }
  return snapshot;
}
