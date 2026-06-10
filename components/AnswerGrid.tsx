"use client";

import { ANSWER_SHAPES } from "./ui";

export function AnswerGrid({
  answers,
  onAnswer,
  selected,
  correctIndex,
  counts,
  disabled = false,
}: {
  answers: string[];
  onAnswer?: (i: number) => void;
  /** Index the player picked (highlighted while waiting). */
  selected?: number | null;
  /** When set, reveals the correct answer and dims the others. */
  correctIndex?: number | null;
  /** When revealing, number of players who chose each answer. */
  counts?: number[];
  disabled?: boolean;
}) {
  const revealing = correctIndex != null && correctIndex >= 0;

  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
      {answers.map((answer, i) => {
        const isCorrect = revealing && i === correctIndex;
        const isSelected = selected === i;
        const dim = revealing && !isCorrect;
        const classes = [
          "answer-tile",
          `a${i}`,
          dim ? "tile-dim" : "",
          isCorrect ? "tile-correct" : "",
          isSelected && !revealing ? "tile-correct" : "",
        ].join(" ");
        return (
          <button
            key={i}
            className={classes}
            disabled={disabled || !onAnswer}
            onClick={() => onAnswer?.(i)}
          >
            <span className="answer-shape">{ANSWER_SHAPES[i]}</span>
            <span className="flex-1">{answer}</span>
            {revealing && counts && (
              <span className="rounded-full bg-black/25 px-2 py-0.5 text-sm">
                {counts[i]}
              </span>
            )}
            {isCorrect && <span className="text-xl">✓</span>}
          </button>
        );
      })}
    </div>
  );
}
