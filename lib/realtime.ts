import type {
  LeaderboardEntry,
  LiveQuestion,
  QuestionResult,
  RoomState,
} from "./types";

export const DEFAULT_QUESTION_DURATION = 25; // seconds
/** Seconds-per-question options the host can pick before starting. */
export const QUESTION_DURATION_OPTIONS = [10, 15, 20, 25, 30, 45, 60] as const;
export const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20, 30] as const;
export const DEFAULT_QUESTION_COUNT = 10;

/**
 * The PeerJS broker namespace is global (shared by every PeerJS app in the
 * world), so we use a distinctive prefix to avoid id collisions. The host
 * registers as `<prefix><pin>` and players connect to that id.
 */
export const PEER_PREFIX = "philoquiz-bac-9f3a2c-";
export const hostPeerId = (pin: string) => `${PEER_PREFIX}${pin}`;

/** Messages the host (authority) sends to players. */
export type HostMessage =
  | { type: "room"; state: RoomState }
  | { type: "question"; question: LiveQuestion }
  | { type: "reveal"; result: QuestionResult }
  | { type: "finished"; leaderboard: LeaderboardEntry[] }
  | { type: "answered"; count: number; total: number }
  | { type: "joinAck"; ok: boolean; error?: string };

/** Messages a player sends to the host. */
export type PlayerMessage =
  | { type: "join"; playerId: string; name: string; emoji: string }
  | { type: "answer"; answerIndex: number }
  | { type: "leave" };

export interface CreateRoomResult {
  pin: string;
  playerId: string;
}

export interface JoinResult {
  ok: boolean;
  playerId?: string;
  error?: string;
}

export const CONNECTION_ERROR_MESSAGE =
  "Impossible d'établir la connexion temps réel. Vérifie que tu as accès à Internet (nécessaire pour relier les appareils entre eux) puis réessaie.";

export const ROOM_NOT_FOUND_MESSAGE =
  "Aucune partie trouvée pour ce code PIN. Vérifie le code, et que l'hôte a bien créé la partie.";
