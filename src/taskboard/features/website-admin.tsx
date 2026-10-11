"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  FilePenLine,
  Link2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { Button, EmptyState, Field, InlineError, Modal, Select } from "@/components/ui";
import { adminRequest, downloadJson } from "@/lib/api/admin";
import { taskboardUrl } from "@/lib/routes.mjs";
import {
  CONTENT_FIELDS,
  COPY_GROUPS,
  copyLabel,
  validateContent,
} from "../../shared/content-schema.js";
import "./website-admin.css";

type ContentItem = Record<string, any> & { id: string };
type WebsiteContent = {
  version: number;
  chapters: ContentItem[];
  team: ContentItem[];
  announcements: ContentItem[];
  qa: ContentItem[];
  copy: Record<string, string>;
};
type ContentSnapshot = { revision: number; content: WebsiteContent };
type ContentSection = "chapters" | "team" | "announcements" | "qa" | "copy";
const contentSections: Record<ContentSection, string> = {
  chapters: "Chapters",
  team: "Team",
  announcements: "Announcements",
  qa: "Q&A",
  copy: "Website text",
};

export function WebsiteContentAdmin({ onDirty }: { onDirty?: (dirty: boolean) => void }) {
  const [snapshot, setSnapshot] = useState<ContentSnapshot | null>(null);
  const [form, setForm] = useState<WebsiteContent | null>(null);
  const [section, setSection] = useState<ContentSection>("chapters");
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const dirty = Boolean(
    snapshot && form && JSON.stringify(snapshot.content) !== JSON.stringify(form),
  );

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await adminRequest<ContentSnapshot>("/content");
      setSnapshot(result);
      setForm(result.content);
      setMessage("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Content could not be loaded.");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => void load(), []);
  useEffect(() => {
    onDirty?.(dirty);
    return () => onDirty?.(false);
  }, [dirty, onDirty]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const publish = async (event: FormEvent) => {
    event.preventDefault();
    if (!form || !snapshot) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const content = validateContent(form) as WebsiteContent;
      const result = await adminRequest<ContentSnapshot>("/content", {
        method: "PUT",
        body: { revision: snapshot.revision, content },
      });
      setSnapshot(result);
      setForm(result.content);
      setMessage("Published to the Enigma website.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Publishing failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!form || !snapshot)
    return (
      <section className="management-panel website-loading">
        <h2>Website content</h2>
        {error ? (
          <><InlineError>{error}</InlineError><Button onClick={() => void load()}>Retry</Button></>
        ) : <p>Loading shared website content…</p>}
      </section>
    );

  const entries = section === "copy" ? [] : form[section];
  const selected = entries.find((item) => item.id === selectedId) || entries[0];
  const filtered = entries.filter((item) =>
    `${item.name || ""} ${item.title || ""} ${item.question || ""} ${item.role || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const update = (id: string, key: string, value: unknown) => {
    if (section === "copy") return;
    setForm((current) => current && ({
      ...current,
      [section]: current[section].map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    }));
  };
  const add = () => {
    if (section === "chapters" || section === "copy") return;
    const id = `${section}-${crypto.randomUUID()}`;
    const item = section === "team"
      ? { id, name: "New contributor", role: "Contributor", description: "", avatar: "", socials: {}, isCore: false, representation: "star", planetColor: "#c2abeb", disciplines: [] }
      : section === "qa"
        ? { id, question: "New question", answer: "", category: "General", published: false }
        : { id, title: "New announcement", epicTag: "Void Transmission", date: new Date().toISOString().slice(0, 10), content: "", published: false };
    setForm({ ...form, [section]: [...form[section], item] });
    setSelectedId(id);
    setQuery("");
  };
  const remove = (item: ContentItem) => {
    if (section === "chapters" || section === "copy") return;
    if (!window.confirm(`Remove ${item.name || item.title || item.question}? The removal takes effect when you publish.`)) return;
    setForm({ ...form, [section]: form[section].filter((entry) => entry.id !== item.id) });
    setSelectedId("");
  };
  const move = (item: ContentItem, direction: number) => {
    if (section === "chapters" || section === "copy") return;
    const next = [...form[section]];
    const index = next.findIndex((entry) => entry.id === item.id);
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setForm({ ...form, [section]: next });
  };
  const legacyDraft =
    section === "chapters" && selected
      ? readLegacyAdminData().chapterDrafts[selected.id]
      : undefined;

  return (
    <form className="website-content-admin" onSubmit={publish}>
      <section className="management-panel website-content-intro">
        <div>
          <span className="management-eyebrow">SHARED WEBSITE · REVISION {snapshot.revision}</span>
          <h2>Edit the world of Enigma</h2>
          <p>Update chapter cards and pages, team credits, announcements, Q&A, and shared website copy. All sections publish atomically.</p>
        </div>
        <div className="website-content-actions">
          <Button variant="primary" type="submit" disabled={!dirty || busy}><Check size={14} />{busy ? "Publishing…" : "Publish changes"}</Button>
          <Button type="button" disabled={!dirty || busy} onClick={() => {
            if (window.confirm("Discard all unpublished website edits?")) {
              setForm(snapshot.content); setError(""); setMessage("Changes discarded.");
            }
          }}>Discard</Button>
          <Button type="button" onClick={() => downloadJson("enigma-website-content.json", { revision: snapshot.revision, content: form })}><Download size={14} />Export</Button>
          <Button type="button" disabled={busy} onClick={() => {
            if (!dirty || window.confirm("Reload shared content and discard unpublished edits?")) void load();
          }}><RefreshCw size={14} />Reload</Button>
          <span className={dirty ? "is-dirty" : ""}>{dirty ? "Unpublished changes" : "Up to date"}</span>
        </div>
        {error && <InlineError>{error}</InlineError>}
        {message && <p className="website-success" role="status">{message}</p>}
      </section>

      <fieldset disabled={busy} className="website-content-fieldset">
        <nav className="website-content-tabs" aria-label="Website content sections">
          {Object.entries(contentSections).map(([key, label]) => (
            <button type="button" key={key} aria-pressed={section === key} onClick={() => {
              setSection(key as ContentSection); setSelectedId(""); setQuery("");
            }}>{label}{key !== "copy" && <span>{form[key as Exclude<ContentSection, "copy">].length}</span>}</button>
          ))}
        </nav>
        {section === "copy" ? (
          <div className="website-copy-grid">
            {Object.entries(COPY_GROUPS as Record<string, string[]>).map(([group, keys]) => (
              <section className="management-panel website-copy-panel" key={group}>
                <h2>{group}</h2>
                {keys.map((key) => <Field key={key} label={copyLabel(key)}>
                  <textarea rows={key.endsWith("Description") ? 3 : 2} maxLength={10_000} value={form.copy[key]} onChange={(event) => setForm({ ...form, copy: { ...form.copy, [key]: event.target.value } })} />
                </Field>)}
              </section>
            ))}
          </div>
        ) : (
          <div className="website-content-columns">
            <aside className="management-panel website-catalogue">
              <div className="website-section-heading"><h2>{contentSections[section]}</h2>{section !== "chapters" && <Button type="button" onClick={add}><Plus size={14} />Add</Button>}</div>
              <label className="website-search"><Search size={14} /><input aria-label={`Search ${contentSections[section]}`} placeholder="Search…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
              <div className="website-item-list">{filtered.map((item) => <button type="button" key={item.id} aria-pressed={selected?.id === item.id} onClick={() => setSelectedId(item.id)}><strong>{item.name || item.title || item.question}</strong><small>{section === "team" ? `${item.role} · ${item.representation}` : `${item.subtitle || item.category || item.date} · ${item.published ? "Visible" : "Hidden"}`}</small></button>)}</div>
              {!filtered.length && <p>No matching entries.</p>}
            </aside>
            {selected ? (
              <section className="management-panel website-editor" key={selected.id}>
                <div className="website-section-heading">
                  <div><span className="management-eyebrow">{selected.subtitle || contentSections[section]}</span><h2>{selected.name || selected.title || selected.question}</h2></div>
                  {section !== "chapters" && <div className="website-row-actions"><Button type="button" aria-label="Move up" disabled={entries.indexOf(selected) === 0} onClick={() => move(selected, -1)}><ArrowUp size={14} /></Button><Button type="button" aria-label="Move down" disabled={entries.indexOf(selected) === entries.length - 1} onClick={() => move(selected, 1)}><ArrowDown size={14} /></Button><Button type="button" onClick={() => remove(selected)}><Trash2 size={14} />Remove</Button></div>}
                </div>
                {section === "chapters" && selected.id === "chapter-6" && <div className="management-note">Grand Final: keep “Visible on the public website” off until the reveal.</div>}
                {legacyDraft && <div className="management-note website-legacy-note"><span>A browser draft from the retired Website Admin is available for this chapter.</span><Button type="button" onClick={() => {
                  if (!window.confirm("Import the old browser draft into these unpublished edits?")) return;
                  const fields = (CONTENT_FIELDS as Record<string, Record<string, any>>).chapters;
                  setForm({ ...form, chapters: form.chapters.map((chapter) => chapter.id === selected.id ? { ...chapter, ...Object.fromEntries(Object.keys(fields).filter((key) => legacyDraft[key] !== undefined).map((key) => [key, legacyDraft[key]])) } : chapter) });
                }}>Import draft</Button></div>}
                <ContentFields fields={(CONTENT_FIELDS as Record<string, Record<string, any>>)[section]} value={selected} onChange={(key, value) => update(selected.id, key, value)} />
                {section === "chapters" && <div className="website-card-preview" style={{ "--preview-color": selected.cardColor } as CSSProperties}><small>Chapter card preview</small><h3>{selected.title}</h3><p>{selected.description}</p></div>}
                {section === "team" && <div className="website-member-preview"><span className={selected.representation === "planet" ? "preview-planet" : "preview-star"} style={{ "--preview-color": selected.planetColor } as CSSProperties}>{selected.representation === "star" ? "✦" : ""}</span><span>{selected.name}<small>{selected.role} · {selected.isCore ? "Core team" : "Contributor"}</small></span></div>}
              </section>
            ) : <EmptyState title="No entries yet" description="Add an entry to get started." />}
          </div>
        )}
      </fieldset>
    </form>
  );
}

function ContentFields({ fields, value, onChange }: { fields: Record<string, any>; value: ContentItem; onChange: (key: string, value: unknown) => void }) {
  return <div className="website-fields">{Object.entries(fields).map(([key, field]) => <ContentField key={key} field={field} value={value[key]} onChange={(next) => onChange(key, next)} />)}</div>;
}
function ContentField({ field, value, onChange }: { field: any; value: any; onChange: (value: any) => void }) {
  if (field.type === "socials") return <fieldset className="website-socials"><legend>{field.label}</legend>{["discord", "github", "youtube", "twitter", "website"].map((key) => <Field key={key} label={key === "discord" ? "Discord username" : `${key} URL`}><input type={key === "discord" ? "text" : "url"} maxLength={1_000} value={value[key] || ""} onChange={(event) => onChange({ ...value, [key]: event.target.value })} /></Field>)}</fieldset>;
  if (field.type === "checkbox") return <label className="management-checkbox"><input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />{field.label}</label>;
  if (field.type === "color") return <Field label={field.label}><div className="website-color"><input aria-label={field.label} type="color" value={/^#[a-f0-9]{6}$/i.test(value) ? value : "#000000"} onChange={(event) => onChange(event.target.value)} /><input aria-label={`${field.label} hex`} type="text" maxLength={7} pattern="#[a-fA-F0-9]{6}" value={value} onChange={(event) => onChange(event.target.value)} /></div></Field>;
  return <Field label={field.label}>{field.type === "select" ? <Select value={value} onChange={(event) => onChange(event.target.value)}>{field.options.map((option: string) => <option key={option} value={option}>{option === "coming-soon" ? "Coming soon" : option[0].toUpperCase() + option.slice(1)}</option>)}</Select> : ["textarea", "assets", "list"].includes(field.type) ? <textarea rows={field.type === "textarea" ? 5 : 3} maxLength={field.max || 50_000} value={Array.isArray(value) ? value.join("\n") : value} onChange={(event) => onChange(["assets", "list"].includes(field.type) ? event.target.value.split("\n") : event.target.value)} /> : <input type={field.type === "date" ? "date" : "text"} maxLength={field.max} value={value} onChange={(event) => onChange(event.target.value)} />}</Field>;
}

type ReleaseEntry = {
  id: string; version: string; title: string; summary: string; type: string;
  status: string; changes: string[]; tags: string[]; date: string;
  author?: string; createdAt?: string; updatedAt?: string;
};
const emptyRelease = { version: "", title: "", summary: "", type: "Feature", status: "draft", changes: "", tags: "" };

function readLegacyAdminData() {
  const chapterDrafts: Record<string, ContentItem> = {};
  const recovery: Array<{ entry: ReleaseEntry; reason: string; at: string }> = [];
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith("enigma-admin-workspace-v1:")) continue;
      const parsed = JSON.parse(window.localStorage.getItem(key) || "null");
      if (!parsed || parsed.version !== 1 || !parsed.data) continue;
      Object.assign(chapterDrafts, parsed.data.chapters || {});
      for (const record of Object.values(parsed.data.archive || {}) as Array<any>) {
        if (record?.entry && record?.at) recovery.push(record);
      }
    }
  } catch {
    // Old browser data is optional; malformed or blocked storage is ignored.
  }
  return { chapterDrafts, recovery: recovery.sort((a, b) => b.at.localeCompare(a.at)) };
}

export function ChangelogAdmin() {
  const [entries, setEntries] = useState<ReleaseEntry[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<ReleaseEntry | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const recovery = useMemo(() => readLegacyAdminData().recovery, []);
  const load = async () => {
    setBusy(true); setError("");
    try { setEntries((await adminRequest<{ entries: ReleaseEntry[] }>("/changelog")).entries); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Changelog could not be loaded."); }
    finally { setBusy(false); }
  };
  useEffect(() => void load(), []);
  const filtered = useMemo(() => entries.filter((entry) => (status === "all" || entry.status === status) && [entry.title, entry.version, entry.summary, ...entry.tags, ...entry.changes].join(" ").toLowerCase().includes(query.toLowerCase())).sort((a, b) => (b.updatedAt || b.createdAt || b.date).localeCompare(a.updatedAt || a.createdAt || a.date)), [entries, query, status]);
  const save = async (body: Omit<ReleaseEntry, "id" | "date">) => {
    const result = await adminRequest<{ entry: ReleaseEntry }>(editing ? `/changelog/${editing.id}` : "/changelog", { method: editing ? "PUT" : "POST", body });
    setEntries((current) => [result.entry, ...current.filter((entry) => entry.id !== result.entry.id)]);
    setEditing(undefined);
  };
  const remove = async (entry: ReleaseEntry) => {
    if (!window.confirm(`Delete “${entry.title}” from the shared changelog?`)) return;
    setBusy(true); setError("");
    try { await adminRequest(`/changelog/${entry.id}`, { method: "DELETE" }); setEntries((current) => current.filter((item) => item.id !== entry.id)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "The entry could not be deleted."); }
    finally { setBusy(false); }
  };
  const restore = async (entry: ReleaseEntry) => {
    setBusy(true); setError("");
    try {
      const body = Object.fromEntries(["version", "title", "summary", "type", "changes", "tags"].map((key) => [key, entry[key as keyof ReleaseEntry]]));
      const result = await adminRequest<{ entry: ReleaseEntry }>("/changelog", { method: "POST", body: { ...body, status: "draft" } });
      setEntries((current) => [result.entry, ...current]);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The recovery copy could not be restored."); }
    finally { setBusy(false); }
  };
  const copyLink = async (id = "") => {
    try {
      await navigator.clipboard.writeText(
        new URL(taskboardUrl("changelog", id), window.location.origin).href,
      );
      setCopiedId(id || "all");
      setError("");
    } catch {
      setError("The link could not be copied. Open the Changelog page and copy its address instead.");
    }
  };
  return <div className="website-changelog">
    <section className="management-panel website-content-intro">
      <div><span className="management-eyebrow">SHARED RELEASE NOTES</span><h2>Release changelog</h2><p>Create, test, publish, search, and export the entries shared with the team.</p></div>
      <Button variant="primary" onClick={() => setEditing(null)}><Plus size={14} />New entry</Button>
    </section>
    <div className="website-changelog-toolbar">
      <label className="website-search"><Search size={14} /><input aria-label="Search changelog" placeholder="Search versions, titles, tags…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <Select aria-label="Filter changelog status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="testing">Testing</option><option value="released">Released</option></Select>
      <Button onClick={() => void copyLink()}><Link2 size={14} />{copiedId === "all" ? "Copied" : "Copy team link"}</Button>
      <Button onClick={() => downloadJson("enigma-changelog.json", filtered)}><Download size={14} />Export</Button>
      <Button onClick={() => void load()} disabled={busy}><RefreshCw size={14} />Reload</Button>
    </div>
    {error && <InlineError>{error}</InlineError>}
    <section className="website-release-list">
      {filtered.map((entry) => <article key={entry.id} className="management-panel website-release-entry"><div className="website-release-version">v{entry.version}</div><div><div className="website-release-heading"><h3>{entry.title}</h3><span data-status={entry.status}>{entry.status}</span></div><p>{entry.summary}</p><small>{entry.date} · {entry.type}{entry.author ? ` · ${entry.author}` : ""}</small>{entry.changes.length > 0 && <ul>{entry.changes.map((change, index) => <li key={index}>{change}</li>)}</ul>}{entry.tags.length > 0 && <div className="website-release-tags">{entry.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}</div><div className="website-row-actions">{entry.status === "released" && <Button aria-label={`Copy link to ${entry.title}`} onClick={() => void copyLink(entry.id)}><Link2 size={14} />{copiedId === entry.id ? "Copied" : "Copy link"}</Button>}<Button aria-label={`Edit ${entry.title}`} onClick={() => setEditing(entry)}><FilePenLine size={14} /></Button><Button aria-label={`Delete ${entry.title}`} disabled={busy} onClick={() => void remove(entry)}><Trash2 size={14} /></Button></div></article>)}
      {!busy && filtered.length === 0 && <EmptyState title="No matching entries" description="Adjust the filter or create a release entry." />}
    </section>
    {recovery.length > 0 && <details className="management-panel website-recovery"><summary>Browser recovery history ({recovery.length})</summary><p>Copies retained by the retired Website Admin can be exported or restored as new shared drafts.</p><Button onClick={() => downloadJson("enigma-release-recovery.json", recovery)}><Download size={14} />Export recovery</Button>{recovery.map((record, index) => <div className="website-recovery-row" key={`${record.at}-${index}`}><span><strong>{record.entry.title}</strong><small>{record.reason} · {new Date(record.at).toLocaleString()}</small></span><Button disabled={busy} onClick={() => void restore(record.entry)}>Restore as draft</Button></div>)}</details>}
    <ReleaseEditor open={editing !== undefined} entry={editing || null} onClose={() => setEditing(undefined)} onSave={save} />
  </div>;
}

function ReleaseEditor({ open, entry, onClose, onSave }: { open: boolean; entry: ReleaseEntry | null; onClose: () => void; onSave: (body: any) => Promise<void> }) {
  const [form, setForm] = useState<any>(emptyRelease);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (open) setForm(entry ? { ...entry, changes: entry.changes.join("\n"), tags: entry.tags.join(", ") } : emptyRelease); }, [open, entry]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    const changes = form.changes.split("\n").map((value: string) => value.trim()).filter(Boolean);
    const tags = form.tags.split(",").map((value: string) => value.trim().toLowerCase()).filter(Boolean);
    if (!form.version.trim() || !form.title.trim() || !form.summary.trim()) return setError("Version, title, and summary are required.");
    if (changes.length > 50 || tags.length > 20) return setError("Use up to 50 changes and 20 tags.");
    setSaving(true);
    try { await onSave({ version: form.version.trim().replace(/^v/i, ""), title: form.title.trim(), summary: form.summary.trim(), type: form.type, status: form.status, changes, tags }); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "The entry could not be saved."); }
    finally { setSaving(false); }
  };
  return <Modal open={open} onClose={() => !saving && onClose()} title={entry ? "Edit changelog entry" : "New changelog entry"} description="Saved to the shared team database."><form className="management-form" onSubmit={submit}><div className="management-form-grid"><Field label="Version"><input autoFocus required maxLength={50} value={form.version} onChange={(event) => setForm({ ...form, version: event.target.value })} placeholder="1.3.0" /></Field><Field label="Type"><Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{["Feature", "Improvement", "Fix", "Content", "Release"].map((value) => <option key={value}>{value}</option>)}</Select></Field></div><Field label="Title"><input required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field><Field label="Status"><Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">Draft</option><option value="testing">Testing</option><option value="released">Released</option></Select></Field><Field label="Summary"><textarea required maxLength={2_000} rows={3} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></Field><Field label="Changes (one per line)"><textarea rows={5} value={form.changes} onChange={(event) => setForm({ ...form, changes: event.target.value })} /></Field><Field label="Tags (comma separated)"><input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} /></Field>{error && <InlineError>{error}</InlineError>}<div className="modal-actions"><Button type="button" disabled={saving} onClick={onClose}>Cancel</Button><Button variant="primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save entry"}</Button></div></form></Modal>;
}
