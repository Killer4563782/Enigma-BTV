"use client";
import { lazy, Suspense, useEffect, useState } from "react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { MotionConfig } from "motion/react";
import {
  Bell,
  Blocks,
  Bug,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Compass,
  FlaskConical,
  Globe2,
  Home,
  LogOut,
  Menu as MenuIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  X,
  Zap,
  CheckCheck,
  ArrowUpRight,
  Star,
  CalendarDays,
  Code2,
  ScrollText,
} from "lucide-react";
import { WorkspaceProvider, useWorkspace } from "@/lib/store";
import { Avatar, Badge, Button, Field, IconButton, Modal, TooltipLayer } from "./ui";
import { NewTaskDialog, CommandPalette } from "@/features/quick-actions";
import {
  HomePage,
  MyTasksPage,
  SpacePage,
  NotificationsPage,
  TrashPage,
  ProfilePage,
  ReleasesPage,
} from "@/features/product-pages";
import { AuthScreen } from "@/features/auth";
import type { View } from "@/lib/types";
import { uid } from "@/lib/operations";

const BoardPage = lazy(() => import('@/features/board').then(module => ({ default: module.BoardPage })));
const SettingsPage = lazy(() => import('@/features/management').then(module => ({ default: module.SettingsPage })));
const AdminPage = lazy(() => import('@/features/management').then(module => ({ default: module.AdminPage })));
const ChangelogPage = lazy(() => import('@/features/changelog').then(module => ({ default: module.ChangelogPage })));
const TaskDetail = lazy(() => import('@/features/task-detail').then(module => ({ default: module.TaskDetail })));

export function EnigmaLogo() {
  return (
    <span className="enigma-logo">
      <svg
        width="29"
        height="33"
        viewBox="0 0 32 36"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 2h18L20 12H10l-8 8h20L12 30h18l-5 5H1l10-10H1L12 14H2z"
          fill="currentColor"
        />
      </svg>
      <span>
        ENIGMA<small>TASKBOARD</small>
      </span>
    </span>
  );
}
export function Workspace() {
  return (
    <WorkspaceProvider>
      <MotionConfig reducedMotion="user">
        <WorkspaceContent />
      </MotionConfig>
    </WorkspaceProvider>
  );
}
function WorkspaceContent() {
  const {
    state,
    setState,
    user,
    view,
    entityId,
    navigate,
    leaveWorkspace,
    can,
    notify,
    authMode,
    signOut,
    switchAccount,
    removeAccount,
    localAccounts,
    requestNewTask,
    openTask,
    showProfile,
    selectedTaskId,
  } = useWorkspace();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [spaceOpen, setSpaceOpen] = useState(false);
  const [spaceName, setSpaceName] = useState("");
  const [spaceDescription, setSpaceDescription] = useState("");
  const [closedSpaces, setClosedSpaces] = useState<string[]>([]);
  const unread = state.notifications.filter(
    (n) => n.userId === user.id && !n.read,
  );
  const board = state.boards.find((b) => b.id === entityId);
  const space = state.spaces.find(
    (s) => s.id === (view === "space" ? entityId : board?.spaceId),
  );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input,textarea,select,[contenteditable="true"]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
        return;
      }
      if (document.querySelector('[role="dialog"]') || authMode) return;
      if (e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (
        e.key.toLowerCase() === "n" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        requestNewTask();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestNewTask, authMode]);
  useEffect(() => {
    setMobileOpen(false);
  }, [view, entityId]);
  const nav = (next: View, id?: string) => {
    navigate(next, id);
    setMobileOpen(false);
  };
  if (authMode || !user.id) return <AuthScreen />;
  return (
    <div
      className={`workspace ${collapsed && !mobileOpen ? "sidebar-collapsed" : ""}`}
    >
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <TooltipLayer />
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-brand">
          <button onClick={() => nav("home")} aria-label="Enigma home">
            <EnigmaLogo />
          </button>
          <IconButton
            className="collapse-toggle"
            label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </IconButton>
          <IconButton
            className="mobile-nav-close"
            label="Close navigation"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </IconButton>
        </div>
        <button className="sidebar-search" onClick={() => setSearchOpen(true)}>
          <Search size={15} />
          <span>Search anything</span>
          <kbd>Ctrl K</kbd>
        </button>
        <nav className="sidebar-nav">
          {(
            [
              { id: "home", label: "Home", icon: Home },
              { id: "my-tasks", label: "My Tasks", icon: Check },
              { id: "notifications", label: "Inbox", icon: Bell },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              aria-current={view === item.id ? "page" : undefined}
              data-tooltip={item.label}
              data-tooltip-placement="right"
              className={`nav-item ${view === item.id ? "active" : ""}`}
              onClick={() => nav(item.id)}
            >
              <item.icon size={17} />
              <span>{item.label}</span>
              {item.id === "notifications" && unread.length > 0 && (
                <b className="nav-count">{unread.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-spaces">
          <div className="nav-section-title">
            <span>WORKSPACE</span>
            {can("Create Spaces") && (
              <IconButton
                label="Create space"
                onClick={() => {
                  setSpaceName("");
                  setSpaceDescription("");
                  setSpaceOpen(true);
                }}
              >
                <Plus size={14} />
              </IconButton>
            )}
          </div>
          {state.spaces
            .filter((s) => !s.deleted)
            .map((s) => (
              <div className="sidebar-space" key={s.id}>
                <div className="space-nav-row">
                  <button
                    aria-expanded={!closedSpaces.includes(s.id)}
                    className="space-chevron"
                    aria-label={`${closedSpaces.includes(s.id) ? "Expand" : "Collapse"} ${s.name}`}
                    onClick={() =>
                      setClosedSpaces((prev) =>
                        prev.includes(s.id)
                          ? prev.filter((id) => id !== s.id)
                          : [...prev, s.id],
                      )
                    }
                  >
                    <ChevronDown
                      size={12}
                      style={{
                        transform: closedSpaces.includes(s.id)
                          ? "rotate(-90deg)"
                          : undefined,
                      }}
                    />
                  </button>
                  <button
                    aria-current={
                      view === "space" && entityId === s.id ? "page" : undefined
                    }
                    className={
                      view === "space" && entityId === s.id
                        ? "space-active"
                        : ""
                    }
                    onClick={() => nav("space", s.id)}
                  >
                    <span
                      className="space-color"
                      style={{ background: s.color }}
                    />
                    <span>{s.name}</span>
                  </button>
                </div>
                {!closedSpaces.includes(s.id) && (
                  <div className="space-board-links">
                    {state.boards
                      .filter((b) => b.spaceId === s.id && !b.deleted)
                      .map((b) => {
                        const Icon =
                          b.icon === "globe"
                            ? Globe2
                            : b.icon === "bug"
                              ? Bug
                              : b.icon === "bulb"
                                ? FlaskConical
                                : b.icon === "star"
                                  ? Star
                                  : b.icon === "calendar"
                                    ? CalendarDays
                                    : b.icon === "check"
                                      ? Check
                                      : b.icon === "code"
                                        ? Code2
                                : Blocks;
                        return (
                          <button
                            key={b.id}
                            aria-current={
                              view === "board" && entityId === b.id
                                ? "page"
                                : undefined
                            }
                            data-tooltip={b.name}
                            data-tooltip-placement="right"
                            className={`nav-item board-nav ${view === "board" && entityId === b.id ? "active" : ""}`}
                            onClick={() => nav("board", b.id)}
                          >
                            {b.icon.startsWith("text:") ? <span className="sidebar-board-custom-icon">{b.icon.slice(5)}</span> : <Icon size={15} />}
                            <span>{b.name}</span>
                            {view === "board" && entityId === b.id && (
                              <span className="active-nav-dot" />
                            )}
                          </button>
                        );
                      })}
                    {can("Create Boards") && (
                      <button
                        className="add-board-nav"
                        onClick={() => nav("space", s.id)}
                      >
                        <Plus size={13} />
                        <span>Add board</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
        <div className="sidebar-bottom">
          <a className="nav-item" href="/" onClick={event => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault(); void leaveWorkspace('/');
          }}><Globe2 size={16} /><span>Enigma website</span></a>
          <button
            className={`nav-item ${view === "settings" ? "active" : ""}`}
            data-tooltip="Settings"
            data-tooltip-placement="right"
            onClick={() => nav("settings")}
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>
          <button
            className={`nav-item ${view === "changelog" ? "active" : ""}`}
            data-tooltip="Changelog"
            data-tooltip-placement="right"
            onClick={() => nav("changelog")}
          >
            <ScrollText size={16} />
            <span>Changelog</span>
          </button>
          {(user.role === "Admin" || user.role === "Owner") && (
            <button
              className={`nav-item ${view === "admin" ? "active" : ""}`}
              data-tooltip="Administration"
              data-tooltip-placement="right"
              onClick={() => nav("admin")}
            >
              <ShieldCheck size={16} />
              <span>Administration</span>
              <span className="admin-marker">ADMIN</span>
            </button>
          )}
          <div className="sidebar-user">
            <Avatar
              user={user}
              size={34}
              showStatus
              onClick={() => nav("settings", "account")}
            />
            <button
              className="current-user-name"
              onClick={() => nav("settings", "account")}
            >
              <strong>{user.name}</strong>
              <small>{user.role} account</small>
            </button>
            <Dropdown.Root>
              <Dropdown.Trigger asChild>
                <button
                  className="icon-button"
                  aria-label="Switch account"
                  data-tooltip="Switch account"
                  data-tooltip-placement="top"
                >
                  <ChevronDown size={14} />
                </button>
              </Dropdown.Trigger>
              <Dropdown.Portal>
                <Dropdown.Content
                  className="dropdown user-dropdown"
                  side="top"
                  align="start"
                  sideOffset={12}
                >
                  <Dropdown.Label className="dropdown-label">
                    ACCOUNTS ON THIS BROWSER
                  </Dropdown.Label>
                  {localAccounts.map((email) => (
                    <Dropdown.Item
                      key={email}
                      className="menu-item"
                      onSelect={() => void switchAccount(email)}
                    >
                      <span>
                        {email}
                        <small>Sign in with password</small>
                      </span>
                    </Dropdown.Item>
                  ))}
                  <Dropdown.Sub>
                    <Dropdown.SubTrigger className="menu-item" disabled={localAccounts.length === 0}>
                      <X size={15} />
                      Remove saved account
                      <ChevronRight size={14} />
                    </Dropdown.SubTrigger>
                    <Dropdown.Portal>
                      <Dropdown.SubContent className="dropdown user-dropdown" sideOffset={6}>
                        <Dropdown.Label className="dropdown-label">REMOVE FROM THIS BROWSER ONLY</Dropdown.Label>
                        {localAccounts.map((email) => (
                          <Dropdown.Item
                            key={email}
                            className="menu-item"
                            aria-label={`Remove ${email} from this browser`}
                            onSelect={() => removeAccount(email)}
                          >
                            <X size={15} />
                            {email}
                          </Dropdown.Item>
                        ))}
                      </Dropdown.SubContent>
                    </Dropdown.Portal>
                  </Dropdown.Sub>
                  <Dropdown.Separator className="menu-separator" />
                  <Dropdown.Item className="menu-item" onSelect={() => void signOut()}>
                    <Plus size={15} />
                    Sign in to another account
                  </Dropdown.Item>
                  <Dropdown.Item
                    className="menu-item"
                    onSelect={() => void signOut()}
                  >
                    <LogOut size={15} />
                    Sign out
                  </Dropdown.Item>
                </Dropdown.Content>
              </Dropdown.Portal>
            </Dropdown.Root>
          </div>
          <div className="demo-indicator">
            <span />
            BACKEND CONNECTED
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumbs">
            <IconButton
              className="mobile-menu"
              label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon size={20} />
            </IconButton>
            <Compass size={15} />
            <button onClick={() => nav("home")}>Workspace</button>
            <ChevronRight size={12} />
            {view === "board" ? (
              <>
                <button onClick={() => nav("space", space?.id)}>
                  {space?.name || "Workspace"}
                </button>
                <ChevronRight size={12} />
                <span>{board?.name || "Board"}</span>
              </>
            ) : (
              <span>
                {
                  (
                    {
                      home: "Overview",
                      "my-tasks": "My Tasks",
                      notifications: "Inbox",
                      space: space?.name,
                      trash: "Trash",
                      settings: "Settings",
                      admin: "Administration",
                      profile: "Profile",
                      releases: "Plugin Releases",
                      changelog: "Changelog",
                    } as Record<string, string | undefined>
                  )[view]
                }
              </span>
            )}
          </div>
          <div className="topbar-actions">
            <span className="live-indicator">Synced workspace</span>
            <span className="toolbar-divider" />
            <IconButton
              label="Search workspace"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={17} />
            </IconButton>
            <Dropdown.Root>
              <Dropdown.Trigger asChild>
                <button
                  className="icon-button notification-button"
                  aria-label={`Notifications, ${unread.length} unread`}
                  data-tooltip="Notifications"
                  data-tooltip-placement="bottom-end"
                >
                  <Bell size={17} />
                  {unread.length > 0 && <span />}
                </button>
              </Dropdown.Trigger>
              <Dropdown.Portal>
                <Dropdown.Content
                  className="dropdown notification-dropdown"
                  align="end"
                  sideOffset={14}
                >
                  <div className="notification-popover-heading">
                    <strong>
                      Your inbox<Badge>{unread.length} new</Badge>
                    </strong>
                    <IconButton
                      label="Mark all notifications read"
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          notifications: prev.notifications.map((n) =>
                            n.userId === user.id ? { ...n, read: true } : n,
                          ),
                        }))
                      }
                    >
                      <CheckCheck size={16} />
                    </IconButton>
                  </div>
                  {state.notifications
                    .filter((n) => n.userId === user.id)
                    .slice(0, 5)
                    .map((n) => (
                      <Dropdown.Item
                        key={n.id}
                        className={`notification-preview ${!n.read ? "unread" : ""}`}
                        onSelect={() => {
                          setState((prev) => ({
                            ...prev,
                            notifications: prev.notifications.map((item) =>
                              item.id === n.id ? { ...item, read: true } : item,
                            ),
                          }));
                          if (n.taskId) openTask(n.taskId);
                          else nav("notifications");
                        }}
                      >
                        <Avatar
                          user={state.users.find((u) => u.id === n.actorId)}
                          size={32}
                        />
                        <span>
                          <strong>{n.title}</strong>
                          <small>{n.body}</small>
                          <span className="notification-task-ref">
                            {n.taskId} · {n.kind}
                          </span>
                        </span>
                        {!n.read && <i />}
                      </Dropdown.Item>
                    ))}
                  {!state.notifications.some((n) => n.userId === user.id) && (
                    <p className="notification-empty">You’re all caught up.</p>
                  )}
                  <Dropdown.Item
                    className="inbox-link"
                    onSelect={() => nav("notifications")}
                  >
                    Open inbox
                    <ArrowUpRight size={14} />
                  </Dropdown.Item>
                </Dropdown.Content>
              </Dropdown.Portal>
            </Dropdown.Root>
            <IconButton
              label="Help and keyboard shortcuts"
              onClick={() => setHelpOpen(true)}
            >
              <CircleHelp size={17} />
            </IconButton>
            <Avatar
              user={user}
              size={29}
              onClick={() => showProfile(user.id)}
            />
          </div>
        </header>
        <main
          id="main-content"
          className={`main-content view-${view}`}
          key={`${view}-${entityId}`}
        >
          <Suspense fallback={<p role="status">Loading workspace view…</p>}>
          {view === "board" ? (
            <BoardPage />
          ) : view === "home" ? (
            <HomePage />
          ) : view === "space" ? (
            <SpacePage />
          ) : view === "my-tasks" ? (
            <MyTasksPage />
          ) : view === "notifications" ? (
            <NotificationsPage />
          ) : view === "trash" ? (
            <TrashPage />
          ) : view === "settings" ? (
            <SettingsPage />
          ) : view === "admin" ? (
            <AdminPage />
          ) : view === "profile" ? (
            <ProfilePage />
          ) : view === "changelog" ? (
            <ChangelogPage />
          ) : (
            <ReleasesPage />
          )}
          </Suspense>
        </main>
      </div>
      <Suspense fallback={<p role="status">Loading task…</p>}>
        {selectedTaskId && <TaskDetail />}
      </Suspense>
      <NewTaskDialog />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="A few small shortcuts"
        description="Spend less time navigating and more time making progress."
      >
        <div className="shortcut-list">
          {[
            ["Search & commands", "Ctrl / ⌘ + K"],
            ["Search workspace", "/"],
            ["Create a task", "N"],
            ["Close a panel", "Esc"],
            ["Pick up a drag handle", "Space"],
            ["Move a picked-up item", "Arrow keys"],
          ].map(([label, key]) => (
            <div key={label}>
              <span>{label}</span>
              <kbd>{key}</kbd>
            </div>
          ))}
        </div>
        <div className="demo-help">
          <Zap size={18} />
          <div>
            <strong>A workspace you can explore freely</strong>
            <p>Changes are saved to the Enigma backend for this workspace.</p>
          </div>
        </div>
      </Modal>
      <Modal
        open={spaceOpen}
        onClose={() => setSpaceOpen(false)}
        title="Create space"
        description="A space brings related boards and people together."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!spaceName.trim() || !can("Create Spaces")) return;
            const id = uid("space");
            setState((prev) => ({
              ...prev,
              spaces: [
                ...prev.spaces,
                {
                  id,
                  name: spaceName.trim(),
                  description: spaceDescription,
                  color: "#a78bfa",
                  icon: "orbit",
                  members: [user.id],
                },
              ],
            }));
            setSpaceOpen(false);
            navigate("space", id);
            notify("Space created");
          }}
        >
          <Field label="Space name">
            <input
              autoFocus
              required
              maxLength={60}
              value={spaceName}
              onChange={(e) => setSpaceName(e.target.value)}
              placeholder="e.g. Community projects"
            />
          </Field>
          <Field label="Description">
            <textarea
              rows={3}
              value={spaceDescription}
              onChange={(e) => setSpaceDescription(e.target.value)}
              placeholder="What brings this space together?"
            />
          </Field>
          <div className="modal-actions">
            <Button type="button" onClick={() => setSpaceOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create space
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
