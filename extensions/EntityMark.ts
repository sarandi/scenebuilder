import { Mark, mergeAttributes } from "@tiptap/core";

export const EntityMark = Mark.create({
  name: "entityMark",
  inclusive: false,

  addAttributes() {
    return {
      entityId: { default: null },
      entityType: { default: null },
      entityName: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-entity-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes({
        "data-entity-id": HTMLAttributes.entityId,
        "data-entity-type": HTMLAttributes.entityType,
        class: `entity-link entity-${HTMLAttributes.entityType}`,
      }),
      0,
    ];
  },
});