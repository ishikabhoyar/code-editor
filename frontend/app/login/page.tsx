"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { login, register } from "../../lib/api";
import { getStoredSession, saveSession } from "../../lib/auth";
import { AuthMode } from "../../lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      router.push("/documents");
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Code Editor</h1>
        <p className="mt-1 text-sm text-(--muted)">
          {mode === "login" ? "Sign in to continue" : "Create a new account"}
        </p>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 space-y-3">
          {mode === "register" && (
            <label className="block space-y-1.5 text-sm">
              <span className="text-(--muted)">Name</span>
              <input
                className="w-full rounded-xl border border-(--border) bg-white px-4 py-2.5 outline-none focus:border-foreground/30"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
              />
            </label>
          )}

          <label className="block space-y-1.5 text-sm">
            <span className="text-(--muted)">Email</span>
            <input
              className="w-full rounded-xl border border-(--border) bg-white px-4 py-2.5 outline-none focus:border-foreground/30"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="text-(--muted)">Password</span>
            <input
              className="w-full rounded-xl border border-(--border) bg-white px-4 py-2.5 outline-none focus:border-foreground/30"
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
            className="w-full rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:opacity-70"
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </div>

        <p className="mt-4 text-center text-sm text-(--muted)">
          {mode === "login" ? "No account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="font-medium text-foreground"
          >
            {mode === "login" ? "Register" : "Sign in"}
          </button>
        </p>
      </div>
    </main>
  );
}
