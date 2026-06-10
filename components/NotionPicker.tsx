"use client";

import { NOTIONS } from "@/lib/notions";
import { questionCountForNotion } from "@/lib/questions";
import type { NotionId } from "@/lib/types";

export function NotionPicker({
  selected,
  onToggle,
  onSelectAll,
  onClear,
}: {
  selected: NotionId[];
  onToggle: (id: NotionId) => void;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  const selectedSet = new Set(selected);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-bold text-violet-900">
          Notions ({selected.length}/{NOTIONS.length})
        </p>
        <div className="flex gap-2 text-sm font-bold">
          <button
            type="button"
            onClick={onSelectAll}
            className="rounded-full bg-violet-100 px-3 py-1 text-violet-700 hover:bg-violet-200"
          >
            Tout
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-full bg-violet-100 px-3 py-1 text-violet-700 hover:bg-violet-200"
          >
            Aucune
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {NOTIONS.map((n) => {
          const active = selectedSet.has(n.id);
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => onToggle(n.id)}
              className={`flex items-center gap-2 rounded-2xl border-2 px-3 py-2 text-left font-bold transition ${
                active
                  ? "border-violet-500 bg-violet-500 text-white"
                  : "border-violet-200 bg-white text-violet-800 hover:border-violet-400"
              }`}
            >
              <span className="text-xl">{n.emoji}</span>
              <span className="flex-1 leading-tight">{n.label}</span>
              <span className="text-xs opacity-70">
                {questionCountForNotion(n.id)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
