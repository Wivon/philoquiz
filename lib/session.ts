import type { EngineSnapshot } from "./host-engine";

/**
 * Persisted in sessionStorage so an accidental page refresh keeps the user in
 * the game. sessionStorage survives a reload but not a tab close — exactly the
 * "oops, I refreshed" case.
 */
export interface SavedSession {
  role: "host" | "join" | "present";
  pin: string;
  name: string;
  emoji: string;
  playerId: string;
  /** Host/présentateur only: full authoritative game state to rebuild on reload. */
  snapshot?: EngineSnapshot;
}

const KEY = "philoquiz:session";

export function saveSession(session: SavedSession): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable / quota — ignore, the game still works live */
  }
}

export function loadSession(): SavedSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SavedSession;
    if (!s || !s.role || !s.pin || !s.playerId) return null;
    return s;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
