"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { EntityEditForm, type EntityEditFormHandle, type EntityMeta } from "./EntityEditForm";

interface Props {
  entityId: number | null;
  onClose: () => void;
  onSaved?: (name: string) => void;
}

export function EntityEditModal({ entityId, onClose, onSaved }: Props) {
  const formRef = useRef<EntityEditFormHandle>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const [meta, setMeta] = useState<EntityMeta | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "unsaved">("idle");

  if (!entityId) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", width: "min(640px, 95vw)", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {meta && (
            <span style={{ fontSize: "11px", color: meta.entityTypeColor ?? "var(--accent)", fontFamily: "monospace", flexShrink: 0 }}>
              {meta.entityTypeIcon} {meta.entityTypeName?.toUpperCase()}
            </span>
          )}
          <span style={{ flex: 1, fontSize: "13px", color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name || "—"}
          </span>
          <span style={{ fontSize: "11px", fontFamily: "monospace", flexShrink: 0, color: saveStatus === "saved" ? "var(--green)" : saveStatus === "saving" ? "var(--accent)" : saveStatus === "unsaved" ? "var(--red)" : "transparent" }}>
            {saveStatus === "saving" ? "saving..." : saveStatus === "saved" ? "saved" : saveStatus === "unsaved" ? "unsaved" : "."}
          </span>
          <button
            onClick={() => formRef.current?.save()}
            style={{ background: "none", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace", padding: "3px 8px", borderRadius: "4px", flexShrink: 0 }}
          >
            save
          </button>
          <Link
            href={`/entities/${entityId}`}
            style={{ color: "var(--fg-muted)", fontSize: "11px", fontFamily: "monospace", textDecoration: "none", flexShrink: 0 }}
          >
            open ↗
          </Link>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "18px", lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          <EntityEditForm
            ref={formRef}
            entityId={entityId}
            autoFocusName
            onNameChange={n => { setName(n); onSaved?.(n); }}
            onSaveStatusChange={setSaveStatus}
            onMetaReady={setMeta}
          />
        </div>
      </div>
    </div>
  );
}
