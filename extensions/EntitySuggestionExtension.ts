import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Entity } from "@/lib/mockData";

export type SuggestionState = {
  active: boolean;
  matches: Entity[];
  query: string;
  from: number;
  to: number;
  coords: { top: number; left: number } | null;
};

type Options = {
  entities: Entity[];
  onStateChange: (state: SuggestionState) => void;
};

const pluginKey = new PluginKey("entitySuggestion");

function matchEntities(query: string, entities: Entity[]): Entity[] {
  if (query.length < 2) return [];
  const lower = query.toLowerCase();
  return entities.filter((e) => {
    if (e.name.toLowerCase().includes(lower)) return true;
    if (e.aliases?.some((a) => a.toLowerCase().includes(lower))) return true;
    return false;
  });
}

export const EntitySuggestionExtension = Extension.create<Options>({
  name: "entitySuggestion",

  addOptions() {
    return { entities: [], onStateChange: () => {} };
  },

  addProseMirrorPlugins() {
    const { entities, onStateChange } = this.options;

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
              const matches = matchEntities(query, entities);

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
                to: pos,
                coords: { top: coords.bottom + 6, left: coords.left },
              });
            },
          };
        },
      }),
    ];
  },
});