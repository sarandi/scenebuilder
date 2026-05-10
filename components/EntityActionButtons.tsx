"use client";

import Link from "next/link";

type Props = {
  entityId: string | number;
  onQuickEdit?: () => void;
  onQuickView?: () => void;
  onUnlink?: () => void;
};

const btnBase: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--border)",
  color: "var(--fg-muted)",
  cursor: "pointer",
  fontSize: "10px",
  fontFamily: "monospace",
  flexShrink: 0,
  padding: "1px 4px",
  borderRadius: "3px",
  lineHeight: 1,
  textDecoration: "none",
  display: "inline-block",
};

const dangerStyle: React.CSSProperties = { ...btnBase, color: "#c04040" };

function onIn(e: React.MouseEvent<HTMLElement>, danger = false) {
  e.stopPropagation();
  (e.currentTarget as HTMLElement).style.borderColor = danger ? "#e05555" : "var(--accent)";
  (e.currentTarget as HTMLElement).style.color = danger ? "#e05555" : "var(--accent)";
}

function onOut(e: React.MouseEvent<HTMLElement>, danger = false) {
  e.stopPropagation();
  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
  (e.currentTarget as HTMLElement).style.color = danger ? "#c04040" : "var(--fg-muted)";
}

export function EntityActionButtons({ entityId, onQuickEdit, onQuickView, onUnlink }: Props) {
  return (
    <>
      {onQuickEdit && (
        <button
          title="Quick Edit"
          onClick={e => { e.stopPropagation(); onQuickEdit(); }}
          style={btnBase}
          onMouseEnter={e => onIn(e)}
          onMouseLeave={e => onOut(e)}
        >QE</button>
      )}
      <Link
        title="Edit in Full Window"
        href={`/entities/${entityId}`}
        style={btnBase}
        onClick={e => e.stopPropagation()}
        onMouseEnter={e => onIn(e)}
        onMouseLeave={e => onOut(e)}
      >E</Link>
      {onQuickView && (
        <button
          title="Quick View"
          onClick={e => { e.stopPropagation(); onQuickView(); }}
          style={btnBase}
          onMouseEnter={e => onIn(e)}
          onMouseLeave={e => onOut(e)}
        >QV</button>
      )}
      {onUnlink && (
        <button
          title="Unlink from text"
          onClick={e => { e.stopPropagation(); onUnlink(); }}
          style={dangerStyle}
          onMouseEnter={e => onIn(e, true)}
          onMouseLeave={e => onOut(e, true)}
        >–</button>
      )}
    </>
  );
}
