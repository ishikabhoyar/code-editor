"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import {
  executeCode,
  loadDocument,
  saveDocument,
  sessionAction,
} from "../../../lib/api";
import { clearSession, getStoredSession } from "../../../lib/auth";
import { DocumentResponse, ExecutionResponse, UserSession } from "../../../lib/types";

// Monaco must be loaded client-side only (no SSR)
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

function toMonacoLang(lang: string): string {
  switch (lang) {
    case "Java": return "java";
    case "JavaScript": return "javascript";
    case "HTML": return "html";
    default: return "plaintext";
  }
}

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
  const [joinName, setJoinName] = useState("");
  const hasAutoJoined = useRef(false);
  const [stdout, setStdout] = useState("Output will appear here after execution.");
  const [stderr, setStderr] = useState("");
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "success" | "timeout" | "error">("idle");
  const [status, setStatus] = useState("Load a document and continue editing.");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [recentEditor, setRecentEditor] = useState<string | null>(null);

  // Refs for stable access inside callbacks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const stompClientRef = useRef<Client | null>(null);
  const applyingRemoteRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<UserSession | null>(null);
  const documentRef = useRef<DocumentResponse | null>(null);

  // Keep refs in sync with state
  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { documentRef.current = document; }, [document]);

  // ── Auth + initial load ──────────────────────────────────────────────────
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
    setJoinName(existing.name);
    fetchDocument(existing.token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, router]);

  // ── WebSocket / STOMP setup ──────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;

    const apiUrl = apiBaseUrl();
    const client = new Client({
      webSocketFactory: () => new SockJS(`${apiUrl}/ws`),
      reconnectDelay: 3000,
      onConnect: () => {
        setWsConnected(true);
        client.subscribe(`/topic/document/${documentId}`, (msg) => {
          const incoming = JSON.parse(msg.body) as {
            senderName: string;
            content?: string;
            language?: string;
            title?: string;
          };

          // Skip echoes of our own broadcasts
          if (incoming.senderName === sessionRef.current?.name) return;

          applyingRemoteRef.current = true;

          // Apply content directly to Monaco (no prop re-render = no cursor jump)
          if (incoming.content !== undefined && editorRef.current) {
            const editor = editorRef.current;
            if (editor.getValue() !== incoming.content) {
              const pos = editor.getPosition();
              editor.setValue(incoming.content);
              if (pos) editor.setPosition(pos);
            }
          }

          // Sync language / title into React state
          setDocument((cur) => {
            if (!cur) return cur;
            return {
              ...cur,
              content: incoming.content ?? cur.content,
              language: (incoming.language as DocumentResponse["language"]) ?? cur.language,
              title: incoming.title ?? cur.title,
            };
          });

          if (incoming.senderName) setRecentEditor(incoming.senderName);
          applyingRemoteRef.current = false;
        });
      },
      onDisconnect: () => setWsConnected(false),
      onStompError: () => setWsConnected(false),
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      client.deactivate();
      stompClientRef.current = null;
      setWsConnected(false);
    };
  }, [session?.token, documentId]);

  // ── Auto-join session once document loads ────────────────────────────────
  useEffect(() => {
    if (!session || !document || hasAutoJoined.current) return;
    hasAutoJoined.current = true;
    sessionAction(session.token, document.id, "join", session.name)
      .then((res) => setDocument((cur) => cur ? { ...cur, collaborators: res.activeCollaborators } : cur))
      .catch(() => {});
  }, [session, document]);

  // ── Periodic ping + auto-leave on unmount ────────────────────────────────
  useEffect(() => {
    if (!session || !document) return;
    const { token, name } = session;
    const docId = document.id;
    const interval = setInterval(() => {
      sessionAction(token, docId, "ping", name)
        .then((res) => setDocument((cur) => cur ? { ...cur, collaborators: res.activeCollaborators } : cur))
        .catch(() => {});
    }, 15000);
    return () => {
      clearInterval(interval);
      sessionAction(token, docId, "leave", name).catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token, document?.id]);

  const executionHistory = useMemo(() => document?.history || [], [document?.history]);

  // ── Helpers ──────────────────────────────────────────────────────────────
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

  // Debounced STOMP broadcast
  const broadcastEdit = useCallback((patch: Partial<DocumentResponse>) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      const client = stompClientRef.current;
      const sess = sessionRef.current;
      const doc = documentRef.current;
      if (!client?.connected || !sess || !doc) return;
      client.publish({
        destination: `/app/document/${documentId}/edit`,
        body: JSON.stringify({
          senderName: sess.name,
          content: patch.content ?? doc.content,
          language: patch.language ?? doc.language,
          title: patch.title ?? doc.title,
        }),
      });
    }, 250);
  }, [documentId]);

  // Monaco onMount — store editor ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleEditorMount(editor: any) {
    editorRef.current = editor;
    editor.onDidChangeModelContent(() => {
      if (applyingRemoteRef.current) return;
      const newContent: string = editor.getValue();
      // Keep documentRef in sync for save/run without triggering another render
      if (documentRef.current) {
        documentRef.current = { ...documentRef.current, content: newContent };
      }
      setDocument((cur) => cur ? { ...cur, content: newContent } : cur);
      broadcastEdit({ content: newContent });
    });
  }

  function handleLanguageChange(lang: string) {
    const newLang = lang as DocumentResponse["language"];
    patchDocument({ language: newLang });
    broadcastEdit({ language: newLang });
  }

  function handleTitleChange(title: string) {
    patchDocument({ title });
    broadcastEdit({ title });
  }

  async function handleSave() {
    if (!session || !document) return;
    try {
      setSaving(true);
      setError("");
      const saved = await saveDocument(session.token, document.id, {
        title: document.title,
        language: document.language,
        content: editorRef.current?.getValue() ?? document.content,
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
    if (!session || !document) return;
    try {
      setError("");
      setRunStatus("running");
      setStdout("Running in backend sandbox...");
      setStderr("");
      const execution = await executeCode(session.token, document.id, {
        language: document.language,
        code: editorRef.current?.getValue() ?? document.content,
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
        if (!current) return current;
        return { ...current, history: [execution, ...current.history] };
      });
    } catch (runError) {
      setRunStatus("error");
      setError((runError as Error).message);
      setStatus("Execution request failed.");
    }
  }

  async function handleSession(action: "join" | "leave" | "ping") {
    if (!session || !document || !joinName.trim()) return;
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

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl rounded-[30px] border border-(--border) bg-white/85 p-7 shadow-sm">
        <header className="flex flex-col gap-4 border-b border-(--border) pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--muted)">Editor</p>
            <h1 className="mt-1 text-2xl font-semibold">{document?.title || "Loading..."}</h1>
            <p className="mt-1 text-xs text-(--muted)">{status}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-2xl border px-3 py-2 text-xs font-medium ${
                wsConnected
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {wsConnected ? "● Live" : "○ Offline"}
            </span>
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

        {error && (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          {/* ── Left: editor ── */}
          <section className="rounded-3xl border border-(--border) bg-(--panel) p-5">
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded-2xl border border-(--border) bg-white px-4 py-2 text-sm"
                value={document?.language || "Java"}
                onChange={(e) => handleLanguageChange(e.target.value)}
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
              {recentEditor && (
                <span className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  ✎ {recentEditor} editing
                </span>
              )}
            </div>

            <label className="mt-4 block space-y-2 text-sm">
              <span className="text-(--muted)">Document title</span>
              <input
                className="w-full rounded-2xl border border-(--border) bg-white px-4 py-3 outline-none"
                value={document?.title || ""}
                onChange={(e) => handleTitleChange(e.target.value)}
                disabled={!document}
              />
            </label>

            <div className="mt-4 space-y-2 text-sm">
              <span className="text-(--muted)">Code</span>
              <div className="overflow-hidden rounded-3xl border border-(--border)" style={{ height: 420 }}>
                {document ? (
                  <MonacoEditor
                    height={420}
                    language={toMonacoLang(document.language)}
                    defaultValue={document.content}
                    onMount={handleEditorMount}
                    theme="vs-dark"
                    options={{
                      fontSize: 13,
                      minimap: { enabled: false },
                      wordWrap: "on",
                      scrollBeyondLastLine: false,
                      padding: { top: 16, bottom: 16 },
                      automaticLayout: true,
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[#1e1e1e] text-sm text-gray-400">
                    Loading editor…
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── Right: panels ── */}
          <section className="space-y-4">
            {/* Execution output */}
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

            {/* Session */}
            <div className="rounded-3xl border border-(--border) bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-(--muted)">Session</p>
              <div className="mt-3 rounded-2xl border border-(--border) bg-(--panel) px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.24em] text-(--muted)">Team code</p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-widest">
                  {String(documentId).padStart(6, "0")}
                </p>
                <p className="mt-1 text-[11px] text-(--muted)">Share this code so teammates can join</p>
              </div>
              <label className="mt-3 block space-y-2 text-sm">
                <span className="text-(--muted)">Collaborator name</span>
                <input
                  className="w-full rounded-2xl border border-(--border) bg-(--panel) px-4 py-2 outline-none"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
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

            {/* Execution history */}
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

