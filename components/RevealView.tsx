"use client";

import type { LiveQuestion } from "@/lib/socket-events";
import type { QuestionResult } from "@/lib/types";
import { AnswerGrid } from "./AnswerGrid";
import { Button, Card } from "./ui";
import { Leaderboard } from "./Leaderboard";

export function RevealView({
  question,
  reveal,
  myId,
  isHost,
  isLast,
  onNext,
}: {
  question: LiveQuestion;
  reveal: QuestionResult;
  myId: string | null;
  isHost: boolean;
  isLast: boolean;
  onNext: () => void;
}) {
  const me = reveal.leaderboard.find((e) => e.id === myId);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      {me && (
        <div
          className={`pop-in rounded-3xl p-5 text-center text-white shadow-2xl ${
            me.lastCorrect ? "bg-emerald-500" : "bg-rose-500"
          }`}
        >
          <p className="text-3xl font-black">
            {me.lastCorrect ? "Bonne réponse ! 🎉" : "Raté… 😅"}
          </p>
          {me.lastGain > 0 && (
            <p className="text-xl font-bold">+{me.lastGain} points</p>
          )}
          <p className="mt-1 opacity-90">
            {me.rank === 1 ? "🥇 Tu es en tête !" : `Tu es ${me.rank}ᵉ`}
          </p>
        </div>
      )}

      <Card>
        <p className="mb-3 text-center font-bold text-violet-400">
          {question.question}
        </p>
        <AnswerGrid
          answers={question.answers}
          correctIndex={reveal.correctIndex}
          counts={reveal.answerCounts}
        />
        <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-violet-900">
          <span className="font-black">💡 À retenir : </span>
          {reveal.explanation}
        </p>
      </Card>

      <Card>
        <h3 className="mb-3 text-xl font-black text-violet-900">Classement</h3>
        <Leaderboard entries={reveal.leaderboard} myId={myId} />
      </Card>

      {isHost ? (
        <Button onClick={onNext} className="w-full text-xl">
          {isLast ? "🏁 Voir les résultats" : "Question suivante →"}
        </Button>
      ) : (
        <p className="text-center font-bold text-white/80">
          En attente de l'hôte pour continuer…
        </p>
      )}
    </div>
  );
}
