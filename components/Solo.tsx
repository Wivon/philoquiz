"use client";

import { useState } from "react";

import { NOTIONS, notionLabel } from "@/lib/notions";
import { buildQuiz } from "@/lib/questions";
import { computeScore } from "@/lib/scoring";
import { DEFAULT_QUESTION_COUNT, QUESTION_COUNT_OPTIONS } from "@/lib/realtime";
import type { NotionId, Question } from "@/lib/types";
import { AnswerGrid } from "./AnswerGrid";
import { Countdown } from "./Countdown";
import { NotionPicker } from "./NotionPicker";
import { Button, Card } from "./ui";

const SOLO_DURATION = 30;

type Phase = "setup" | "playing" | "reveal" | "done";

export function Solo({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [notions, setNotions] = useState<NotionId[]>([]);
  const [count, setCount] = useState<number>(DEFAULT_QUESTION_COUNT);
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [gained, setGained] = useState(0);

  const toggle = (id: NotionId) =>
    setNotions((cur) =>
      cur.includes(id) ? cur.filter((n) => n !== id) : [...cur, id],
    );

  const start = () => {
    const built = buildQuiz(notions, count);
    if (built.length === 0) return;
    setQuiz(built);
    setIndex(0);
    setScore(0);
    setCorrectCount(0);
    setSelected(null);
    setGained(0);
    setStartedAt(Date.now());
    setPhase("playing");
  };

  const answer = (i: number) => {
    if (selected !== null) return;
    const q = quiz[index];
    const timeLeft = Math.max(0, SOLO_DURATION - (Date.now() - startedAt) / 1000);
    const isCorrect = i === q.correct;
    const pts = computeScore(isCorrect, timeLeft, SOLO_DURATION);
    setSelected(i);
    setGained(pts);
    setScore((s) => s + pts);
    if (isCorrect) setCorrectCount((c) => c + 1);
    setPhase("reveal");
  };

  const timeout = () => {
    if (selected !== null || phase !== "playing") return;
    setSelected(-1);
    setGained(0);
    setPhase("reveal");
  };

  const nextQuestion = () => {
    if (index + 1 >= quiz.length) {
      setPhase("done");
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setGained(0);
    setStartedAt(Date.now());
    setPhase("playing");
  };

  // ---- Setup ----
  if (phase === "setup") {
    return (
      <Card className="screen-enter mx-auto flex max-w-2xl flex-col gap-5">
        <h2 className="text-center text-3xl font-black text-violet-900">
          Mode solo 🧠
        </h2>
        <NotionPicker
          selected={notions}
          onToggle={toggle}
          onSelectAll={() => setNotions(NOTIONS.map((n) => n.id))}
          onClear={() => setNotions([])}
        />
        <div>
          <p className="mb-2 font-bold text-violet-900">Nombre de questions</p>
          <div className="flex flex-wrap gap-2">
            {QUESTION_COUNT_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCount(c)}
                className={`rounded-2xl px-5 py-2 font-black transition ${
                  count === c
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
          onClick={start}
          disabled={notions.length === 0}
          className="w-full text-xl"
        >
          🚀 Commencer
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

  // ---- Done ----
  if (phase === "done") {
    return (
      <Card className="screen-enter mx-auto flex max-w-lg flex-col items-center gap-4 text-center">
        <h2 className="text-4xl font-black text-violet-900">Terminé ! 🎉</h2>
        <p className="text-2xl font-bold text-violet-700">
          {correctCount}/{quiz.length} bonnes réponses
        </p>
        <p className="text-5xl font-black text-violet-900">{score} pts</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => setPhase("setup")} className="text-lg">
            🔁 Rejouer
          </Button>
          <Button variant="secondary" onClick={onExit} className="text-lg">
            Accueil
          </Button>
        </div>
      </Card>
    );
  }

  const q = quiz[index];
  const isLast = index + 1 >= quiz.length;

  return (
    <div
      key={`${phase}-${index}`}
      className="screen-enter mx-auto flex w-full max-w-3xl flex-col gap-5"
    >
      <div className="flex items-center justify-between text-white">
        <span className="rounded-full bg-white/15 px-4 py-1 font-bold">
          {notionLabel(q.notion)}
        </span>
        <span className="font-black">
          {index + 1}/{quiz.length} · {score} pts
        </span>
        {phase === "playing" ? (
          <Countdown
            startedAt={startedAt}
            duration={SOLO_DURATION}
            onExpire={timeout}
          />
        ) : (
          <span className="h-20 w-20" />
        )}
      </div>

      <div className="scale-in rounded-3xl bg-white p-6 text-center shadow-2xl sm:p-8">
        <h2 className="text-2xl font-black leading-snug text-violet-900 sm:text-3xl">
          {q.question}
        </h2>
      </div>

      <AnswerGrid
        answers={q.answers}
        onAnswer={phase === "playing" ? answer : undefined}
        selected={selected}
        correctIndex={phase === "reveal" ? q.correct : null}
        disabled={phase !== "playing"}
      />

      {phase === "reveal" && (
        <Card>
          <p
            className={`text-center text-2xl font-black ${
              selected === q.correct ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {selected === q.correct
              ? `Bonne réponse ! +${gained} pts`
              : "Mauvaise réponse"}
          </p>
          <p className="mt-3 rounded-2xl bg-amber-50 p-4 text-violet-900">
            <span className="font-black">💡 À retenir : </span>
            {q.explanation}
          </p>
          <Button onClick={nextQuestion} className="mt-4 w-full text-xl">
            {isLast ? "🏁 Voir mon score" : "Question suivante →"}
          </Button>
        </Card>
      )}
    </div>
  );
}
