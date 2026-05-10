"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { getEntity, getEntityTypes, type EntityDetail, type EntityTypeField } from "@/lib/api";

interface Props {
  entityId: number | null;
  onClose: () => void;
  onQuickEdit?: (id: number) => void;
}

export function EntityViewModal({ entityId, onClose, onQuickEdit }: Props) {
  const { getToken } = useAuth();
  const [entity, setEntity] = useState<EntityDetail | null>(null);
  const [fields, setFields] = useState<EntityTypeField[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!entityId) { setEntity(null); setFields([]); return; }
    setLoading(true);
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const [entityData, types] = await Promise.all([getEntity(token, entityId), getEntityTypes(token)]);
        const type = types.find(t => t.id === entityData.entityTypeId);
        setEntity(entityData);
        setFields(type?.fields.sort((a, b) => a.displayOrder - b.displayOrder) ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [entityId, getToken]);

  if (!entityId) return null;

  const color = entity?.entityTypeColor ?? "var(--accent)";

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", width: "min(600px, 95vw)", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {entity && (
            <span style={{ fontSize: "11px", color, fontFamily: "monospace", flexShrink: 0 }}>
              {entity.entityTypeIcon} {entity.entityTypeName?.toUpperCase()}
            </span>
          )}
          <span style={{ flex: 1, fontSize: "13px", color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {entity?.name ?? "—"}
          </span>
          {onQuickEdit && (
            <button
              onClick={() => { onClose(); onQuickEdit(entityId); }}
              style={{ background: "none", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace", padding: "3px 8px", borderRadius: "4px", flexShrink: 0 }}
              onMouseEnter={e => { (e.currentTarget.style.borderColor = "var(--accent)"); (e.currentTarget.style.color = "var(--accent)"); }}
              onMouseLeave={e => { (e.currentTarget.style.borderColor = "var(--border)"); (e.currentTarget.style.color = "var(--fg-muted)"); }}
            >
              quick edit
            </button>
          )}
          <Link
            href={`/entities/${entityId}`}
            style={{ color: "var(--fg-muted)", fontSize: "11px", fontFamily: "monospace", textDecoration: "none", flexShrink: 0 }}
          >
            open ↗
          </Link>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "18px", lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {loading ? (
            <p style={{ color: "var(--fg-muted)", fontSize: "13px", fontFamily: "monospace" }}>Loading...</p>
          ) : entity ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {fields.filter(f => !f.isGmOnly).map(field => {
                if (field.valueType === "ref") {
                  const refs = entity.fieldRefValues.filter(v => v.fieldId === field.id);
                  if (refs.length === 0) return null;
                  return (
                    <div key={field.id}>
                      <div style={{ fontSize: "11px", color: "var(--fg-muted)", fontFamily: "monospace", letterSpacing: "0.06em", marginBottom: "6px" }}>{field.label.toUpperCase()}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {refs.map(r => (
                          <span key={r.refEntityId} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "4px", padding: "2px 10px", fontSize: "12px", color: "var(--fg)", fontFamily: "Georgia, serif" }}>
                            {r.refEntityName}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (field.valueType === "bool") {
                  const val = entity.fieldValues.find(v => v.fieldId === field.id);
                  if (val?.boolValue === undefined || val?.boolValue === null) return null;
                  return (
                    <div key={field.id}>
                      <div style={{ fontSize: "11px", color: "var(--fg-muted)", fontFamily: "monospace", letterSpacing: "0.06em", marginBottom: "4px" }}>{field.label.toUpperCase()}</div>
                      <div style={{ fontSize: "13px", color: "var(--fg)" }}>{val.boolValue ? "Yes" : "No"}</div>
                    </div>
                  );
                }

                const val = entity.fieldValues.find(v => v.fieldId === field.id);
                const text = field.valueType === "number"
                  ? (val?.numberValue !== undefined ? String(val.numberValue) : "")
                  : (val?.textValue ?? "");
                if (!text) return null;
                return (
                  <div key={field.id}>
                    <div style={{ fontSize: "11px", color: "var(--fg-muted)", fontFamily: "monospace", letterSpacing: "0.06em", marginBottom: "4px" }}>{field.label.toUpperCase()}</div>
                    <div style={{ fontSize: "13px", color: "var(--fg)", lineHeight: "1.7", whiteSpace: "pre-wrap", fontFamily: "Georgia, serif" }}>{text}</div>
                  </div>
                );
              })}
              {fields.filter(f => !f.isGmOnly && hasValue(f, entity)).length === 0 && (
                <p style={{ color: "var(--fg-muted)", fontSize: "13px", fontStyle: "italic" }}>No fields filled in yet.</p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function hasValue(field: EntityTypeField, entity: EntityDetail): boolean {
  if (field.valueType === "ref") return entity.fieldRefValues.some(v => v.fieldId === field.id);
  if (field.valueType === "bool") return entity.fieldValues.some(v => v.fieldId === field.id && v.boolValue !== undefined);
  const val = entity.fieldValues.find(v => v.fieldId === field.id);
  return field.valueType === "number" ? val?.numberValue !== undefined : !!(val?.textValue);
}
