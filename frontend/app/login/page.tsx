"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiBaseUrl, login, register, validateToken } from "../../lib/api";
import { getStoredSession, saveSession } from "../../lib/auth";
import { AuthMode } from "../../lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("Asha Rao");
  const [email, setEmail] = useState("asha@example.com");
  const [password, setPassword] = useState("editor-123");
  const [status, setStatus] = useState("Authenticate to start collaboration.");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const existing = getStoredSession();
    if (existing) {
      router.replace("/documents");
    }
  }, [router]);

  async function handleSubmit() {
    try {
      setError("");
      setLoading(true);

      const response =
        mode === "register"
          ? await register({ name: name.trim(), email: email.trim(), password })
          : await login({ email: email.trim(), password });

      saveSession({ token: response.token, name: response.name, email: response.email });
      setStatus(`${mode === "register" ? "Registered" : "Logged in"} as ${response.name}`);
      router.push("/documents");
    } catch (submitError) {
      setError((submitError as Error).message);
      setStatus("Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleValidate() {
    const existing = getStoredSession();
    if (!existing) {
      setStatus("Login first to validate token.");
      return;
    }

    try {
      setError("");
      const validation = await validateToken(existing.token);
      setStatus(
        validation.valid
          ? `Token valid for ${validation.name} (${validation.email})`
          : "Token invalid",
      );
    } catch (validationError) {
      setError((validationError as Error).message);
      setStatus("Validation failed.");
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[28px] border border-(--border) bg-white/85 p-7 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--muted)">
            Real-Time Collaborative Code Editor Platform
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight">Sign in to your workspace</h1>
          <p className="mt-3 text-sm text-(--muted)">
            Step 1 of 3: Authenticate with backend JWT APIs, then continue to documents and editor.
          </p>
          <p className="mt-3 text-xs text-(--muted)">Backend base URL: {apiBaseUrl()}</p>

          <div className="mt-6 rounded-2xl border border-(--border) bg-(--panel) p-4 text-sm">
            <p className="font-medium">Current status</p>
            <p className="mt-2 text-(--muted)">{status}</p>
            {error && <p className="mt-2 font-medium text-red-600">{error}</p>}
          </div>
        </section>

        <section className="rounded-[28px] border border-(--border) bg-white/85 p-7 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-(--muted)">
              Authentication
            </p>
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="rounded-full border border-(--border) bg-(--panel) px-3 py-1 text-xs font-medium"
            >
              {mode === "login" ? "Switch to register" : "Switch to login"}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {mode === "register" && (
              <label className="block space-y-2 text-sm">
                <span className="text-(--muted)">Name</span>
                <input
                  className="w-full rounded-2xl border border-(--border) bg-white px-4 py-3 outline-none"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                />
              </label>
            )}

            <label className="block space-y-2 text-sm">
              <span className="text-(--muted)">Email</span>
              <input
                className="w-full rounded-2xl border border-(--border) bg-white px-4 py-3 outline-none"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label className="block space-y-2 text-sm">
              <span className="text-(--muted)">Password</span>
              <input
                className="w-full rounded-2xl border border-(--border) bg-white px-4 py-3 outline-none"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="••••••••"
              />
            </label>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="mt-2 w-full rounded-2xl bg-foreground px-4 py-3 text-sm font-medium text-background disabled:opacity-70"
            >
              {loading ? "Please wait..." : mode === "register" ? "Register" : "Login"}
            </button>

            <button
              type="button"
              onClick={handleValidate}
              className="w-full rounded-2xl border border-(--border) bg-(--panel) px-4 py-3 text-sm font-medium"
            >
              Validate existing token
            </button>
          </div>

          <p className="mt-5 text-xs text-(--muted)">
            Already authenticated? Continue to <Link href="/documents" className="font-medium text-foreground underline">Documents</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
