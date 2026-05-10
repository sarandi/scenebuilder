"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { getEntityTypes, getEntities, createEntity, getEntity, updateEntity, deleteEntity, type EntityType, type EntitySummary } from "@/lib/api";
import { EntityEditModal } from "@/components/EntityEditModal";

export default function EntityTypePage() {
  const params = useParams();
  const typeName = params.name as string;
  const { getToken } = useAuth();

  const [entityType, setEntityType] = useState<EntityType | null>(() => {
    try {
      if (typeof window === "undefined") return null;
      const types: EntityType[] | null = JSON.parse(localStorage.getItem("entityTypes") ?? "null");
      return types?.find(t => t.name.toLowerCase() === typeName.toLowerCase()) ?? null;
    } catch { return null; }
  });

  const [entities, setEntities] = useState<EntitySummary[]>(() => {
    try {
      if (typeof window === "undefined") return [];
      const types: EntityType[] | null = JSON.parse(localStorage.getItem("entityTypes") ?? "null");
      const type = types?.find(t => t.name.toLowerCase() === typeName.toLowerCase());
      if (!type) return [];
      return JSON.parse(localStorage.getItem(`entities_${type.id}`) ?? "[]");
    } catch { return []; }
  });

  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [modalEntityId, setModalEntityId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      const types = await getEntityTypes(token);
      localStorage.setItem("entityTypes", JSON.stringify(types));
      const type = types.find(t => t.name.toLowerCase() === typeName.toLowerCase());
      if (!type) return;
      setEntityType(type);
      const entitiesResult = await getEntities(token, { entityTypeId: type.id });
      localStorage.setItem(`entities_${type.id}`, JSON.stringify(entitiesResult));
      setEntities(entitiesResult);
    })();
  }, [typeName, getToken]);

  const updateCache = (updated: EntitySummary[]) => {
    if (entityType) localStorage.setItem(`entities_${entityType.id}`, JSON.stringify(updated));
  };

  const handleCreate = async () => {
    if (!newName.trim() || !entityType) return;
    const token = await getToken();
    if (!token) return;
    const entity = await createEntity(token, {
      name: newName.trim(), entityTypeId: entityType.id,
      isPublic: true, isSecret: false, fieldValues: [], fieldRefValues: [],
    });
    setEntities(prev => { const next = [entity, ...prev]; updateCache(next); return next; });
    setNewName("");
  };

  const handleRename = async (id: number) => {
    if (!renameValue.trim()) return;
    const token = await getToken();
    if (!token) return;
    const full = await getEntity(token, id);
    await updateEntity(token, id, {
      name: renameValue.trim(),
      entityTypeId: full.entityTypeId,
      universeId: full.universeId,
      isPublic: full.isPublic,
      isSecret: full.isSecret,
      fieldValues: full.fieldValues.map(v => ({ fieldId: v.fieldId, textValue: v.textValue, numberValue: v.numberValue, boolValue: v.boolValue, isSecret: v.isSecret })),
      fieldRefValues: full.fieldRefValues.map(r => ({ fieldId: r.fieldId, refEntityId: r.refEntityId, displayOrder: r.displayOrder, isSecret: r.isSecret })),
    });
    setEntities(prev => { const next = prev.map(e => e.id === id ? { ...e, name: renameValue.trim() } : e); updateCache(next); return next; });
    setRenamingId(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this entity?")) return;
    const token = await getToken();
    if (!token) return;
    await deleteEntity(token, id);
    setEntities(prev => { const next = prev.filter(e => e.id !== id); updateCache(next); return next; });
  };

  const color = entityType?.color ?? "var(--accent)";

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", color: "var(--fg)", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ flexShrink: 0, background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "10px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
        <Link href="/" style={{ color: "var(--fg-muted)", textDecoration: "none", fontSize: "12px", fontFamily: "monospace", flexShrink: 0 }}>← dashboard</Link>
        <span style={{ color: "var(--border)" }}>|</span>
        <span style={{ fontSize: "11px", color, fontFamily: "monospace", flexShrink: 0 }}>
          {entityType?.icon} {typeName.toUpperCase()}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, maxWidth: "720px", width: "100%", margin: "0 auto", padding: "32px 24px" }}>
        {!entityType ? null : (
          <>
            <div style={{ display: "flex", gap: "8px", marginBottom: "32px" }}>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                placeholder={`New ${entityType.name.toLowerCase()}...`}
                style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", padding: "8px 12px", fontSize: "14px", fontFamily: "Georgia, serif", borderRadius: "4px", outline: "none" }}
              />
              <button onClick={handleCreate} style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", color: "var(--accent)", padding: "8px 14px", fontSize: "12px", fontFamily: "monospace", borderRadius: "4px", cursor: "pointer" }}>
                create
              </button>
            </div>

            {entities.map(entity => (
              <div key={entity.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                {renamingId === entity.id ? (
                  <input autoFocus value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleRename(entity.id); if (e.key === "Escape") setRenamingId(null); }}
                    onBlur={() => handleRename(entity.id)}
                    style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--accent)", color: "var(--fg)", padding: "4px 8px", fontSize: "15px", fontFamily: "Georgia, serif", borderRadius: "4px", outline: "none" }}
                  />
                ) : (
                  <button
                    onClick={() => setModalEntityId(entity.id)}
                    style={{ flex: 1, background: "none", border: "none", color: "var(--fg)", textAlign: "left", fontSize: "16px", cursor: "pointer", padding: 0, fontFamily: "Georgia, serif" }}
                  >
                    {entity.name}
                  </button>
                )}
                <button onClick={() => setModalEntityId(entity.id)} style={{ background: "none", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer", fontSize: "10px", fontFamily: "monospace", padding: "1px 4px", borderRadius: "3px" }}>QE</button>
                <Link href={`/entities/${entity.id}`} style={{ color: "var(--fg-muted)", fontSize: "10px", fontFamily: "monospace", textDecoration: "none", border: "1px solid var(--border)", padding: "1px 4px", borderRadius: "3px" }}>E</Link>
                <button onClick={() => { setRenamingId(entity.id); setRenameValue(entity.name); }} style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace" }}>rename</button>
                <button onClick={() => handleDelete(entity.id)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace" }}>delete</button>
              </div>
            ))}
          </>
        )}
      </div>

      <EntityEditModal
        entityId={modalEntityId}
        onClose={() => setModalEntityId(null)}
        onSaved={updatedName => setEntities(prev => {
          const next = prev.map(e => e.id === modalEntityId ? { ...e, name: updatedName } : e);
          updateCache(next);
          return next;
        })}
      />
    </div>
  );
}
