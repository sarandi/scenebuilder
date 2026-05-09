"use client";

import { useEffect, useState } from "react";
import type { SuggestionState } from "@/extensions/EntitySuggestionExtension";
import { entityColors, entityIcons } from "@/lib/mockData";

type Props = {
  suggestion: SuggestionState;
  onSelect: (index: number) => void;
  onDismiss: () => void;
};

const PAGE_SIZE = 3;

export function SuggestionPopup({ suggestion, onSelect, onDismiss }: Props) {
  const [page, setPage] = useState(0);

  // Reset page when matches change
  useEffect(() => { setPage(0); }, [suggestion.query]);

  useEffect(() => {
    if (!suggestion.active) return;

    const handleKey = (e: KeyboardEvent) => {
      const visible = suggestion.matches.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

      if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      } else if (e.key === "Tab" || e.key === "1") {
        e.preventDefault();
        if (visible[0]) onSelect(page * PAGE_SIZE);
      } else if (e.key === "2") {
        e.preventDefault();
        if (visible[1]) onSelect(page * PAGE_SIZE + 1);
      } else if (e.key === "3") {
        e.preventDefault();
        if (visible[2]) onSelect(page * PAGE_SIZE + 2);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if ((page + 1) * PAGE_SIZE < suggestion.matches.length) setPage(p => p + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (page > 0) setPage(p => p - 1);
      }
    };

    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [suggestion, page, onSelect, onDismiss]);

  if (!suggestion.active || !suggestion.coords) return null;

  const visible = suggestion.matches.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const hasMore = (page + 1) * PAGE_SIZE < suggestion.matches.length;
  const hasPrev = page > 0;

  return (
    <div
      style={{
        position: "fixed",
        top: suggestion.coords.top,
        left: suggestion.coords.left,
        zIndex: 100,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        minWidth: "260px",
        maxWidth: "320px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "6px 12px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "10px", fontFamily: "monospace", color: "var(--fg-muted)", letterSpacing: "0.1em" }}>
          ENTITY MATCH
        </span>
        <span style={{ fontSize: "10px", fontFamily: "monospace", color: "var(--fg-muted)" }}>
          ESC to dismiss
        </span>
      </div>

      {/* Matches */}
      {visible.map((entity, i) => (
        <div
          key={entity.id}
          onClick={() => onSelect(page * PAGE_SIZE + i)}
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "10px 12px",
            borderBottom: "1px solid var(--border)",
            cursor: "pointer",
            transition: "background 0.1s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          {/* Number */}
          <span style={{
            width: "18px", height: "18px",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "3px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "11px", fontFamily: "monospace", color: "var(--fg-muted)",
            flexShrink: 0,
          }}>
            {i + 1}
          </span>

          {/* Icon */}
          <span style={{ color: entityColors[entity.type], fontSize: "13px", flexShrink: 0 }}>
            {entityIcons[entity.type]}
          </span>

          {/* Name + type */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "var(--fg)", fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {entity.name}
            </div>
            <div style={{ color: "var(--fg-muted)", fontSize: "11px", fontFamily: "monospace" }}>
              {entity.type}
            </div>
          </div>
        </div>
      ))}

      {/* Pagination */}
      {(hasMore || hasPrev) && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px" }}>
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={!hasPrev}
            style={{
              background: "none", border: "none",
              color: hasPrev ? "var(--fg-muted)" : "var(--border)",
              cursor: hasPrev ? "pointer" : "default",
              fontSize: "12px", fontFamily: "monospace",
            }}
          >
            ↑ prev
          </button>
          <span style={{ fontSize: "10px", color: "var(--fg-muted)", fontFamily: "monospace", alignSelf: "center" }}>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, suggestion.matches.length)} of {suggestion.matches.length}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!hasMore}
            style={{
              background: "none", border: "none",
              color: hasMore ? "var(--fg-muted)" : "var(--border)",
              cursor: hasMore ? "pointer" : "default",
              fontSize: "12px", fontFamily: "monospace",
            }}
          >
            ↓ more
          </button>
        </div>
      )}
    </div>
  );
}