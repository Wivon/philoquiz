"use client";

import { useState } from "react";

import type { LiveQuestion } from "@/lib/types";
import { AnswerGrid } from "./AnswerGrid";
import { Countdown } from "./Countdown";

export function QuestionView({
  question,
  receivedAt,
  answered,
  onAnswer,
}: {
  question: LiveQuestion;
  receivedAt: number;
  answered: { count: number; total: number } | null;
  onAnswer: (i: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  const pick = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    onAnswer(i);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex items-center justify-between text-white">
        <span className="rounded-full bg-white/15 px-4 py-1 font-bold">
          {question.notionLabel}
        </span>
        <span className="font-black">
          Question {question.index + 1}/{question.total}
        </span>
        <Countdown
          startedAt={receivedAt}
          duration={question.duration}
          onExpire={() => setSelected((s) => s)}
        />
      </div>

      <div className="rounded-3xl bg-white p-6 text-center shadow-2xl sm:p-8">
        <h2 className="text-2xl font-black leading-snug text-violet-900 sm:text-3xl">
          {question.question}
        </h2>
      </div>

      <AnswerGrid
        answers={question.answers}
        onAnswer={pick}
        selected={selected}
        disabled={selected !== null}
      />

      <div className="text-center font-bold text-white">
        {selected !== null ? (
          <p className="float-up text-xl">
            ✅ Réponse enregistrée ! En attente des autres…
          </p>
        ) : (
          <p className="text-white/70">Choisis une réponse 👆</p>
        )}
        {answered && (
          <p className="mt-1 text-white/80">
            {answered.count}/{answered.total} ont répondu
          </p>
        )}
      </div>
    </div>
  );
}
