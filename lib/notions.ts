import type { Notion, NotionId } from "./types";

// The 17 notions of the Terminale Générale philosophy programme.
export const NOTIONS: Notion[] = [
  { id: "art", label: "L'art", emoji: "🎨" },
  { id: "bonheur", label: "Le bonheur", emoji: "😊" },
  { id: "conscience", label: "La conscience", emoji: "🧠" },
  { id: "devoir", label: "Le devoir", emoji: "⚖️" },
  { id: "etat", label: "L'État", emoji: "🏛️" },
  { id: "inconscient", label: "L'inconscient", emoji: "🌊" },
  { id: "justice", label: "La justice", emoji: "⚖️" },
  { id: "langage", label: "Le langage", emoji: "💬" },
  { id: "liberte", label: "La liberté", emoji: "🕊️" },
  { id: "nature", label: "La nature", emoji: "🌿" },
  { id: "raison", label: "La raison", emoji: "🔎" },
  { id: "religion", label: "La religion", emoji: "🙏" },
  { id: "science", label: "La science", emoji: "🔬" },
  { id: "technique", label: "La technique", emoji: "⚙️" },
  { id: "temps", label: "Le temps", emoji: "⏳" },
  { id: "travail", label: "Le travail", emoji: "🛠️" },
  { id: "verite", label: "La vérité", emoji: "💡" },
];

export const NOTION_MAP: Record<NotionId, Notion> = NOTIONS.reduce(
  (acc, n) => {
    acc[n.id] = n;
    return acc;
  },
  {} as Record<NotionId, Notion>,
);

export function notionLabel(id: NotionId): string {
  return NOTION_MAP[id]?.label ?? id;
}
