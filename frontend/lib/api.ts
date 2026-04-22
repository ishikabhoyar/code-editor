import {
  AuthResponse,
  DocumentResponse,
  ExecutionResponse,
  SessionResponse,
  TokenValidationResponse,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

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
