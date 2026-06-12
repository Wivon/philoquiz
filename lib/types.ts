// Shared types used by both the Socket.IO server and the React client.

export type NotionId =
  | "art"
  | "bonheur"
  | "conscience"
  | "devoir"
  | "etat"
  | "inconscient"
  | "justice"
  | "langage"
  | "liberte"
  | "nature"
  | "raison"
  | "religion"
  | "science"
  | "technique"
  | "temps"
  | "travail"
  | "verite";

export interface Notion {
  id: NotionId;
  label: string;
  emoji: string;
}

export interface Question {
  notion: NotionId;
  question: string;
  /** Exactly 4 answers, mapped to the 4 Kahoot-style colored buttons. */
  answers: [string, string, string, string];
  /** Index (0-3) of the correct answer in `answers`. */
  correct: number;
  /** Short explanation shown after the question to help revision. */
  explanation: string;
}

/** A question as sent to clients DURING play — the correct answer is hidden. */
export interface PublicQuestion {
  index: number;
  total: number;
  notion: NotionId;
  notionLabel: string;
  question: string;
  answers: string[];
  /** Seconds allowed to answer. */
  duration: number;
}

/** A question as pushed to clients during play (correct answer hidden). */
export interface LiveQuestion extends PublicQuestion {
  /** Host timestamp (ms) when the question started. */
  startedAt: number;
  /**
   * Milliseconds already elapsed when this payload was sent. 0 at the start of
   * a question; > 0 in a catch-up sent to a player who (re)joined mid-question,
   * so their countdown resumes at the right point.
   */
  elapsedMs: number;
}

export interface Player {
  id: string;
  name: string;
  emoji: string;
  score: number;
  /** Whether this socket is the host of the room. */
  isHost: boolean;
  connected: boolean;
}

export type GamePhase =
  | "lobby"
  | "question"
  | "reveal"
  | "leaderboard"
  | "finished";

export interface LeaderboardEntry {
  id: string;
  name: string;
  emoji: string;
  score: number;
  /** Points gained on the last question (for the +X animation). */
  lastGain: number;
  rank: number;
  /** True if the player answered the last question correctly. */
  lastCorrect: boolean;
}

/** Result of a single question, broadcast during the "reveal" phase. */
export interface QuestionResult {
  correctIndex: number;
  explanation: string;
  /** How many players chose each of the 4 answers. */
  answerCounts: number[];
  leaderboard: LeaderboardEntry[];
}

/** Public snapshot of a room, kept in sync on every client. */
export interface RoomState {
  pin: string;
  phase: GamePhase;
  players: Player[];
  selectedNotions: NotionId[];
  hostId: string;
  questionCount: number;
  /** Seconds allowed per question (host-configurable). */
  questionDuration: number;
  currentQuestionIndex: number;
  totalQuestions: number;
}
