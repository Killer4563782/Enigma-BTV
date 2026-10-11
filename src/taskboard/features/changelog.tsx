"use client";

import { useEffect, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button, EmptyState, InlineError } from "@/components/ui";
import { workspaceApi } from "@/lib/api/workspace";
import type { ReleaseEntry } from "@/lib/changelog";
import { taskboardUrl } from "@/lib/routes.mjs";
import { useWorkspace } from "@/lib/store";
import { ChangelogAdmin } from "./website-admin";
import "./changelog.css";

export function ChangelogPage() {
  const { entityId: routeEntityId, view, navigate, user } = useWorkspace();
  const admin = user.role === "Owner" || user.role === "Admin";
  const managing = admin && routeEntityId === "manage";
  const entityId = view === "changelog" && routeEntityId !== "manage" ? routeEntityId : "";
  const [entries, setEntries] = useState<ReleaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    workspaceApi.getChangelog(controller.signal)
      .then((result) => setEntries(result.entries))
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setError(failure instanceof Error ? failure.message : "Changelog could not be loaded.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const selected = entityId ? entries.find((entry) => entry.id === entityId) : null;
  const visible = entityId ? (selected ? [selected] : []) : entries;

  const copyLink = async (id = "") => {
    try {
      await navigator.clipboard.writeText(
        new URL(taskboardUrl("changelog", id), window.location.origin).href,
      );
      setCopiedId(id || "all");
    } catch {
      setError("The link could not be copied. Copy the address from your browser instead.");
    }
  };

  if (managing) return (
    <div className="changelog-page">
      <Button onClick={() => navigate("changelog")}>Back to Changelog</Button>
      <ChangelogAdmin />
    </div>
  );

  return (
    <div className="changelog-page">
      <header className="changelog-page-header">
        <div>
          <span className="management-eyebrow">ENIGMA UPDATES</span>
          <h1>Changelog</h1>
          <p>What changed in Enigma, release by release.</p>
        </div>
        <div className="changelog-page-actions">
          {admin && <Button onClick={() => navigate("changelog", "manage")}>Manage releases</Button>}
          {entityId && <Button onClick={() => navigate("changelog")}>All releases</Button>}
          <Button onClick={() => void copyLink(entityId)}>
            {copiedId === (entityId || "all") ? <Check size={14} /> : <Link2 size={14} />}
            {copiedId === (entityId || "all") ? "Link copied" : "Copy link"}
          </Button>
        </div>
      </header>
      {error && <InlineError>{error}</InlineError>}
      {loading ? (
        <p>Loading releases…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          title={entityId ? "Release not available" : "No releases yet"}
          description={entityId ? "This release may be unpublished or the link may be outdated." : "Published releases will appear here."}
        />
      ) : (
        <div className="changelog-page-list">
          {visible.map((entry) => (
            <article className="management-panel changelog-page-entry" key={entry.id}>
              <div className="changelog-page-version">v{entry.version}</div>
              <div className="changelog-page-entry-body">
                <div className="changelog-page-entry-heading">
                  <h2>{entry.title}</h2>
                  {!entityId && (
                    <Button
                      aria-label={`Copy link to ${entry.title}`}
                      onClick={() => void copyLink(entry.id)}
                    >
                      {copiedId === entry.id ? <Check size={14} /> : <Link2 size={14} />}
                      {copiedId === entry.id ? "Copied" : "Share"}
                    </Button>
                  )}
                </div>
                <p>{entry.summary}</p>
                <small>{entry.date} · {entry.type}</small>
                {entry.changes.length > 0 && (
                  <ul>{entry.changes.map((change, index) => <li key={index}>{change}</li>)}</ul>
                )}
                {entry.tags.length > 0 && (
                  <div className="changelog-page-tags">
                    {entry.tags.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
