const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5025";

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function login(email: string, password: string) {
  return request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export async function register(email: string, displayName: string, password: string) {
  return request("/api/auth/register", { method: "POST", body: JSON.stringify({ email, displayName, password }) });
}

export async function getScenes(token: string) {
  return request<SceneSummary[]>("/api/scenes", {}, token);
}

export async function getScene(token: string, id: number) {
  return request<SceneFull>(`/api/scenes/${id}`, {}, token);
}

export async function saveScene(token: string, title: string, content: string) {
  return request<SceneFull>("/api/scenes", { method: "POST", body: JSON.stringify({ title, content }) }, token);
}

export async function updateScene(token: string, id: number, title: string, content: string) {
  return request<SceneFull>(`/api/scenes/${id}`, { method: "PUT", body: JSON.stringify({ title, content }) }, token);
}

export async function deleteScene(token: string, id: number) {
  return request<void>(`/api/scenes/${id}`, { method: "DELETE" }, token);
}

export async function reorderScenes(token: string, orderedIds: number[]) {
  return request<void>("/api/scenes/reorder", { method: "PUT", body: JSON.stringify({ orderedIds }) }, token);
}

export type SceneSummary = {
  id: number;
  title: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type SceneFull = SceneSummary & {
  content: string;
};