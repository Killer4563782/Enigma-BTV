"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import { createInitialState } from "@/data/initial-state";
import { permissions, type AppState, type AuthMode, type Presence, type Task, type User, type View } from "./types";
import type { WorkspaceContext } from "./context-contract";
import { canEdit, uid } from "./operations";
import { mergeWorkspace, normalizeAttachmentReferences } from "./workspace-merge";
import { workspaceApi } from "./api/workspace";
import { ApiError } from "./api/client";
import { Check, CircleAlert, Info, X } from "lucide-react";
import { taskboardParts, taskboardUrl } from "./routes.mjs";
import { getLocalAccounts, rememberLocalAccount, removeLocalAccount } from "./local-accounts";
import { defaultAppearance, readLocalAppearance, saveLocalAppearance, type LocalAppearance } from "./appearance";

const Context = createContext<WorkspaceContext | null>(null);
// An unauthenticated context value, never inserted into the users collection.
const signedOutUser: User = {
  id: "",
  username: "",
  name: "",
  bio: "",
  role: "",
  color: "",
  presence: "Offline",
  status: "",
  joined: "",
  lastActive: "",
  active: false,
};
const routes: View[] = [
  "home",
  "board",
  "space",
  "my-tasks",
  "notifications",
  "trash",
  "settings",
  "admin",
  "profile",
  "releases",
  "changelog",
];
export function workspaceForUser(snapshot: AppState, authenticatedUser: User) {
  const taskDefaults = snapshot.tasks.map((task) => ({
    ...task,
    labels: task.labels || [],
    blockedBy: task.blockedBy || [],
    relatedIds: task.relatedIds || [],
    watcherIds: task.watcherIds || [],
    attachments: task.attachments || [],
    comments: task.comments || [],
    activity: task.activity || [],
    checklists: (task.checklists || []).map((checklist) => ({
      ...checklist,
      items: checklist.items.map((item) => ({ ...item, thread: item.thread || [] })),
    })),
  }));
  const tasksById = new Map(taskDefaults.map(task => [task.id, task]));
  const listsById = new Map(snapshot.lists.map(list => [list.id, list]));
  const fallbackListsByBoard = new Map<string, AppState['lists'][number]>();
  for (const list of snapshot.lists) {
    if (!list.deleted && !list.archived && !/^(done|complete|completed)$/i.test(list.name)
      && !fallbackListsByBoard.has(list.boardId)) fallbackListsByBoard.set(list.boardId, list);
  }
  const normalizedTasks = taskDefaults.map((task) => {
    const unresolved = task.blockedBy.some((dependencyId) => {
      const dependency = tasksById.get(dependencyId);
      const dependencyList = dependency ? listsById.get(dependency.listId) : undefined;
      return Boolean(
        dependency &&
          !dependency.deleted &&
          !dependency.archived &&
          !dependency.completedAt &&
          !/^(done|complete|completed)$/i.test(dependencyList?.name || ""),
      );
    });
    const currentList = listsById.get(task.listId);
    if (!unresolved || (!task.completedAt && !/^(done|complete|completed)$/i.test(currentList?.name || "")))
      return task;
    const fallback = fallbackListsByBoard.get(task.boardId);
    return { ...task, completedAt: undefined, listId: fallback?.id || task.listId };
  });
  const existing = snapshot.users.find(
    (person) => person.id === authenticatedUser.id,
  );
  const user = existing
    ? {
        ...authenticatedUser,
        ...existing,
        id: authenticatedUser.id,
        username: existing.username,
        role: authenticatedUser.role,
        siteAdmin: authenticatedUser.siteAdmin,
        bootstrapOwner: authenticatedUser.bootstrapOwner,
        active: true,
        lastActive: authenticatedUser.lastActive,
      }
    : authenticatedUser;
  const users = snapshot.users.some((person) => person.id === user.id)
    ? snapshot.users.map((person) => (person.id === user.id ? user : person))
    : [user, ...snapshot.users];
  // Members must send back the server's role definitions unchanged. Expanding
  // Owner/Admin permissions here makes every member workspace save fail with
  // "Your role cannot change roles", including their own profile updates.
  if (authenticatedUser.role !== "Owner" && authenticatedUser.role !== "Admin")
    return { ...snapshot, tasks: normalizedTasks, users, currentUserId: user.id };
  const adminRole = snapshot.roles.find((role) => role.name === "Admin");
  const roles = adminRole
    ? snapshot.roles.map((role) =>
        role.name === "Admin" ? { ...role, permissions: [...permissions] } : role,
      )
    : [
        {
          id: "admin",
          name: "Admin",
          color: "#a78bfa",
          permissions: [...permissions],
        },
        ...snapshot.roles,
      ];
  const ownerRole = roles.find((role) => role.name === "Owner");
  const privilegedRoles = ownerRole
    ? roles.map((role) => role.name === "Owner" ? { ...role, permissions: [...permissions] } : role)
    : [{ id: "owner", name: "Owner", color: "#fbbf24", permissions: [...permissions] }, ...roles];
  return { ...snapshot, tasks: normalizedTasks, users, roles: privilegedRoles, currentUserId: user.id };
}
type Toast = {
  id: string;
  message: string;
  tone: "success" | "error" | "info";
};
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(createInitialState);
  const [view, setView] = useState<View>("home");
  const [entityId, setEntityId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [localAccounts, setLocalAccounts] = useState<string[]>(getLocalAccounts);
  const [loginEmail, setLoginEmail] = useState("");
  const [appearance, setAppearance] = useState<{ accountId: string; value: LocalAppearance }>({ accountId: "", value: defaultAppearance });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ready, setReady] = useState(false);
  const [livePresence, setLivePresence] = useState<Record<string, { presence: Presence; lastActive: string }>>({});
  const toastTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const saveTimer = useRef<number | null>(null);
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const confirmedProfileState = useRef<AppState | null>(null);
  const pendingProfileSave = useRef<Promise<void> | null>(null);
  const selectedRef = useRef(selectedTaskId);
  selectedRef.current = selectedTaskId;
  const preserveSelection = (current: AppState, next: AppState) => {
    const before = current.tasks.find((task) => task.id === selectedRef.current);
    if (!before) return;
    if (next.tasks.some((task) => task.id === before.id && task.creatorId === before.creatorId && task.createdAt === before.createdAt)) return;
    const after = next.tasks.find((task) => task.createdAt === before.createdAt && task.creatorId === before.creatorId);
    if (after && after.id !== before.id) {
      setSelectedTaskId(after.id);
      const url = new URL(window.location.href);
      url.searchParams.set("task", after.id);
      window.history.replaceState({}, "", url);
    }
  };
  const serverRevision = useRef(0);
  const serverState = useRef<AppState | null>(null);
  const baselines = useRef(new Map<number, AppState>());
  const rememberServer = (snapshot: AppState) => {
    serverState.current = snapshot;
    serverRevision.current = snapshot.revision || 0;
    baselines.current.set(snapshot.revision || 0, snapshot);
    if (baselines.current.size > 32) baselines.current.delete(baselines.current.keys().next().value!);
  };
  const latestState = useRef(state);
  latestState.current = state;
  const saveFailureNotified = useRef(false);
  const notify = useCallback(
    (message: string, tone: Toast["tone"] = "success") => {
      const id = uid("toast");
      setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
      toastTimers.current.push(
        setTimeout(
          () => setToasts((prev) => prev.filter((t) => t.id !== id)),
          4200,
        ),
      );
    },
    [],
  );
  useEffect(() => {
    let cancelled = false;
    // Remove keys written by earlier demo builds. This is cleanup only; no
    // workspace value is read from or written back to browser storage.
    try {
      window.localStorage.removeItem("enigma-taskboard-demo-v1");
      window.localStorage.removeItem("enigma-taskboard-v1");
    } catch {
      // Storage may be disabled by the browser; there is nothing to persist.
    }
    const loadWorkspace = async () => {
      try {
        const session = await workspaceApi.getSession();
        if (cancelled) return;
        if (!session.user) {
          setAuthMode(window.location.pathname.startsWith("/taskboard/register") ? "register" : "login");
          return;
        }
        const snapshot = await workspaceApi.getWorkspace();
        if (cancelled) return;
        serverRevision.current = snapshot?.revision || 0;
        const loaded = workspaceForUser(snapshot || createInitialState(), session.user);
        rememberServer(loaded);
        setState(loaded);
        setAuthMode(null);
      } catch {
        if (!cancelled) setAuthMode(window.location.pathname.startsWith("/taskboard/register") ? "register" : "login");
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    void loadWorkspace();
    const sync = () => {
      const parts = taskboardParts(window.location.pathname);
      if (routes.includes(parts[0] as View)) {
        setView(parts[0] as View);
        setEntityId(decodeURIComponent(parts[1] || ""));
      } else if (["login", "register", "setup"].includes(parts[0]))
        setAuthMode(parts[0] as AuthMode);
      else {
        setView("home");
        setEntityId("");
      }
      setSelectedTaskId(
        new URLSearchParams(window.location.search).get("task"),
      );
    };
    sync();
    window.addEventListener("popstate", sync);
    const timers = toastTimers.current;
    return () => {
      cancelled = true;
      window.removeEventListener("popstate", sync);
      timers.forEach(clearTimeout);
    };
  }, [notify]);
  useEffect(() => {
    document.documentElement.dataset.motion = state.preferences.motion
      ? "on"
      : "off";
    document.documentElement.dataset.density = state.preferences.compact
      ? "compact"
      : "comfortable";
  }, [state.preferences]);
  const user =
    state.users.find((u) => u.id === state.currentUserId) ||
    signedOutUser;
  const displayState = useMemo(() => ({
    ...state,
    users: state.users.map((person) => ({
      ...person,
      presence: livePresence[person.id]?.presence || "Offline" as Presence,
      lastActive: livePresence[person.id]?.lastActive || person.lastActive,
    })),
  }), [state, livePresence]);
  const displayUser = displayState.users.find((person) => person.id === user.id) || user;
  const localAppearance = appearance.accountId === user.id ? appearance.value : readLocalAppearance(user.id);
  const updateLocalAppearance = (patch: Partial<LocalAppearance>) => {
    const value = { ...localAppearance, ...patch };
    try {
      saveLocalAppearance(user.id, value);
      setAppearance({ accountId: user.id, value });
    } catch { notify("Appearance could not be saved. Check browser storage settings.", "error"); }
  };
  useEffect(() => {
    document.documentElement.dataset.enigmaTheme = localAppearance.theme;
    document.documentElement.style.setProperty("--accent", localAppearance.accent);
    document.documentElement.style.setProperty("--accent-light", localAppearance.accent === defaultAppearance.accent ? "#c8b4f3" : `color-mix(in srgb, ${localAppearance.accent} 75%, white)`);
    return () => {
      delete document.documentElement.dataset.enigmaTheme;
      document.documentElement.style.removeProperty("--accent");
      document.documentElement.style.removeProperty("--accent-light");
    };
  }, [localAppearance.theme, localAppearance.accent]);
  useEffect(() => {
    if (!ready || authMode || !user.id || !user.active) return;
    let cancelled = false;
    let inFlight = false;
    const refresh = async () => {
      if (document.visibilityState !== "visible" || inFlight) return;
      inFlight = true;
      try {
        const result = await workspaceApi.heartbeat();
        if (!cancelled) {
          setLivePresence(Object.fromEntries(
            result.users.map(({ id, presence, lastActive }) => [id, { presence, lastActive }]),
          ));
        }
      } catch (error) {
        if (!cancelled && error instanceof ApiError && error.status === 401) {
          setLivePresence({});
          setAuthMode("login");
        }
      } finally {
        inFlight = false;
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [ready, authMode, user.id, user.active]);
  const persist = async (submitted: AppState, localBase: AppState = submitted) => {
    let baseline = baselines.current.get(submitted.revision || 0) || serverState.current || submitted;
    let next: AppState = { ...submitted, revision: submitted.revision || 0 };
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const saved = await workspaceApi.saveWorkspace(next);
        const confirmed = workspaceForUser({ ...saved, preferences: next.preferences }, user);
        rememberServer(confirmed);
        preserveSelection(latestState.current, mergeWorkspace(localBase, latestState.current, confirmed));
        setState((current) => {
          const rebased = mergeWorkspace(localBase, current, confirmed);
          if (JSON.stringify(rebased) === JSON.stringify(confirmed)) confirmedProfileState.current = rebased;
          return rebased;
        });
        return confirmed;
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 409 || !/Workspace changed/.test(error.message)) throw error;
        const snapshot = await workspaceApi.getWorkspace();
        if (!snapshot) throw error;
        const remote = workspaceForUser(snapshot, user);
        next = mergeWorkspace(baseline, next, remote);
        baseline = remote;
        rememberServer(remote);
      }
    }
    throw new Error("The workspace is busy. Your edits are kept here; retry saving shortly.");
  };
  useEffect(() => {
    if (!ready || authMode || !user.id || !user.active) return;
    if (!serverState.current && state.revision !== undefined) {
      rememberServer(state);
      return;
    }
    if (state === confirmedProfileState.current) {
      confirmedProfileState.current = null;
      return;
    }
    if (JSON.stringify(state) === JSON.stringify(serverState.current)) return;
    const timer = window.setTimeout(() => {
      saveTimer.current = null;
      saveChain.current = saveChain.current.then(async () => {
        try {
          await persist(latestState.current);
          saveFailureNotified.current = false;
        } catch (error) {
          if (!saveFailureNotified.current) {
            saveFailureNotified.current = true;
            notify(error instanceof Error ? error.message : "Workspace changes could not be saved.", "error");
          }
        }
      });
    }, 300);
    saveTimer.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (saveTimer.current === timer) saveTimer.current = null;
    };
  }, [ready, authMode, state, user.id, user.active, notify]);
  useEffect(() => {
    if (!ready || authMode || !user.id) return;
    let cancelled = false;
    let refreshing = false;
    const refresh = async () => {
      if (document.visibilityState !== "visible" || refreshing) return;
      refreshing = true;
      // Serialize reads and writes so a slow refresh cannot replace a newer save.
      saveChain.current = saveChain.current.then(async () => {
        try {
          const snapshot = await workspaceApi.getWorkspace();
          if (cancelled || !snapshot) return;
          const remote = workspaceForUser(snapshot, user);
          const baseline = serverState.current || remote;
          rememberServer(remote);
          preserveSelection(latestState.current, mergeWorkspace(baseline, latestState.current, remote));
          setState((current) => {
            const next = mergeWorkspace(baseline, current, remote);
            if (JSON.stringify(next) === JSON.stringify(remote)) confirmedProfileState.current = next;
            return next;
          });
        } catch (error) {
          if (!cancelled && error instanceof ApiError && error.status === 401) setAuthMode("login");
        } finally {
          refreshing = false;
        }
      });
      await saveChain.current;
    };
    const timer = window.setInterval(() => void refresh(), 3000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [ready, authMode, user.id, user.role]);
  const navigate = useCallback((next: View, id = "") => {
    setView(next);
    setEntityId(id);
    setSelectedTaskId(null);
    window.history.pushState(
      {},
      "",
      taskboardUrl(next, id),
    );
  }, []);
  const flushWorkspace = async () => {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = null;
    let snapshot = latestState.current;
    const flush = saveChain.current.then(async () => {
      snapshot = latestState.current;
      if (JSON.stringify(latestState.current) !== JSON.stringify(serverState.current)) {
        snapshot = await persist(latestState.current);
      }
    });
    saveChain.current = flush.catch(() => undefined);
    await flush;
    return snapshot;
  };
  const openTask = useCallback((id: string) => {
    setSelectedTaskId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("task", id);
    window.history.replaceState({}, "", url);
  }, []);
  const redeemAccessKey = async (key: string) => {
    await flushWorkspace();
    const redemption = saveChain.current.then(async () => {
      const account = await workspaceApi.redeemAccessKey(key);
      // Once the key is consumed, a failed refresh must not report redemption
      // as failed or encourage another attempt with the now-used key.
      const snapshot = await workspaceApi.getWorkspace().catch(() => null);
      const refreshed = workspaceForUser(snapshot || latestState.current, account);
      rememberServer(refreshed);
      setState(refreshed);
    });
    saveChain.current = redemption.catch(() => undefined);
    await redemption;
  };
  const leaveWorkspace = async (href: '/') => {
    try {
      // A full document navigation would otherwise cancel the debounce timer.
      await saveChain.current;
      const saved = await persist(latestState.current);
      serverRevision.current = saved.revision || 0;
      window.location.assign(href);
    } catch {
      notify("Save failed. Please retry before leaving the workspace.", "error");
    }
  };
  const closeTask = useCallback(() => {
    setSelectedTaskId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("task");
    window.history.replaceState({}, "", url);
  }, []);
  const can: WorkspaceContext["can"] = (permission) =>
    user.active &&
    ((user.role === "Admin" || user.role === "Owner") ||
      !!state.roles
        .find((r) => r.name === user.role)
        ?.permissions.includes(permission));
  const mayEditTask = (task: Task) =>
    canEdit(task, user) && (can("Edit Any Task") || can("Edit Tasks"));
  const updateTask: WorkspaceContext["updateTask"] = (id, patch, activity) => {
    const existing = state.tasks.find((t) => t.id === id);
    if (!existing) return;
    if (!mayEditTask(existing)) {
      notify(
        "This task is restricted to its creator and workspace moderators.",
        "error",
      );
      return;
    }
    const now = new Date().toISOString();
    setState((prev) => {
      const current = prev.tasks.find((task) => task.id === id);
      if (!current) return prev;
      const change = typeof patch === "function" ? patch(current) : patch;
      if (change.attachments) {
        change.attachments = normalizeAttachmentReferences(change.attachments, current.attachments);
      }
      const watcherNotifications = activity
        ? current.watcherIds
            .filter((watcherId) => watcherId !== user.id)
            .map((watcherId) => ({
              id: uid("notification"),
              userId: watcherId,
              actorId: user.id,
              title: `${user.name} updated a task you watch`,
              body: `${current.id} · ${activity}`,
              kind: "Task update" as const,
              taskId: current.id,
              createdAt: now,
              read: false,
            }))
        : [];
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                ...change,
                updatedAt: now,
                ...(activity
                  ? {
                      activity: [
                        {
                          id: uid("activity"),
                          userId: user.id,
                          text: activity,
                          createdAt: now,
                        },
                        ...t.activity,
                      ],
                    }
                  : {}),
              }
            : t,
        ),
        notifications: [...watcherNotifications, ...prev.notifications],
      };
    });
  };
  const createTask: WorkspaceContext["createTask"] = (patch) => {
    if (!can("Create Tasks")) {
      notify("Your role cannot create tasks.", "error");
      return "";
    }
    const boardId =
      patch.boardId ||
      (view === "board"
        ? entityId
        : state.boards.find((board) => !board.deleted)?.id || "");
    if (
      !boardId ||
      !state.lists.some(
        (list) => list.boardId === boardId && !list.deleted && !list.archived,
      )
    ) {
      notify("Create a board with a list before adding tasks.", "info");
      return "";
    }
    const prefix = "ENIGMA";
    const nextNumber =
      Math.max(
        0,
        ...state.tasks
          .filter((t) => t.id.startsWith(prefix + "-"))
          .map((t) => Number(t.id.split("-").at(-1)) || 0),
      ) + 1;
    const id = `${prefix}-${nextNumber}`;
    const now = new Date().toISOString();
    const { title: requestedTitle, ...restPatch } = patch;
    const task: Task = {
      id,
      boardId,
      listId:
        restPatch.listId ||
        state.lists.find(
          (l) => l.boardId === boardId && !l.deleted && !l.archived,
        )?.id ||
        "",
      title: requestedTitle.trim(),
      description: "",
      priority: "None",
      labels: [],
      assignees: [],
      creatorId: user.id,
      createdAt: now,
      updatedAt: now,
      startDate: "",
      dueDate: "",
      dueTime: "",
      restricted: false,
      blockedBy: [],
      relatedIds: [],
      watcherIds: [user.id],
      checklists: [],
      attachments: [],
      comments: [],
      activity: [
        {
          id: uid("activity"),
          userId: user.id,
          text: "created this task",
          createdAt: now,
        },
      ],
      ...restPatch,
    };
    const newNotifications = task.assignees
      .filter((id) => id !== user.id)
      .map((userId) => ({
        id: uid("notification"),
        userId,
        actorId: user.id,
        title: `${user.name} assigned you a task`,
        body: task.title,
        kind: "Assignment" as const,
        taskId: id,
        createdAt: now,
        read: false,
      }));
    setState((prev) => ({
      ...prev,
      tasks: [...prev.tasks, task],
      notifications: [...newNotifications, ...prev.notifications],
    }));
    notify("Task created");
    return id;
  };
  const toggleTaskWatch: WorkspaceContext["toggleTaskWatch"] = (id) => {
    setState((previous) => ({
      ...previous,
      tasks: previous.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              watcherIds: task.watcherIds.includes(user.id)
                ? task.watcherIds.filter((watcherId) => watcherId !== user.id)
                : [...task.watcherIds, user.id],
              updatedAt: new Date().toISOString(),
            }
          : task,
      ),
    }));
  };
  const requestNewTask = useCallback(
    (listId?: string, parentId?: string) =>
      window.dispatchEvent(
        new CustomEvent("enigma:new-task", { detail: { listId, parentId } }),
      ),
    [],
  );
  const rememberAccount = (email: string) => {
    setLocalAccounts(rememberLocalAccount(email));
    setLoginEmail("");
  };
  const removeAccount = (email: string) => {
    try {
      setLocalAccounts(removeLocalAccount(email));
      if (loginEmail === email) setLoginEmail("");
      notify("Saved account removed from this browser.");
    } catch {
      notify("The saved account could not be removed. Check browser storage settings.", "error");
    }
  };
  const saveProfile: WorkspaceContext["saveProfile"] = async (change) => {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const profileSave = saveChain.current.then(async () => {
      const current = latestState.current;
      const next = {
        ...current,
        revision: current.revision || 0,
        users: current.users.map((person) =>
          person.id === user.id ? { ...person, ...change } : person,
        ),
      };
      await persist(next, current);
    });
    saveChain.current = profileSave.catch(() => undefined);
    pendingProfileSave.current = profileSave;
    try {
      await profileSave;
      void workspaceApi.heartbeat()
        .then((result) => setLivePresence(Object.fromEntries(
          result.users.map(({ id, presence, lastActive }) => [id, { presence, lastActive }]),
        )))
        .catch(() => undefined);
    } finally {
      if (pendingProfileSave.current === profileSave) pendingProfileSave.current = null;
    }
  };
  const signOut = async () => {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = null;
    await saveChain.current;
    if (JSON.stringify(latestState.current) !== JSON.stringify(serverState.current)) {
      try { await persist(latestState.current); }
      catch { notify("Save failed. Retry before signing out.", "error"); return false; }
    }
    if (pendingProfileSave.current) {
      try {
        await pendingProfileSave.current;
      } catch {
        notify("Save your profile before signing out.", "error");
        return false;
      }
    }
    await workspaceApi.logout().catch(() => undefined);
    setState(createInitialState());
    setLivePresence({});
    serverRevision.current = 0;
    serverState.current = null;
    baselines.current.clear();
    setLoginEmail("");
    setAuthMode("login");
    navigate("home");
    return true;
  };
  const switchAccount = async (email: string) => {
    if (!localAccounts.includes(email)) return;
    if (!await signOut()) return;
    setLoginEmail(email);
  };
  const resetWorkspace = async () => {
    const empty = workspaceForUser(createInitialState(), user);
    try {
      const saved = await workspaceApi.saveWorkspace({ ...empty, revision: Math.max(serverRevision.current, empty.revision || 0) });
      serverRevision.current = saved.revision || 0;
    } catch {
      notify("The workspace could not be cleared. Try again.", "error");
      return;
    }
    setState(empty);
    setAuthMode(null);
    navigate("home");
    notify("Workspace cleared");
  };
  return (
    <Context.Provider
      value={{
        state: displayState,
        setState,
        saveProfile,
        localAppearance,
        updateLocalAppearance,
        user: displayUser,
        view,
        entityId,
        navigate,
        leaveWorkspace,
        flushWorkspace,
        redeemAccessKey,
        selectedTaskId,
        openTask,
        closeTask,
        createTask,
        updateTask,
        toggleTaskWatch,
        canEditTask: mayEditTask,
        can,
        notify,
        requestNewTask,
        showProfile: (id) => navigate("profile", id),
        authMode,
        setAuthMode,
        localAccounts,
        loginEmail,
        rememberAccount,
        removeAccount,
        switchAccount,
        signOut,
        resetWorkspace,
      }}
    >
      {ready ? (
        children
      ) : (
        <div
          className="app-loading"
          role="status"
          aria-label="Loading workspace"
        >
          <div className="skeleton loading-sidebar" />
          <main>
            <div className="skeleton loading-title" />
            <div className="loading-columns">
              {[0, 1, 2, 3].map((i) => (
                <div className="skeleton" key={i} />
              ))}
            </div>
          </main>
        </div>
      )}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            {t.tone === "success" ? (
              <Check size={17} />
            ) : t.tone === "error" ? (
              <CircleAlert size={17} />
            ) : (
              <Info size={17} />
            )}
            <span>{t.message}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() =>
                setToasts((prev) => prev.filter((item) => item.id !== t.id))
              }
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </Context.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("Workspace provider missing");
  return value;
}
