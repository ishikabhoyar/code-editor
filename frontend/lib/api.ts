import {
  AuthResponse,
  DocumentResponse,
  ExecutionResponse,
  SandboxResultResponse,
  SandboxSubmitResponse,
  SessionResponse,
  TokenValidationResponse,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:17808";

const SANDBOX_BASE_URL =
  process.env.NEXT_PUBLIC_SANDBOX_URL || "https://monacoapi.swdc.somaiya.edu";

function toMessage(errorBody: unknown, fallback: string): string {
  if (errorBody && typeof errorBody === "object" && "message" in errorBody) {
    const message = (errorBody as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
}

export async function apiRequest<T>(
  path: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    token?: string;
    body?: unknown;
  },
): Promise<T> {
  const headers = new Headers();
  if (options?.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }
  if (options?.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options?.method || "GET",
      headers,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      let body: unknown = undefined;
      try {
        body = await response.json();
      } catch {
        // Keep fallback message when response is not JSON.
      }
      throw new Error(toMessage(body, `Request failed with status ${response.status}`));
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.message === "Failed to fetch") {
      throw new Error(
        `Cannot reach backend at ${API_BASE_URL}. Start backend and verify CORS/env settings.`,
      );
    }
    throw error;
  }
}

export function register(payload: {
  name: string;
  email: string;
  password: string;
}) {
  return apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: payload,
  });
}

export function login(payload: { email: string; password: string }) {
  return apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function validateToken(token: string) {
  return apiRequest<TokenValidationResponse>("/api/auth/validate", { token });
}

export function listDocuments(token: string) {
  return apiRequest<DocumentResponse[]>("/api/documents", { token });
}

export function createDocument(
  token: string,
  payload: { title: string; language: string; content: string },
) {
  return apiRequest<DocumentResponse>("/api/documents", {
    method: "POST",
    token,
    body: payload,
  });
}

export function loadDocument(token: string, documentId: number) {
  return apiRequest<DocumentResponse>(`/api/documents/${documentId}`, { token });
}

export function saveDocument(
  token: string,
  documentId: number,
  payload: { title: string; language: string; content: string },
) {
  return apiRequest<DocumentResponse>(`/api/documents/${documentId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export function deleteDocument(token: string, documentId: number) {
  return apiRequest<void>(`/api/documents/${documentId}`, {
    method: "DELETE",
    token,
  });
}

export function sessionAction(
  token: string,
  documentId: number,
  action: "join" | "leave" | "ping",
  collaboratorName: string,
) {
  return apiRequest<SessionResponse>(`/api/documents/${documentId}/sessions/${action}`, {
    method: "POST",
    token,
    body: { collaboratorName },
  });
}

export function executeCode(
  token: string,
  documentId: number,
  payload: { language: string; code: string; timeoutSeconds?: number },
) {
  return apiRequest<ExecutionResponse>(`/api/documents/${documentId}/execute`, {
    method: "POST",
    token,
    body: payload,
  });
}

export function apiBaseUrl() {
  return API_BASE_URL;
}

// ── Monaco Sandbox API (monacoapi.swdc.somaiya.edu) ────────────────────────

function toSandboxLanguage(lang: string): string {
  switch (lang) {
    case "Java": return "java";
    case "JavaScript": return "javascript";
    case "Python": return "python";
    case "C": return "c";
    case "C++": return "cpp";
    default: return lang.toLowerCase();
  }
}

export async function sandboxSubmit(payload: {
  code: string;
  language: string;
  input?: string;
}): Promise<SandboxSubmitResponse> {
  const response = await fetch(`${SANDBOX_BASE_URL}/api/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: payload.code,
      language: toSandboxLanguage(payload.language),
      input: payload.input ?? "",
    }),
  });
  if (!response.ok) {
    throw new Error(`Sandbox submission failed with status ${response.status}`);
  }
  return response.json() as Promise<SandboxSubmitResponse>;
}

export async function sandboxGetResult(id: string): Promise<SandboxResultResponse> {
  const response = await fetch(`${SANDBOX_BASE_URL}/api/result/${id}`);
  if (!response.ok) {
    throw new Error(`Sandbox result fetch failed with status ${response.status}`);
  }
  return response.json() as Promise<SandboxResultResponse>;
}

/**
 * Submit code to the sandbox and poll until execution completes or times out.
 * Resolves with the final SandboxResultResponse.
 */
export async function runInSandbox(
  code: string,
  language: string,
  input?: string,
  pollIntervalMs = 1000,
  timeoutMs = 30000,
): Promise<SandboxResultResponse> {
  const { id } = await sandboxSubmit({ code, language, input });

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await sandboxGetResult(id);
    if (result.status === "completed" || result.status === "failed") {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error("Sandbox execution timed out");
}
