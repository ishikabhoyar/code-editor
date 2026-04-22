"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  apiBaseUrl,
  executeCode,
  loadDocument,
  saveDocument,
  sessionAction,
} from "../../../lib/api";
import { clearSession, getStoredSession } from "../../../lib/auth";
import { DocumentResponse, ExecutionResponse, UserSession } from "../../../lib/types";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const documentId = Number(params.id);

  const [session, setSession] = useState<UserSession | null>(null);
  const [document, setDocument] = useState<DocumentResponse | null>(null);
  const [joinName, setJoinName] = useState("Maya Chen");
  const [stdout, setStdout] = useState("Output will appear here after execution.");
  const [stderr, setStderr] = useState("");
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "success" | "timeout" | "error">("idle");
  const [status, setStatus] = useState("Load a document and continue editing.");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(documentId)) {
      router.replace("/documents");
      return;
    }

    const existing = getStoredSession();
    if (!existing) {
      router.replace("/login");
      return;
    }

    setSession(existing);
    fetchDocument(existing.token);
  }, [documentId, router]);

  const executionHistory = useMemo(() => document?.history || [], [document?.history]);

  async function fetchDocument(token: string) {
    try {
      setError("");
      const loaded = await loadDocument(token, documentId);
      setDocument(loaded);
      setStatus(`Loaded ${loaded.title}`);
    } catch (loadError) {
      setError((loadError as Error).message);
      setStatus("Unable to load this document.");
    }
  }

  function patchDocument(patch: Partial<DocumentResponse>) {
    setDocument((current) => (current ? { ...current, ...patch } : current));
  }

  async function handleSave() {
    if (!session || !document) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      const saved = await saveDocument(session.token, document.id, {
        title: document.title,
        language: document.language,
        content: document.content,
      });
      setDocument(saved);
      setStatus(`Saved ${saved.title}`);
    } catch (saveError) {
      setError((saveError as Error).message);
      setStatus("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRun() {
    if (!session || !document) {
      return;
    }

    try {
      setError("");
      setRunStatus("running");
      setStdout("Running in backend sandbox...");
      setStderr("");

      const execution = await executeCode(session.token, document.id, {
        language: document.language,
        code: document.content,
        timeoutSeconds: 5,
      });

      setRunStatus(execution.status);
      setStdout(execution.stdout || "");
      setStderr(execution.stderr || "");
      setStatus(
        execution.status === "success"
          ? "Execution successful."
          : execution.status === "timeout"
            ? "Execution timed out."
            : "Execution failed.",
      );

      setDocument((current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          history: [execution, ...current.history],
        };
      });
    } catch (runError) {
      setRunStatus("error");
      setError((runError as Error).message);
      setStatus("Execution request failed.");
    }
  }

  async function handleSession(action: "join" | "leave" | "ping") {
    if (!session || !document || !joinName.trim()) {
      return;
    }

    try {
      setError("");
      const response = await sessionAction(session.token, document.id, action, joinName.trim());
      patchDocument({ collaborators: response.activeCollaborators });
      setStatus(
        action === "join"
          ? `${joinName.trim()} joined session.`
          : action === "leave"
            ? `${joinName.trim()} left session.`
            : `Heartbeat updated for ${joinName.trim()}.`,
      );
    } catch (sessionError) {
      setError((sessionError as Error).message);
      setStatus(`Session ${action} failed.`);
    }
  }

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <main className="min-h-screen px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl rounded-[30px] border border-(--border) bg-white/85 p-7 shadow-sm">
        <header className="flex flex-col gap-4 border-b border-(--border) pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--muted)">Editor</p>
            <h1 className="mt-2 text-3xl font-semibold">{document?.title || "Loading..."}</h1>
            <p className="mt-2 text-sm text-(--muted)">
              Step 3 of 3: Save, collaborate, and execute using backend APIs.
            </p>
            <p className="mt-1 text-xs text-(--muted)">Status: {status}</p>
            <p className="mt-1 text-xs text-(--muted)">Backend base URL: {apiBaseUrl()}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/documents"
              className="rounded-2xl border border-(--border) bg-(--panel) px-4 py-2 text-sm font-medium"
            >
              Back to documents
            </Link>
            <button
              type="button"
              onClick={() => session && fetchDocument(session.token)}
              className="rounded-2xl border border-(--border) bg-white px-4 py-2 text-sm font-medium"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-2xl border border-(--border) bg-white px-4 py-2 text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </header>

        {error && <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-3xl border border-(--border) bg-(--panel) p-5">
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-2xl border border-(--border) bg-white px-4 py-2 text-sm"
                value={document?.language || "Java"}
                onChange={(event) =>
                  patchDocument({ language: event.target.value as DocumentResponse["language"] })
                }
              >
                <option value="Java">Java</option>
                <option value="HTML">HTML</option>
                <option value="JavaScript">JavaScript</option>
              </select>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !document}
                className="rounded-2xl border border-(--border) bg-white px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={handleRun}
                disabled={!document}
                className="rounded-2xl bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
              >
                Run sandboxed code
              </button>
            </div>

            <label className="mt-4 block space-y-2 text-sm">
              <span className="text-(--muted)">Document title</span>
              <input
                className="w-full rounded-2xl border border-(--border) bg-white px-4 py-3 outline-none"
                value={document?.title || ""}
                onChange={(event) => patchDocument({ title: event.target.value })}
                disabled={!document}
              />
            </label>

            <label className="mt-4 block space-y-2 text-sm">
              <span className="text-(--muted)">Code</span>
              <textarea
                className="min-h-90 w-full rounded-3xl border border-(--border) bg-[#0f172a] p-5 font-mono text-[13px] leading-6 text-white outline-none"
                value={document?.content || ""}
                onChange={(event) => patchDocument({ content: event.target.value })}
                disabled={!document}
              />
            </label>
          </section>

          <section className="space-y-4">
            <div className="rounded-3xl border border-(--border) bg-white p-4">
              <div className="flex items-center justify-between border-b border-(--border) pb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-(--muted)">
                  Execution output
                </p>
                <span className="rounded-full border border-(--border) bg-(--panel) px-2 py-1 text-[11px] uppercase tracking-[0.2em]">
                  {runStatus}
                </span>
              </div>
              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-(--muted)">stdout</p>
                  <pre className="mt-1 whitespace-pre-wrap rounded-2xl border border-(--border) bg-(--panel) p-3 font-mono text-[12px]">
{stdout}
                  </pre>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-(--muted)">stderr</p>
                  <pre className="mt-1 whitespace-pre-wrap rounded-2xl border border-(--border) bg-(--panel) p-3 font-mono text-[12px]">
{stderr || "No stderr captured."}
                  </pre>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-(--border) bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-(--muted)">Session</p>
              <label className="mt-3 block space-y-2 text-sm">
                <span className="text-(--muted)">Collaborator name</span>
                <input
                  className="w-full rounded-2xl border border-(--border) bg-(--panel) px-4 py-2 outline-none"
                  value={joinName}
                  onChange={(event) => setJoinName(event.target.value)}
                />
              </label>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSession("join")}
                  className="flex-1 rounded-2xl bg-foreground px-3 py-2 text-xs font-medium text-background"
                >
                  Join
                </button>
                <button
                  type="button"
                  onClick={() => handleSession("leave")}
                  className="flex-1 rounded-2xl border border-(--border) bg-(--panel) px-3 py-2 text-xs font-medium"
                >
                  Leave
                </button>
                <button
                  type="button"
                  onClick={() => handleSession("ping")}
                  className="flex-1 rounded-2xl border border-(--border) bg-(--panel) px-3 py-2 text-xs font-medium"
                >
                  Ping
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(document?.collaborators || []).map((person) => (
                  <span
                    key={person}
                    className="rounded-full border border-(--border) bg-(--panel) px-3 py-1 text-xs font-medium"
                  >
                    {person}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-(--border) bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-(--muted)">Execution history</p>
              <div className="mt-3 space-y-2">
                {executionHistory.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-(--border) bg-(--panel) px-3 py-4 text-sm text-(--muted)">
                    No executions yet.
                  </p>
                )}

                {executionHistory.slice(0, 8).map((item: ExecutionResponse) => (
                  <div key={item.executionId} className="rounded-2xl border border-(--border) bg-(--panel) px-3 py-2">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-(--muted)">
                      <span>{item.status}</span>
                      <span>{formatTime(item.executedAt)}</span>
                    </div>
                    <p className="mt-1 text-xs">Duration: {item.durationMs}ms</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
