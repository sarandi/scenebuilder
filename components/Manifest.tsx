"use client";

import { useState, useRef } from "react";
import { entityColors, entityIcons } from "@/lib/mockData";
import type { Entity } from "@/lib/mockData";
import type { SceneSummary } from "@/lib/api";

type Props = {
  storyTitle: string;
  entities: Entity[];
  onClose: () => void;
  scenes: SceneSummary[];
  currentSceneId: number | null;
  onSceneSelect: (scene: SceneSummary) => void;
  onSceneCreate: () => void;
  onSceneDelete: (id: number) => void;
  onSceneRename: (id: number, title: string) => void;
  onScenesReorder: (orderedIds: number[]) => void;
};

export function Manifest({
  storyTitle,
  entities,
  onClose,
  scenes,
  currentSceneId,
  onSceneSelect,
  onSceneCreate,
  onSceneDelete,
  onSceneRename,
  onScenesReorder,
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

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOver.current = index;
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

  return (
    <>
      <div style={{ padding: "16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <span style={{ fontSize: "13px", color: "var(--fg)", fontFamily: "Georgia, serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{storyTitle}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>

        {/* Scenes */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--fg-muted)", fontFamily: "monospace" }}>SCENES</span>
            <button
              onClick={onSceneCreate}
              style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}
              title="New scene"
            >
              +
            </button>
          </div>

          {scenes.length === 0 && (
            <p style={{ padding: "16px", color: "var(--fg-muted)", fontSize: "13px", fontStyle: "italic" }}>
              No scenes yet. Click + to create one.
            </p>
          )}

          {scenes.map((scene, index) => (
            <div
              key={scene.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={e => e.preventDefault()}
              style={{
                padding: "10px 16px",
                borderBottom: "1px solid var(--border)",
                cursor: "grab",
                background: currentSceneId === scene.id ? "var(--surface-2)" : "transparent",
                borderLeft: currentSceneId === scene.id ? "2px solid var(--accent)" : "2px solid transparent",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ color: "var(--fg-muted)", fontSize: "12px", flexShrink: 0 }}>⠿</span>

              {renamingId === scene.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => handleRenameCommit(scene.id)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleRenameCommit(scene.id);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--accent)", color: "var(--fg)", padding: "2px 6px", fontSize: "13px", borderRadius: "3px", outline: "none", fontFamily: "Georgia, serif" }}
                />
              ) : (
                <span
                  onClick={() => onSceneSelect(scene)}
                  style={{ flex: 1, color: "var(--fg)", fontSize: "13px", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {scene.title || "Untitled"}
                </span>
              )}

              <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                <button
                  onClick={() => handleRenameStart(scene)}
                  style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "12px", padding: "2px" }}
                  title="Rename"
                >
                  ✎
                </button>
                <button
                  onClick={() => onSceneDelete(scene.id)}
                  style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "12px", padding: "2px" }}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Entity references — collapsible */}
        <div style={{ flexShrink: 0 }}>
          <button
            onClick={() => setEntitiesOpen(o => !o)}
            style={{ width: "100%", padding: "8px 16px", background: "none", border: "none", borderBottom: "1px solid var(--border)", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          >
            <span style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--fg-muted)", fontFamily: "monospace" }}>
              REFERENCED ENTITIES
            </span>
            <span style={{ color: "var(--fg-muted)", fontSize: "12px" }}>{entitiesOpen ? "▲" : "▼"}</span>
          </button>

          {entitiesOpen && (
            entities.length === 0 ? (
              <p style={{ padding: "16px", color: "var(--fg-muted)", fontSize: "13px", fontStyle: "italic" }}>
                No entities referenced yet.
              </p>
            ) : (
              Object.entries(
                entities.reduce<Record<string, Entity[]>>((acc, e) => {
                  if (!acc[e.type]) acc[e.type] = [];
                  acc[e.type].push(e);
                  return acc;
                }, {})
              ).map(([type, items]) => (
                <div key={type}>
                  <div style={{ padding: "6px 16px", fontSize: "10px", letterSpacing: "0.1em", color: "var(--fg-muted)", fontFamily: "monospace", borderBottom: "1px solid var(--border)" }}>
                    {type.toUpperCase()}S
                  </div>
                  {items.map(entity => (
                    <div key={entity.id} style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                        <span style={{ color: entityColors[entity.type], fontSize: "12px" }}>{entityIcons[entity.type]}</span>
                        <span style={{ color: "var(--fg)", fontSize: "13px" }}>{entity.name}</span>
                      </div>
                      <p style={{ color: "var(--fg-muted)", fontSize: "11px", lineHeight: 1.5, paddingLeft: "20px" }}>
                        {entity.description.length > 80 ? entity.description.slice(0, 80) + "..." : entity.description}
                      </p>
                    </div>
                  ))}
                </div>
              ))
            )
          )}
        </div>

      </div>
    </>
  );
}