"use client";

import { useState } from "react";

import { CONNECTION_ERROR, useGame } from "@/hooks/useGame";
import { Identity } from "./Identity";
import { Lobby } from "./Lobby";
import { QuestionView } from "./QuestionView";
import { PresenterQuestion } from "./PresenterQuestion";
import { RevealView } from "./RevealView";
import { Podium } from "./Podium";
import { Button, Card } from "./ui";

export type MultiplayerMode = "host" | "join" | "present";

export function Multiplayer({
  mode,
  onExit,
}: {
  mode: MultiplayerMode;
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
    } catch {
      // Peer failed to open (broker unreachable / no internet).
      setError(CONNECTION_ERROR);
    } finally {
      setBusy(false);
    }
  };

  const handlePresent = async () => {
    setBusy(true);
    setError(null);
    try {
      await game.createRoom("Tableau", "📽️", false);
      setJoined(true);
    } catch {
      setError(CONNECTION_ERROR);
    } finally {
      setBusy(false);
    }
  };

  const leave = () => {
    game.leave();
    onExit();
  };

  if (!joined || !game.room) {
    if (mode === "present") {
      return (
        <Card className="mx-auto flex max-w-md flex-col gap-4 text-center">
          <h2 className="text-3xl font-black text-violet-900">
            Mode présentation 📽️
          </h2>
          <p className="text-violet-700">
            Tu héberges la partie sans y jouer : idéal pour projeter les questions
            et le classement au tableau. Les élèves rejoignent avec le code PIN
            depuis leur appareil.
          </p>
          {error && (
            <p className="rounded-xl bg-rose-100 px-4 py-2 font-bold text-rose-700">
              {error}
            </p>
          )}
          <Button onClick={handlePresent} disabled={busy} className="w-full">
            {busy ? "..." : "Créer la session"}
          </Button>
          <button
            onClick={onExit}
            className="font-bold text-violet-500 hover:text-violet-700"
          >
            ← Retour
          </button>
        </Card>
      );
    }
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
  const isPresenter = mode === "present";
  const isLast = room.currentQuestionIndex >= room.totalQuestions - 1;

  switch (room.phase) {
    case "question":
      if (!game.question) return null;
      return isPresenter ? (
        <PresenterQuestion
          key={game.question.data.index}
          question={game.question.data}
          receivedAt={game.question.receivedAt}
          answered={game.answered}
        />
      ) : (
        <QuestionView
          key={game.question.data.index}
          question={game.question.data}
          receivedAt={game.question.receivedAt}
          answered={game.answered}
          onAnswer={game.answer}
        />
      );

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
          shareUrl={game.shareUrl}
          onSetNotions={game.setNotions}
          onSetCount={game.setQuestionCount}
          onStart={game.start}
          onLeave={leave}
        />
      );
  }
}
