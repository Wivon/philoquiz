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

export interface HostPlayer extends Player {
  currentAnswer: number | null;
  currentTimeLeft: number;
  lastGain: number;
  lastCorrect: boolean;
}

/** Full authoritative state, serialisable so the host can rebuild after a refresh. */
export interface EngineSnapshot {
  pin: string;
  hostId: string;
  hostPlays: boolean;
  players: HostPlayer[];
  selectedNotions: NotionId[];
  questionCount: number;
  questionDuration: number;
  phase: GamePhase;
  quiz: Question[];
  currentIndex: number;
  questionStartedAt: number;
}

/** Events produced by the engine — the host renders them locally AND broadcasts them. */
export type EngineEvent =
  | { kind: "room"; state: RoomState }
  | { kind: "question"; question: LiveQuestion }
  | { kind: "reveal"; result: QuestionResult }
  | { kind: "finished"; leaderboard: LeaderboardEntry[] }
  | { kind: "answered"; count: number; total: number };

/**
 * Once everyone has answered, wait this long before revealing — a small window
 * so a player can still change their mind, without the long timer wait.
 */
const ALL_ANSWERED_GRACE_MS = 1500;

/**
 * Authoritative game state, run inside the host's browser. It owns the player
 * list, the quiz, the timers and the scoring. The hook wires PeerJS to `emit`.
 */
export class HostEngine {
  readonly pin: string;
  readonly hostId: string;
  private hostPlays: boolean;
  private players = new Map<string, HostPlayer>();
  private selectedNotions: NotionId[] = [];
  private questionCount = DEFAULT_QUESTION_COUNT;
  private questionDuration = DEFAULT_QUESTION_DURATION;
  private phase: GamePhase = "lobby";
  private quiz: Question[] = [];
  private currentIndex = 0;
  private questionStartedAt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private graceTimer: ReturnType<typeof setTimeout> | null = null;
  private emit: (e: EngineEvent) => void;

  constructor(
    pin: string,
    hostId: string,
    hostName: string,
    hostEmoji: string,
    emit: (e: EngineEvent) => void,
    /** When false, the host only presents (board mode) and is not a player. */
    hostPlays = true,
    /** When false, the host player is not added (used when restoring from a snapshot). */
    addHost = true,
  ) {
    this.pin = pin;
    this.hostId = hostId;
    this.emit = emit;
    this.hostPlays = hostPlays;
    if (addHost && hostPlays) {
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

  // ---- snapshots / restore ----

  toSnapshot(): EngineSnapshot {
    return {
      pin: this.pin,
      hostId: this.hostId,
      hostPlays: this.hostPlays,
      players: [...this.players.values()],
      selectedNotions: this.selectedNotions,
      questionCount: this.questionCount,
      questionDuration: this.questionDuration,
      phase: this.phase,
      quiz: this.quiz,
      currentIndex: this.currentIndex,
      questionStartedAt: this.questionStartedAt,
    };
  }

  static fromSnapshot(
    s: EngineSnapshot,
    emit: (e: EngineEvent) => void,
  ): HostEngine {
    const e = new HostEngine(
      s.pin,
      s.hostId,
      "",
      "",
      emit,
      s.hostPlays,
      false,
    );
    e.players = new Map(s.players.map((p) => [p.id, { ...p }]));
    e.selectedNotions = s.selectedNotions;
    e.questionCount = s.questionCount;
    e.questionDuration = s.questionDuration ?? DEFAULT_QUESTION_DURATION;
    e.phase = s.phase;
    e.quiz = s.quiz;
    e.currentIndex = s.currentIndex;
    e.questionStartedAt = s.questionStartedAt;
    // Resume the question timer with whatever time is left.
    if (e.phase === "question") {
      const remaining =
        e.questionDuration * 1000 - (Date.now() - e.questionStartedAt);
      e.timer = setTimeout(() => e.endQuestion(), Math.max(0, remaining));
      e.maybeStartGrace();
    }
    return e;
  }

  // ---- snapshots of the public state ----

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
      questionDuration: this.questionDuration,
      currentQuestionIndex: this.currentIndex,
      totalQuestions: this.quiz.length,
    };
  }

  getState(): RoomState {
    return this.roomState();
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

  private buildLive(elapsedMs: number): LiveQuestion {
    const q = this.quiz[this.currentIndex];
    return {
      index: this.currentIndex,
      total: this.quiz.length,
      notion: q.notion,
      notionLabel: notionLabel(q.notion),
      question: q.question,
      answers: q.answers,
      duration: this.questionDuration,
      startedAt: this.questionStartedAt,
      elapsedMs,
    };
  }

  /** Question payload for a player (re)connecting mid-question. */
  currentQuestionPayload(): LiveQuestion | null {
    if (this.phase !== "question") return null;
    return this.buildLive(Date.now() - this.questionStartedAt);
  }

  /** Question data to accompany a reveal when a player reconnects mid-leaderboard. */
  revealQuestionPayload(): LiveQuestion | null {
    if (this.phase !== "leaderboard") return null;
    return this.buildLive(0);
  }

  /** Reveal payload for a player reconnecting during the leaderboard phase. */
  currentRevealPayload(): QuestionResult | null {
    if (this.phase !== "leaderboard") return null;
    const q = this.quiz[this.currentIndex];
    const answerCounts = [0, 0, 0, 0];
    for (const p of this.players.values()) {
      if (p.currentAnswer !== null) answerCounts[p.currentAnswer]++;
    }
    return {
      correctIndex: q.correct,
      explanation: q.explanation,
      answerCounts,
      leaderboard: this.leaderboard(),
    };
  }

  private broadcastRoom() {
    this.emit({ kind: "room", state: this.roomState() });
  }

  // ---- lobby actions ----

  /** Adds a player, or reconnects a known one (keeping their score). */
  addPlayer(
    playerId: string,
    name: string,
    emoji: string,
  ): { ok: boolean; reconnected?: boolean; error?: string } {
    const existing = this.players.get(playerId);
    if (existing) {
      existing.name = name.trim().slice(0, 20) || existing.name;
      existing.emoji = emoji || existing.emoji;
      existing.connected = true;
      this.broadcastRoom();
      return { ok: true, reconnected: true };
    }
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
  }

  /** A player's connection dropped (may reconnect): mark disconnected, keep score. */
  markDisconnected(playerId: string) {
    const p = this.players.get(playerId);
    if (!p || !p.connected) return;
    p.connected = false;
    this.broadcastRoom();
    // A drop may mean the remaining connected players have all answered.
    this.maybeStartGrace();
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

  setQuestionDuration(seconds: number) {
    if (this.phase !== "lobby") return;
    if (seconds < 5 || seconds > 300) return;
    this.questionDuration = seconds;
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
    this.clearGrace();
    for (const p of this.players.values()) {
      p.currentAnswer = null;
      p.currentTimeLeft = 0;
      p.lastGain = 0;
      p.lastCorrect = false;
    }
    this.phase = "question";
    this.questionStartedAt = Date.now();
    this.broadcastRoom();
    this.emit({ kind: "question", question: this.buildLive(0) });
    this.timer = setTimeout(
      () => this.endQuestion(),
      this.questionDuration * 1000,
    );
  }

  recordAnswer(playerId: string, answerIndex: number) {
    if (this.phase !== "question") return;
    const p = this.players.get(playerId);
    if (!p) return;
    if (answerIndex < 0 || answerIndex > 3) return;
    // Players may change their answer until the timer runs out; the score uses
    // the moment of their LAST choice, so re-answering re-stamps the time.
    const elapsed = (Date.now() - this.questionStartedAt) / 1000;
    p.currentAnswer = answerIndex;
    p.currentTimeLeft = Math.max(0, this.questionDuration - elapsed);
    const total = this.players.size;
    const count = [...this.players.values()].filter(
      (x) => x.currentAnswer !== null,
    ).length;
    this.emit({ kind: "answered", count, total });
    this.maybeStartGrace();
  }

  /** When every connected player has answered, reveal after a short grace delay. */
  private maybeStartGrace() {
    if (this.phase !== "question" || this.graceTimer) return;
    const active = [...this.players.values()].filter((p) => p.connected);
    if (active.length > 0 && active.every((p) => p.currentAnswer !== null)) {
      this.graceTimer = setTimeout(
        () => this.endQuestion(),
        ALL_ANSWERED_GRACE_MS,
      );
    }
  }

  private clearGrace() {
    if (this.graceTimer) {
      clearTimeout(this.graceTimer);
      this.graceTimer = null;
    }
  }

  private endQuestion() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.clearGrace();
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
        this.questionDuration,
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
    this.clearGrace();
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
    this.clearGrace();
  }
}
