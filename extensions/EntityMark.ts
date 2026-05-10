import { Mark, mergeAttributes } from "@tiptap/core";

export const EntityMark = Mark.create({
  name: "entityMark",
  inclusive: false,

  addAttributes() {
    return {
      entityId: { default: null },
      entityType: { default: null },
      entityName: { default: null },
      entityColor: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-entity-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const color = HTMLAttributes.entityColor ?? "var(--accent)";
    return [
      "span",
      mergeAttributes({
        "data-entity-id": HTMLAttributes.entityId,
        "data-entity-type": HTMLAttributes.entityType,
        class: "entity-link",
        style: `color: ${color}; border-color: ${color};`,
      }),
      0,
    ];
  },
});
