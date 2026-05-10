import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorEntity } from "@/lib/api";

export type EntityMatch = {
  entity: EditorEntity;
  linkText: string;
  isAlias: boolean;
};

export type SuggestionState = {
  active: boolean;
  matches: EntityMatch[];
  query: string;
  from: number;
  to: number;
  coords: { top: number; left: number } | null;
};

type Options = {
  getEntities: () => EditorEntity[];
  onStateChange: (state: SuggestionState) => void;
};

const pluginKey = new PluginKey("entitySuggestion");

function matchEntities(query: string, entities: EditorEntity[]): EntityMatch[] {
  if (query.length < 2) return [];
  const lower = query.toLowerCase();
  const results: EntityMatch[] = [];
  for (const entity of entities) {
    if (entity.name.toLowerCase().includes(lower)) {
      results.push({ entity, linkText: entity.name, isAlias: false });
    }
    for (const alias of entity.aliases ?? []) {
      if (alias.toLowerCase().includes(lower)) {
        results.push({ entity, linkText: alias, isAlias: true });
      }
    }
  }
  return results;
}

export const EntitySuggestionExtension = Extension.create<Options>({
  name: "entitySuggestion",

  addOptions() {
    return { getEntities: () => [], onStateChange: () => {} };
  },

  addProseMirrorPlugins() {
    const { getEntities, onStateChange } = this.options;

    return [
      new Plugin({
        key: pluginKey,
        view() {
          let prevQuery = "";
          let prevActive = false;
          let prevFrom = 0;

          return {
            update(view) {
              const { state } = view;
              const { selection } = state;

              if (selection.from !== selection.to) {
                if (prevActive) {
                  prevActive = false; prevQuery = ""; prevFrom = 0;
                  onStateChange({ active: false, matches: [], query: "", from: 0, to: 0, coords: null });
                }
                return;
              }

              const pos = selection.from;
              const $pos = state.doc.resolve(pos);
              const textBefore = $pos.parent.textBetween(0, $pos.parentOffset, null, "\0");
              const match = textBefore.match(/[\w''.-]+$/);

              if (!match || match[0].length < 2) {
                if (prevActive || prevQuery !== "") {
                  prevActive = false; prevQuery = ""; prevFrom = 0;
                  onStateChange({ active: false, matches: [], query: "", from: 0, to: 0, coords: null });
                }
                return;
              }

              const query = match[0];
              const from = pos - query.length;
              const to = pos;

              const matches = matchEntities(query, getEntities());

              if (matches.length === 0) {
                if (prevActive || prevQuery !== query) {
                  prevActive = false; prevQuery = query; prevFrom = from;
                  onStateChange({ active: false, matches: [], query: "", from: 0, to: 0, coords: null });
                }
                return;
              }

              if (prevActive && prevQuery === query && prevFrom === from) return;

              prevActive = true; prevQuery = query; prevFrom = from;
              const coords = view.coordsAtPos(from);
              onStateChange({
                active: true,
                matches,
                query,
                from,
                to,
                coords: { top: coords.bottom + 6, left: coords.left },
              });
            },
          };
        },
      }),
    ];
  },
});
