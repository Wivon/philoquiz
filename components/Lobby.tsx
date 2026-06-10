"use client";

import { useState } from "react";

import { NOTIONS, notionLabel } from "@/lib/notions";
import { QUESTION_COUNT_OPTIONS } from "@/lib/socket-events";
import type { NotionId, RoomState } from "@/lib/types";
import { NotionPicker } from "./NotionPicker";
import { Button, Card, PlayerChip } from "./ui";

export function Lobby({
  room,
  myId,
  urls,
  onSetNotions,
  onSetCount,
  onStart,
  onLeave,
}: {
  room: RoomState;
  myId: string | null;
  urls: string[];
  onSetNotions: (n: NotionId[]) => void;
  onSetCount: (c: number) => void;
  onStart: () => void;
  onLeave: () => void;
}) {
  const isHost = room.hostId === myId;
  const [copied, setCopied] = useState(false);

  const toggle = (id: NotionId) => {
    const set = new Set(room.selectedNotions);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onSetNotions([...set]);
  };

  const shareUrl = urls.find((u) => !u.includes("localhost")) ?? urls[0];

  const copyPin = async () => {
    try {
      await navigator.clipboard.writeText(room.pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable on http LAN; PIN is shown anyway */
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Card className="text-center">
        <p className="font-bold uppercase tracking-wide text-violet-400">
          Code PIN
        </p>
        <button
          onClick={copyPin}
          className="mx-auto block text-6xl font-black tracking-[0.3em] text-violet-900 transition hover:scale-105 sm:text-7xl"
          title="Cliquer pour copier"
        >
          {room.pin}
        </button>
        <p className="mt-2 text-sm font-bold text-violet-500">
          {copied ? "Copié ✓" : "Clique sur le PIN pour le copier"}
        </p>
        {shareUrl && (
          <p className="mt-3 text-violet-700">
            Sur le même réseau Wi-Fi, ouvrez{" "}
            <span className="rounded-lg bg-violet-100 px-2 py-1 font-black">
              {shareUrl}
            </span>
          </p>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 text-xl font-black text-violet-900">
          Joueurs ({room.players.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {room.players.map((p) => (
            <PlayerChip
              key={p.id}
              emoji={p.emoji}
              name={p.isHost ? `${p.name} 👑` : p.name}
              highlight={p.id === myId}
            />
          ))}
          {room.players.length === 0 && (
            <p className="text-violet-400">En attente de joueurs…</p>
          )}
        </div>
      </Card>

      {isHost ? (
        <Card className="flex flex-col gap-5">
          <NotionPicker
            selected={room.selectedNotions}
            onToggle={toggle}
            onSelectAll={() => onSetNotions(NOTIONS.map((n) => n.id))}
            onClear={() => onSetNotions([])}
          />

          <div>
            <p className="mb-2 font-bold text-violet-900">Nombre de questions</p>
            <div className="flex flex-wrap gap-2">
              {QUESTION_COUNT_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onSetCount(c)}
                  className={`rounded-2xl px-5 py-2 font-black transition ${
                    room.questionCount === c
                      ? "bg-violet-500 text-white"
                      : "bg-violet-100 text-violet-700 hover:bg-violet-200"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={onStart}
            disabled={room.selectedNotions.length === 0}
            className="w-full text-2xl"
          >
            🚀 Démarrer la partie
          </Button>
          {room.selectedNotions.length === 0 && (
            <p className="text-center text-sm font-bold text-rose-500">
              Choisis au moins une notion pour démarrer.
            </p>
          )}
        </Card>
      ) : (
        <Card className="text-center">
          <p className="text-xl font-bold text-violet-900">
            En attente que l'hôte démarre la partie…
          </p>
          {room.selectedNotions.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {room.selectedNotions.map((id) => (
                <span
                  key={id}
                  className="rounded-full bg-violet-100 px-3 py-1 font-bold text-violet-700"
                >
                  {notionLabel(id)}
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      <button
        onClick={onLeave}
        className="mx-auto font-bold text-white/70 hover:text-white"
      >
        Quitter la partie
      </button>
    </div>
  );
}
