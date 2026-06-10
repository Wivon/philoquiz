"use client";

import { ALL_QUESTIONS } from "@/lib/questions";
import { NOTIONS } from "@/lib/notions";
import { Button } from "./ui";

export function Home({
  onHost,
  onJoin,
  onSolo,
  onPresent,
}: {
  onHost: () => void;
  onJoin: () => void;
  onSolo: () => void;
  onPresent: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-8 text-center">
      <div>
        <h1 className="text-6xl font-black tracking-tight text-white drop-shadow-lg sm:text-7xl">
          Philo<span className="text-amber-300">Quiz</span>
        </h1>
        <p className="mt-3 text-xl font-bold text-white/85">
          Révise le bac de philo en t'amusant 🧠
        </p>
        <p className="mt-1 text-sm font-bold text-white/60">
          {NOTIONS.length} notions · {ALL_QUESTIONS.length} questions · jusqu'à
          la Terminale Générale
        </p>
      </div>

      <div className="flex w-full flex-col gap-4">
        <Button onClick={onHost} className="w-full py-5 text-2xl">
          🎮 Créer une partie
        </Button>
        <Button
          variant="secondary"
          onClick={onJoin}
          className="w-full py-5 text-2xl"
        >
          🔑 Rejoindre avec un PIN
        </Button>
        <Button
          variant="secondary"
          onClick={onSolo}
          className="w-full py-5 text-2xl"
        >
          🧍 Jouer en solo
        </Button>
        <button
          onClick={onPresent}
          className="mt-1 w-full rounded-2xl px-6 py-3 text-lg font-bold text-white/80 underline-offset-4 transition hover:text-white hover:underline"
        >
          📽️ Héberger sans jouer (tableau / vidéoprojecteur)
        </button>
      </div>

      <p className="max-w-md text-sm text-white/60">
        Pour jouer à plusieurs, connectez vos appareils au même réseau Wi-Fi.
        L'hôte crée la partie et partage le code PIN.
      </p>
    </div>
  );
}
