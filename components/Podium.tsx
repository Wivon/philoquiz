"use client";

import type { LeaderboardEntry } from "@/lib/types";
import { Button, Card } from "./ui";
import { Leaderboard } from "./Leaderboard";

export function Podium({
  entries,
  myId,
  isHost,
  onRestart,
  onLeave,
}: {
  entries: LeaderboardEntry[];
  myId: string | null;
  isHost: boolean;
  onRestart: () => void;
  onLeave: () => void;
}) {
  const top3 = entries.slice(0, 3);
  // Display order on the podium: 2nd, 1st, 3rd.
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights = new Map<number, string>([
    [1, "h-40"],
    [2, "h-28"],
    [3, "h-20"],
  ]);
  const me = entries.find((e) => e.id === myId);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <h1 className="text-center text-4xl font-black text-white drop-shadow">
        🏆 Podium 🏆
      </h1>

      <div className="flex items-end justify-center gap-3">
        {order.map((e, i) => (
          <div
            key={e.id}
            style={{ animationDelay: `${i * 140}ms` }}
            className="tile-enter flex w-24 flex-col items-center"
          >
            <div className="text-4xl">{e.emoji}</div>
            <div className="mb-1 max-w-full truncate font-black text-white">
              {e.name}
            </div>
            <div
              className={`flex w-full ${heights.get(e.rank)} flex-col items-center justify-start rounded-t-2xl bg-white pt-2 shadow-2xl`}
            >
              <span className="text-3xl font-black">
                {["🥇", "🥈", "🥉"][e.rank - 1]}
              </span>
              <span className="font-black text-violet-700 tabular-nums">
                {e.score}
              </span>
            </div>
          </div>
        ))}
      </div>

      {me && (
        <p className="text-center text-xl font-black text-white">
          Tu termines {me.rank}ᵉ avec {me.score} points !
        </p>
      )}

      <Card>
        <h3 className="mb-3 text-xl font-black text-violet-900">
          Classement final
        </h3>
        <Leaderboard entries={entries} myId={myId} />
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        {isHost && (
          <Button onClick={onRestart} className="text-xl">
            🔁 Rejouer (nouveau lobby)
          </Button>
        )}
        <Button variant="secondary" onClick={onLeave} className="text-xl">
          Quitter
        </Button>
      </div>
    </div>
  );
}
