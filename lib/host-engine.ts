import { notionLabel } from "./notions";
import { buildQuiz } from "./questions";
import { DEFAULT_QUESTION_COUNT, DEFAULT_QUESTION_DURATION } from "./realtime";
import { computeScore } from "./scoring";
import type {
  GamePhase,
  LeaderboardEntry,
  LiveQuestion,
  NotionId,
  Player,
  Question,
  QuestionResult,
  RoomState,
} from "./types";

interface HostPlayer extends Player {
  currentAnswer: number | null;
  currentTimeLeft: number;
  lastGain: number;
  lastCorrect: boolean;
}

/** Events produced by the engine — the host renders them locally AND broadcasts them. */
export type EngineEvent =
  | { kind: "room"; state: RoomState }
  | { kind: "question"; question: LiveQuestion }
  | { kind: "reveal"; result: QuestionResult }
  | { kind: "finished"; leaderboard: LeaderboardEntry[] }
  | { kind: "answered"; count: number; total: number };

/**
 * Authoritative game state, run inside the host's browser. It owns the player
 * list, the quiz, the timers and the scoring — exactly what the old Socket.IO
 * server did, minus the network (the hook wires PeerJS to `emit`).
 */
export class HostEngine {
  readonly pin: string;
  readonly hostId: string;
  private players = new Map<string, HostPlayer>();
  private selectedNotions: NotionId[] = [];
  private questionCount = DEFAULT_QUESTION_COUNT;
  private phase: GamePhase = "lobby";
  private quiz: Question[] = [];
  private currentIndex = 0;
  private questionStartedAt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private emit: (e: EngineEvent) => void;

  constructor(
    pin: string,
    hostId: string,
    hostName: string,
    hostEmoji: string,
    emit: (e: EngineEvent) => void,
    /** When false, the host only presents (board mode) and is not a player. */
    hostPlays = true,
  ) {
    this.pin = pin;
    this.hostId = hostId;
    this.emit = emit;
    if (hostPlays) {
      this.players.set(hostId, {
        id: hostId,
        name: hostName.trim().slice(0, 20) || "Hôte",
        emoji: hostEmoji || "🧑",
        score: 0,
        isHost: true,
        connected: true,
        currentAnswer: null,
        currentTimeLeft: 0,
        lastGain: 0,
        lastCorrect: false,
      });
    }
  }

  // ---- snapshots ----

  roomState(): RoomState {
    return {
      pin: this.pin,
      phase: this.phase,
      players: [...this.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        score: p.score,
        isHost: p.isHost,
        connected: p.connected,
      })),
      selectedNotions: this.selectedNotions,
      hostId: this.hostId,
      questionCount: this.questionCount,
      currentQuestionIndex: this.currentIndex,
      totalQuestions: this.quiz.length,
    };
  }

  leaderboard(): LeaderboardEntry[] {
    return [...this.players.values()]
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        score: p.score,
        lastGain: p.lastGain,
        lastCorrect: p.lastCorrect,
        rank: i + 1,
      }));
  }

  private broadcastRoom() {
    this.emit({ kind: "room", state: this.roomState() });
  }

  getState(): RoomState {
    return this.roomState();
  }

  // ---- lobby actions ----

  addPlayer(
    playerId: string,
    name: string,
    emoji: string,
  ): { ok: boolean; error?: string } {
    if (this.phase !== "lobby") {
      return { ok: false, error: "La partie a déjà commencé." };
    }
    const cleanName = name.trim().slice(0, 20);
    if (!cleanName) return { ok: false, error: "Choisis un prénom." };
    this.players.set(playerId, {
      id: playerId,
      name: cleanName,
      emoji: emoji || "🙂",
      score: 0,
      isHost: false,
      connected: true,
      currentAnswer: null,
      currentTimeLeft: 0,
      lastGain: 0,
      lastCorrect: false,
    });
    this.broadcastRoom();
    return { ok: true };
  }

  removePlayer(playerId: string) {
    if (playerId === this.hostId) return; // host leaving ends the game elsewhere
    if (!this.players.delete(playerId)) return;
    this.broadcastRoom();
    if (this.phase === "question") this.maybeEndEarly();
  }

  setNotions(notions: NotionId[]) {
    if (this.phase !== "lobby") return;
    this.selectedNotions = notions;
    this.broadcastRoom();
  }

  setQuestionCount(count: number) {
    if (this.phase !== "lobby") return;
    this.questionCount = count;
    this.broadcastRoom();
  }

  start() {
    if (this.phase !== "lobby" || this.selectedNotions.length === 0) return;
    this.quiz = buildQuiz(this.selectedNotions, this.questionCount);
    if (this.quiz.length === 0) return;
    this.currentIndex = 0;
    for (const p of this.players.values()) p.score = 0;
    this.startQuestion();
  }

  // ---- question lifecycle ----

  private startQuestion() {
    if (this.timer) clearTimeout(this.timer);
    const q = this.quiz[this.currentIndex];
    for (const p of this.players.values()) {
      p.currentAnswer = null;
      p.currentTimeLeft = 0;
      p.lastGain = 0;
      p.lastCorrect = false;
    }
    this.phase = "question";
    this.questionStartedAt = Date.now();
    this.broadcastRoom();
    const live: LiveQuestion = {
      index: this.currentIndex,
      total: this.quiz.length,
      notion: q.notion,
      notionLabel: notionLabel(q.notion),
      question: q.question,
      answers: q.answers,
      duration: DEFAULT_QUESTION_DURATION,
      startedAt: this.questionStartedAt,
    };
    this.emit({ kind: "question", question: live });
    this.timer = setTimeout(
      () => this.endQuestion(),
      DEFAULT_QUESTION_DURATION * 1000,
    );
  }

  recordAnswer(playerId: string, answerIndex: number) {
    if (this.phase !== "question") return;
    const p = this.players.get(playerId);
    if (!p || p.currentAnswer !== null) return;
    if (answerIndex < 0 || answerIndex > 3) return;
    const elapsed = (Date.now() - this.questionStartedAt) / 1000;
    p.currentAnswer = answerIndex;
    p.currentTimeLeft = Math.max(0, DEFAULT_QUESTION_DURATION - elapsed);
    const total = this.players.size;
    const count = [...this.players.values()].filter(
      (x) => x.currentAnswer !== null,
    ).length;
    this.emit({ kind: "answered", count, total });
    this.maybeEndEarly();
  }

  private maybeEndEarly() {
    const all = [...this.players.values()];
    if (all.length > 0 && all.every((p) => p.currentAnswer !== null)) {
      this.endQuestion();
    }
  }

  private endQuestion() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.phase !== "question") return;
    const q = this.quiz[this.currentIndex];
    const answerCounts = [0, 0, 0, 0];
    for (const p of this.players.values()) {
      if (p.currentAnswer === null) continue;
      answerCounts[p.currentAnswer]++;
      const correct = p.currentAnswer === q.correct;
      const gain = computeScore(
        correct,
        p.currentTimeLeft,
        DEFAULT_QUESTION_DURATION,
      );
      p.score += gain;
      p.lastGain = gain;
      p.lastCorrect = correct;
    }
    this.phase = "leaderboard";
    this.broadcastRoom();
    this.emit({
      kind: "reveal",
      result: {
        correctIndex: q.correct,
        explanation: q.explanation,
        answerCounts,
        leaderboard: this.leaderboard(),
      },
    });
  }

  next() {
    if (this.phase !== "leaderboard") return;
    this.currentIndex++;
    if (this.currentIndex >= this.quiz.length) {
      this.phase = "finished";
      this.broadcastRoom();
      this.emit({ kind: "finished", leaderboard: this.leaderboard() });
      return;
    }
    this.startQuestion();
  }

  restart() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.phase = "lobby";
    this.quiz = [];
    this.currentIndex = 0;
    for (const p of this.players.values()) {
      p.score = 0;
      p.currentAnswer = null;
      p.lastGain = 0;
      p.lastCorrect = false;
    }
    this.broadcastRoom();
  }

  destroy() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
