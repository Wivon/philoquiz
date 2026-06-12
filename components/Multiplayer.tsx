"use client";

import { useEffect, useState, type ReactNode } from "react";

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
  autoRestore = false,
}: {
  mode: MultiplayerMode;
  onExit: () => void;
  /** True when this screen was reopened from a saved session (page refresh). */
  autoRestore?: boolean;
}) {
  const game = useGame();
  const [busy, setBusy] = useState(false);
  const [awaiting, setAwaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seenRestoring, setSeenRestoring] = useState(false);

  useEffect(() => {
    if (game.restoring) setSeenRestoring(true);
  }, [game.restoring]);

  const handleIdentity = async (name: string, emoji: string, pin: string) => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "host") {
        await game.createRoom(name, emoji);
      } else {
        setAwaiting(true);
        const res = await game.joinRoom(pin, name, emoji);
        if (!res.ok) {
          setAwaiting(false);
          setError(res.error ?? "Impossible de rejoindre la partie.");
        }
      }
    } catch {
      setAwaiting(false);
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

  // ---- in a room: render the current phase ----
  if (game.room) {
    const { room, myId } = game;
    const isHost = room.hostId === myId;
    const isPresenter = mode === "present";
    const isLast = room.currentQuestionIndex >= room.totalQuestions - 1;
    let screenKey = `${room.phase}-${room.currentQuestionIndex}`;
    let content: ReactNode = null;

    switch (room.phase) {
      case "question":
        content =
          game.question &&
          (isPresenter ? (
            <PresenterQuestion
              question={game.question.data}
              receivedAt={game.question.receivedAt}
              answered={game.answered}
            />
          ) : (
            <QuestionView
              question={game.question.data}
              receivedAt={game.question.receivedAt}
              answered={game.answered}
              onAnswer={game.answer}
            />
          ));
        break;
      case "leaderboard":
        content = game.reveal && game.question && (
          <RevealView
            question={game.question.data}
            reveal={game.reveal}
            myId={myId}
            isHost={isHost}
            isLast={isLast}
            onNext={game.next}
          />
        );
        break;
      case "finished":
        screenKey = "finished";
        content = game.finished && (
          <Podium
            entries={game.finished}
            myId={myId}
            isHost={isHost}
            onRestart={game.restart}
            onLeave={leave}
          />
        );
        break;
      case "lobby":
      default:
        screenKey = "lobby";
        content = (
          <Lobby
            room={room}
            myId={myId}
            shareUrl={game.shareUrl}
            onSetNotions={game.setNotions}
            onSetCount={game.setQuestionCount}
            onSetDuration={game.setQuestionDuration}
            onStart={game.start}
            onLeave={leave}
          />
        );
    }
    return (
      <div key={screenKey} className="screen-enter w-full">
        {content}
      </div>
    );
  }

  // ---- not in a room yet: loader, or the identity / present forms ----
  const waitingOnRestore = autoRestore && !seenRestoring;
  if (game.restoring || busy || awaiting || waitingOnRestore) {
    return (
      <Card className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
        <p className="text-lg font-bold text-violet-800">
          {game.restoring || waitingOnRestore
            ? "Reconnexion à la partie…"
            : "Connexion…"}
        </p>
      </Card>
    );
  }

  if (mode === "present") {
    return (
      <Card className="screen-enter mx-auto flex max-w-md flex-col gap-4 text-center">
        <h2 className="text-3xl font-black text-violet-900">
          Mode présentation 📽️
        </h2>
        <p className="text-violet-700">
          Tu héberges la partie sans y jouer : idéal pour projeter les questions
          et le classement au tableau. Les élèves rejoignent avec le code PIN
          depuis leur appareil.
        </p>
        {(error ?? game.error) && (
          <p className="rounded-xl bg-rose-100 px-4 py-2 font-bold text-rose-700">
            {error ?? game.error}
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
      error={error ?? game.error}
      busy={busy}
    />
  );
}
