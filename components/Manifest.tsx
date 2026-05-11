"use client";

import { useState, useRef } from "react";
import type { EditorEntity, SceneSummary, Universe, SceneNote } from "@/lib/api";
import { EntityActionButtons } from "@/components/EntityActionButtons";

type Props = {
  entities: EditorEntity[];
  scenes: SceneSummary[];
  currentSceneId: number | null;
  onSceneSelect: (scene: SceneSummary) => void;
  onSceneCreate: () => void;
  onSceneDelete: (id: number) => void;
  onSceneRename: (id: number, title: string) => void;
  onScenesReorder: (orderedIds: number[]) => void;
  storyUniverseIds: number[];
  universes: Universe[];
  onSceneUniverseChange: (id: number, uids: number[]) => void;
  onEntityEdit: (id: number) => void;
  onEntityView?: (id: number) => void;
  onEntityUnlink?: (entityId: string) => void;
  onEntityHighlight?: (entityId: string | null) => void;
  entityCounts?: Record<string, number>;
  lockedScenes?: Set<number>;
  onToggleLock?: (id: number) => void;
  notes?: SceneNote[];
  onNoteCreate?: (title: string, content: string) => void;
  onNoteUpdate?: (id: number, title: string, content: string) => void;
  onNoteDelete?: (id: number) => void;
};

export function Manifest({
  entities, scenes, currentSceneId,
  onSceneSelect, onSceneCreate, onSceneDelete, onSceneRename, onScenesReorder,
  storyUniverseIds, universes, onSceneUniverseChange, onEntityEdit, onEntityView, onEntityUnlink, onEntityHighlight, entityCounts,
  lockedScenes, onToggleLock,
  notes, onNoteCreate, onNoteUpdate, onNoteDelete,
}: Props) {
  const [scenesOpen, setScenesOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(true);
  const [entitiesOpen, setEntitiesOpen] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState<number | "new" | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  const handleRenameStart = (scene: SceneSummary) => {
    setRenamingId(scene.id);
    setRenameValue(scene.title);
  };

  const handleRenameCommit = (id: number) => {
    if (renameValue.trim()) onSceneRename(id, renameValue.trim());
    setRenamingId(null);
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null) return;
    if (dragItem.current === dragOver.current) return;
    const reordered = [...scenes];
    const dragged = reordered.splice(dragItem.current, 1)[0];
    reordered.splice(dragOver.current, 0, dragged);
    onScenesReorder(reordered.map(s => s.id));
    dragItem.current = null;
    dragOver.current = null;
  };

  const grouped = entities.reduce<Record<string, EditorEntity[]>>((acc, e) => {
    if (!acc[e.typeName]) acc[e.typeName] = [];
    acc[e.typeName].push(e);
    return acc;
  }, {});

  return (
    <>
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>

        {/* Scenes */}
        <div style={{ flexShrink: 0 }}>
          <button onClick={() => setScenesOpen(o => !o)} style={{ width: "100%", padding: "8px 16px", background: "none", border: "none", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
            <span style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--fg-muted)", fontFamily: "monospace" }}>SCENES</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span onClick={e => { e.stopPropagation(); onSceneCreate?.(); }} style={{ color: "var(--accent)", fontSize: "18px", lineHeight: 1, cursor: "pointer" }} title="New scene">+</span>
              <span style={{ color: "var(--fg-muted)", fontSize: "12px" }}>{scenesOpen ? "▲" : "▼"}</span>
            </div>
          </button>

          {scenesOpen && scenes.length === 0 && (
            <p style={{ padding: "16px", color: "var(--fg-muted)", fontSize: "13px", fontStyle: "italic" }}>No scenes yet. Click + to create one.</p>
          )}

          {scenesOpen && scenes.map((scene, index) => {
            const sceneUniversePool = storyUniverseIds.length > 0
              ? universes.filter(u => storyUniverseIds.includes(u.id))
              : universes;
            return (
              <div
                key={scene.id}
                draggable
                onDragStart={() => { dragItem.current = index; }}
                onDragEnter={() => { dragOver.current = index; }}
                onDragEnd={handleDragEnd}
                onDragOver={e => e.preventDefault()}
                style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", cursor: "grab", background: currentSceneId === scene.id ? "var(--surface-2)" : "transparent", borderLeft: currentSceneId === scene.id ? "2px solid var(--accent)" : "2px solid transparent" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "var(--fg-muted)", fontSize: "12px", flexShrink: 0 }}>⠿</span>

                  {renamingId === scene.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={() => handleRenameCommit(scene.id)}
                      onKeyDown={e => { if (e.key === "Enter") handleRenameCommit(scene.id); if (e.key === "Escape") setRenamingId(null); }}
                      style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--accent)", color: "var(--fg)", padding: "2px 6px", fontSize: "13px", borderRadius: "3px", outline: "none", fontFamily: "Georgia, serif" }}
                    />
                  ) : (
                    <span onClick={() => onSceneSelect(scene)} style={{ flex: 1, color: "var(--fg)", fontSize: "13px", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {scene.title || "Untitled"}
                    </span>
                  )}

                  <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                    {onToggleLock && (() => {
                      const isLocked = lockedScenes?.has(scene.id) ?? false;
                      return (
                        <>
                          <button onClick={e => { e.stopPropagation(); onToggleLock(scene.id); }} style={{ background: "none", border: "none", color: isLocked ? "var(--accent)" : "var(--fg-muted)", cursor: "pointer", fontSize: "12px", padding: "2px" }} title={isLocked ? "Unlock" : "Lock"}>
                            {isLocked ? "🔒" : "🔓"}
                          </button>
                          {!isLocked && (
                            <>
                              <button onClick={() => handleRenameStart(scene)} style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "12px", padding: "2px" }} title="Rename">✎</button>
                              <button onClick={() => onSceneDelete(scene.id)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "12px", padding: "2px" }} title="Delete">✕</button>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {sceneUniversePool.length > 0 && !(lockedScenes?.has(scene.id)) && (
                  <div style={{ display: "flex", gap: "4px", marginTop: "6px", paddingLeft: "20px", flexWrap: "wrap" }}>
                    {sceneUniversePool.map(u => {
                      const active = sceneUniversePool.length === 1 || (scene.universeIds ?? []).includes(u.id);
                      return (
                        <button
                          key={u.id}
                          onClick={e => {
                            e.stopPropagation();
                            const current = scene.universeIds ?? [];
                            const next = active ? current.filter(id => id !== u.id) : [...current, u.id];
                            onSceneUniverseChange(scene.id, next);
                          }}
                          style={{ background: active ? "var(--accent-dim)" : "none", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`, color: active ? "var(--accent)" : "var(--fg-muted)", fontSize: "9px", fontFamily: "monospace", padding: "1px 6px", borderRadius: "8px", cursor: "pointer" }}
                        >
                          {u.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Notes */}
        {currentSceneId !== null && (
          <div style={{ flexShrink: 0 }}>
            <button onClick={() => setNotesOpen(o => !o)} style={{ width: "100%", padding: "8px 16px", background: "none", border: "none", borderBottom: "1px solid var(--border)", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <span style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--fg-muted)", fontFamily: "monospace" }}>NOTES</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span onClick={e => { e.stopPropagation(); setNoteTitle(""); setNoteContent(""); setEditingNoteId("new"); }} style={{ color: "var(--accent)", fontSize: "18px", lineHeight: 1, cursor: "pointer" }} title="New note">+</span>
                <span style={{ color: "var(--fg-muted)", fontSize: "12px" }}>{notesOpen ? "▲" : "▼"}</span>
              </div>
            </button>

            {notesOpen && (
              <>
                {editingNoteId === "new" && (
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <input
                      autoFocus
                      value={noteTitle}
                      onChange={e => setNoteTitle(e.target.value)}
                      placeholder="Note title..."
                      style={{ background: "var(--surface-2)", border: "1px solid var(--accent)", color: "var(--fg)", padding: "4px 8px", fontSize: "12px", fontFamily: "monospace", borderRadius: "3px", outline: "none" }}
                    />
                    <textarea
                      value={noteContent}
                      onChange={e => setNoteContent(e.target.value)}
                      placeholder="Note content..."
                      rows={4}
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", padding: "6px 8px", fontSize: "12px", fontFamily: "Georgia, serif", borderRadius: "3px", outline: "none", resize: "vertical" }}
                    />
                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                      <button onClick={() => setEditingNoteId(null)} style={{ background: "none", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace", padding: "3px 8px", borderRadius: "3px" }}>cancel</button>
                      <button onClick={() => { onNoteCreate?.(noteTitle, noteContent); setEditingNoteId(null); }} style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", color: "var(--accent)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace", padding: "3px 8px", borderRadius: "3px" }}>save</button>
                    </div>
                  </div>
                )}

                {(notes ?? []).length === 0 && editingNoteId !== "new" && (
                  <p style={{ padding: "16px", color: "var(--fg-muted)", fontSize: "12px", fontStyle: "italic" }}>No notes for this scene.</p>
                )}

                {(notes ?? []).map(note => (
                  <div key={note.id} style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                    {editingNoteId === note.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <input
                          autoFocus
                          value={noteTitle}
                          onChange={e => setNoteTitle(e.target.value)}
                          style={{ background: "var(--surface-2)", border: "1px solid var(--accent)", color: "var(--fg)", padding: "4px 8px", fontSize: "12px", fontFamily: "monospace", borderRadius: "3px", outline: "none" }}
                        />
                        <textarea
                          value={noteContent}
                          onChange={e => setNoteContent(e.target.value)}
                          rows={4}
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", padding: "6px 8px", fontSize: "12px", fontFamily: "Georgia, serif", borderRadius: "3px", outline: "none", resize: "vertical" }}
                        />
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button onClick={() => setEditingNoteId(null)} style={{ background: "none", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace", padding: "3px 8px", borderRadius: "3px" }}>cancel</button>
                          <button onClick={() => { onNoteUpdate?.(note.id, noteTitle, noteContent); setEditingNoteId(null); }} style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", color: "var(--accent)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace", padding: "3px 8px", borderRadius: "3px" }}>save</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: note.content ? "4px" : 0 }}>
                          <span style={{ flex: 1, fontSize: "12px", fontFamily: "monospace", color: "var(--fg)", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note.title || "Untitled"}</span>
                          <button onClick={() => { setNoteTitle(note.title); setNoteContent(note.content); setEditingNoteId(note.id); }} style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "12px", padding: "1px 3px" }} title="Edit">✎</button>
                          <button onClick={() => onNoteDelete?.(note.id)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "12px", padding: "1px 3px" }} title="Delete">✕</button>
                        </div>
                        {note.content && <p style={{ margin: 0, fontSize: "12px", fontFamily: "Georgia, serif", color: "var(--fg-muted)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{note.content}</p>}
                      </>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Referenced entities */}
        <div style={{ flexShrink: 0 }}>
          <button
            onClick={() => setEntitiesOpen(o => !o)}
            style={{ width: "100%", padding: "8px 16px", background: "none", border: "none", borderBottom: "1px solid var(--border)", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          >
            <span style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--fg-muted)", fontFamily: "monospace" }}>REFERENCED ENTITIES</span>
            <span style={{ color: "var(--fg-muted)", fontSize: "12px" }}>{entitiesOpen ? "▲" : "▼"}</span>
          </button>

          {entitiesOpen && (
            entities.length === 0 ? (
              <p style={{ padding: "16px", color: "var(--fg-muted)", fontSize: "13px", fontStyle: "italic" }}>No entities referenced yet.</p>
            ) : (
              Object.entries(grouped).map(([typeName, items]) => (
                <div key={typeName}>
                  <div style={{ padding: "6px 16px", fontSize: "10px", letterSpacing: "0.1em", color: "var(--fg-muted)", fontFamily: "monospace", borderBottom: "1px solid var(--border)" }}>
                    {typeName.toUpperCase()}S
                  </div>
                  {items.map(entity => {
                    const count = entityCounts?.[entity.id];
                    return (
                      <div
                        key={entity.id}
                        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderBottom: "1px solid var(--border)" }}
                        onMouseEnter={e => { (e.currentTarget.style.background = "var(--surface-2)"); onEntityHighlight?.(entity.id); }}
                        onMouseLeave={e => { (e.currentTarget.style.background = "transparent"); onEntityHighlight?.(null); }}
                      >
                        <span style={{ color: entity.typeColor ?? "var(--accent)", fontSize: "12px", flexShrink: 0 }}>{entity.typeIcon ?? "◈"}</span>
                        <span style={{ color: "var(--fg)", fontSize: "13px", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entity.name}</span>
                        {count !== undefined && count > 0 && (
                          <span style={{ color: "var(--accent)", fontSize: "10px", fontFamily: "monospace", flexShrink: 0, background: "var(--accent-dim)", borderRadius: "8px", padding: "0 5px" }}>×{count}</span>
                        )}
                        <EntityActionButtons
                          entityId={entity.id}
                          onQuickEdit={() => onEntityEdit(Number(entity.id))}
                          onQuickView={onEntityView ? () => onEntityView(Number(entity.id)) : undefined}
                          onUnlink={onEntityUnlink ? () => onEntityUnlink(entity.id) : undefined}
                        />
                      </div>
                    );
                  })}
                </div>
              ))
            )
          )}
        </div>

      </div>
    </>
  );
}
