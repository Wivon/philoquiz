import type { NotionId, Question } from "../types";
import type { RawQuestion } from "./raw";

import { artQuestions } from "./art";
import { bonheurQuestions } from "./bonheur";
import { conscienceQuestions } from "./conscience";
import { devoirQuestions } from "./devoir";
import { etatQuestions } from "./etat";
import { inconscientQuestions } from "./inconscient";
import { justiceQuestions } from "./justice";
import { langageQuestions } from "./langage";
import { liberteQuestions } from "./liberte";
import { natureQuestions } from "./nature";
import { raisonQuestions } from "./raison";
import { religionQuestions } from "./religion";
import { scienceQuestions } from "./science";
import { techniqueQuestions } from "./technique";
import { tempsQuestions } from "./temps";
import { travailQuestions } from "./travail";
import { veriteQuestions } from "./verite";

const RAW_BY_NOTION: Record<NotionId, RawQuestion[]> = {
  art: artQuestions,
  bonheur: bonheurQuestions,
  conscience: conscienceQuestions,
  devoir: devoirQuestions,
  etat: etatQuestions,
  inconscient: inconscientQuestions,
  justice: justiceQuestions,
  langage: langageQuestions,
  liberte: liberteQuestions,
  nature: natureQuestions,
  raison: raisonQuestions,
  religion: religionQuestions,
  science: scienceQuestions,
  technique: techniqueQuestions,
  temps: tempsQuestions,
  travail: travailQuestions,
  verite: veriteQuestions,
};

/** All questions, tagged with their notion. */
export const ALL_QUESTIONS: Question[] = (
  Object.entries(RAW_BY_NOTION) as [NotionId, RawQuestion[]][]
).flatMap(([notion, list]) => list.map((q) => ({ ...q, notion })));

export function questionsForNotion(notion: NotionId): Question[] {
  return RAW_BY_NOTION[notion].map((q) => ({ ...q, notion }));
}

export function questionCountForNotion(notion: NotionId): number {
  return RAW_BY_NOTION[notion]?.length ?? 0;
}

/** Fisher-Yates shuffle (returns a new array). */
export function shuffle<T>(input: readonly T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build a quiz from the selected notions: gathers the questions, shuffles them,
 * and limits to `count`. Also shuffles each question's answers so the correct
 * answer isn't always in the same position.
 */
export function buildQuiz(notions: NotionId[], count: number): Question[] {
  const pool = notions.flatMap((n) => questionsForNotion(n));
  const picked = shuffle(pool).slice(0, count);
  return picked.map(shuffleAnswers);
}

/** Returns a copy of the question with answers shuffled and `correct` updated. */
export function shuffleAnswers(q: Question): Question {
  const indices = shuffle([0, 1, 2, 3]);
  const answers = indices.map((i) => q.answers[i]) as [
    string,
    string,
    string,
    string,
  ];
  const correct = indices.indexOf(q.correct);
  return { ...q, answers, correct };
}
