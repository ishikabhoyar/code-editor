export type AuthMode = "login" | "register";

export type AuthResponse = {
  token: string;
  name: string;
  email: string;
};

export type TokenValidationResponse = {
  valid: boolean;
  email: string;
  name: string;
};

export type ExecutionResponse = {
  executionId: string;
  status: "success" | "timeout" | "error";
  stdout: string;
  stderr: string;
  durationMs: number;
  executedAt: string;
};

export type DocumentResponse = {
  id: number;
  title: string;
  ownerName: string;
  ownerEmail: string;
  language: "Java" | "HTML" | "JavaScript";
  content: string;
  collaborators: string[];
  updatedAt: string;
  history: ExecutionResponse[];
};

export type SessionResponse = {
  documentId: number;
  activeCollaborators: string[];
  activeCount: number;
  lastHeartbeatAt: string;
};

export type UserSession = {
  token: string;
  name: string;
  email: string;
};
