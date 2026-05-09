"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useState, useCallback, useRef } from "react";
import { EntityMark } from "@/extensions/EntityMark";
import { EntitySuggestionExtension, type SuggestionState } from "@/extensions/EntitySuggestionExtension";
import { SuggestionPopup } from "./SuggestionPopup";
import { EntityHoverPopup } from "./EntityHoverPopup";
import { mockEntities } from "@/lib/mockData";
import type { Entity } from "@/lib/mockData";

type Props = {
  onWordCountChange: (count: number) => void;
  onEntitiesChange: (entities: Entity[]) => void;
  onContentChange: (content: string) => void;
  onResetRef: React.MutableRefObject<((content: string) => void) | null>;
};

const defaultSuggestion: SuggestionState = {
  active: false, matches: [], query: "", from: 0, to: 0, coords: null,
};

type HoverState = {
  entity: Entity;
  position: { top: number; left: number };
} | null;

function getLinkedEntities(editor: ReturnType<typeof useEditor>): Entity[] {
  if (!editor) return [];
  const ids = new Set<string>();
  editor.state.doc.descendants(node => {
    node.marks.forEach(mark => {
      if (mark.type.name === "entityMark" && mark.attrs.entityId) {
        ids.add(mark.attrs.entityId);
      }
    });
  });
  return mockEntities.filter(e => ids.has(e.id));
}

export function Editor({ onWordCountChange, onEntitiesChange, onContentChange, onResetRef }: Props) {
  const [suggestion, setSuggestion] = useState<SuggestionState>(defaultSuggestion);
  const [hover, setHover] = useState<HoverState>(null);
  const dismissedQueryRef = useRef<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      EntitySuggestionExtension.configure({
        entities: mockEntities,
        onStateChange: handleStateChange,
      }),
    ],
    content: "",
    editorProps: { attributes: { class: "scene-editor" } },
    onUpdate({ editor }) {
      const text = editor.getText();
      const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
      onWordCountChange(words);
      onEntitiesChange(getLinkedEntities(editor));
      onContentChange(JSON.stringify(editor.getJSON()));
    },
  });

  // Expose reset function to parent
  useEffect(() => {
    onResetRef.current = (content: string) => {
      if (!editor) return;
      if (content) {
        try {
          editor.commands.setContent(JSON.parse(content));
        } catch {
          editor.commands.setContent(content);
        }
      } else {
        editor.commands.clearContent();
      }
      onEntitiesChange(getLinkedEntities(editor));
    };
  }, [editor, onResetRef, onEntitiesChange]);

  // Hover detection on entity spans
  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-entity-id]") as HTMLElement | null;
      if (!target) return;
      const entityId = target.getAttribute("data-entity-id");
      const entity = mockEntities.find(e => e.id === entityId);
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
          editor
            .chain()
            .focus()
            .setTextSelection({ from: pos, to: pos + node.nodeSize })
            .unsetMark("entityMark")
            .run();
        }
      });
    });
    setHover(null);
  }, [editor, hover]);

  const handleSelect = useCallback((index: number) => {
    if (!editor || !suggestion.active) return;
    const entity: Entity = suggestion.matches[index];
    editor
      .chain()
      .focus()
      .deleteRange({ from: suggestion.from, to: suggestion.to })
      .insertContent({
        type: "text",
        text: entity.name,
        marks: [{
          type: "entityMark",
          attrs: {
            entityId: entity.id,
            entityType: entity.type,
            entityName: entity.name,
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

  useEffect(() => { return () => editor?.destroy(); }, [editor]);

  return (
    <>
      <EditorContent editor={editor} style={{ height: "100%" }} />
      <SuggestionPopup
        suggestion={suggestion}
        onSelect={handleSelect}
        onDismiss={handleDismiss}
      />
      {hover && (
        <EntityHoverPopup
          entity={hover.entity}
          position={hover.position}
          onClose={() => setHover(null)}
          onUnlink={handleUnlink}
          onMouseEnter={clearHoverTimeout}
          onMouseLeave={startHoverTimeout}
        />
      )}
    </>
  );
}