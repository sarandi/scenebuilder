"use client";

import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import {
  getStories, createStory, updateStory, deleteStory, type Story,
  getUniverses, createUniverse, updateUniverse, deleteUniverse, type Universe,
  getEntityTypes, getEntities, createEntity, deleteEntity, type EntityType, type EntitySummary,
} from "@/lib/api";

type Tab = "social" | "worlds" | "others" | "settings";
type SidebarItem = "stories" | "universes" | number; // number = entityTypeId

export default function Dashboard() {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";

  const [tab, setTab] = useState<Tab>("worlds");
  const [sidebarItem, setSidebarItem] = useState<SidebarItem>("stories");

  // Stories
  const [stories, setStories] = useState<Story[]>([]);
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [renamingStoryId, setRenamingStoryId] = useState<number | null>(null);
  const [renameStoryTitle, setRenameStoryTitle] = useState("");

  // Universes
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [newUniverseName, setNewUniverseName] = useState("");
  const [renamingUniverseId, setRenamingUniverseId] = useState<number | null>(null);
  const [renameUniverseName, setRenameUniverseName] = useState("");

  // Entities
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [newEntityName, setNewEntityName] = useState("");
  const [loadingEntities, setLoadingEntities] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken({ skipCache: true });
      if (!token) return;
      try {
        const [s, u, et] = await Promise.all([
          getStories(token),
          getUniverses(token),
          getEntityTypes(token),
        ]);
        setStories(s);
        setUniverses(u);
        setEntityTypes(et);
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken]);

  // Load entities when switching to an entity type
  useEffect(() => {
    if (typeof sidebarItem !== "number") return;
    (async () => {
      setLoadingEntities(true);
      const token = await getToken();
      if (!token) return;
      try {
        setEntities(await getEntities(token, { entityTypeId: sidebarItem }));
      } finally {
        setLoadingEntities(false);
      }
    })();
  }, [sidebarItem, getToken]);

  // Stories handlers
  const handleCreateStory = async () => {
    if (!newStoryTitle.trim()) return;
    const token = await getToken();
    if (!token) return;
    const story = await createStory(token, newStoryTitle.trim());
    setStories(prev => [story, ...prev]);
    setNewStoryTitle("");
  };

  const handleRenameStory = async (id: number) => {
    if (!renameStoryTitle.trim()) return;
    const token = await getToken();
    if (!token) return;
    await updateStory(token, id, renameStoryTitle.trim());
    setStories(prev => prev.map(s => s.id === id ? { ...s, title: renameStoryTitle.trim() } : s));
    setRenamingStoryId(null);
  };

  const handleDeleteStory = async (id: number) => {
    if (!confirm("Delete this story and all its scenes?")) return;
    const token = await getToken();
    if (!token) return;
    await deleteStory(token, id);
    setStories(prev => prev.filter(s => s.id !== id));
  };

  // Universe handlers
  const handleCreateUniverse = async () => {
    if (!newUniverseName.trim()) return;
    const token = await getToken();
    if (!token) return;
    const universe = await createUniverse(token, newUniverseName.trim());
    setUniverses(prev => [universe, ...prev]);
    setNewUniverseName("");
  };

  const handleRenameUniverse = async (id: number) => {
    if (!renameUniverseName.trim()) return;
    const token = await getToken();
    if (!token) return;
    await updateUniverse(token, id, renameUniverseName.trim());
    setUniverses(prev => prev.map(u => u.id === id ? { ...u, name: renameUniverseName.trim() } : u));
    setRenamingUniverseId(null);
  };

  const handleDeleteUniverse = async (id: number) => {
    if (!confirm("Delete this universe?")) return;
    const token = await getToken();
    if (!token) return;
    await deleteUniverse(token, id);
    setUniverses(prev => prev.filter(u => u.id !== id));
  };

  // Entity handlers
  const handleCreateEntity = async () => {
    if (!newEntityName.trim() || typeof sidebarItem !== "number") return;
    const token = await getToken();
    if (!token) return;
    const entity = await createEntity(token, {
      name: newEntityName.trim(),
      entityTypeId: sidebarItem,
      isPublic: true,
      isSecret: false,
      fieldValues: [],
      fieldRefValues: [],
    });
    setEntities(prev => [entity, ...prev]);
    setNewEntityName("");
  };

  const handleDeleteEntity = async (id: number) => {
    if (!confirm("Delete this entity?")) return;
    const token = await getToken();
    if (!token) return;
    await deleteEntity(token, id);
    setEntities(prev => prev.filter(e => e.id !== id));
  };

  const activeEntityType = typeof sidebarItem === "number"
    ? entityTypes.find(t => t.id === sidebarItem)
    : null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "social", label: "Social" },
    { key: "worlds", label: "My Worlds" },
    { key: "others", label: "Others'" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", color: "var(--fg)", display: "flex", flexDirection: "column" }}>

      {/* Top bar */}
      <div style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
            <span style={{ fontSize: "12px", letterSpacing: "0.12em", color: "var(--fg-muted)", fontFamily: "monospace", padding: "16px 0" }}>
              SCENE BUILDER
            </span>
            <div style={{ display: "flex" }}>
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: "16px 16px", fontSize: "13px", fontFamily: "monospace",
                    color: tab === t.key ? "var(--accent)" : "var(--fg-muted)",
                    borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
                    letterSpacing: "0.06em",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            {isAdmin && (
              <a href="/admin" style={{ fontSize: "12px", color: "var(--fg-muted)", fontFamily: "monospace", textDecoration: "none" }}>admin</a>
            )}
            <button
              onClick={() => signOut(() => window.location.href = "/sign-in")}
              style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "12px", fontFamily: "monospace" }}
            >
              signout
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, maxWidth: "1200px", margin: "0 auto", width: "100%", padding: "0 24px", display: "flex" }}>

        {/* Social */}
        {tab === "social" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "var(--fg-muted)", fontSize: "13px", fontFamily: "monospace", fontStyle: "italic" }}>Social — coming soon</p>
          </div>
        )}

        {/* Others' */}
        {tab === "others" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "var(--fg-muted)", fontSize: "13px", fontFamily: "monospace", fontStyle: "italic" }}>Others' worlds — coming soon</p>
          </div>
        )}

        {/* Settings */}
        {tab === "settings" && (
          <div style={{ flex: 1, padding: "48px 0" }}>
            <p style={{ color: "var(--fg-muted)", fontSize: "13px", fontFamily: "monospace" }}>account / settings — coming soon</p>
          </div>
        )}

        {/* My Worlds */}
        {tab === "worlds" && (
          <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

            {/* Sidebar */}
            <div style={{ width: "180px", borderRight: "1px solid var(--border)", padding: "24px 0", flexShrink: 0 }}>
              {(["stories", "universes"] as const).map(item => (
                <button
                  key={item}
                  onClick={() => setSidebarItem(item)}
                  style={{
                    width: "100%", textAlign: "left", background: "none", border: "none",
                    padding: "8px 16px", cursor: "pointer", fontSize: "12px",
                    fontFamily: "monospace", letterSpacing: "0.08em",
                    color: sidebarItem === item ? "var(--accent)" : "var(--fg-muted)",
                    background: sidebarItem === item ? "var(--surface-2)" : "none",
                    borderLeft: sidebarItem === item ? "2px solid var(--accent)" : "2px solid transparent",
                  }}
                >
                  {item.toUpperCase()}
                </button>
              ))}

              {entityTypes.length > 0 && (
                <>
                  <div style={{ padding: "16px 16px 6px", fontSize: "10px", letterSpacing: "0.1em", color: "var(--fg-muted)", fontFamily: "monospace", opacity: 0.5 }}>
                    ENTITIES
                  </div>
                  {entityTypes.map(et => (
                    <button
                      key={et.id}
                      onClick={() => setSidebarItem(et.id)}
                      style={{
                        width: "100%", textAlign: "left", background: "none", border: "none",
                        padding: "8px 16px", cursor: "pointer", fontSize: "12px",
                        fontFamily: "monospace", letterSpacing: "0.08em",
                        color: sidebarItem === et.id ? "var(--accent)" : "var(--fg-muted)",
                        background: sidebarItem === et.id ? "var(--surface-2)" : "none",
                        borderLeft: sidebarItem === et.id ? "2px solid var(--accent)" : "2px solid transparent",
                        display: "flex", alignItems: "center", gap: "8px",
                      }}
                    >
                      <span style={{ color: et.color ?? "var(--fg-muted)" }}>{et.icon}</span>
                      {et.name.toUpperCase()}
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: "32px 32px" }}>

              {loading ? (
                <p style={{ color: "var(--fg-muted)", fontSize: "13px", fontFamily: "monospace" }}>loading...</p>
              ) : (
                <>
                  {/* Stories */}
                  {sidebarItem === "stories" && (
                    <>
                      <div style={{ display: "flex", gap: "8px", marginBottom: "32px" }}>
                        <input
                          value={newStoryTitle}
                          onChange={e => setNewStoryTitle(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleCreateStory()}
                          placeholder="New story title..."
                          style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", padding: "8px 12px", fontSize: "14px", fontFamily: "Georgia, serif", borderRadius: "4px", outline: "none" }}
                        />
                        <button onClick={handleCreateStory} style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", color: "var(--accent)", padding: "8px 14px", fontSize: "12px", fontFamily: "monospace", borderRadius: "4px", cursor: "pointer" }}>
                          create
                        </button>
                      </div>
                      {stories.length === 0 ? (
                        <p style={{ color: "var(--fg-muted)", fontSize: "14px", fontStyle: "italic" }}>No stories yet.</p>
                      ) : stories.map(story => (
                        <div key={story.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                          {renamingStoryId === story.id ? (
                            <input autoFocus value={renameStoryTitle} onChange={e => setRenameStoryTitle(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") handleRenameStory(story.id); if (e.key === "Escape") setRenamingStoryId(null); }}
                              onBlur={() => handleRenameStory(story.id)}
                              style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--accent)", color: "var(--fg)", padding: "4px 8px", fontSize: "15px", fontFamily: "Georgia, serif", borderRadius: "4px", outline: "none" }} />
                          ) : (
                            <a href={`/stories/${story.id}`} style={{ flex: 1, color: "var(--fg)", textDecoration: "none", fontSize: "16px" }}>{story.title}</a>
                          )}
                          <span style={{ fontSize: "11px", color: "var(--fg-muted)", fontFamily: "monospace" }}>{story.sceneCount}sc</span>
                          <button onClick={() => { setRenamingStoryId(story.id); setRenameStoryTitle(story.title); }} style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace" }}>rename</button>
                          <button onClick={() => handleDeleteStory(story.id)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace" }}>delete</button>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Universes */}
                  {sidebarItem === "universes" && (
                    <>
                      <div style={{ display: "flex", gap: "8px", marginBottom: "32px" }}>
                        <input
                          value={newUniverseName}
                          onChange={e => setNewUniverseName(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleCreateUniverse()}
                          placeholder="New universe name..."
                          style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", padding: "8px 12px", fontSize: "14px", fontFamily: "Georgia, serif", borderRadius: "4px", outline: "none" }}
                        />
                        <button onClick={handleCreateUniverse} style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", color: "var(--accent)", padding: "8px 14px", fontSize: "12px", fontFamily: "monospace", borderRadius: "4px", cursor: "pointer" }}>
                          create
                        </button>
                      </div>
                      {universes.length === 0 ? (
                        <p style={{ color: "var(--fg-muted)", fontSize: "14px", fontStyle: "italic" }}>No universes yet.</p>
                      ) : universes.map(u => (
                        <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                          {renamingUniverseId === u.id ? (
                            <input autoFocus value={renameUniverseName} onChange={e => setRenameUniverseName(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") handleRenameUniverse(u.id); if (e.key === "Escape") setRenamingUniverseId(null); }}
                              onBlur={() => handleRenameUniverse(u.id)}
                              style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--accent)", color: "var(--fg)", padding: "4px 8px", fontSize: "15px", fontFamily: "Georgia, serif", borderRadius: "4px", outline: "none" }} />
                          ) : (
                            <span style={{ flex: 1, color: "var(--fg)", fontSize: "16px" }}>{u.name}</span>
                          )}
                          <button onClick={() => { setRenamingUniverseId(u.id); setRenameUniverseName(u.name); }} style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace" }}>rename</button>
                          <button onClick={() => handleDeleteUniverse(u.id)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace" }}>delete</button>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Entity list */}
                  {typeof sidebarItem === "number" && (
                    <>
                      <div style={{ display: "flex", gap: "8px", marginBottom: "32px" }}>
                        <input
                          value={newEntityName}
                          onChange={e => setNewEntityName(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleCreateEntity()}
                          placeholder={`New ${activeEntityType?.name.toLowerCase() ?? "entity"} name...`}
                          style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", padding: "8px 12px", fontSize: "14px", fontFamily: "Georgia, serif", borderRadius: "4px", outline: "none" }}
                        />
                        <button onClick={handleCreateEntity} style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", color: "var(--accent)", padding: "8px 14px", fontSize: "12px", fontFamily: "monospace", borderRadius: "4px", cursor: "pointer" }}>
                          create
                        </button>
                      </div>
                      {loadingEntities ? (
                        <p style={{ color: "var(--fg-muted)", fontSize: "13px", fontFamily: "monospace" }}>loading...</p>
                      ) : entities.length === 0 ? (
                        <p style={{ color: "var(--fg-muted)", fontSize: "14px", fontStyle: "italic" }}>No {activeEntityType?.name.toLowerCase()}s yet.</p>
                      ) : entities.map(entity => (
                        <div key={entity.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                          <a href={`/entities/${entity.id}`} style={{ flex: 1, color: "var(--fg)", textDecoration: "none", fontSize: "16px" }}>{entity.name}</a>
                          <button onClick={() => handleDeleteEntity(entity.id)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace" }}>delete</button>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
