"use client";

import type { EditorEntity } from "@/lib/api";
import { EntityActionButtons } from "@/components/EntityActionButtons";

type Props = {
  entity: EditorEntity;
  position: { top: number; left: number };
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClose: () => void;
  onQuickEdit?: () => void;
  onQuickView?: () => void;
  onUnlink?: () => void;
};

export function EntityHoverPopup({ entity, position, onMouseEnter, onMouseLeave, onQuickEdit, onQuickView, onUnlink }: Props) {
  const left = Math.min(position.left, window.innerWidth - 260);
  const top = position.top + 8;
  const color = entity.typeColor ?? "var(--accent)";

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ position: "fixed", top, left, zIndex: 200, width: "240px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", overflow: "hidden" }}
    >
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ color, fontSize: "16px", flexShrink: 0 }}>{entity.typeIcon ?? "◈"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "var(--fg)", fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entity.name}</div>
          <div style={{ color, fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.08em" }}>{entity.typeName.toUpperCase()}</div>
        </div>
      </div>
      <div style={{ padding: "8px 12px", display: "flex", gap: "6px" }}>
        <EntityActionButtons
          entityId={entity.id}
          onQuickEdit={onQuickEdit}
          onQuickView={onQuickView}
          onUnlink={onUnlink}
        />
      </div>
    </div>
  );
}
