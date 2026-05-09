export type EntityType = "character" | "location" | "item" | "faction" | "event";

export type Entity = {
  id: string;
  type: EntityType;
  name: string;
  description: string;
  aliases?: string[];
};

export const mockEntities: Entity[] = [
  { id: "c1", type: "character", name: "Aldric Vane", description: "A disgraced knight seeking redemption in the northern territories.", aliases: ["The Grey Sword", "Aldric"] },
  { id: "c2", type: "character", name: "Seraphine", description: "An oracle whose visions are fragmented and unreliable.", aliases: ["The Blind Seer"] },
  { id: "c3", type: "character", name: "Commander Holt", description: "Ruthless military commander loyal to the Iron Throne.", aliases: ["Holt"] },
  { id: "l1", type: "location", name: "The Ashwood", description: "A cursed forest where the trees bleed black sap at midnight." },
  { id: "l2", type: "location", name: "Vel Moran", description: "A coastal city built on the ruins of a drowned civilization." },
  { id: "l3", type: "location", name: "The Hollow Spire", description: "An ancient tower with no interior, yet lights burn in its windows." },
  { id: "i1", type: "item", name: "The Sundered Key", description: "Half of a key that opens a door no one has found.", aliases: ["The Key"] },
  { id: "i2", type: "item", name: "Vane's Greatsword", description: "Aldric's sword, notched from a hundred battles." },
  { id: "f1", type: "faction", name: "The Iron Throne", description: "The ruling military government of the eastern continent." },
  { id: "f2", type: "faction", name: "The Unbound", description: "A secret network of escaped slaves and refugees." },
  { id: "e1", type: "event", name: "The Night of Ash", description: "When three cities burned simultaneously, blamed on different causes." },
];

export const entityColors: Record<EntityType, string> = {
  character: "#c49a3c",
  location: "#4a8a6a",
  item: "#7a4a9a",
  faction: "#9a4a4a",
  event: "#4a6a9a",
};

export const entityIcons: Record<EntityType, string> = {
  character: "⚔",
  location: "⌖",
  item: "◈",
  faction: "⚑",
  event: "◉",
};