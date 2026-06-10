"use client";

import type { LiveQuestion } from "@/lib/types";
import { AnswerGrid } from "./AnswerGrid";
import { Countdown } from "./Countdown";

/** Read-only "board" view of a question — for projecting in class. The host
 *  presenter does not answer; it just shows the question and live progress. */
export function PresenterQuestion({
  question,
  receivedAt,
  answered,
}: {
  question: LiveQuestion;
  receivedAt: number;
  answered: { count: number; total: number } | null;
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between text-white">
        <span className="rounded-full bg-white/15 px-4 py-1 text-lg font-bold">
          {question.notionLabel}
        </span>
        <span className="text-xl font-black">
          Question {question.index + 1}/{question.total}
        </span>
        <Countdown startedAt={receivedAt} duration={question.duration} />
      </div>

      <div className="rounded-3xl bg-white p-8 text-center shadow-2xl">
        <h2 className="text-3xl font-black leading-snug text-violet-900 sm:text-4xl">
          {question.question}
        </h2>
      </div>

      {/* Non-interactive: no onAnswer, so tiles are just displayed. */}
      <AnswerGrid answers={question.answers} disabled />

      <div className="text-center text-2xl font-black text-white">
        {answered ? (
          <span>
            {answered.count} / {answered.total} ont répondu
          </span>
        ) : (
          <span className="text-white/70">En attente des réponses…</span>
        )}
      </div>
    </div>
  );
}
