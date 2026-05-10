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

export async function createStory(token: string, title: string, universeIds: number[] = []) {
  return request<Story>("/api/stories", { method: "POST", body: JSON.stringify({ title, universeIds }) }, token);
}

export async function updateStory(token: string, id: number, title: string, universeIds: number[] = []) {
  return request<Story>(`/api/stories/${id}`, { method: "PUT", body: JSON.stringify({ title, universeIds }) }, token);
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

export async function saveScene(token: string, storyId: number, title: string, content: string, universeIds: number[] = []) {
  return request<SceneFull>(`/api/stories/${storyId}/scenes`, { method: "POST", body: JSON.stringify({ title, content, universeIds }) }, token);
}

export async function updateScene(token: string, storyId: number, id: number, title: string, content: string, universeIds: number[] = []) {
  return request<SceneFull>(`/api/stories/${storyId}/scenes/${id}`, { method: "PUT", body: JSON.stringify({ title, content, universeIds }) }, token);
}

export async function deleteScene(token: string, storyId: number, id: number) {
  return request<void>(`/api/stories/${storyId}/scenes/${id}`, { method: "DELETE" }, token);
}

export async function reorderScenes(token: string, storyId: number, orderedIds: number[]) {
  return request<void>(`/api/stories/${storyId}/scenes/reorder`, { method: "PUT", body: JSON.stringify({ orderedIds }) }, token);
}

// Universes
export async function getUniverses(token: string) {
  return request<Universe[]>("/api/universes", {}, token);
}

export async function createUniverse(token: string, name: string, description?: string) {
  return request<Universe>("/api/universes", { method: "POST", body: JSON.stringify({ name, description }) }, token);
}

export async function updateUniverse(token: string, id: number, name: string, description?: string) {
  return request<Universe>(`/api/universes/${id}`, { method: "PUT", body: JSON.stringify({ name, description }) }, token);
}

export async function deleteUniverse(token: string, id: number) {
  return request<void>(`/api/universes/${id}`, { method: "DELETE" }, token);
}

// Entity types
export async function getEntityTypes(token: string) {
  return request<EntityType[]>("/api/entity-types", {}, token);
}

// Entities
export async function getEntities(token: string, params?: { universeId?: number; entityTypeId?: number }) {
  const qs = new URLSearchParams();
  if (params?.universeId) qs.set("universeId", String(params.universeId));
  if (params?.entityTypeId) qs.set("entityTypeId", String(params.entityTypeId));
  const query = qs.toString() ? `?${qs}` : "";
  return request<EntitySummary[]>(`/api/entities${query}`, {}, token);
}

export async function createEntity(token: string, body: EntityRequest) {
  return request<EntitySummary>("/api/entities", { method: "POST", body: JSON.stringify(body) }, token);
}

export async function getEntity(token: string, id: number) {
  return request<EntityDetail>(`/api/entities/${id}`, {}, token);
}

export async function updateEntity(token: string, id: number, body: EntityRequest) {
  return request<EntitySummary>(`/api/entities/${id}`, { method: "PUT", body: JSON.stringify(body) }, token);
}

export async function deleteEntity(token: string, id: number) {
  return request<void>(`/api/entities/${id}`, { method: "DELETE" }, token);
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
  universeIds: number[];
  universeNames: string[];
  sceneCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SceneSummary = {
  id: number;
  title: string;
  displayOrder: number;
  universeIds: number[];
  createdAt: string;
  updatedAt: string;
};

export type SceneFull = SceneSummary & {
  content: string;
};

export type Universe = {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export type EntityTypeField = {
  id: number;
  key: string;
  label: string;
  valueType: string;
  refEntityTypeId?: number;
  isBuiltIn: boolean;
  isRequired: boolean;
  isGmOnly: boolean;
  displayOrder: number;
};

export type EntityType = {
  id: number;
  name: string;
  icon?: string;
  color?: string;
  isBuiltIn: boolean;
  fields: EntityTypeField[];
};

export type EntitySummary = {
  id: number;
  name: string;
  entityTypeId: number;
  entityTypeName?: string;
  entityTypeIcon?: string;
  entityTypeColor?: string;
  universeId?: number;
  isPublic: boolean;
  isSecret: boolean;
  updatedAt: string;
  aliases?: string;
};

export type EntityRequest = {
  name: string;
  entityTypeId: number;
  universeId?: number;
  isPublic: boolean;
  isSecret: boolean;
  fieldValues: { fieldId: number; textValue?: string; numberValue?: number; boolValue?: boolean; isSecret: boolean }[];
  fieldRefValues: { fieldId: number; refEntityId: number; displayOrder: number; isSecret: boolean }[];
};

export type FieldValue = {
  fieldId: number;
  key: string;
  valueType: string;
  textValue?: string;
  numberValue?: number;
  boolValue?: boolean;
  isSecret: boolean;
};

export type FieldRefValue = {
  fieldId: number;
  key: string;
  refEntityId: number;
  refEntityName: string;
  refEntityTypeId: number;
  displayOrder: number;
  isSecret: boolean;
};

export type EntityDetail = EntitySummary & {
  createdAt: string;
  fieldValues: FieldValue[];
  fieldRefValues: FieldRefValue[];
};

export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: string | null;
  sceneCount: number;
  createdAt: string;
};

export type EditorEntity = {
  id: string;
  name: string;
  typeName: string;
  typeIcon?: string;
  typeColor?: string;
  aliases?: string[];
};

export function toEditorEntity(s: EntitySummary): EditorEntity {
  let aliases: string[] | undefined;
  if (s.aliases) {
    try {
      const parsed = JSON.parse(s.aliases);
      aliases = Array.isArray(parsed) ? parsed : [s.aliases];
    } catch {
      aliases = s.aliases.split(",").map(a => a.trim()).filter(Boolean);
    }
  }
  return {
    id: String(s.id),
    name: s.name,
    typeName: s.entityTypeName ?? "Entity",
    typeIcon: s.entityTypeIcon,
    typeColor: s.entityTypeColor,
    aliases,
  };
}
