"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Copy,
  Github,
  KeyRound,
  LockKeyhole,
  MessageSquare,
  Monitor,
  Palette,
  Plus,
  Search,
  Settings2,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  InlineError,
  Menu,
  MenuItem,
  Modal,
  PageHeading,
  Select,
  Tabs,
  Toggle,
} from "@/components/ui";
import { useWorkspace } from "@/lib/store";
import { ProfileBanner } from "@/components/profile-banner";
import {
  bannerColors,
  defaultAppearance,
  readAvatarImage,
  readBannerImage,
  themes,
  validColor,
} from "@/lib/appearance";
import { workspaceApi } from "@/lib/api/workspace";
import { TrashPage } from "@/features/product-pages";
import { WebsiteContentAdmin } from "@/features/website-admin";
import {
  permissions,
  type Permission,
  type Presence,
  type Role,
  type User,
  type AccessKey,
} from "@/lib/types";
import "./management.css";

const settingSections = [
  "Profile",
  "Account",
  "Appearance",
  "Notifications",
  "Security",
  "Integrations",
] as const;
type SettingSection = (typeof settingSections)[number];
const settingIcons = {
  Profile: CircleUserRound,
  Account: Users,
  Appearance: Palette,
  Notifications: Bell,
  Security: Shield,
  Integrations: Github,
};
const roleColors = [
  "#a78bfa",
  "#60a5fa",
  "#2dd4bf",
  "#fbbf24",
  "#fb7185",
  "#f472b6",
];
const dateLabel = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

function SettingPanel({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="management-panel">
      <div className="management-panel-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="management-setting-row">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const { user, entityId } = useWorkspace();
  const initialSection = settingSections.find(
    (item) => item.toLowerCase() === entityId.toLowerCase(),
  );
  const [section, setSection] = useState<SettingSection>(
    initialSection || "Profile",
  );
  return (
    <div className="management-page">
      <PageHeading
        eyebrow="MAKE IT YOURS"
        title="Settings"
        description="A workspace that feels a little more like you."
      />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {settingSections.map((item) => {
            const Icon = settingIcons[item];
            return (
              <button
                key={item}
                className={section === item ? "active" : ""}
                onClick={() => setSection(item)}
                aria-current={section === item ? "page" : undefined}
              >
                <Icon size={17} />
                {item}
                <ChevronRight size={14} />
              </button>
            );
          })}
          <div className="settings-nav-note">
            <ShieldCheck size={20} />
            <strong>Your space, your preferences</strong>
            <p>Your settings are personal. Themes stay on this browser.</p>
          </div>
        </nav>
        <div className="settings-content" key={user.id}>
          {section === "Profile" && <ProfileSettings />}
          {section === "Account" && (
            <AccountSettings onSecurity={() => setSection("Security")} />
          )}
          {section === "Appearance" && <AppearanceSettings />}
          {section === "Notifications" && <NotificationSettings />}
          {section === "Security" && <SecuritySettings />}
          {section === "Integrations" && <IntegrationSettings />}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  const { user, state, saveProfile, notify } = useWorkspace();
  const [draft, setDraft] = useState(user);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [processingAvatar, setProcessingAvatar] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const avatarUpload = useRef(0);
  useEffect(() => () => {
    avatarUpload.current += 1;
  }, []);
  const role = state.roles.find((item) => item.name === user.role);
  const assigned = state.tasks.filter(
    (task) => !task.deleted && task.assignees.includes(user.id),
  );
  const completed = assigned.filter((task) => task.completedAt);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (processingAvatar) return;
    setError("");
    const username = draft.username.trim();
    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username))
      return setError(
        "Your username must contain 3–30 letters, numbers, periods, hyphens, or underscores.",
      );
    if (
      state.users.some(
        (person) =>
          person.id !== user.id &&
          person.username.toLowerCase() === username.toLowerCase(),
      )
    )
      return setError("This username is already taken.");
    setSaving(true);
    try {
      await saveProfile({
        username,
        name: draft.name.trim() || username,
        bio: draft.bio.trim(),
        status: draft.status.trim(),
        presence: draft.presence === "Away" || draft.presence === "Do Not Disturb" ? draft.presence : "Online",
        color: draft.color,
        avatar: draft.avatar,
        bannerColor: user.bannerColor,
        bannerImage: user.bannerImage,
      });
      notify("Profile updated");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Profile could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={save} className="management-form">
      <SettingPanel
        title="Your profile"
        description="This is how you appear across Enigma."
      >
        <div className="profile-avatar-editor">
          <Avatar user={draft} size={80} showStatus />
          <div>
            <div className="management-inline">
              <Button
                type="button"
                disabled={saving}
                onClick={() => uploadRef.current?.click()}
              >
                <Upload size={14} />
                Change avatar
              </Button>
              {draft.avatar && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => {
                    avatarUpload.current += 1;
                    setProcessingAvatar(false);
                    setDraft((previous) => ({ ...previous, avatar: undefined }));
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
            <p>
              {processingAvatar
                ? "Preparing your avatar…"
                : "Choose an image, or keep your initials. Animated images can be up to 512 KiB."}
            </p>
            <input
              className="sr-only"
              ref={uploadRef}
              aria-label="Upload profile avatar"
              type="file"
              accept="image/*"
              disabled={saving}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                const upload = ++avatarUpload.current;
                setProcessingAvatar(true);
                setError("");
                try {
                  const avatar = await readAvatarImage(file);
                  if (upload !== avatarUpload.current) return;
                  setDraft((previous) => ({ ...previous, avatar }));
                } catch (failure) {
                  if (upload !== avatarUpload.current) return;
                  setError(
                    failure instanceof Error
                      ? failure.message
                      : "Your image could not be loaded. Please try again.",
                  );
                } finally {
                  if (upload === avatarUpload.current) setProcessingAvatar(false);
                }
              }}
            />
          </div>
        </div>
        <div className="management-form-grid">
          <Field label="Display name">
            <input
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              placeholder="How should we call you?"
              maxLength={60}
            />
          </Field>
          <Field
            label="Username"
            hint="Your unique name for @mentions. Sign-in uses your email."
          >
            <div className="management-input-prefix">
              <span>@</span>
              <input
                value={draft.username}
                onChange={(event) =>
                  setDraft({ ...draft, username: event.target.value })
                }
                required
                minLength={3}
                maxLength={30}
              />
            </div>
          </Field>
        </div>
        <Field label="Bio" hint={`${draft.bio.length}/240 characters · Line breaks appear on your profile`}>
          <textarea
            value={draft.bio}
            onChange={(event) =>
              setDraft({ ...draft, bio: event.target.value })
            }
            placeholder="A little about you and what you're working on…"
            rows={3}
            maxLength={240}
          />
        </Field>
        <div className="management-form-grid">
          <Field label="Availability" hint="Online and offline update automatically.">
            <Select
              value={draft.presence === "Away" || draft.presence === "Do Not Disturb" ? draft.presence : "Online"}
              onChange={(event) =>
                setDraft({ ...draft, presence: event.target.value as Presence })
              }
            >
              {(
                ["Online", "Away", "Do Not Disturb"] as Presence[]
              ).map((presence) => (
                <option key={presence} value={presence}>
                  {presence === "Online" ? "Automatic" : presence}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Custom status">
            <input
              value={draft.status}
              onChange={(event) =>
                setDraft({ ...draft, status: event.target.value })
              }
              placeholder="Working on the next release"
              maxLength={80}
            />
          </Field>
        </div>
        <div className="management-color-field">
          <span>Avatar color</span>
          <div className="management-swatches">
            {roleColors.map((color) => (
              <button
                type="button"
                key={color}
                style={{ background: color }}
                aria-label={`Use avatar color ${color}`}
                aria-pressed={draft.color === color}
                onClick={() => setDraft({ ...draft, color })}
              >
                {draft.color === color && <Check size={15} />}
              </button>
            ))}
          </div>
        </div>
        {error && <InlineError>{error}</InlineError>}
        <div className="management-form-footer">
          <span>
            <ShieldCheck size={14} />
            Your profile is visible to workspace members.
          </span>
          <Button variant="primary" type="submit" disabled={saving || processingAvatar}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </SettingPanel>
      <div className="management-profile-summary">
        <div>
          <Badge color={role?.color}>{user.role}</Badge>
          <span>Member since {dateLabel(user.joined)}</span>
        </div>
        <div>
          <strong>
            {assigned.length}
            <small>Assigned tasks</small>
          </strong>
          <strong>
            {completed.length}
            <small>Completed</small>
          </strong>
        </div>
      </div>
    </form>
  );
}

function AccountSettings({ onSecurity }: { onSecurity: () => void }) {
  const { user, signOut, resetWorkspace, redeemAccessKey, notify } = useWorkspace();
  const [reset, setReset] = useState(false);
  const [activationKey, setActivationKey] = useState("");
  const [keyError, setKeyError] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const redeem = async (event: FormEvent) => {
    event.preventDefault();
    if (redeeming) return;
    setKeyError("");
    setRedeeming(true);
    try {
      await redeemAccessKey(activationKey.trim());
      setActivationKey("");
      notify("Activation key redeemed. Your role has been updated.");
    } catch (error) {
      setKeyError(error instanceof Error ? error.message : "Could not redeem this activation key.");
    } finally {
      setRedeeming(false);
    }
  };
  return (
    <>
      <SettingPanel
        title="Account"
        description="Your identity and workspace access."
      >
        <div className="account-identity">
          <Avatar user={user} size={50} />
          <div>
            <strong>{user.name}</strong>
            <span>@{user.username}</span>
          </div>
          <Badge>{user.role}</Badge>
        </div>
        <SettingRow
          title="Password"
          description="Update the password for your demo account."
        >
          <Button onClick={onSecurity}>
            Change password
            <ArrowRight size={14} />
          </Button>
        </SettingRow>
        <SettingRow
          title="Signed in on this browser"
          description={`Last active ${dateLabel(user.lastActive)} · Enigma backend`}
        >
          <Badge color="#6ee7b7">Current session</Badge>
        </SettingRow>
        <SettingRow
          title="Sign out"
          description="Return to the sign-in screen. Your workspace data stays here."
        >
          <Button onClick={() => void signOut()}>Sign out</Button>
        </SettingRow>
      </SettingPanel>
      {!user.bootstrapOwner && (
        <SettingPanel
          title="Redeem an activation key"
          description="Apply the role assigned to a new key. Each key can only be used once, for registration or a role change."
        >
          <form onSubmit={redeem} className="management-form">
            <Field label="Activation key">
              <input
                value={activationKey}
                onChange={(event) => setActivationKey(event.target.value)}
                placeholder="ENIGMA-…"
                required
                autoComplete="off"
                spellCheck={false}
                disabled={redeeming}
              />
            </Field>
            {keyError && <InlineError>{keyError}</InlineError>}
            <div className="modal-actions">
              <Button type="submit" variant="primary" disabled={redeeming || !activationKey.trim()}>
                {redeeming ? "Redeeming…" : "Redeem key"}
              </Button>
            </div>
          </form>
        </SettingPanel>
      )}
      <SettingPanel
        title="Workspace data"
        description="Clear the workspace stored by the Enigma backend."
      >
        <SettingRow
          title="Clear workspace data"
          description="Remove workspace records while keeping your administrator session."
        >
          <Button variant="danger" onClick={() => setReset(true)}>
            Clear workspace
          </Button>
        </SettingRow>
      </SettingPanel>
      <ConfirmDialog
        open={reset}
        onClose={() => setReset(false)}
        title="Clear the workspace?"
        description="This removes all tasks, members, activation keys, and preferences from the backend workspace. Your administrator account remains available. This cannot be undone."
        confirmLabel="Clear workspace"
        onConfirm={resetWorkspace}
      />
    </>
  );
}

function AppearanceSettings() {
  const { state, setState, localAppearance, updateLocalAppearance } = useWorkspace();
  const prefs = state.preferences;
  const update = (patch: Partial<typeof prefs>) => {
    setState((previous) => ({
      ...previous,
      preferences: { ...previous.preferences, ...patch },
    }));
  };
  return (
    <>
      <SettingPanel
        title="Appearance"
        description="Find your focus. Make Enigma feel like home."
      >
        <div className="appearance-preview">
          <div className="appearance-preview-sidebar">
            <i />
            <i />
            <i className="selected" />
            <i />
          </div>
          <div className="appearance-preview-body">
            <span>YOUR WORKSPACE</span>
            <strong>Room for your next idea.</strong>
            <div>
              <i />
              <i />
              <i />
            </div>
          </div>
          <Badge color="#c4b5fd">
            <Check size={12} />
            {themes.find((theme) => theme.id === localAppearance.theme)?.name}
          </Badge>
        </div>
        <fieldset className="appearance-theme-field">
          <legend>Theme</legend>
          <div className="appearance-theme-options">
            {themes.map((theme) => <button key={theme.id} type="button" aria-pressed={localAppearance.theme === theme.id} onClick={() => updateLocalAppearance({ theme: theme.id })}>
              <span style={{ background: theme.color }} />{theme.name}
              {localAppearance.theme === theme.id && <Check size={14} />}
            </button>)}
          </div>
          <p>Saved only in this browser, separately for your account.</p>
        </fieldset>
        <div className="management-setting-row">
          <div>
            <h3>Accent color</h3>
            <p>A small touch of personality across your workspace.</p>
          </div>
          <div className="management-swatches">
            {roleColors.slice(0, 4).map((color) => (
              <button
                key={color}
                aria-label={`Set accent ${color}`}
                aria-pressed={localAppearance.accent === color}
                style={{ background: color }}
                onClick={() => {
                  updateLocalAppearance({ accent: color });
                }}
              >
                {localAppearance.accent === color && <Check size={15} />}
              </button>
            ))}
          </div>
        </div>
        <CustomColor label="Custom accent color" value={localAppearance.accent} onChange={(accent) => updateLocalAppearance({ accent })} />
        <Button type="button" onClick={() => updateLocalAppearance(defaultAppearance)}>Reset theme and accent</Button>
        <SettingRow
          title="Compact task cards"
          description="Keep more tasks in view with a tighter layout."
        >
          <Toggle
            label="Compact task cards"
            checked={prefs.compact}
            onChange={(compact) => update({ compact })}
          />
        </SettingRow>
        <SettingRow
          title="Motion and transitions"
          description="Subtle animation for a smoother workspace. Reduced motion preferences are always respected."
        >
          <Toggle
            label="Motion and transitions"
            checked={prefs.motion}
            onChange={(motion) => update({ motion })}
          />
        </SettingRow>
        <SettingRow
          title="Interface density"
          description="Choose how much breathing room you like."
        >
          <Select
            aria-label="Interface density"
            value={prefs.density}
            onChange={(event) => update({ density: event.target.value })}
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </Select>
        </SettingRow>
      </SettingPanel>
      <ProfileBannerSettings />
      <div className="management-note">
        <Monitor size={17} />
        <span>
          Theme and accent stay on this browser. Your profile banner is shared with members who view your profile.
        </span>
      </div>
    </>
  );
}

function ProfileBannerSettings() {
  const { user, saveProfile, notify } = useWorkspace();
  const [color, setColor] = useState(user.bannerColor);
  const [image, setImage] = useState(user.bannerImage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await saveProfile({ username: user.username, name: user.name, bio: user.bio, status: user.status, presence: user.presence, color: user.color, avatar: user.avatar, bannerColor: color, bannerImage: image });
      notify("Profile banner updated");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The banner could not be saved."); }
    finally { setBusy(false); }
  };
  return <form className="management-form" onSubmit={save}>
    <SettingPanel title="Profile banner" description="Choose the background members see on your profile. The original purple banner is the default.">
      <ProfileBanner color={color} image={image} />
      <fieldset className="profile-banner-controls" disabled={busy}>
        <legend className="sr-only">Banner customization</legend>
        <div className="management-swatches">
          {bannerColors.map((preset) => <button key={preset} type="button" aria-label={`Set banner ${preset}`} aria-pressed={color === preset && !image} style={{ background: preset }} onClick={() => { setColor(preset); setImage(undefined); }}>{color === preset && !image && <Check size={15} />}</button>)}
        </div>
        <CustomColor label="Custom banner color" value={color || "#403052"} onChange={(value) => { setColor(value); setImage(undefined); }} />
        <div className="management-inline">
          <Button type="button" onClick={() => fileRef.current?.click()}><Upload size={14} />Upload banner image</Button>
          <Button type="button" onClick={() => { setColor(undefined); setImage(undefined); }}>Reset banner</Button>
        </div>
        <p>PNG, JPEG, or WebP up to 10 MiB. Images are resized for your banner and centered to fit.</p>
        <input ref={fileRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload profile banner" onChange={async (event) => {
          const file = event.target.files?.[0]; event.target.value = "";
          if (!file) return;
          setBusy(true); setError("");
          try { setImage(await readBannerImage(file)); }
          catch (failure) { setError(failure instanceof Error ? failure.message : "The image could not be read."); }
          finally { setBusy(false); }
        }} />
      </fieldset>
      {error && <InlineError>{error}</InlineError>}
      <Button variant="primary" type="submit" disabled={busy}>{busy ? "Preparing banner…" : "Save profile banner"}</Button>
    </SettingPanel>
  </form>;
}

function CustomColor({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [hex, setHex] = useState(value);
  useEffect(() => setHex(value), [value]);
  return <Field label={label} hint="Choose a color or enter its hex value.">
    <div className="custom-color-control">
      <input type="color" aria-label={`${label} picker`} value={value} onChange={(event) => onChange(event.target.value)} />
      <input aria-label={`${label} hex`} value={hex} placeholder="#a78bfa" maxLength={7} pattern="#[a-fA-F0-9]{6}" onBlur={() => setHex(value)} onChange={(event) => {
        setHex(event.target.value);
        if (validColor(event.target.value)) onChange(event.target.value);
      }} />
    </div>
  </Field>;
}

function NotificationSettings() {
  const { state, setState } = useWorkspace();
  const [types, setTypes] = useState<Record<string, boolean>>({
    Mentions: true,
    Assignments: true,
    "Comments and replies": true,
    "Due dates": true,
    "Task updates": false,
    "GitHub and Forum": true,
  });
  const descriptions: Record<string, string> = {
    Mentions: "When someone @mentions you in a conversation.",
    Assignments: "When a task is assigned to you.",
    "Comments and replies": "Follow the conversations on your tasks.",
    "Due dates": "A heads-up when a deadline is approaching.",
    "Task updates": "Changes to priorities, checklists, and subtasks.",
    "GitHub and Forum": "Pull requests, releases, and linked discussions.",
  };
  return (
    <>
      <SettingPanel
        title="Notifications"
        description="Stay in the loop, on your terms."
      >
        <SettingRow
          title="In-app notifications"
          description="Receive updates in your Enigma notification center."
        >
          <Toggle
            label="In-app notifications"
            checked={state.preferences.notifications}
            onChange={(notifications) =>
              setState((previous) => ({
                ...previous,
                preferences: { ...previous.preferences, notifications },
              }))
            }
          />
        </SettingRow>
        <SettingRow
          title="Notification sounds"
          description="A subtle sound for new activity. Preview preference only."
        >
          <Toggle
            label="Notification sounds"
            checked={state.preferences.sounds}
            onChange={(sounds) =>
              setState((previous) => ({
                ...previous,
                preferences: { ...previous.preferences, sounds },
              }))
            }
          />
        </SettingRow>
      </SettingPanel>
      <SettingPanel
        title="What you'd like to hear about"
        description="Preview notification categories for your account."
      >
        {Object.entries(types).map(([name, value]) => (
          <SettingRow key={name} title={name} description={descriptions[name]}>
            <Toggle
              label={`${name} notifications`}
              checked={value}
              onChange={(checked) => setTypes({ ...types, [name]: checked })}
            />
          </SettingRow>
        ))}
      </SettingPanel>
    </>
  );
}

function PasswordForm({
  resetUser,
  onDone,
}: {
  resetUser?: User;
  onDone?: () => void;
}) {
  const { notify } = useWorkspace();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!resetUser && !current.trim())
      return setError("Enter your current password.");
    if (password.length < 12)
      return setError("Use at least 12 characters for your new password.");
    if (password !== confirmation)
      return setError("Your passwords do not match.");
    try {
      if (resetUser) await workspaceApi.updateAccount(resetUser.id, { password });
      else await workspaceApi.changePassword(current, password);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Password update failed.");
      return;
    }
    setCurrent("");
    setPassword("");
    setConfirmation("");
    notify(resetUser ? `Password reset for ${resetUser.name}` : "Password changed. Sign in again with the new password.");
    if (!resetUser) window.location.assign("/taskboard/login");
    onDone?.();
  };
  return (
    <form className="management-form" onSubmit={submit}>
      <div className="management-note"><LockKeyhole size={16} /><span>Passwords are securely hashed by the Enigma backend.</span></div>
      {!resetUser && (
        <Field label="Current password">
          <input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            required
          />
        </Field>
      )}
      <Field
        label={resetUser ? "Temporary password" : "New password"}
        hint="Use at least 12 characters."
      >
        <input
          type="password"
          autoComplete="new-password"
          minLength={12}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </Field>
      <Field label="Confirm password">
        <input
          type="password"
          autoComplete="new-password"
          minLength={12}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          required
        />
      </Field>
      {error && <InlineError>{error}</InlineError>}
      <div className="management-form-footer">
        <span>
          <Shield size={14} />
          Secure account update
        </span>
        <Button variant="primary" type="submit">
          {resetUser ? "Reset password" : "Update password"}
        </Button>
      </div>
    </form>
  );
}

function SecuritySettings() {
  return (
    <>
      <SettingPanel title="Security" description="Take care of your account.">
        <PasswordForm />
      </SettingPanel>
      <SettingPanel
        title="Account access"
        description="Your workspace is invitation-only."
      >
        <div className="security-access">
          <span>
            <KeyRound size={21} />
          </span>
          <div>
            <h3>One invitation, one account</h3>
            <p>
              Activation keys can only be used once. An administrator chooses the
              role attached to each invitation.
            </p>
          </div>
          <Badge color="#6ee7b7">Single use</Badge>
        </div>
      </SettingPanel>
    </>
  );
}

function IntegrationSettings() {
  const { can, notify } = useWorkspace();
  const [connections, setConnections] = useState({
    GitHub: false,
    "Enigma Forum": false,
  });
  const [configuration, setConfiguration] = useState<
    keyof typeof connections | null
  >(null);
  const [repository, setRepository] = useState("");
  const [forum, setForum] = useState("");
  const allowed = can("Manage Integrations");
  return (
    <>
      <SettingPanel
        title="Integrations"
        description="Connect the dots between your work and your tools."
      >
        <div className="management-note">
          <Sparkles size={16} />
          <span>
            Connections are simulated. No external services are contacted.
          </span>
        </div>
        <div className="integration-grid">
          {(["GitHub", "Enigma Forum"] as const).map((name) => (
            <article className="integration-card" key={name}>
              <div className="integration-top">
                <span
                  className={`integration-icon ${name === "GitHub" ? "" : "purple"}`}
                >
                  {name === "GitHub" ? (
                    <Github size={25} />
                  ) : (
                    <MessageSquare size={25} />
                  )}
                </span>
                <Badge color={connections[name] ? "#6ee7b7" : "#a8a3b2"}>
                  {connections[name] ? "Connected · demo" : "Not connected"}
                </Badge>
              </div>
              <h3>{name}</h3>
              <p>
                {name === "GitHub"
                  ? "Bring issues, pull requests, commits, and releases into the conversation."
                  : "Turn proposals and bug reports into work. Keep your community in the loop."}
              </p>
              <div className="integration-detail">
                {connections[name] ? (
                  <>
                    <CheckCircle2 size={14} />
                    {name === "GitHub" ? repository : forum}
                  </>
                ) : (
                  "Ready when you are"
                )}
              </div>
              <div className="integration-actions">
                <Button
                  disabled={!allowed}
                  onClick={() => {
                    setConnections({
                      ...connections,
                      [name]: !connections[name],
                    });
                    notify(
                      `${name} ${connections[name] ? "disconnected" : "connected"} in demo`,
                    );
                  }}
                >
                  {connections[name] ? "Disconnect" : "Connect"}
                  {!connections[name] && <ArrowRight size={14} />}
                </Button>
                {connections[name] && (
                  <Button
                    variant="ghost"
                    disabled={!allowed}
                    onClick={() => setConfiguration(name)}
                  >
                    <Settings2 size={15} />
                    Configure
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
        {!allowed && (
          <p className="management-permission-note">
            <LockKeyhole size={14} />
            Your role can view integrations. Ask an administrator to manage
            connections.
          </p>
        )}
      </SettingPanel>
      <Modal
        open={configuration !== null}
        onClose={() => setConfiguration(null)}
        title={`Configure ${configuration || "integration"}`}
        description="Preview how this integration will be connected."
      >
        <form
          className="management-form"
          onSubmit={(event) => {
            event.preventDefault();
            notify("Integration settings saved for this preview");
            setConfiguration(null);
          }}
        >
          <Field
            label={configuration === "GitHub" ? "Repository" : "Forum name"}
          >
            <input
              required
              value={configuration === "GitHub" ? repository : forum}
              onChange={(event) =>
                configuration === "GitHub"
                  ? setRepository(event.target.value)
                  : setForum(event.target.value)
              }
            />
          </Field>
          <div className="management-note">
            <Sparkles size={16} />
            This connection is simulated. No API credentials are needed.
          </div>
          <div className="modal-actions">
            <Button type="button" onClick={() => setConfiguration(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save settings
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

type AdminSection =
  | "Users"
  | "Roles & permissions"
  | "Activation keys"
  | "Website content"
  | "System settings"
  | "Trash";
export function AdminPage() {
  const { user, can, navigate, entityId } = useWorkspace();
  useEffect(() => {
    if (entityId === "changelog" || entityId === "releases") navigate("changelog");
  }, [entityId, navigate]);
  const [section, setSection] = useState<AdminSection>(
    ({ users: "Users", roles: "Roles & permissions", keys: "Activation keys", website: "Website content", system: "System settings", trash: "Trash" } as Record<string, AdminSection>)[entityId] || "Users",
  );
  const [websiteContentDirty, setWebsiteContentDirty] = useState(false);
  const admin = user.role === "Admin" || user.role === "Owner";
  if (!admin && !can("Manage Members"))
    return (
      <div className="management-page">
        <EmptyState
          icon={<Shield size={28} />}
          title="This space is for administrators"
          description="Your role does not have access to workspace administration."
          action={
            <Button onClick={() => navigate("home")}>Back to home</Button>
          }
        />
      </div>
    );
  const sections: AdminSection[] = admin
    ? [
        "Users",
        "Roles & permissions",
        "Activation keys",
        "Website content",
        "System settings",
        "Trash",
      ]
    : ["Users"];
  return (
    <div className="management-page admin-page">
      <PageHeading
        eyebrow="WORKSPACE ADMINISTRATION"
        title="A space for everyone."
        description="The people, permissions, and details that keep Enigma running."
      />
      <div className="admin-topline">
        <Tabs
          items={sections}
          value={sections.includes(section) ? section : "Users"}
          onChange={(next) => {
            if (
              websiteContentDirty &&
              section === "Website content" &&
              next !== section &&
              !window.confirm("Discard unpublished website content edits?")
            ) return;
            setSection(next);
            const ids: Record<string, string> = { Users: "users", "Roles & permissions": "roles", "Activation keys": "keys", "Website content": "website", "System settings": "system", Trash: "trash" };
            navigate("admin", ids[next]);
          }}
        />
        <Badge color="#a78bfa">
          <ShieldCheck size={12} />
          {admin ? "Administrator" : "Member management"}
        </Badge>
      </div>
      {section === "Users" || !admin ? (
        <UserManagement />
      ) : section === "Roles & permissions" ? (
        <RoleManagement />
      ) : section === "Activation keys" ? (
        <AccessKeyManagement />
      ) : section === "Website content" ? (
        <WebsiteContentAdmin onDirty={setWebsiteContentDirty} />
      ) : section === "System settings" ? (
        <SystemSettings />
      ) : (
        <TrashPage embedded />
      )}
    </div>
  );
}

function UserManagement() {
  const { user, state, setState, showProfile, notify } = useWorkspace();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [emailUser, setEmailUser] = useState<User | null>(null);
  const [keyUser, setKeyUser] = useState<User | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [action, setAction] = useState<{
    user: User;
    type: "deactivate" | "delete";
  } | null>(null);
  const admin = user.role === "Admin" || user.role === "Owner";
  const users = state.users.filter(
    (person) =>
      `${person.name} ${person.username}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "all" ||
        (filter === "active" ? person.active : !person.active)),
  );
  const activeCount = state.users.filter((person) => person.active).length;
  const protectedUser = (person: User) =>
    person.id === user.id ||
    person.bootstrapOwner ||
    (person.role === "Owner" && user.role !== "Owner");
  const changeRole = async (person: User, role: string) => {
    if (
      !admin ||
      protectedUser(person) ||
      (role === "Owner" && user.role !== "Owner") ||
      !state.roles.some((item) => item.name === role)
    )
      return;
    try {
      await workspaceApi.updateAccount(person.id, { role });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Role change failed.", "error");
      return;
    }
    setState((previous) => ({
      ...previous,
      users: previous.users.map((item) =>
        item.id === person.id ? { ...item, role } : item,
      ),
    }));
    notify(`${person.name}'s role changed to ${role}`);
  };
  const confirmAction = async () => {
    if (!action || !admin || protectedUser(action.user)) return;
    try {
      if (action.type === "delete") await workspaceApi.deleteAccount(action.user.id);
      else await workspaceApi.updateAccount(action.user.id, { active: false });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Account update failed.", "error");
      return;
    }
    if (action.type === "delete")
      setState((previous) => ({
        ...previous,
        users: previous.users.filter((person) => person.id !== action.user.id),
        tasks: previous.tasks.map((task) => ({
          ...task,
          assignees: task.assignees.filter((id) => id !== action.user.id),
        })),
        spaces: previous.spaces.map((space) => ({
          ...space,
          members: space.members.filter((id) => id !== action.user.id),
        })),
      }));
    else
      setState((previous) => ({
        ...previous,
        users: previous.users.map((person) =>
          person.id === action.user.id
            ? { ...person, active: false, presence: "Offline" }
            : person,
        ),
      }));
    notify(
      `${action.user.name} ${action.type === "delete" ? "removed from the workspace" : "deactivated"}`,
    );
  };
  return (
    <>
      <div className="admin-summary-strip">
        <div>
          <span className="admin-summary-icon">
            <Users size={20} />
          </span>
          <strong>
            {state.users.length}
            <small>Total members</small>
          </strong>
        </div>
        <div>
          <span className="admin-summary-icon green">
            <CheckCircle2 size={20} />
          </span>
          <strong>
            {activeCount}
            <small>Active accounts</small>
          </strong>
        </div>
        <div>
          <span className="admin-summary-icon blue">
            <Shield size={20} />
          </span>
          <strong>
            {state.roles.length}
            <small>Workspace roles</small>
          </strong>
        </div>
      </div>
      <section className="management-panel user-management-panel">
        <div className="management-toolbar">
          <div>
            <h2>
              Workspace members <span>{state.users.length}</span>
            </h2>
            <p>Good work starts with the right people.</p>
          </div>
          <div className="management-inline">
            <div className="management-search">
              <Search size={15} />
              <input
                aria-label="Search members"
                placeholder="Search members…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  aria-label="Clear member search"
                  onClick={() => setSearch("")}
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <Select
              aria-label="Filter account status"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">All accounts</option>
              <option value="active">Active</option>
              <option value="inactive">Deactivated</option>
            </Select>
          </div>
        </div>
        <div className="management-table-scroll">
          <table className="management-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((person) => (
                <tr key={person.id}>
                  <td>
                    <div className="management-member">
                      <Avatar
                        user={person}
                        size={36}
                        showStatus
                        onClick={() => showProfile(person.id)}
                      />
                      <button onClick={() => showProfile(person.id)}>
                        <strong>
                          {person.name}{" "}
                          {person.id === user.id && <small>you</small>}
                        </strong>
                        <span>@{person.username}</span>
                        <span>{person.email || "No login email"}</span>
                        {user.role === "Owner" && person.pendingActivationKeyId && <span>Activation key pending next sign-in</span>}
                      </button>
                    </div>
                  </td>
                  <td>
                    {admin && !protectedUser(person) ? (
                      <Select
                        className="role-select"
                        aria-label={`Role for ${person.name}`}
                        value={person.role}
                        onChange={(event) =>
                          changeRole(person, event.target.value)
                        }
                      >
                        {state.roles.filter((role) => role.name !== "Owner" || user.role === "Owner").map((role) => (
                          <option key={role.id}>{role.name}</option>
                        ))}
                      </Select>
                    ) : (
                      <Badge
                        color={
                          state.roles.find((role) => role.name === person.role)
                            ?.color
                        }
                      >
                        {person.role}
                      </Badge>
                    )}
                  </td>
                  <td>
                    <span
                      className={`management-status ${person.active ? person.presence.toLowerCase().replaceAll(" ", "-") : "offline"}`}
                    >
                      <i />
                      {person.active ? person.presence : "Deactivated"}
                    </span>
                  </td>
                  <td className="management-muted">
                    {dateLabel(person.joined)}
                  </td>
                  <td>
                    <Menu label={`Manage ${person.name}`}>
                      <MenuItem onSelect={() => showProfile(person.id)}>
                        View profile
                      </MenuItem>
                      {admin && (
                        <>
                          {user.role === "Owner" && <MenuItem disabled={person.bootstrapOwner || !person.active || !person.email} onSelect={() => setKeyUser(person)}>
                            Change activation key
                          </MenuItem>}
                          <MenuItem disabled={person.bootstrapOwner || (person.role === "Owner" && user.role !== "Owner") || !person.email} onSelect={() => { setEmailUser(person); setEmailDraft(person.email || ""); setEmailError(""); }}>
                            Edit email
                          </MenuItem>
                          <MenuItem disabled={protectedUser(person)} onSelect={() => setResetUser(person)}>
                            Reset password
                          </MenuItem>
                          {!person.active ? (
                            <MenuItem
                              onSelect={async () => {
                                try {
                                  await workspaceApi.updateAccount(person.id, { active: true });
                                } catch (error) {
                                  notify(error instanceof Error ? error.message : "Reactivation failed.", "error");
                                  return;
                                }
                                setState((previous) => ({
                                  ...previous,
                                  users: previous.users.map((item) =>
                                    item.id === person.id
                                      ? {
                                          ...item,
                                          active: true,
                                          presence: "Offline",
                                        }
                                      : item,
                                  ),
                                }));
                                notify(`${person.name}'s account reactivated`);
                              }}
                            >
                              Reactivate account
                            </MenuItem>
                          ) : (
                            <MenuItem
                              disabled={protectedUser(person)}
                              onSelect={() =>
                                setAction({ user: person, type: "deactivate" })
                              }
                            >
                              Deactivate account
                            </MenuItem>
                          )}
                          <MenuItem
                            danger
                            disabled={protectedUser(person)}
                            onSelect={() =>
                              setAction({ user: person, type: "delete" })
                            }
                          >
                            Delete account
                          </MenuItem>
                        </>
                      )}
                    </Menu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <EmptyState
            title="No members found"
            description="Try a different name or account status."
            action={
              <Button
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
              >
                Clear filters
              </Button>
            }
          />
        )}
        <div className="management-table-footer">
          <span>
            {users.length} {users.length === 1 ? "member" : "members"}
          </span>
          <span>
            <ShieldCheck size={13} />
            {admin
              ? "Your own account and the last administrator are protected."
              : "Role changes and account actions require an administrator."}
          </span>
        </div>
      </section>
      <ConfirmDialog
        open={!!action}
        onClose={() => setAction(null)}
        title={`${action?.type === "delete" ? "Delete" : "Deactivate"} ${action?.user.name || "account"}?`}
        description={
          action?.type === "delete"
            ? "This removes the account and its task assignments from the workspace. Existing comments and task history remain. This action cannot be undone."
            : "This user will be unable to sign in. Their tasks and activity will remain. You can reactivate the account at any time."
        }
        confirmLabel={
          action?.type === "delete" ? "Delete account" : "Deactivate account"
        }
        onConfirm={confirmAction}
      />
      <Modal open={!!emailUser} onClose={() => setEmailUser(null)} title={`Edit email for ${emailUser?.name || "member"}`}>
        <form onSubmit={async (event) => {
          event.preventDefault();
          if (!emailUser || emailSaving) return;
          setEmailSaving(true);
          setEmailError("");
          try {
            const saved = await workspaceApi.updateAccount(emailUser.id, { email: emailDraft.trim().toLowerCase() });
            setState((previous) => ({ ...previous, users: previous.users.map((person) => person.id === saved.id ? { ...person, email: saved.email } : person) }));
            setEmailUser(null);
            notify("Email updated. The member can sign in with the new address.");
          } catch (error) { setEmailError(error instanceof Error ? error.message : "Email update failed."); }
          finally { setEmailSaving(false); }
        }}>
          <Field label="Email"><input autoFocus type="email" required value={emailDraft} onChange={(event) => setEmailDraft(event.target.value)} /></Field>
          {emailError && <p className="inline-error" role="alert">{emailError}</p>}
          <div className="modal-actions"><Button type="button" onClick={() => setEmailUser(null)}>Cancel</Button><Button type="submit" variant="primary" disabled={emailSaving}>Save email</Button></div>
        </form>
      </Modal>
      {keyUser && user.role === "Owner" && <AssignActivationKeyDialog person={keyUser} onClose={() => setKeyUser(null)} />}
      <Modal
        open={!!resetUser}
        onClose={() => setResetUser(null)}
        title={`Reset password for ${resetUser?.name || "member"}`}
        description="Set a temporary password for this member. Existing sessions will expire."
      >
        {resetUser && (
          <PasswordForm
            resetUser={resetUser}
            onDone={() => setResetUser(null)}
          />
        )}
      </Modal>
    </>
  );
}

function AssignActivationKeyDialog({ person, onClose }: { person: User; onClose: () => void }) {
  const { user, setState, notify } = useWorkspace();
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [selected, setSelected] = useState(person.pendingActivationKeyId || "");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    workspaceApi.getAccessKeys().then((result) => { if (!cancelled) setKeys(result); })
      .catch((failure) => { if (!cancelled) setError(failure instanceof Error ? failure.message : "Keys could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const available = keys.filter((key) => key.status === "Active" || (key.status === "Reserved" && key.reservedBy === person.id && key.id === person.pendingActivationKeyId));
  const current = keys.find((key) => key.id === person.activationKeyId);
  return <Modal open onClose={() => { if (!busy) onClose(); }} title={`Change activation key for ${person.name}`} description="The key is reserved immediately. Its role applies and the key becomes Used at this user's next successful sign-in.">
    <form className="management-form" onSubmit={async (event) => {
      event.preventDefault();
      if (busy || user.role !== "Owner" || !selected) return;
      setBusy(true); setError("");
      try {
        const updated = await workspaceApi.assignActivationKey(person.id, selected);
        const refreshedKeys = await workspaceApi.getAccessKeys().catch(() => null);
        setState((previous) => ({ ...previous, ...(refreshedKeys ? { accessKeys: refreshedKeys } : {}), users: previous.users.map((member) => member.id === updated.id ? { ...member, activationKeyId: updated.activationKeyId, pendingActivationKeyId: updated.pendingActivationKeyId } : member) }));
        notify("Activation key reserved. It will apply at the next sign-in.");
        onClose();
      } catch (failure) { setError(failure instanceof Error ? failure.message : "The key could not be assigned."); }
      finally { setBusy(false); }
    }}>
      {current && <p>Current activation key: <code>{current.key}</code></p>}
      <Field label="Replacement activation key" hint="Choose an existing active key. Generate one in Activation keys if needed.">
        <Select value={selected} disabled={loading || busy} required onChange={(event) => setSelected(event.target.value)}>
          <option value="">{loading ? "Loading keys…" : "Choose a key"}</option>
          {available.map((key) => <option key={key.id} value={key.id}>{key.key} · {key.role}{key.status === "Reserved" ? " · currently pending" : ""}</option>)}
        </Select>
      </Field>
      {!loading && !available.length && <p>No available keys. Generate a key before assigning it.</p>}
      {error && <InlineError>{error}</InlineError>}
      <div className="modal-actions"><Button type="button" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" disabled={loading || busy || !selected}>{busy ? "Assigning…" : "Assign key for next sign-in"}</Button></div>
    </form>
  </Modal>;
}

const permissionGroups: {
  name: string;
  description: string;
  items: Permission[];
}[] = [
  {
    name: "Spaces & boards",
    description: "Structure the workspace.",
    items: ["Create Spaces", "Create Boards", "Delete Boards"],
  },
  {
    name: "Tasks & content",
    description: "Keep work moving.",
    items: [
      "Create Tasks",
      "Edit Tasks",
      "Edit Any Task",
      "Delete Tasks",
      "Restore Tasks",
      "Permanently Delete Items",
      "Moderate Comments",
    ],
  },
  {
    name: "People & administration",
    description: "Manage access and workspace settings.",
    items: [
      "Manage Members",
      "Manage Roles",
      "Generate Access Keys",
      "Manage Integrations",
      "Manage Settings",
    ],
  },
];
function RoleManagement() {
  const { state, setState, notify, user } = useWorkspace();
  const [selected, setSelected] = useState(state.roles[0]?.id || "");
  const [editor, setEditor] = useState<Role | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);
  const [error, setError] = useState("");
  const role =
    state.roles.find((item) => item.id === selected) || state.roles[0];
  const isDefault = role && ["Owner", "Admin", "Moderator", "User"].includes(role.name);
  const admin = user.role === "Admin" || user.role === "Owner";
  const openEditor = (value?: Role) => {
    setError("");
    setIsNew(!value);
    setEditor(
      value
        ? { ...value, permissions: [...value.permissions] }
        : {
            id: `role-${crypto.randomUUID()}`,
            name: "",
            color: "#a78bfa",
            permissions: [
              "Create Tasks",
              "Edit Tasks",
              "Delete Tasks",
              "Restore Tasks",
            ],
          },
    );
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!editor || !admin || editor.name.trim() === "Owner") return;
    setError("");
    const name = editor.name.trim();
    if (!name) return setError("Give this role a name.");
    if (
      state.roles.some(
        (item) =>
          item.id !== editor.id &&
          item.name.toLowerCase() === name.toLowerCase(),
      )
    )
      return setError("A role with that name already exists.");
    const prior = state.roles.find((item) => item.id === editor.id);
    const updated = {
      ...editor,
      name,
      permissions: name === "Admin" ? [...permissions] : editor.permissions,
    };
    setState((previous) => ({
      ...previous,
      roles: isNew
        ? [...previous.roles, updated]
        : previous.roles.map((item) =>
            item.id === editor.id ? updated : item,
          ),
      users: previous.users.map((person) =>
        person.role === prior?.name ? { ...person, role: name } : person,
      ),
      accessKeys: previous.accessKeys.map((key) =>
        key.role === prior?.name ? { ...key, role: name } : key,
      ),
    }));
    setSelected(editor.id);
    setEditor(null);
    notify(isNew ? "Custom role created" : "Role permissions saved");
  };
  const remove = () => {
    if (!deleteRole || !admin || ["Owner", "Admin"].includes(deleteRole.name)) return;
    if (
      state.users.some((person) => person.role === deleteRole.name) ||
      state.accessKeys.some(
        (key) => key.role === deleteRole.name && (key.status === "Active" || key.status === "Reserved"),
      )
    ) {
      notify(
        "Reassign members and revoke active or reserved keys before deleting this role.",
        "error",
      );
      return;
    }
    setState((previous) => ({
      ...previous,
      roles: previous.roles.filter((item) => item.id !== deleteRole.id),
    }));
    setSelected(
      state.roles.find((item) => item.id !== deleteRole.id)?.id || "",
    );
    notify("Custom role deleted");
  };
  return (
    <>
      <div className="management-section-intro">
        <div>
          <h2>Roles & permissions</h2>
          <p>A clear place for every member of your team.</p>
        </div>
        <Button variant="primary" onClick={() => openEditor()}>
          <Plus size={15} />
          Create role
        </Button>
      </div>
      <div className="roles-layout">
        <aside className="roles-list" aria-label="Workspace roles">
          {state.roles.map((item) => (
            <button
              key={item.id}
              className={role?.id === item.id ? "active" : ""}
              onClick={() => setSelected(item.id)}
            >
              <span className="role-dot" style={{ background: item.color }} />
              <span>
                <strong>{item.name}</strong>
                <small>
                  {
                    state.users.filter((person) => person.role === item.name)
                      .length
                  }{" "}
                  members
                </small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
        </aside>
        {role ? (
          <section className="management-panel role-detail">
            <div className="role-detail-heading">
              <span
                className="role-emblem"
                style={{
                  color: role.color,
                  background: `color-mix(in srgb, ${role.color} 12%, transparent)`,
                }}
              >
                <Shield size={26} />
              </span>
              <div>
                <h2>
                  {role.name}
                  <Badge>{isDefault ? "Default role" : "Custom role"}</Badge>
                </h2>
                <p>
                  {role.permissions.length} permissions ·{" "}
                  {
                    state.users.filter((person) => person.role === role.name)
                      .length
                  }{" "}
                  members
                </p>
              </div>
              <Button
                disabled={role.name === "Admin" || role.name === "Owner"}
                onClick={() => openEditor(role)}
              >
                Edit role
              </Button>
            </div>
            {(role.name === "Admin" || role.name === "Owner") && (
              <div className="management-note">
                <ShieldCheck size={16} />
                <span>
                  {role.name === "Owner" ? "Owners" : "Administrators"} have full workspace access. This role is always
                  protected.
                </span>
              </div>
            )}
            <div className="role-permission-groups">
              {permissionGroups.map((group) => (
                <div key={group.name}>
                  <h3>{group.name}</h3>
                  <p>{group.description}</p>
                  <div className="permission-read-grid">
                    {group.items.map((permission) => (
                      <span
                        key={permission}
                        className={
                          role.permissions.includes(permission)
                            ? "granted"
                            : "denied"
                        }
                      >
                        {role.permissions.includes(permission) ? (
                          <Check size={14} />
                        ) : (
                          <X size={14} />
                        )}
                        <span>{permission}</span>
                        {(
                          [
                            "Manage Roles",
                            "Generate Access Keys",
                            "Permanently Delete Items",
                          ] as Permission[]
                        ).includes(permission) &&
                          role.name !== "Admin" && role.name !== "Owner" && <small>Admin only</small>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {!isDefault && (
              <div className="management-form-footer">
                <span>
                  Reassign members and revoke active keys before deleting.
                </span>
                <Button variant="danger" onClick={() => setDeleteRole(role)}>
                  <Trash2 size={14} />
                  Delete role
                </Button>
              </div>
            )}
          </section>
        ) : (
          <EmptyState
            title="Create your first role"
            description="Give your team the right access."
          />
        )}
      </div>
      <Modal
        open={!!editor}
        onClose={() => setEditor(null)}
        title={
          isNew ? "Create a custom role" : `Edit ${editor?.name || "role"}`
        }
        description="Choose a name and the access this role needs."
        className="role-editor-modal"
      >
        {editor && (
          <form className="management-form" onSubmit={save}>
            <div className="management-form-grid">
              <Field label="Role name">
                <input
                  required
                  value={editor.name}
                  disabled={
                    !isNew &&
                    ["Owner", "Admin", "Moderator", "User"].includes(editor.name)
                  }
                  maxLength={30}
                  placeholder="e.g. Project Manager"
                  onChange={(event) =>
                    setEditor({ ...editor, name: event.target.value })
                  }
                />
              </Field>
              <div className="management-color-field">
                <span>Role color</span>
                <div className="management-swatches">
                  {roleColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Set role color ${color}`}
                      aria-pressed={editor.color === color}
                      style={{ background: color }}
                      onClick={() => setEditor({ ...editor, color })}
                    >
                      {editor.color === color && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {permissionGroups.map((group) => (
              <fieldset className="permission-fieldset" key={group.name}>
                <legend>{group.name}</legend>
                {group.items.map((permission) => {
                  const adminOnly = (
                    [
                      "Manage Roles",
                      "Generate Access Keys",
                      "Permanently Delete Items",
                    ] as Permission[]
                  ).includes(permission);
                  return (
                    <label
                      key={permission}
                      className={`management-checkbox ${adminOnly ? "permission-admin-only" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={editor.permissions.includes(permission)}
                        disabled={adminOnly}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            permissions: event.target.checked
                              ? [...editor.permissions, permission]
                              : editor.permissions.filter(
                                  (item) => item !== permission,
                                ),
                          })
                        }
                      />
                      <span>{permission}</span>
                      {adminOnly && <small>Admin only</small>}
                    </label>
                  );
                })}
              </fieldset>
            ))}
            {error && <InlineError>{error}</InlineError>}
            <div className="modal-actions">
              <Button type="button" onClick={() => setEditor(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                {isNew ? "Create role" : "Save permissions"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
      <ConfirmDialog
        open={!!deleteRole}
        onClose={() => setDeleteRole(null)}
        title={`Delete ${deleteRole?.name || "role"}?`}
        description="This permanently removes this custom role. It must have no assigned members or active or reserved activation keys."
        confirmLabel="Delete role"
        onConfirm={remove}
      />
    </>
  );
}

function AccessKeyManagement() {
  const { state, setState, user, notify } = useWorkspace();
  const [generate, setGenerate] = useState(false);
  const [selectedRole, setSelectedRole] = useState(
    state.roles.find((role) => role.name === "User")?.name ||
      state.roles[0]?.name ||
      "User",
  );
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const [filter, setFilter] = useState("All keys");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const admin = user.role === "Admin" || user.role === "Owner";
  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      notify("Activation key copied");
    } catch {
      notify(
        "Clipboard is unavailable. Select the key text to copy it.",
        "error",
      );
    }
  };
  const createKey = async (event: FormEvent) => {
    event.preventDefault();
    if (!admin || !state.roles.some((role) => role.name === selectedRole))
      return;
    setBusy(true);
    try {
      const key = await workspaceApi.createAccessKey(selectedRole);
      setState((previous) => ({ ...previous, accessKeys: [key, ...previous.accessKeys] }));
      setCreatedKey(key.key);
      notify("Single-use activation key generated");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not generate activation key.", "error");
    } finally {
      setBusy(false);
    }
  };
  const keys = state.accessKeys.filter(
    (key) => filter === "All keys" || key.status === filter,
  );
  return (
    <>
      <div className="management-section-intro">
        <div>
          <h2>Good work starts with an invitation.</h2>
          <p>Generate a single-use key and choose the role it unlocks.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setCreatedKey(null);
            setGenerate(true);
          }}
        >
          <Plus size={15} />
          Generate activation key
        </Button>
      </div>
      <div className="access-key-banner">
        <span>
          <KeyRound size={24} />
        </span>
        <div>
          <h3>One key. One use.</h3>
          <p>
            Keys can register a new account or update an existing account's role.
            Once used, they cannot be used again.
          </p>
        </div>
        <Badge color="#a78bfa">
          {state.accessKeys.filter((key) => key.status === "Active").length}{" "}
          active keys
        </Badge>
      </div>
      <section className="management-panel access-key-panel">
        <div className="access-key-tabs">
          <Tabs
            items={["All keys", "Active", "Reserved", "Used", "Revoked"]}
            value={filter}
            onChange={setFilter}
          />
        </div>
        <div className="management-table-scroll">
          <table className="management-table">
            <thead>
              <tr>
                <th>Activation key</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Assigned / used by</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id}>
                  <td>
                    <div className="access-key-code">
                      <KeyRound size={14} />
                      <code>{key.key}</code>
                      {!key.key.includes("••••") && <Button variant="ghost" onClick={() => copyKey(key.key)}><Copy size={13} />Copy</Button>}
                      {key.key.includes("••••") && <small>Legacy key: generate a replacement to view its full value.</small>}
                    </div>
                  </td>
                  <td>
                    <Badge
                      color={
                        state.roles.find((role) => role.name === key.role)
                          ?.color
                      }
                    >
                      {key.role}
                    </Badge>
                  </td>
                  <td>
                    <Badge
                      color={
                        key.status === "Active"
                          ? "#6ee7b7"
                          : key.status === "Reserved"
                            ? "#e3bb78"
                          : key.status === "Used"
                            ? "#93c5fd"
                            : "#aaa3b6"
                      }
                    >
                      {key.status === "Used" && <CheckCheck size={12} />}{" "}
                      {key.status}
                    </Badge>
                  </td>
                  <td className="management-muted">
                    {dateLabel(key.createdAt)}
                  </td>
                  <td>
                    {key.usedBy || key.reservedBy ? (
                      <span className="management-muted">
                        @
                        {state.users.find((person) => person.id === (key.usedBy || key.reservedBy))
                          ?.username || "deleted-user"}
                      </span>
                    ) : (
                      <span className="management-muted">—</span>
                    )}
                  </td>
                  <td>
                    {(key.status === "Active" || key.status === "Reserved") && (
                      <Button
                        variant="ghost"
                        onClick={() => setRevokeId(key.id)}
                      >
                        Revoke
                      </Button>
                    )}
                    <Button variant="ghost" onClick={() => setDeleteKeyId(key.id)} aria-label={`Delete activation key ${key.key}`}>
                      <Trash2 size={14} />Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!keys.length && (
          <EmptyState
            icon={<KeyRound size={28} />}
            title={`No ${filter === "All keys" ? "access" : filter.toLowerCase()} keys`}
            description="When you're ready to grow the team, generate an invitation."
            action={
              <Button
                onClick={() => {
                  setCreatedKey(null);
                  setGenerate(true);
                }}
              >
                Generate activation key
              </Button>
            }
          />
        )}
        <div className="management-table-footer">
          <span>
            {keys.length} {keys.length === 1 ? "key" : "keys"}
          </span>
          <span>
            <LockKeyhole size={13} />
            Single-use activation keys · available to administrators
          </span>
        </div>
      </section>
      <Modal
        open={generate}
        onClose={() => setGenerate(false)}
        title={
          createdKey ? "Your invitation is ready" : "Generate an activation key"
        }
        description={
          createdKey
            ? "Share this key with one person for registration or a role change."
            : "Choose which role the recipient will receive."
        }
      >
        {createdKey ? (
          <div className="management-form">
            <div className="generated-key-success">
              <CheckCircle2 size={34} />
              <Badge>{selectedRole}</Badge>
            </div>
            <div className="generated-key">
              <code>{createdKey}</code>
              <Button onClick={() => copyKey(createdKey)}>
                <Copy size={15} />
                Copy key
              </Button>
            </div>
            <div className="management-note">
              <KeyRound size={16} />
              This key can only be used once. It stays active until used or
              revoked.
            </div>
            <div className="modal-actions">
              <Button onClick={() => setCreatedKey(null)}>
                Generate another
              </Button>
              <Button variant="primary" onClick={() => setGenerate(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form className="management-form" onSubmit={createKey}>
            <Field
              label="Assign a role"
              hint="The role is applied automatically when this key is used."
            >
              <Select
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value)}
              >
                {state.roles.filter((role) => role.name !== "Owner" || user.role === "Owner").map((role) => (
                  <option key={role.id}>{role.name}</option>
                ))}
              </Select>
            </Field>
            <div className="management-note">
              <Shield size={16} />
              <span>
                {selectedRole === "Owner"
                  ? "An Owner key grants complete control and can promote other accounts to Owner. Only Owners can generate it."
                  : selectedRole === "Admin"
                  ? "An Admin key grants complete control of the workspace, including users and roles."
                  : `${selectedRole} members receive the permissions configured for this role.`}
              </span>
            </div>
            <div className="modal-actions">
              <Button type="button" onClick={() => setGenerate(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={busy}>
                <KeyRound size={15} />
                Generate key
              </Button>
            </div>
          </form>
        )}
      </Modal>
      <ConfirmDialog
        open={!!revokeId}
        onClose={() => setRevokeId(null)}
        title="Revoke this activation key?"
        description="This key will no longer work for registration or role changes."
        confirmLabel="Revoke key"
        onConfirm={async () => {
          if (!admin) return;
          try {
            await workspaceApi.revokeAccessKey(revokeId!);
            setState((previous) => ({
              ...previous,
              accessKeys: previous.accessKeys.map((key) =>
                key.id === revokeId ? { ...key, status: "Revoked" } : key,
              ),
            }));
            notify("Activation key revoked");
          } catch (error) {
            notify(error instanceof Error ? error.message : "Could not revoke activation key.", "error");
          }
        }}
      />
      <ConfirmDialog
        open={!!deleteKeyId}
        onClose={() => setDeleteKeyId(null)}
        title="Delete this activation key?"
        description="The key will be permanently removed. Accounts and roles already granted with it remain unchanged."
        confirmLabel="Delete key"
        onConfirm={async () => {
          if (!admin || !deleteKeyId) return;
          try {
            await workspaceApi.deleteAccessKey(deleteKeyId);
            setState((previous) => ({ ...previous, accessKeys: previous.accessKeys.filter((key) => key.id !== deleteKeyId) }));
            notify("Activation key deleted");
          } catch (error) {
            notify(error instanceof Error ? error.message : "Could not delete activation key.", "error");
          }
        }}
      />
    </>
  );
}

function SystemSettings() {
  const { state, notify, resetWorkspace, navigate } = useWorkspace();
  const [name, setName] = useState("Enigma");
  const [description, setDescription] = useState("");
  const [reset, setReset] = useState(false);
  return (
    <div className="system-settings">
      <SettingPanel
        title="Workspace details"
        description="Preview your workspace identity."
      >
        <form
          className="management-form"
          onSubmit={(event) => {
            event.preventDefault();
            notify("Workspace details saved for this preview");
          }}
        >
          <Field label="Workspace name">
            <input
              required
              value={name}
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Description">
            <textarea
              rows={3}
              value={description}
              maxLength={240}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <div className="management-form-footer">
            <span>Preview only</span>
            <Button variant="primary" type="submit">
              Save changes
            </Button>
          </div>
        </form>
      </SettingPanel>
      <SettingPanel
        title="Workspace policies"
        description="Thoughtful defaults for a collaborative space."
      >
        <SettingRow
          title="Registration"
          description="New accounts need an active, single-use activation key."
        >
          <Badge color="#a78bfa">Invitation only</Badge>
        </SettingRow>
        <SettingRow
          title="Trash retention"
          description="Deleted items remain in Trash until an administrator permanently removes them."
        >
          <Badge>Indefinite</Badge>
        </SettingRow>
        <SettingRow
          title="Task editing"
          description="Members can edit tasks. Restricted tasks are limited to their creator, Moderators, and Admins."
        >
          <Badge>Collaborative</Badge>
        </SettingRow>
        <SettingRow
          title="Trash"
          description="Review deleted tasks, lists, boards, and spaces."
        >
          <Button onClick={() => navigate("admin", "trash")}>
            Open trash
            <ArrowRight size={14} />
          </Button>
        </SettingRow>
      </SettingPanel>
      <SettingPanel
        title="Backend data"
        description={`${state.users.length} members · ${state.boards.filter((board) => !board.deleted).length} boards · ${state.tasks.filter((task) => !task.deleted).length} tasks`}
      >
        <SettingRow
          title="Clear the workspace"
          description="Remove workspace records while keeping the administrator account."
        >
          <Button variant="danger" onClick={() => setReset(true)}>
            Clear workspace
          </Button>
        </SettingRow>
      </SettingPanel>
      <ConfirmDialog
        open={reset}
        onClose={() => setReset(false)}
        title="Clear the workspace?"
        description="All workspace members, keys, tasks, and preferences will be removed from the backend. The administrator account remains available. This cannot be undone."
        confirmLabel="Clear workspace"
        onConfirm={resetWorkspace}
      />
    </div>
  );
}
