import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node } from "@tiptap/pm/model";

export const textHighlightKey = new PluginKey<DecorationSet>("textHighlight");

function buildDecorations(doc: Node, names: string[]): DecorationSet {
  const lower = names.map(n => n.toLowerCase()).filter(Boolean);
  if (lower.length === 0) return DecorationSet.empty;

  const decos: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = node.text.toLowerCase();
    for (const name of lower) {
      let i = 0;
      while ((i = text.indexOf(name, i)) !== -1) {
        decos.push(Decoration.inline(pos + i, pos + i + name.length, { class: "entity-highlight" }));
        i += name.length;
      }
    }
  });

  return DecorationSet.create(doc, decos);
}

export const TextHighlightExtension = Extension.create({
  name: "textHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: textHighlightKey,
        state: {
          init() { return DecorationSet.empty; },
          apply(tr, set, _, newState) {
            const meta: string[] | null | undefined = tr.getMeta(textHighlightKey);
            if (meta !== undefined) {
              return meta && meta.length > 0
                ? buildDecorations(newState.doc, meta)
                : DecorationSet.empty;
            }
            if (tr.docChanged && set !== DecorationSet.empty) {
              return set.map(tr.mapping, newState.doc);
            }
            return set;
          },
        },
        props: {
          decorations(state) { return this.getState(state); },
        },
      }),
    ];
  },
});
