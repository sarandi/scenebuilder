"use client";

import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { getStories, createStory, updateStory, deleteStory, type Story } from "@/lib/api";

export default function StoriesPage() {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";

  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  useEffect(() => {
    (async () => {
      const token = await getToken({ skipCache: true });
      if (!token) return;
      try {
        setStories(await getStories(token));
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const token = await getToken();
    if (!token) return;
    setCreating(true);
    try {
      const story = await createStory(token, newTitle.trim());
      setStories(prev => [story, ...prev]);
      setNewTitle("");
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (id: number) => {
    if (!renameTitle.trim()) return;
    const token = await getToken();
    if (!token) return;
    await updateStory(token, id, renameTitle.trim());
    setStories(prev => prev.map(s => s.id === id ? { ...s, title: renameTitle.trim() } : s));
    setRenamingId(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this story and all its scenes?")) return;
    const token = await getToken();
    if (!token) return;
    await deleteStory(token, id);
    setStories(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", color: "var(--fg)", fontFamily: "Georgia, serif" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "48px 24px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "48px" }}>
          <span style={{ fontSize: "13px", letterSpacing: "0.12em", color: "var(--fg-muted)", fontFamily: "monospace" }}>SCENE BUILDER</span>
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

        <div style={{ display: "flex", gap: "8px", marginBottom: "40px" }}>
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            placeholder="New story title..."
            style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", padding: "10px 14px", fontSize: "15px", fontFamily: "Georgia, serif", borderRadius: "4px", outline: "none" }}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newTitle.trim()}
            style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", color: "var(--accent)", padding: "10px 16px", fontSize: "12px", fontFamily: "monospace", borderRadius: "4px", cursor: "pointer", opacity: creating ? 0.5 : 1 }}
          >
            create
          </button>
        </div>

        {loading ? (
          <p style={{ color: "var(--fg-muted)", fontSize: "13px", fontFamily: "monospace" }}>loading...</p>
        ) : stories.length === 0 ? (
          <p style={{ color: "var(--fg-muted)", fontSize: "15px", fontStyle: "italic" }}>No stories yet. Create one above.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {stories.map(story => (
              <div key={story.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
                {renamingId === story.id ? (
                  <input
                    autoFocus
                    value={renameTitle}
                    onChange={e => setRenameTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleRename(story.id); if (e.key === "Escape") setRenamingId(null); }}
                    onBlur={() => handleRename(story.id)}
                    style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--accent)", color: "var(--fg)", padding: "4px 8px", fontSize: "15px", fontFamily: "Georgia, serif", borderRadius: "4px", outline: "none" }}
                  />
                ) : (
                  <a
                    href={`/stories/${story.id}`}
                    style={{ flex: 1, color: "var(--fg)", textDecoration: "none", fontSize: "17px" }}
                  >
                    {story.title}
                  </a>
                )}
                <span style={{ fontSize: "11px", color: "var(--fg-muted)", fontFamily: "monospace", flexShrink: 0 }}>
                  {story.sceneCount} {story.sceneCount === 1 ? "scene" : "scenes"}
                </span>
                <button
                  onClick={() => { setRenamingId(story.id); setRenameTitle(story.title); }}
                  style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace" }}
                >
                  rename
                </button>
                <button
                  onClick={() => handleDelete(story.id)}
                  style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace" }}
                >
                  delete
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
