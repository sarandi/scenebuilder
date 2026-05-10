"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  getEntity, updateEntity, getEntityTypes, getEntities, createEntity,
  type EntityDetail, type EntityTypeField, type EntitySummary, type FieldRefValue,
} from "@/lib/api";

type FieldState = Record<number, string | boolean | number | undefined>;

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)",
  color: "var(--fg)", padding: "6px 10px", fontSize: "13px", fontFamily: "Georgia, serif",
  borderRadius: "4px", outline: "none", boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle, resize: "vertical", minHeight: "72px", lineHeight: "1.5",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "11px", color: "var(--fg-muted)",
  fontFamily: "monospace", letterSpacing: "0.06em", marginBottom: "4px",
};

const longKeys = new Set([
  "appearance", "mannerisms", "education", "beliefs", "skills", "goals", "fears",
  "personality", "backstory", "secrets", "notes", "wounds", "description", "lore",
  "properties", "culture", "economy", "notable_features", "hidden_features",
  "stated_goals", "public_identity", "methods", "true_goals", "true_nature",
  "outcome", "significance", "true_account", "succession", "resources", "denominations",
]);

export default function EntityPage() {
  const params = useParams();
  const id = Number(params.id);
  const { getToken } = useAuth();

  const [entity, setEntity] = useState<EntityDetail | null>(null);
  const [fields, setFields] = useState<EntityTypeField[]>([]);
  const [values, setValues] = useState<FieldState>({});
  const [refValues, setRefValues] = useState<FieldRefValue[]>([]);
  const [name, setName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "unsaved">("idle");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pickerFieldId, setPickerFieldId] = useState<number | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerOptions, setPickerOptions] = useState<EntitySummary[]>([]);
  const [pickerCreating, setPickerCreating] = useState(false);
  const pickerSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken({ skipCache: true });
      if (!token) return;
      const [ent, types] = await Promise.all([getEntity(token, id), getEntityTypes(token)]);
      const type = types.find(t => t.id === ent.entityTypeId);
      setEntity(ent);
      setName(ent.name);
      setFields(type?.fields ?? []);
      setRefValues(ent.fieldRefValues);

      const initial: FieldState = {};
      ent.fieldValues.forEach(v => {
        if (v.valueType === "boolean") initial[v.fieldId] = v.boolValue;
        else if (v.valueType === "number") initial[v.fieldId] = v.numberValue;
        else initial[v.fieldId] = v.textValue ?? "";
      });
      setValues(initial);
    })();
  }, [id, getToken]);

  const handleSave = useCallback(async (
    currentName: string,
    currentValues: FieldState,
    currentRefValues: FieldRefValue[],
  ) => {
    if (!entity) return;
    const token = await getToken();
    if (!token) return;
    setSaveStatus("saving");
    try {
      const fieldValues = fields
        .filter(f => !["entity_ref", "entity_ref_list"].includes(f.valueType))
        .map(f => ({
          fieldId: f.id,
          textValue: f.valueType === "text" || f.valueType === "text_array"
            ? (currentValues[f.id] as string ?? "")
            : undefined,
          numberValue: f.valueType === "number" ? (currentValues[f.id] as number) : undefined,
          boolValue: f.valueType === "boolean" ? (currentValues[f.id] as boolean ?? false) : undefined,
          isSecret: false,
        }));

      await updateEntity(token, entity.id, {
        name: currentName,
        entityTypeId: entity.entityTypeId,
        universeId: entity.universeId,
        isPublic: entity.isPublic,
        isSecret: entity.isSecret,
        fieldValues,
        fieldRefValues: currentRefValues.map(r => ({
          fieldId: r.fieldId,
          refEntityId: r.refEntityId,
          displayOrder: r.displayOrder,
          isSecret: r.isSecret,
        })),
      });
      setSaveStatus("saved");
    } catch {
      setSaveStatus("unsaved");
    }
  }, [entity, fields, getToken]);

  const triggerAutoSave = useCallback((
    currentName: string,
    currentValues: FieldState,
    currentRefValues: FieldRefValue[],
  ) => {
    setSaveStatus("unsaved");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => handleSave(currentName, currentValues, currentRefValues), 2000);
  }, [handleSave]);

  const setValue = (fieldId: number, value: string | boolean | number) => {
    setValues(prev => {
      const next = { ...prev, [fieldId]: value };
      triggerAutoSave(name, next, refValues);
      return next;
    });
  };

  const openPicker = async (field: EntityTypeField) => {
    setPickerFieldId(field.id);
    setPickerSearch("");
    setPickerOptions([]);
    const token = await getToken();
    if (!token) return;
    const opts = await getEntities(token, field.refEntityTypeId ? { entityTypeId: field.refEntityTypeId } : undefined);
    setPickerOptions(opts);
    setTimeout(() => pickerSearchRef.current?.focus(), 50);
  };

  const closePicker = () => {
    setPickerFieldId(null);
    setPickerSearch("");
    setPickerOptions([]);
    setPickerCreating(false);
  };

  const createAndLink = async (field: EntityTypeField) => {
    if (!entity || !pickerSearch.trim() || !field.refEntityTypeId) return;
    setPickerCreating(true);
    try {
      const token = await getToken();
      if (!token) return;
      const created = await createEntity(token, {
        name: pickerSearch.trim(),
        entityTypeId: field.refEntityTypeId,
        universeId: entity.universeId,
        isPublic: true,
        isSecret: false,
        fieldValues: [],
        fieldRefValues: [],
      });
      selectRef(field, { ...created, entityTypeName: undefined, entityTypeIcon: undefined, entityTypeColor: undefined, updatedAt: "" });
    } finally {
      setPickerCreating(false);
    }
  };

  const selectRef = (field: EntityTypeField, opt: EntitySummary) => {
    setRefValues(prev => {
      let next: FieldRefValue[];
      if (field.valueType === "entity_ref") {
        next = [
          ...prev.filter(r => r.fieldId !== field.id),
          { fieldId: field.id, key: field.key, refEntityId: opt.id, refEntityName: opt.name, refEntityTypeId: opt.entityTypeId, displayOrder: 0, isSecret: false },
        ];
      } else {
        if (prev.some(r => r.fieldId === field.id && r.refEntityId === opt.id)) return prev;
        const count = prev.filter(r => r.fieldId === field.id).length;
        next = [...prev, { fieldId: field.id, key: field.key, refEntityId: opt.id, refEntityName: opt.name, refEntityTypeId: opt.entityTypeId, displayOrder: count, isSecret: false }];
      }
      triggerAutoSave(name, values, next);
      return next;
    });
    if (field.valueType === "entity_ref") closePicker();
  };

  const removeRef = (fieldId: number, refEntityId: number) => {
    setRefValues(prev => {
      const next = prev.filter(r => !(r.fieldId === fieldId && r.refEntityId === refEntityId));
      triggerAutoSave(name, values, next);
      return next;
    });
  };

  if (!entity) return (
    <div style={{ height: "100dvh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "var(--fg-muted)", fontFamily: "monospace", fontSize: "13px" }}>loading...</p>
    </div>
  );

  const publicFields = fields.filter(f => !f.isGmOnly);
  const gmFields = fields.filter(f => f.isGmOnly);

  const renderField = (f: EntityTypeField) => {
    const val = values[f.id];

    if (f.valueType === "boolean") {
      return (
        <label key={f.id} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={!!val}
            onChange={e => setValue(f.id, e.target.checked)}
            style={{ accentColor: "var(--accent)", width: "14px", height: "14px" }}
          />
          <span style={{ fontSize: "13px", color: "var(--fg-muted)" }}>{f.label}</span>
        </label>
      );
    }

    if (f.valueType === "entity_ref" || f.valueType === "entity_ref_list") {
      const refs = refValues.filter(r => r.fieldId === f.id);
      const isOpen = pickerFieldId === f.id;
      const filtered = pickerOptions.filter(o =>
        o.name.toLowerCase().includes(pickerSearch.toLowerCase())
      );

      return (
        <div key={f.id} style={{ position: "relative" }}>
          <label style={labelStyle}>{f.label}</label>

          {refs.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "6px" }}>
              {refs.map(r => (
                <span key={r.refEntityId} style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: "3px", padding: "2px 6px", fontSize: "12px", color: "var(--fg)",
                }}>
                  {r.refEntityName}
                  <button
                    onClick={() => removeRef(f.id, r.refEntityId)}
                    style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "12px", lineHeight: 1, padding: "0 1px" }}
                  >×</button>
                </span>
              ))}
            </div>
          )}

          <button
            onClick={() => openPicker(f)}
            style={{
              background: "none", border: "1px dashed var(--border)", color: "var(--fg-muted)",
              cursor: "pointer", fontSize: "11px", fontFamily: "monospace", padding: "3px 8px",
              borderRadius: "4px", display: "block",
            }}
          >
            {f.valueType === "entity_ref" && refs.length ? "change" : "+ link"}
          </button>

          {isOpen && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 5 }} onClick={closePicker} />
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, minWidth: "220px", maxWidth: "100%",
                zIndex: 10, background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: "4px", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              }}>
                <input
                  ref={pickerSearchRef}
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  placeholder="search..."
                  style={{
                    width: "100%", padding: "6px 10px", background: "var(--surface)",
                    border: "none", borderBottom: "1px solid var(--border)",
                    color: "var(--fg)", fontSize: "12px", fontFamily: "monospace", outline: "none",
                  }}
                />
                <div style={{ maxHeight: "180px", overflowY: "auto" }}>
                  {filtered.length === 0 && !pickerSearch.trim() && (
                    <div style={{ padding: "8px 10px", color: "var(--fg-muted)", fontSize: "12px", fontStyle: "italic" }}>
                      {pickerOptions.length === 0 ? "loading..." : "no results"}
                    </div>
                  )}
                  {filtered.map(opt => (
                    <div
                      key={opt.id}
                      onClick={() => selectRef(f, opt)}
                      style={{ padding: "6px 10px", fontSize: "13px", cursor: "pointer", color: "var(--fg)", borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      {opt.entityTypeIcon && <span style={{ marginRight: "6px", opacity: 0.6 }}>{opt.entityTypeIcon}</span>}
                      {opt.name}
                    </div>
                  ))}
                  {pickerSearch.trim() && f.refEntityTypeId && (
                    <div
                      onClick={() => createAndLink(f)}
                      style={{ padding: "6px 10px", fontSize: "12px", cursor: pickerCreating ? "default" : "pointer", color: "var(--accent)", borderTop: filtered.length ? "1px solid var(--border)" : "none", fontFamily: "monospace", opacity: pickerCreating ? 0.5 : 1 }}
                      onMouseEnter={e => { if (!pickerCreating) e.currentTarget.style.background = "var(--surface)"; }}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      {pickerCreating ? "creating..." : `+ create "${pickerSearch.trim()}"`}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    const isLong = longKeys.has(f.key);
    return (
      <div key={f.id}>
        <label style={labelStyle}>{f.label}</label>
        {isLong ? (
          <textarea
            value={(val as string) ?? ""}
            onChange={e => setValue(f.id, e.target.value)}
            style={textareaStyle}
          />
        ) : (
          <input
            type={f.valueType === "number" ? "number" : "text"}
            value={(val as string) ?? ""}
            onChange={e => setValue(f.id, f.valueType === "number" ? Number(e.target.value) : e.target.value)}
            style={inputStyle}
          />
        )}
      </div>
    );
  };

  return (
    <div style={{ height: "100dvh", background: "var(--bg)", color: "var(--fg)", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ flexShrink: 0, background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "10px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
        <a href="/" style={{ color: "var(--fg-muted)", textDecoration: "none", fontSize: "12px", fontFamily: "monospace", flexShrink: 0 }}>← dashboard</a>
        <span style={{ color: "var(--border)" }}>|</span>
        <span style={{ fontSize: "11px", color: entity.entityTypeColor ?? "var(--accent)", fontFamily: "monospace", flexShrink: 0 }}>
          {entity.entityTypeIcon} {entity.entityTypeName?.toUpperCase()}
        </span>
        <input
          value={name}
          onChange={e => { setName(e.target.value); triggerAutoSave(e.target.value, values, refValues); }}
          style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--fg)", fontSize: "16px", fontFamily: "Georgia, serif", minWidth: 0 }}
          placeholder="Name..."
        />
        <span style={{
          fontSize: "11px", fontFamily: "monospace", flexShrink: 0,
          color: saveStatus === "saved" ? "var(--green)" : saveStatus === "saving" ? "var(--accent)" : saveStatus === "unsaved" ? "var(--red)" : "var(--fg-muted)",
        }}>
          {saveStatus === "saving" ? "saving..." : saveStatus === "saved" ? "saved" : saveStatus === "unsaved" ? "unsaved" : ""}
        </span>
        <button
          onClick={() => handleSave(name, values, refValues)}
          style={{ background: "none", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace", padding: "3px 8px", borderRadius: "4px", flexShrink: 0 }}
        >
          save
        </button>
      </div>

      {/* Form */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: "640px", margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {publicFields.map(renderField)}

          {gmFields.length > 0 && (
            <>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", marginTop: "8px" }}>
                <span style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--fg-muted)", fontFamily: "monospace" }}>GM ONLY</span>
              </div>
              {gmFields.map(renderField)}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
