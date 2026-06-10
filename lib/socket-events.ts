import type {
  LeaderboardEntry,
  NotionId,
  PublicQuestion,
  QuestionResult,
  RoomState,
} from "./types";

/** A question as pushed to clients, with the server timestamp it started at. */
export interface LiveQuestion extends PublicQuestion {
  startedAt: number;
}

export interface CreateRoomResult {
  pin: string;
  playerId: string;
  /** http://<lan-ip>:<port> addresses the host can share. */
  urls: string[];
}

export interface JoinResult {
  ok: boolean;
  playerId?: string;
  error?: string;
}

export interface ServerToClientEvents {
  room: (state: RoomState) => void;
  question: (q: LiveQuestion) => void;
  reveal: (result: QuestionResult) => void;
  finished: (leaderboard: LeaderboardEntry[]) => void;
  answered: (info: { count: number; total: number }) => void;
  errorMsg: (message: string) => void;
}

export interface ClientToServerEvents {
  "host:create": (
    data: { name: string; emoji: string },
    cb: (res: CreateRoomResult) => void,
  ) => void;
  "player:join": (
    data: { pin: string; name: string; emoji: string },
    cb: (res: JoinResult) => void,
  ) => void;
  "host:setNotions": (notions: NotionId[]) => void;
  "host:setQuestionCount": (count: number) => void;
  "host:start": () => void;
  "player:answer": (answerIndex: number) => void;
  "host:next": () => void;
  "host:restart": () => void;
  leave: () => void;
}

export const DEFAULT_QUESTION_DURATION = 25; // seconds
export const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20] as const;
export const DEFAULT_QUESTION_COUNT = 10;
