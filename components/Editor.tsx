"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useState, useCallback, useRef } from "react";
import { EntityMark } from "@/extensions/EntityMark";
import { EntitySuggestionExtension, type SuggestionState } from "@/extensions/EntitySuggestionExtension";
import { TextHighlightExtension, textHighlightKey } from "@/extensions/TextHighlightExtension";
import { SuggestionPopup } from "./SuggestionPopup";
import { EntityHoverPopup } from "./EntityHoverPopup";
import type { EditorEntity, EntityType } from "@/lib/api";

type Props = {
  entities: EditorEntity[];
  entityTypes: EntityType[];
  onEntityCreate: (name: string, entityTypeId: number) => Promise<EditorEntity | null>;
  onWordCountChange: (count: number) => void;
  onEntitiesChange: (entities: EditorEntity[]) => void;
  onContentChange: (content: string) => void;
  onResetRef: React.RefObject<((content: string) => void) | null>;
  insertEntityRef: React.RefObject<((entity: EditorEntity) => void) | null>;
  unlinkEntityRef: React.RefObject<((entityId: string) => void) | null>;
  highlightEntityRef: React.RefObject<((entityId: string | null) => void) | null>;
  onEntityCountsChange: (counts: Record<string, number>) => void;
  onEntityEdit?: (id: number) => void;
  onEntityView?: (id: number) => void;
};

type SelectionBubble = { text: string; x: number; y: number } | null;

const defaultSuggestion: SuggestionState = {
  active: false, matches: [], query: "", from: 0, to: 0, coords: null,
};

type HoverState = {
  entity: EditorEntity;
  position: { top: number; left: number };
} | null;

function getEntityTextCounts(editor: ReturnType<typeof useEditor>, entities: EditorEntity[]): Record<string, number> {
  if (!editor || entities.length === 0) return {};
  const fullText = editor.state.doc.textContent.toLowerCase();
  const counts: Record<string, number> = {};
  for (const entity of entities) {
    const names = [entity.name, ...(entity.aliases ?? [])].map(n => n.toLowerCase()).filter(Boolean);
    let count = 0;
    for (const name of names) {
      let i = 0;
      while ((i = fullText.indexOf(name, i)) !== -1) { count++; i += name.length; }
    }
    if (count > 0) counts[entity.id] = count;
  }
  return counts;
}

function getLinkedEntities(editor: ReturnType<typeof useEditor>, allEntities: EditorEntity[]): EditorEntity[] {
  if (!editor) return [];
  const entityMap = new Map(allEntities.map(e => [e.id, e]));
  const linked = new Map<string, EditorEntity>();
  editor.state.doc.descendants(node => {
    node.marks.forEach(mark => {
      if (mark.type.name !== "entityMark" || !mark.attrs.entityId) return;
      const id = String(mark.attrs.entityId);
      if (linked.has(id)) return;
      linked.set(id, entityMap.get(id) ?? {
        id,
        name: mark.attrs.entityName ?? id,
        typeName: mark.attrs.entityType ?? "Entity",
        typeColor: mark.attrs.entityColor ?? undefined,
      });
    });
  });
  return Array.from(linked.values());
}

export function Editor({ entities, entityTypes, onEntityCreate, onWordCountChange, onEntitiesChange, onContentChange, onResetRef, insertEntityRef, unlinkEntityRef, highlightEntityRef, onEntityCountsChange, onEntityEdit, onEntityView }: Props) {
  const [suggestion, setSuggestion] = useState<SuggestionState>(defaultSuggestion);
  const [hover, setHover] = useState<HoverState>(null);
  const [selectionBubble, setSelectionBubble] = useState<SelectionBubble>(null);
  const [creatingFromSelection, setCreatingFromSelection] = useState(false);
  const dismissedQueryRef = useRef<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entitiesRef = useRef<EditorEntity[]>(entities);

  useEffect(() => { entitiesRef.current = entities; }, [entities]);

  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const startHoverTimeout = useCallback(() => {
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => setHover(null), 300);
  }, [clearHoverTimeout]);

  const handleStateChange = useCallback((state: SuggestionState) => {
    if (state.active && state.query === dismissedQueryRef.current) return;
    if (state.query !== dismissedQueryRef.current) dismissedQueryRef.current = null;
    setSuggestion(state);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Begin your scene..." }),
      EntityMark,
      TextHighlightExtension,
      EntitySuggestionExtension.configure({
        getEntities: () => entitiesRef.current,
        onStateChange: handleStateChange,
      }),
    ],
    content: "",
    editorProps: { attributes: { class: "scene-editor" } },
    onSelectionUpdate({ editor }) {
      const { from, to } = editor.state.selection;
      if (from === to) { setSelectionBubble(null); return; }
      const text = editor.state.doc.textBetween(from, to, " ").trim();
      if (!text) { setSelectionBubble(null); return; }
      const coords = editor.view.coordsAtPos(from);
      setSelectionBubble({ text, x: coords.left, y: coords.top });
    },
    onUpdate({ editor }) {
      const text = editor.getText();
      const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
      onWordCountChange(words);
      const linked = getLinkedEntities(editor, entitiesRef.current);
      onEntitiesChange(linked);
      onEntityCountsChange(getEntityTextCounts(editor, linked));
      onContentChange(JSON.stringify(editor.getJSON()));
    },
  });

  useEffect(() => {
    if (!editor) return;
    highlightEntityRef.current = (entityId: string | null) => {
      if (!entityId) {
        editor.view.dispatch(editor.view.state.tr.setMeta(textHighlightKey, null));
        return;
      }
      const entity = entitiesRef.current.find(e => e.id === entityId);
      const names = entity ? [entity.name, ...(entity.aliases ?? [])] : [];
      editor.view.dispatch(editor.view.state.tr.setMeta(textHighlightKey, names));
    };
  }, [editor, highlightEntityRef]);

  useEffect(() => {
    unlinkEntityRef.current = (entityId: string) => {
      if (!editor) return;
      editor.state.doc.descendants((node, pos) => {
        node.marks.forEach(mark => {
          if (mark.type.name === "entityMark" && String(mark.attrs.entityId) === entityId) {
            editor.chain().setTextSelection({ from: pos, to: pos + node.nodeSize }).unsetMark("entityMark").run();
          }
        });
      });
    };
  }, [editor, unlinkEntityRef]);

  useEffect(() => {
    insertEntityRef.current = (entity: EditorEntity) => {
      if (!editor) return;
      editor.chain().focus().insertContent({
        type: "text",
        text: entity.name,
        marks: [{
          type: "entityMark",
          attrs: {
            entityId: entity.id,
            entityType: entity.typeName,
            entityName: entity.name,
            entityColor: entity.typeColor ?? "var(--accent)",
          },
        }],
      }).run();
    };
  }, [editor, insertEntityRef]);

  useEffect(() => {
    onResetRef.current = (content: string) => {
      if (!editor) return;
      if (content) {
        try { editor.commands.setContent(JSON.parse(content)); }
        catch { editor.commands.setContent(content); }
      } else {
        editor.commands.clearContent();
      }
      const linked = getLinkedEntities(editor, entitiesRef.current);
      onEntitiesChange(linked);
      onEntityCountsChange(getEntityTextCounts(editor, linked));
    };
  }, [editor, onResetRef, onEntitiesChange, onEntityCountsChange]);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-entity-id]") as HTMLElement | null;
      if (!target) return;
      const entityId = target.getAttribute("data-entity-id");
      const entity = entitiesRef.current.find(e => e.id === entityId);
      if (!entity) return;
      clearHoverTimeout();
      const rect = target.getBoundingClientRect();
      setHover({ entity, position: { top: rect.bottom, left: rect.left } });
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-entity-id]");
      if (!target) return;
      startHoverTimeout();
    };

    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);
    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, [clearHoverTimeout, startHoverTimeout]);

  const handleUnlink = useCallback(() => {
    if (!editor || !hover) return;
    const { state } = editor;
    state.doc.descendants((node, pos) => {
      node.marks.forEach(mark => {
        if (mark.type.name === "entityMark" && mark.attrs.entityId === hover.entity.id) {
          editor.chain().focus().setTextSelection({ from: pos, to: pos + node.nodeSize }).unsetMark("entityMark").run();
        }
      });
    });
    setHover(null);
  }, [editor, hover]);

  const handleSelect = useCallback((index: number) => {
    if (!editor || !suggestion.active) return;
    const match = suggestion.matches[index];
    const { entity, linkText } = match;

    // Extend to past cursor to cover the rest of the word (e.g. cursor mid-word)
    const $to = editor.state.doc.resolve(suggestion.to);
    const textAfter = $to.parent.textBetween($to.parentOffset, $to.parent.nodeSize - 2, null, "\0");
    const tailMatch = textAfter.match(/^[\w''.-]*/);
    const extendedTo = suggestion.to + (tailMatch ? tailMatch[0].length : 0);

    editor
      .chain()
      .focus()
      .deleteRange({ from: suggestion.from, to: extendedTo })
      .insertContent({
        type: "text",
        text: linkText,
        marks: [{
          type: "entityMark",
          attrs: {
            entityId: entity.id,
            entityType: entity.typeName,
            entityName: entity.name,
            entityColor: entity.typeColor ?? "var(--accent)",
          },
        }],
      })
      .run();
    dismissedQueryRef.current = null;
    setSuggestion(defaultSuggestion);
  }, [editor, suggestion]);

  const handleDismiss = useCallback(() => {
    dismissedQueryRef.current = suggestion.query;
    setSuggestion(defaultSuggestion);
  }, [suggestion.query]);

  const handleCreateFromSelection = async (entityType: EntityType) => {
    if (!editor || !selectionBubble || creatingFromSelection) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ").trim();
    if (!text) return;
    setCreatingFromSelection(true);
    setSelectionBubble(null);
    try {
      const newEntity = await onEntityCreate(text, entityType.id);
      if (!newEntity) return;
      editor.chain().focus().setTextSelection({ from, to }).insertContent({
        type: "text",
        text: newEntity.name,
        marks: [{
          type: "entityMark",
          attrs: {
            entityId: newEntity.id,
            entityType: newEntity.typeName,
            entityName: newEntity.name,
            entityColor: newEntity.typeColor ?? entityType.color ?? "var(--accent)",
          },
        }],
      }).run();
    } finally {
      setCreatingFromSelection(false);
    }
  };

  useEffect(() => { return () => editor?.destroy(); }, [editor]);

  return (
    <>
      <EditorContent editor={editor} style={{ height: "100%" }} />

      {selectionBubble && entityTypes.length > 0 && (
        <div style={{
          position: "fixed",
          top: selectionBubble.y - 46,
          left: Math.min(selectionBubble.x, window.innerWidth - 320),
          zIndex: 150,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          gap: "1px",
          padding: "3px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        }}>
          <span style={{ fontSize: "10px", color: "var(--fg-muted)", fontFamily: "monospace", padding: "0 6px", letterSpacing: "0.06em" }}>create as</span>
          {entityTypes.map(type => (
            <button
              key={type.id}
              onClick={() => handleCreateFromSelection(type)}
              title={type.name}
              disabled={creatingFromSelection}
              style={{
                background: "none", border: "none",
                color: type.color ?? "var(--fg-muted)",
                cursor: creatingFromSelection ? "default" : "pointer",
                fontSize: "11px", fontFamily: "monospace",
                padding: "4px 8px", borderRadius: "4px",
                display: "flex", alignItems: "center", gap: "4px",
                opacity: creatingFromSelection ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!creatingFromSelection) e.currentTarget.style.background = "var(--surface-2)"; }}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {type.icon && <span>{type.icon}</span>}
              <span>{type.name}</span>
            </button>
          ))}
        </div>
      )}

      <SuggestionPopup suggestion={suggestion} onSelect={handleSelect} onDismiss={handleDismiss} />
      {hover && (
        <EntityHoverPopup
          entity={hover.entity}
          position={hover.position}
          onClose={() => setHover(null)}
          onQuickEdit={onEntityEdit ? () => { setHover(null); onEntityEdit(Number(hover.entity.id)); } : undefined}
          onQuickView={onEntityView ? () => { setHover(null); onEntityView(Number(hover.entity.id)); } : undefined}
          onUnlink={handleUnlink}
          onMouseEnter={clearHoverTimeout}
          onMouseLeave={startHoverTimeout}
        />
      )}
    </>
  );
}
