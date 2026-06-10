"use client";

import { useState } from "react";

import { useGame } from "@/hooks/useGame";
import { Identity } from "./Identity";
import { Lobby } from "./Lobby";
import { QuestionView } from "./QuestionView";
import { RevealView } from "./RevealView";
import { Podium } from "./Podium";

export function Multiplayer({
  mode,
  onExit,
}: {
  mode: "host" | "join";
  onExit: () => void;
}) {
  const game = useGame();
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleIdentity = async (name: string, emoji: string, pin: string) => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "host") {
        await game.createRoom(name, emoji);
        setJoined(true);
      } else {
        const res = await game.joinRoom(pin, name, emoji);
        if (res.ok) setJoined(true);
        else setError(res.error ?? "Impossible de rejoindre la partie.");
      }
    } finally {
      setBusy(false);
    }
  };

  const leave = () => {
    game.leave();
    onExit();
  };

  if (!joined || !game.room) {
    return (
      <Identity
        mode={mode}
        onSubmit={handleIdentity}
        onBack={onExit}
        error={error}
        busy={busy}
      />
    );
  }

  const { room, myId } = game;
  const isHost = room.hostId === myId;
  const isLast = room.currentQuestionIndex >= room.totalQuestions - 1;

  switch (room.phase) {
    case "question":
      return game.question ? (
        <QuestionView
          key={game.question.data.index}
          question={game.question.data}
          receivedAt={game.question.receivedAt}
          answered={game.answered}
          onAnswer={game.answer}
        />
      ) : null;

    case "leaderboard":
      return game.reveal && game.question ? (
        <RevealView
          question={game.question.data}
          reveal={game.reveal}
          myId={myId}
          isHost={isHost}
          isLast={isLast}
          onNext={game.next}
        />
      ) : null;

    case "finished":
      return game.finished ? (
        <Podium
          entries={game.finished}
          myId={myId}
          isHost={isHost}
          onRestart={game.restart}
          onLeave={leave}
        />
      ) : null;

    case "lobby":
    default:
      return (
        <Lobby
          room={room}
          myId={myId}
          urls={game.urls}
          onSetNotions={game.setNotions}
          onSetCount={game.setQuestionCount}
          onStart={game.start}
          onLeave={leave}
        />
      );
  }
}
