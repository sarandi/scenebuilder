"use client";

import { useState, useRef } from "react";
import type { EditorEntity, SceneSummary, Universe } from "@/lib/api";
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
};

export function Manifest({
  entities, scenes, currentSceneId,
  onSceneSelect, onSceneCreate, onSceneDelete, onSceneRename, onScenesReorder,
  storyUniverseIds, universes, onSceneUniverseChange, onEntityEdit, onEntityView, onEntityUnlink, onEntityHighlight, entityCounts,
}: Props) {
  const [entitiesOpen, setEntitiesOpen] = useState(true);
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
          <div style={{ padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--fg-muted)", fontFamily: "monospace" }}>SCENES</span>
            <button onClick={onSceneCreate} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "18px", lineHeight: 1 }} title="New scene">+</button>
          </div>

          {scenes.length === 0 && (
            <p style={{ padding: "16px", color: "var(--fg-muted)", fontSize: "13px", fontStyle: "italic" }}>No scenes yet. Click + to create one.</p>
          )}

          {scenes.map((scene, index) => {
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
                    <button onClick={() => handleRenameStart(scene)} style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "12px", padding: "2px" }} title="Rename">✎</button>
                    <button onClick={() => onSceneDelete(scene.id)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "12px", padding: "2px" }} title="Delete">✕</button>
                  </div>
                </div>

                {sceneUniversePool.length > 0 && (
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
