"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiBaseUrl, createDocument, deleteDocument, listDocuments } from "../../lib/api";
import { clearSession, getStoredSession } from "../../lib/auth";
import { DocumentResponse, UserSession } from "../../lib/types";

export default function DocumentsPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [title, setTitle] = useState("Document-1.java");
  const [language, setLanguage] = useState<"Java" | "HTML" | "JavaScript">("Java");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinCodeError, setJoinCodeError] = useState("");

  useEffect(() => {
    const existing = getStoredSession();
    if (!existing) {
      router.replace("/login");
      return;
    }

    setSession(existing);
    fetchDocuments(existing.token);
  }, [router]);

  async function fetchDocuments(token: string) {
    try {
      setError("");
      setLoading(true);
      const list = await listDocuments(token);
      setDocuments(list);
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!session) {
      return;
    }

    try {
      setError("");
      const created = await createDocument(session.token, {
        title: title.trim() || `Document-${documents.length + 1}.java`,
        language,
        content:
          language === "Java"
            ? "public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Hello\");\n  }\n}"
            : language === "HTML"
              ? "<!doctype html>\n<html><body><h1>Hello</h1></body></html>"
              : "console.log('Hello');",
      });

      setDocuments((current) => [created, ...current]);
      router.push(`/editor/${created.id}`);
    } catch (createError) {
      setError((createError as Error).message);
    }
  }

  async function handleDelete(documentId: number) {
    if (!session) {
      return;
    }

    try {
      setError("");
      await deleteDocument(session.token, documentId);
      setDocuments((current) => current.filter((doc) => doc.id !== documentId));
    } catch (deleteError) {
      setError((deleteError as Error).message);
    }
  }

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  function handleJoinByCode() {
    const id = parseInt(joinCode.trim(), 10);
    if (!Number.isFinite(id) || id <= 0) {
      setJoinCodeError("Enter a valid team code.");
      return;
    }
    router.push(`/editor/${id}`);
  }

  return (
    <main className="min-h-screen px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl rounded-[30px] border border-(--border) bg-white/85 p-7 shadow-sm">
        <header className="flex flex-col gap-4 border-b border-(--border) pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--muted)">
              Documents
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Choose or create a document</h1>
            <p className="mt-2 text-sm text-(--muted)">
              Step 2 of 3: Manage your document list before entering the editor.
            </p>
            <p className="mt-1 text-xs text-(--muted)">
              Signed in as {session?.name} ({session?.email})
            </p>
            <p className="mt-1 text-xs text-(--muted)">Backend base URL: {apiBaseUrl()}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => session && fetchDocuments(session.token)}
              className="rounded-2xl border border-(--border) bg-(--panel) px-4 py-2 text-sm font-medium"
            >
              Refresh
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

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-(--border) bg-(--panel) p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-(--muted)">New document</p>
            <div className="mt-4 space-y-3">
              <label className="block space-y-2 text-sm">
                <span className="text-(--muted)">Title</span>
                <input
                  className="w-full rounded-2xl border border-(--border) bg-white px-4 py-3 outline-none"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>

              <label className="block space-y-2 text-sm">
                <span className="text-(--muted)">Language</span>
                <select
                  className="w-full rounded-2xl border border-(--border) bg-white px-4 py-3 outline-none"
                  value={language}
                  onChange={(event) =>
                    setLanguage(event.target.value as "Java" | "HTML" | "JavaScript")
                  }
                >
                  <option value="Java">Java</option>
                  <option value="HTML">HTML</option>
                  <option value="JavaScript">JavaScript</option>
                </select>
              </label>

              <button
                type="button"
                onClick={handleCreate}
                className="w-full rounded-2xl bg-foreground px-4 py-3 text-sm font-medium text-background"
              >
                Create and open editor
              </button>

              <div className="border-t border-(--border) pt-3">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-(--muted)">Join with team code</p>
                <div className="mt-3 flex gap-2">
                  <input
                    className="flex-1 rounded-2xl border border-(--border) bg-white px-4 py-3 font-mono text-sm outline-none"
                    placeholder="e.g. 000042"
                    value={joinCode}
                    onChange={(e) => { setJoinCode(e.target.value); setJoinCodeError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
                  />
                  <button
                    type="button"
                    onClick={handleJoinByCode}
                    className="rounded-2xl bg-foreground px-4 py-3 text-sm font-medium text-background"
                  >
                    Join
                  </button>
                </div>
                {joinCodeError && <p className="mt-2 text-xs text-red-600">{joinCodeError}</p>}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-(--border) bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-(--muted)">Your documents</p>
            <div className="mt-4 space-y-3">
              {loading && (
                <p className="rounded-2xl border border-(--border) bg-(--panel) px-4 py-6 text-sm text-(--muted)">
                  Loading documents...
                </p>
              )}

              {!loading && documents.length === 0 && (
                <p className="rounded-2xl border border-dashed border-(--border) bg-(--panel) px-4 py-6 text-sm text-(--muted)">
                  No documents found. Create your first document.
                </p>
              )}

              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-(--border) bg-(--panel) px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-xs text-(--muted)">
                      {doc.language} · Owner: {doc.ownerName} · Code: <span className="font-mono font-semibold">{String(doc.id).padStart(6, "0")}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/editor/${doc.id}`}
                      className="rounded-xl border border-(--border) bg-white px-3 py-1.5 text-xs font-medium"
                    >
                      Open
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
