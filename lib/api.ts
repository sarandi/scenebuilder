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

// Stories
export async function getStories(token: string) {
  return request<Story[]>("/api/stories", {}, token);
}

export async function getStory(token: string, id: number) {
  return request<Story>(`/api/stories/${id}`, {}, token);
}

export async function createStory(token: string, title: string) {
  return request<Story>("/api/stories", { method: "POST", body: JSON.stringify({ title }) }, token);
}

export async function updateStory(token: string, id: number, title: string) {
  return request<Story>(`/api/stories/${id}`, { method: "PUT", body: JSON.stringify({ title }) }, token);
}

export async function deleteStory(token: string, id: number) {
  return request<void>(`/api/stories/${id}`, { method: "DELETE" }, token);
}

// Scenes
export async function getScenes(token: string, storyId: number) {
  return request<SceneSummary[]>(`/api/stories/${storyId}/scenes`, {}, token);
}

export async function getScene(token: string, storyId: number, id: number) {
  return request<SceneFull>(`/api/stories/${storyId}/scenes/${id}`, {}, token);
}

export async function saveScene(token: string, storyId: number, title: string, content: string) {
  return request<SceneFull>(`/api/stories/${storyId}/scenes`, { method: "POST", body: JSON.stringify({ title, content }) }, token);
}

export async function updateScene(token: string, storyId: number, id: number, title: string, content: string) {
  return request<SceneFull>(`/api/stories/${storyId}/scenes/${id}`, { method: "PUT", body: JSON.stringify({ title, content }) }, token);
}

export async function deleteScene(token: string, storyId: number, id: number) {
  return request<void>(`/api/stories/${storyId}/scenes/${id}`, { method: "DELETE" }, token);
}

export async function reorderScenes(token: string, storyId: number, orderedIds: number[]) {
  return request<void>(`/api/stories/${storyId}/scenes/reorder`, { method: "PUT", body: JSON.stringify({ orderedIds }) }, token);
}

// Admin
export async function getAdminUsers(token: string) {
  return request<AdminUser[]>("/api/admin/users", {}, token);
}

export async function updateUserRole(token: string, userId: string, role: string) {
  return request<void>(`/api/admin/users/${userId}/role`, { method: "PUT", body: JSON.stringify({ role }) }, token);
}

export type Story = {
  id: number;
  title: string;
  sceneCount: number;
  createdAt: string;
  updatedAt: string;
};

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

export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: string | null;
  sceneCount: number;
  createdAt: string;
};
