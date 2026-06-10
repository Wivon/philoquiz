"use client";

import { useState } from "react";

import { randomAvatar } from "@/lib/avatars";
import { AvatarPicker, Button, Card } from "./ui";

export function Identity({
  mode,
  onSubmit,
  onBack,
  error,
  busy,
}: {
  mode: "host" | "join";
  onSubmit: (name: string, emoji: string, pin: string) => void;
  onBack: () => void;
  error?: string | null;
  busy?: boolean;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(() => randomAvatar());
  const [pin, setPin] = useState("");

  const isJoin = mode === "join";
  const canSubmit =
    name.trim().length > 0 && (!isJoin || pin.trim().length === 6);

  return (
    <Card className="mx-auto max-w-md">
      <h2 className="mb-5 text-center text-3xl font-black text-violet-900">
        {isJoin ? "Rejoindre une partie" : "Créer une partie"}
      </h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit && !busy) onSubmit(name.trim(), emoji, pin.trim());
        }}
        className="flex flex-col gap-4"
      >
        {isJoin && (
          <div>
            <label className="mb-1 block font-bold text-violet-900">
              Code PIN
            </label>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-full rounded-2xl border-2 border-violet-200 px-4 py-3 text-center text-2xl font-black tracking-[0.4em] text-violet-900 outline-none focus:border-violet-500"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block font-bold text-violet-900">Prénom</label>
          <input
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ton prénom"
            className="w-full rounded-2xl border-2 border-violet-200 px-4 py-3 text-lg font-bold text-violet-900 outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label className="mb-1 block font-bold text-violet-900">Avatar</label>
          <AvatarPicker value={emoji} onChange={setEmoji} />
        </div>

        {error && (
          <p className="rounded-xl bg-rose-100 px-4 py-2 text-center font-bold text-rose-700">
            {error}
          </p>
        )}

        <Button type="submit" disabled={!canSubmit || busy}>
          {busy ? "..." : isJoin ? "Rejoindre" : "Créer la partie"}
        </Button>
        <button
          type="button"
          onClick={onBack}
          className="text-center font-bold text-violet-500 hover:text-violet-700"
        >
          ← Retour
        </button>
      </form>
    </Card>
  );
}
