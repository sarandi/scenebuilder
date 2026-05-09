"use client";

import { entityColors, entityIcons } from "@/lib/mockData";
import type { Entity } from "@/lib/mockData";

type Props = {
  entity: Entity;
  position: { top: number; left: number };
  onClose: () => void;
  onUnlink: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

export function EntityHoverPopup({ entity, position, onClose, onUnlink, onMouseEnter, onMouseLeave }: Props) {
  const left = Math.min(position.left, window.innerWidth - 300);
  const top = position.top + 8;

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        top,
        left,
        zIndex: 200,
        width: "280px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "12px 14px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}>
        <span style={{ color: entityColors[entity.type], fontSize: "16px", flexShrink: 0 }}>
          {entityIcons[entity.type]}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "var(--fg)", fontSize: "14px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {entity.name}
          </div>
          <div style={{ color: entityColors[entity.type], fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.08em" }}>
            {entity.type.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
        <p style={{ color: "var(--fg-muted)", fontSize: "12px", lineHeight: 1.6 }}>
          {entity.description}
        </p>
        {entity.aliases && entity.aliases.length > 0 && (
          <p style={{ color: "var(--fg-muted)", fontSize: "11px", fontFamily: "monospace", marginTop: "6px" }}>
            aka: {entity.aliases.join(", ")}
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex" }}>
        {[
          { label: "View", action: () => {}, color: "var(--fg-muted)" },
          { label: "Edit", action: () => {}, color: "var(--fg-muted)" },
          { label: "Unlink", action: onUnlink, color: "var(--red)" },
        ].map(({ label, action, color }) => (
          <button
            key={label}
            onClick={action}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              borderRight: label !== "Unlink" ? "1px solid var(--border)" : "none",
              color,
              padding: "8px",
              fontSize: "12px",
              cursor: "pointer",
              fontFamily: "monospace",
              letterSpacing: "0.06em",
              transition: "background 0.1s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}