"use client";

import type { LeaderboardEntry } from "@/lib/types";

export function Leaderboard({
  entries,
  myId,
}: {
  entries: LeaderboardEntry[];
  myId: string | null;
}) {
  return (
    <ol className="flex flex-col gap-2">
      {entries.map((e, i) => {
        const isMe = e.id === myId;
        return (
          <li
            key={e.id}
            style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
            className={`float-up flex items-center gap-3 rounded-2xl px-4 py-3 ${
              isMe
                ? "bg-violet-600 text-white"
                : "bg-violet-50 text-violet-900"
            }`}
          >
            <span className="w-7 text-center text-lg font-black">
              {e.rank <= 3 ? ["🥇", "🥈", "🥉"][e.rank - 1] : e.rank}
            </span>
            <span className="text-2xl">{e.emoji}</span>
            <span className="flex-1 truncate font-bold">
              {e.name}
              {isMe && " (toi)"}
            </span>
            {e.lastGain > 0 && (
              <span
                className={`text-sm font-bold ${
                  isMe ? "text-amber-200" : "text-emerald-600"
                }`}
              >
                +{e.lastGain}
              </span>
            )}
            <span className="w-16 text-right font-black tabular-nums">
              {e.score}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
