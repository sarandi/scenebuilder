"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getStories, createStory, updateStory, deleteStory, type Story,
  getUniverses, createUniverse, updateUniverse, deleteUniverse, type Universe,
  getEntityTypes, getEntities, type EntityType,
  getStoryNotes, createStoryNote, updateStoryNote, deleteStoryNote, type StoryNote,
} from "@/lib/api";

type Tab = "social" | "worlds" | "others" | "settings";
type SidebarItem = "stories" | "universes";

export default function Dashboard() {
  const { getToken } = useAuth();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") ?? "worlds") as Tab;

  const [sidebarItem, setSidebarItem] = useState<SidebarItem>("stories");

  const [stories, setStories] = useState<Story[]>([]);
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [renamingStoryId, setRenamingStoryId] = useState<number | null>(null);
  const [renameStoryTitle, setRenameStoryTitle] = useState("");
  const [openPoolStoryId, setOpenPoolStoryId] = useState<number | null>(null);

  const [universes, setUniverses] = useState<Universe[]>([]);
  const [newUniverseName, setNewUniverseName] = useState("");
  const [renamingUniverseId, setRenamingUniverseId] = useState<number | null>(null);
  const [renameUniverseName, setRenameUniverseName] = useState("");

  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedNoteStoryId, setExpandedNoteStoryId] = useState<number | null>(null);
  const [storyNotes, setStoryNotes] = useState<Record<number, StoryNote[]>>({});
  const [loadingNotes, setLoadingNotes] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | "new" | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  useEffect(() => {
    (async () => {
      const token = await getToken();
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
        localStorage.setItem("entityTypes", JSON.stringify(et));
        et.forEach(async (type) => {
          try {
            const entities = await getEntities(token, { entityTypeId: type.id });
            localStorage.setItem(`entities_${type.id}`, JSON.stringify(entities));
          } catch {}
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken]);

  const handleCreateStory = async () => {
    if (!newStoryTitle.trim()) return;
    const token = await getToken();
    if (!token) return;
    const story = await createStory(token, newStoryTitle.trim());
    setStories(prev => [story, ...prev]);
    setNewStoryTitle("");
  };

  const handleStoryUniverseToggle = async (storyId: number, currentIds: number[], uid: number) => {
    const next = currentIds.includes(uid) ? currentIds.filter(id => id !== uid) : [...currentIds, uid];
    setStories(prev => prev.map(s => s.id === storyId ? {
      ...s, universeIds: next, universeNames: universes.filter(u => next.includes(u.id)).map(u => u.name),
    } : s));
    const token = await getToken();
    if (!token) return;
    const story = stories.find(s => s.id === storyId);
    await updateStory(token, storyId, story?.title ?? "", next);
  };

  const handleRenameStory = async (id: number) => {
    if (!renameStoryTitle.trim()) return;
    const token = await getToken();
    if (!token) return;
    const existing = stories.find(s => s.id === id);
    await updateStory(token, id, renameStoryTitle.trim(), existing?.universeIds ?? []);
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

  const handleToggleStoryNotes = async (storyId: number) => {
    if (expandedNoteStoryId === storyId) {
      setExpandedNoteStoryId(null);
      setEditingNoteId(null);
      return;
    }
    setExpandedNoteStoryId(storyId);
    setEditingNoteId(null);
    if (!storyNotes[storyId]) {
      setLoadingNotes(storyId);
      const token = await getToken();
      if (token) {
        try {
          const notes = await getStoryNotes(token, storyId);
          setStoryNotes(prev => ({ ...prev, [storyId]: notes }));
        } finally {
          setLoadingNotes(null);
        }
      } else {
        setLoadingNotes(null);
      }
    }
  };

  const handleNoteCreate = async (storyId: number) => {
    const token = await getToken();
    if (!token) return;
    const note = await createStoryNote(token, storyId, noteTitle, noteContent);
    setStoryNotes(prev => ({ ...prev, [storyId]: [...(prev[storyId] ?? []), note] }));
    setEditingNoteId(null);
    setNoteTitle("");
    setNoteContent("");
  };

  const handleNoteUpdate = async (storyId: number, noteId: number) => {
    const token = await getToken();
    if (!token) return;
    const note = await updateStoryNote(token, storyId, noteId, noteTitle, noteContent);
    setStoryNotes(prev => ({ ...prev, [storyId]: (prev[storyId] ?? []).map(n => n.id === noteId ? note : n) }));
    setEditingNoteId(null);
    setNoteTitle("");
    setNoteContent("");
  };

  const handleNoteDelete = async (storyId: number, noteId: number) => {
    if (!confirm("Delete this note?")) return;
    const token = await getToken();
    if (!token) return;
    await deleteStoryNote(token, storyId, noteId);
    setStoryNotes(prev => ({ ...prev, [storyId]: (prev[storyId] ?? []).filter(n => n.id !== noteId) }));
    if (editingNoteId === noteId) { setEditingNoteId(null); setNoteTitle(""); setNoteContent(""); }
  };

  return (
    <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>

      {/* Body */}
      <div style={{ flex: 1, maxWidth: "1200px", margin: "0 auto", width: "100%", padding: "0 24px", display: "flex" }}>

        {tab === "social" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "var(--fg-muted)", fontSize: "13px", fontFamily: "monospace", fontStyle: "italic" }}>Social — coming soon</p>
          </div>
        )}

        {tab === "others" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "var(--fg-muted)", fontSize: "13px", fontFamily: "monospace", fontStyle: "italic" }}>Others' worlds — coming soon</p>
          </div>
        )}

        {tab === "settings" && (
          <div style={{ flex: 1, padding: "48px 0" }}>
            <p style={{ color: "var(--fg-muted)", fontSize: "13px", fontFamily: "monospace" }}>account / settings — coming soon</p>
          </div>
        )}

        {tab === "worlds" && (
          <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

            {/* Sidebar */}
            <div style={{ width: "180px", borderRight: "1px solid var(--border)", padding: "24px 0", flexShrink: 0 }}>
              {(["stories", "universes"] as const).map(item => (
                <button
                  key={item}
                  onClick={() => setSidebarItem(item)}
                  style={{
                    width: "100%", textAlign: "left", border: "none",
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
                    <a
                      key={et.id}
                      href={`/entities/type/${et.name.toLowerCase()}`}
                      style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        width: "100%", padding: "8px 16px", fontSize: "12px",
                        fontFamily: "monospace", letterSpacing: "0.08em",
                        color: "var(--fg-muted)", textDecoration: "none",
                        borderLeft: "2px solid transparent",
                        boxSizing: "border-box",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.color = "var(--fg)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--fg-muted)"; }}
                    >
                      <span style={{ color: et.color ?? "var(--fg-muted)" }}>{et.icon}</span>
                      {et.name.toUpperCase()}
                    </a>
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
                        <button
                          onClick={handleCreateStory}
                          disabled={!newStoryTitle.trim()}
                          style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", color: "var(--accent)", padding: "8px 14px", fontSize: "12px", fontFamily: "monospace", borderRadius: "4px", cursor: "pointer", opacity: !newStoryTitle.trim() ? 0.4 : 1 }}>
                          create
                        </button>
                      </div>
                      {stories.length === 0 ? (
                        <p style={{ color: "var(--fg-muted)", fontSize: "14px", fontStyle: "italic" }}>No stories yet.</p>
                      ) : stories.map(story => (
                        <div key={story.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          {/* Story row */}
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0" }}>
                            {renamingStoryId === story.id ? (
                              <input autoFocus value={renameStoryTitle} onChange={e => setRenameStoryTitle(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") handleRenameStory(story.id); if (e.key === "Escape") setRenamingStoryId(null); }}
                                onBlur={() => handleRenameStory(story.id)}
                                style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--accent)", color: "var(--fg)", padding: "4px 8px", fontSize: "15px", fontFamily: "Georgia, serif", borderRadius: "4px", outline: "none" }} />
                            ) : (
                              <Link href={`/stories/${story.id}`} style={{ flex: 1, color: "var(--fg)", textDecoration: "none", fontSize: "16px" }}>{story.title}</Link>
                            )}
                            <div
                              style={{ position: "relative", flexShrink: 0 }}
                              onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenPoolStoryId(null); }}
                              tabIndex={-1}
                            >
                              <button
                                onClick={() => setOpenPoolStoryId(openPoolStoryId === story.id ? null : story.id)}
                                style={{ background: "none", border: "1px solid var(--border)", color: story.universeIds.length > 0 ? "var(--fg)" : "var(--fg-muted)", fontSize: "11px", fontFamily: "monospace", padding: "3px 8px", borderRadius: "4px", cursor: "pointer" }}
                              >
                                {story.universeIds.length === 0
                                  ? "universe pool ▾"
                                  : story.universeIds.length === 1
                                    ? `${story.universeNames[0]} ▾`
                                    : `${story.universeIds.length} universes ▾`}
                              </button>
                              {openPoolStoryId === story.id && (
                                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", zIndex: 50, minWidth: "160px", padding: "4px 0", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                                  {universes.length === 0
                                    ? <span style={{ display: "block", padding: "6px 12px", color: "var(--fg-muted)", fontSize: "12px", fontFamily: "monospace" }}>no universes yet</span>
                                    : universes.map(u => {
                                      const active = story.universeIds.includes(u.id);
                                      return (
                                        <label
                                          key={u.id}
                                          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontFamily: "monospace", color: "var(--fg)" }}
                                          onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={active}
                                            onChange={() => handleStoryUniverseToggle(story.id, story.universeIds, u.id)}
                                            style={{ accentColor: "var(--accent)" }}
                                          />
                                          {u.name}
                                        </label>
                                      );
                                    })}
                                </div>
                              )}
                            </div>
                            <span style={{ fontSize: "11px", color: "var(--fg-muted)", fontFamily: "monospace" }}>{story.sceneCount}sc</span>
                            <button
                              onClick={() => handleToggleStoryNotes(story.id)}
                              style={{ background: "none", border: "none", color: expandedNoteStoryId === story.id ? "var(--accent)" : "var(--fg-muted)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace" }}
                            >
                              notes {expandedNoteStoryId === story.id ? "▲" : "▼"}
                            </button>
                            <button onClick={() => { setRenamingStoryId(story.id); setRenameStoryTitle(story.title); }} style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace" }}>rename</button>
                            <button onClick={() => handleDeleteStory(story.id)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace" }}>delete</button>
                          </div>

                          {/* Notes panel */}
                          {expandedNoteStoryId === story.id && (
                            <div style={{ paddingBottom: "16px", paddingLeft: "16px" }}>
                              {loadingNotes === story.id ? (
                                <p style={{ color: "var(--fg-muted)", fontSize: "12px", fontFamily: "monospace" }}>loading notes...</p>
                              ) : (
                                <>
                                  {(storyNotes[story.id] ?? []).map(note => (
                                    <div key={note.id} style={{ marginBottom: "10px" }}>
                                      {editingNoteId === note.id ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                          <input
                                            autoFocus
                                            value={noteTitle}
                                            onChange={e => setNoteTitle(e.target.value)}
                                            placeholder="Title..."
                                            style={{ background: "var(--surface-2)", border: "1px solid var(--accent)", color: "var(--fg)", padding: "4px 8px", fontSize: "12px", fontFamily: "monospace", borderRadius: "4px", outline: "none" }}
                                          />
                                          <textarea
                                            value={noteContent}
                                            onChange={e => setNoteContent(e.target.value)}
                                            placeholder="Content..."
                                            rows={4}
                                            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", padding: "6px 8px", fontSize: "12px", fontFamily: "monospace", borderRadius: "4px", outline: "none", resize: "vertical" }}
                                          />
                                          <div style={{ display: "flex", gap: "8px" }}>
                                            <button onClick={() => handleNoteUpdate(story.id, note.id)} style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", color: "var(--accent)", padding: "3px 10px", fontSize: "11px", fontFamily: "monospace", borderRadius: "4px", cursor: "pointer" }}>save</button>
                                            <button onClick={() => { setEditingNoteId(null); setNoteTitle(""); setNoteContent(""); }} style={{ background: "none", border: "none", color: "var(--fg-muted)", fontSize: "11px", fontFamily: "monospace", cursor: "pointer" }}>cancel</button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                                          <div style={{ flex: 1 }}>
                                            {note.title && <div style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--fg)", fontWeight: 600, marginBottom: "2px" }}>{note.title}</div>}
                                            <div style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--fg-muted)", whiteSpace: "pre-wrap" }}>{note.content}</div>
                                          </div>
                                          <button onClick={() => { setEditingNoteId(note.id); setNoteTitle(note.title); setNoteContent(note.content); }} style={{ background: "none", border: "none", color: "var(--fg-muted)", fontSize: "11px", fontFamily: "monospace", cursor: "pointer", flexShrink: 0 }}>edit</button>
                                          <button onClick={() => handleNoteDelete(story.id, note.id)} style={{ background: "none", border: "none", color: "var(--red)", fontSize: "11px", fontFamily: "monospace", cursor: "pointer", flexShrink: 0 }}>delete</button>
                                        </div>
                                      )}
                                    </div>
                                  ))}

                                  {editingNoteId === "new" ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                                      <input
                                        autoFocus
                                        value={noteTitle}
                                        onChange={e => setNoteTitle(e.target.value)}
                                        placeholder="Title..."
                                        style={{ background: "var(--surface-2)", border: "1px solid var(--accent)", color: "var(--fg)", padding: "4px 8px", fontSize: "12px", fontFamily: "monospace", borderRadius: "4px", outline: "none" }}
                                      />
                                      <textarea
                                        value={noteContent}
                                        onChange={e => setNoteContent(e.target.value)}
                                        placeholder="Content..."
                                        rows={4}
                                        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", padding: "6px 8px", fontSize: "12px", fontFamily: "monospace", borderRadius: "4px", outline: "none", resize: "vertical" }}
                                      />
                                      <div style={{ display: "flex", gap: "8px" }}>
                                        <button onClick={() => handleNoteCreate(story.id)} style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", color: "var(--accent)", padding: "3px 10px", fontSize: "11px", fontFamily: "monospace", borderRadius: "4px", cursor: "pointer" }}>save</button>
                                        <button onClick={() => { setEditingNoteId(null); setNoteTitle(""); setNoteContent(""); }} style={{ background: "none", border: "none", color: "var(--fg-muted)", fontSize: "11px", fontFamily: "monospace", cursor: "pointer" }}>cancel</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => { setEditingNoteId("new"); setNoteTitle(""); setNoteContent(""); }}
                                      style={{ background: "none", border: "1px dashed var(--border)", color: "var(--fg-muted)", fontSize: "11px", fontFamily: "monospace", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", marginTop: "4px" }}
                                    >
                                      + new note
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
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
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
