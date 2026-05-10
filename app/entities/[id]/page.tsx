"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { EntityEditForm, type EntityEditFormHandle, type EntityMeta } from "@/components/EntityEditForm";

export default function EntityPage() {
  const params = useParams();
  const id = Number(params.id);

  const formRef = useRef<EntityEditFormHandle>(null);
  const [name, setName] = useState("");
  const [meta, setMeta] = useState<EntityMeta | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "unsaved">("idle");

  return (
    <div style={{ height: "100dvh", background: "var(--bg)", color: "var(--fg)", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ flexShrink: 0, background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "10px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
        <Link href="/" style={{ color: "var(--fg-muted)", textDecoration: "none", fontSize: "12px", fontFamily: "monospace", flexShrink: 0 }}>← dashboard</Link>
        <span style={{ color: "var(--border)" }}>|</span>
        {meta && (
          <Link
            href={`/entities/type/${meta.entityTypeName?.toLowerCase()}`}
            style={{ fontSize: "11px", color: meta.entityTypeColor ?? "var(--accent)", fontFamily: "monospace", textDecoration: "none", flexShrink: 0 }}
          >
            {meta.entityTypeIcon} {meta.entityTypeName?.toUpperCase()}
          </Link>
        )}
        <span style={{ flex: 1, fontSize: "14px", color: "var(--fg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name || "—"}
        </span>
        <span style={{
          fontSize: "11px", fontFamily: "monospace", flexShrink: 0,
          color: saveStatus === "saved" ? "var(--green)" : saveStatus === "saving" ? "var(--accent)" : saveStatus === "unsaved" ? "var(--red)" : "var(--fg-muted)",
        }}>
          {saveStatus === "saving" ? "saving..." : saveStatus === "saved" ? "saved" : saveStatus === "unsaved" ? "unsaved" : ""}
        </span>
        <button
          onClick={() => formRef.current?.save()}
          style={{ background: "none", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace", padding: "3px 8px", borderRadius: "4px", flexShrink: 0 }}
        >
          save
        </button>
      </div>

      {/* Form */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: "640px", margin: "0 auto", padding: "32px 24px" }}>
          <EntityEditForm
            ref={formRef}
            entityId={id}
            onNameChange={setName}
            onSaveStatusChange={setSaveStatus}
            onMetaReady={setMeta}
          />
        </div>
      </div>
    </div>
  );
}
