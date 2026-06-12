"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DataConnection, Peer } from "peerjs";

import { HostEngine, type EngineEvent } from "@/lib/host-engine";
import {
  CONNECTION_ERROR_MESSAGE,
  ROOM_NOT_FOUND_MESSAGE,
  hostPeerId,
  type CreateRoomResult,
  type HostMessage,
  type JoinResult,
  type PlayerMessage,
} from "@/lib/realtime";
import {
  clearSession,
  loadSession,
  saveSession,
  type SavedSession,
} from "@/lib/session";
import type {
  LeaderboardEntry,
  LiveQuestion,
  NotionId,
  QuestionResult,
  RoomState,
} from "@/lib/types";

export const CONNECTION_ERROR = CONNECTION_ERROR_MESSAGE;

const MAX_RECONNECT_ATTEMPTS = 20;

export interface GameState {
  connected: boolean;
  connectionError: boolean;
  /** True while restoring/reconnecting after a refresh or dropped connection. */
  restoring: boolean;
  room: RoomState | null;
  question: { data: LiveQuestion; receivedAt: number } | null;
  reveal: QuestionResult | null;
  finished: LeaderboardEntry[] | null;
  answered: { count: number; total: number } | null;
  error: string | null;
  myId: string | null;
  shareUrl: string;
}

const INITIAL: GameState = {
  connected: false,
  connectionError: false,
  restoring: false,
  room: null,
  question: null,
  reveal: null,
  finished: null,
  answered: null,
  error: null,
  myId: null,
  shareUrl: "",
};

/** Random id that also works outside secure contexts (crypto.randomUUID is HTTPS-only). */
function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return crypto.randomUUID();
    } catch {
      /* fall through */
    }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function genPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const origin = () =>
  typeof window !== "undefined" ? window.location.origin : "";

export function useGame() {
  const [state, setState] = useState<GameState>(INITIAL);

  const peerRef = useRef<Peer | null>(null);
  const engineRef = useRef<HostEngine | null>(null);
  const roleRef = useRef<"host" | "player" | null>(null);
  const myIdRef = useRef<string>("");
  const connsRef = useRef<Map<string, DataConnection>>(new Map());
  const connPidRef = useRef<Map<DataConnection, string>>(new Map());
  const hostConnRef = useRef<DataConnection | null>(null);

  // Persistence / reconnection bookkeeping.
  const metaRef = useRef<Omit<SavedSession, "snapshot"> | null>(null);
  const intentionalLeaveRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const scheduleReconnectRef = useRef<() => void>(() => {});

  // ---- persistence ----
  const persistHost = useCallback(() => {
    const engine = engineRef.current;
    const meta = metaRef.current;
    if (!engine || !meta) return;
    saveSession({ ...meta, snapshot: engine.toSnapshot() });
  }, []);

  const teardown = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
    engineRef.current?.destroy();
    engineRef.current = null;
    try {
      hostConnRef.current?.close();
    } catch {
      /* ignore */
    }
    hostConnRef.current = null;
    connsRef.current.clear();
    connPidRef.current.clear();
    peerRef.current?.destroy();
    peerRef.current = null;
  }, []);

  // ---- host: render engine events locally, broadcast, and persist ----
  const applyEvent = useCallback((e: EngineEvent) => {
    switch (e.kind) {
      case "room":
        setState((s) => ({ ...s, room: e.state }));
        break;
      case "question":
        setState((s) => ({
          ...s,
          question: {
            data: e.question,
            receivedAt: Date.now() - e.question.elapsedMs,
          },
          reveal: null,
          finished: null,
          answered: null,
        }));
        break;
      case "reveal":
        setState((s) => ({ ...s, reveal: e.result }));
        break;
      case "finished":
        setState((s) => ({ ...s, finished: e.leaderboard, question: null }));
        break;
      case "answered":
        setState((s) => ({
          ...s,
          answered: { count: e.count, total: e.total },
        }));
        break;
    }
  }, []);

  const broadcast = useCallback((msg: HostMessage) => {
    for (const conn of connsRef.current.values()) {
      try {
        conn.send(msg);
      } catch {
        /* ignore broken connection */
      }
    }
  }, []);

  const emitEngineEvent = useCallback(
    (e: EngineEvent) => {
      applyEvent(e);
      broadcast(eventToMessage(e));
      persistHost();
    },
    [applyEvent, broadcast, persistHost],
  );

  // ---- player: apply a message received from the host ----
  const applyHostMessage = useCallback((msg: HostMessage) => {
    switch (msg.type) {
      case "room":
        setState((s) => ({ ...s, room: msg.state, connected: true }));
        break;
      case "question":
        setState((s) => ({
          ...s,
          question: {
            data: msg.question,
            receivedAt: Date.now() - (msg.question.elapsedMs ?? 0),
          },
          reveal: null,
          finished: null,
          answered: null,
        }));
        break;
      case "reveal":
        setState((s) => ({ ...s, reveal: msg.result }));
        break;
      case "finished":
        setState((s) => ({ ...s, finished: msg.leaderboard, question: null }));
        break;
      case "answered":
        setState((s) => ({
          ...s,
          answered: { count: msg.count, total: msg.total },
        }));
        break;
      case "joinAck":
        break; // handled in connectAsPlayer
    }
  }, []);

  // ---- host: handle a player's connection ----
  const setupHostConnection = useCallback((conn: DataConnection) => {
    conn.on("data", (raw) => {
      const msg = raw as PlayerMessage;
      const engine = engineRef.current;
      if (!engine) return;
      if (msg.type === "join") {
        connsRef.current.set(msg.playerId, conn);
        connPidRef.current.set(conn, msg.playerId);
        const res = engine.addPlayer(msg.playerId, msg.name, msg.emoji);
        try {
          conn.send({ type: "joinAck", ok: res.ok, error: res.error });
        } catch {
          /* ignore */
        }
        if (!res.ok) {
          connsRef.current.delete(msg.playerId);
          connPidRef.current.delete(conn);
          setTimeout(() => conn.close(), 200);
          return;
        }
        // Catch-up: put the (re)connecting player on the right screen.
        try {
          conn.send({ type: "room", state: engine.getState() });
          const phase = engine.getState().phase;
          if (phase === "question") {
            const q = engine.currentQuestionPayload();
            if (q) conn.send({ type: "question", question: q });
          } else if (phase === "leaderboard") {
            const q = engine.revealQuestionPayload();
            if (q) conn.send({ type: "question", question: q });
            const r = engine.currentRevealPayload();
            if (r) conn.send({ type: "reveal", result: r });
          } else if (phase === "finished") {
            conn.send({ type: "finished", leaderboard: engine.leaderboard() });
          }
        } catch {
          /* ignore */
        }
      } else if (msg.type === "answer") {
        const pid = connPidRef.current.get(conn);
        if (pid) engine.recordAnswer(pid, msg.answerIndex);
      } else if (msg.type === "leave") {
        const pid = connPidRef.current.get(conn);
        if (pid) {
          engine.removePlayer(pid);
          connsRef.current.delete(pid);
        }
        connPidRef.current.delete(conn);
        persistHost();
      }
    });
    conn.on("close", () => {
      const pid = connPidRef.current.get(conn);
      connPidRef.current.delete(conn);
      if (!pid) return;
      if (connsRef.current.get(pid) === conn) connsRef.current.delete(pid);
      const engine = engineRef.current;
      if (!engine) return;
      // In the lobby a drop means "left"; mid-game keep the player so they can reconnect.
      if (engine.getState().phase === "lobby") engine.removePlayer(pid);
      else engine.markDisconnected(pid);
      persistHost();
    });
  }, [persistHost]);

  // ---- HOST: create a room ----
  const createRoom = useCallback(
    async (
      name: string,
      emoji: string,
      play = true,
    ): Promise<CreateRoomResult> => {
      roleRef.current = "host";
      intentionalLeaveRef.current = false;
      const myId = genId();
      myIdRef.current = myId;

      const PeerCtor = (await import("peerjs")).Peer;

      return new Promise<CreateRoomResult>((resolve, reject) => {
        let attempts = 0;
        const tryOpen = () => {
          attempts++;
          const pin = genPin();
          const peer = new PeerCtor(hostPeerId(pin));
          peerRef.current = peer;

          const onError = (err: { type?: string }) => {
            if (err.type === "unavailable-id" && attempts < 5) {
              peer.destroy();
              tryOpen();
              return;
            }
            peer.off("open", onOpen);
            reject(new Error(err.type ?? "peer-error"));
          };
          const onOpen = () => {
            peer.off("error", onError);
            const engine = new HostEngine(
              pin,
              myId,
              name,
              emoji,
              emitEngineEvent,
              play,
            );
            engineRef.current = engine;
            metaRef.current = {
              role: play ? "host" : "present",
              pin,
              name,
              emoji,
              playerId: myId,
            };
            peer.on("connection", setupHostConnection);
            setState((s) => ({
              ...s,
              connected: true,
              connectionError: false,
              myId,
              shareUrl: origin(),
              room: engine.getState(),
            }));
            persistHost();
            resolve({ pin, playerId: myId });
          };

          peer.once("open", onOpen);
          peer.on("error", onError);
        };
        tryOpen();
      });
    },
    [emitEngineEvent, setupHostConnection, persistHost],
  );

  // ---- PLAYER: open a connection to the host (used for join AND reconnect) ----
  const connectAsPlayer = useCallback(
    (pin: string, name: string, emoji: string, playerId: string) =>
      new Promise<JoinResult>((resolve) => {
        let settled = false;
        const finish = (res: JoinResult) => {
          if (settled) return;
          settled = true;
          resolve(res);
        };

        import("peerjs")
          .then(({ Peer: PeerCtor }) => {
            const peer = new PeerCtor();
            peerRef.current = peer;

            const timeout = setTimeout(
              () => finish({ ok: false, error: ROOM_NOT_FOUND_MESSAGE }),
              9000,
            );

            peer.on("error", (err: { type?: string }) => {
              clearTimeout(timeout);
              finish({
                ok: false,
                error:
                  err.type === "peer-unavailable"
                    ? ROOM_NOT_FOUND_MESSAGE
                    : CONNECTION_ERROR_MESSAGE,
              });
            });

            peer.once("open", () => {
              const conn = peer.connect(hostPeerId(pin), { reliable: true });
              hostConnRef.current = conn;
              conn.on("open", () => {
                const join: PlayerMessage = {
                  type: "join",
                  playerId,
                  name,
                  emoji,
                };
                conn.send(join);
              });
              conn.on("data", (raw) => {
                const msg = raw as HostMessage;
                if (msg.type === "joinAck") {
                  clearTimeout(timeout);
                  if (msg.ok) {
                    reconnectAttemptsRef.current = 0;
                    setState((s) => ({
                      ...s,
                      connected: true,
                      connectionError: false,
                      restoring: false,
                      myId: playerId,
                      error: null,
                    }));
                    finish({ ok: true, playerId });
                  } else {
                    finish({
                      ok: false,
                      error: msg.error ?? ROOM_NOT_FOUND_MESSAGE,
                    });
                  }
                  return;
                }
                applyHostMessage(msg);
              });
              conn.on("close", () => {
                setState((s) => ({ ...s, connected: false }));
                if (!intentionalLeaveRef.current) scheduleReconnectRef.current();
              });
            });
          })
          .catch(() => finish({ ok: false, error: CONNECTION_ERROR_MESSAGE }));
      }),
    [applyHostMessage],
  );

  // ---- PLAYER: reconnection loop (host refresh / temporary drop) ----
  const scheduleReconnect = useCallback(() => {
    if (intentionalLeaveRef.current) return;
    const meta = metaRef.current;
    if (!meta || meta.role !== "join") return;
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      clearSession();
      setState((s) => ({
        ...s,
        restoring: false,
        room: null,
        error: ROOM_NOT_FOUND_MESSAGE,
      }));
      return;
    }
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    setState((s) => ({ ...s, restoring: true }));
    reconnectTimerRef.current = setTimeout(async () => {
      reconnectAttemptsRef.current++;
      try {
        peerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      peerRef.current = null;
      const res = await connectAsPlayer(
        meta.pin,
        meta.name,
        meta.emoji,
        myIdRef.current,
      );
      if (!res.ok && !intentionalLeaveRef.current) scheduleReconnect();
    }, 1500);
  }, [connectAsPlayer]);

  useEffect(() => {
    scheduleReconnectRef.current = scheduleReconnect;
  }, [scheduleReconnect]);

  const joinRoom = useCallback(
    async (pin: string, name: string, emoji: string): Promise<JoinResult> => {
      roleRef.current = "player";
      intentionalLeaveRef.current = false;
      reconnectAttemptsRef.current = 0;
      const myId = genId();
      myIdRef.current = myId;
      metaRef.current = { role: "join", pin, name, emoji, playerId: myId };
      const res = await connectAsPlayer(pin, name, emoji, myId);
      if (res.ok) {
        saveSession({ role: "join", pin, name, emoji, playerId: myId });
      }
      return res;
    },
    [connectAsPlayer],
  );

  // ---- restore after a refresh (runs once on mount) ----
  useEffect(() => {
    let cancelled = false;
    const session = loadSession();
    if (session) {
      setState((s) => ({ ...s, restoring: true }));
      void restoreFromSession(session, () => cancelled);
    }
    return () => {
      cancelled = true;
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restoreFromSession = async (
    session: SavedSession,
    isCancelled: () => boolean,
  ) => {
    intentionalLeaveRef.current = false;
    myIdRef.current = session.playerId;
    reconnectAttemptsRef.current = 0;
    metaRef.current = {
      role: session.role,
      pin: session.pin,
      name: session.name,
      emoji: session.emoji,
      playerId: session.playerId,
    };

    if (session.role === "join") {
      roleRef.current = "player";
      const res = await connectAsPlayer(
        session.pin,
        session.name,
        session.emoji,
        session.playerId,
      );
      if (isCancelled()) return;
      if (!res.ok) scheduleReconnectRef.current();
      return;
    }

    // host / présentateur
    roleRef.current = "host";
    if (!session.snapshot) {
      clearSession();
      setState((s) => ({ ...s, restoring: false }));
      return;
    }
    let PeerCtor: typeof import("peerjs").Peer;
    try {
      PeerCtor = (await import("peerjs")).Peer;
    } catch {
      clearSession();
      setState((s) => ({
        ...s,
        restoring: false,
        error: CONNECTION_ERROR_MESSAGE,
      }));
      return;
    }
    if (isCancelled()) return;

    let attempts = 0;
    const tryOpen = () => {
      if (isCancelled()) return;
      const peer = new PeerCtor(hostPeerId(session.pin));
      peerRef.current = peer;
      const onError = (err: { type?: string }) => {
        if (err.type === "unavailable-id" && attempts < 6) {
          attempts++;
          peer.destroy();
          setTimeout(tryOpen, 800);
          return;
        }
        peer.off("open", onOpen);
        clearSession();
        setState((s) => ({
          ...s,
          restoring: false,
          error: CONNECTION_ERROR_MESSAGE,
        }));
      };
      const onOpen = () => {
        peer.off("error", onError);
        const engine = HostEngine.fromSnapshot(session.snapshot!, emitEngineEvent);
        engineRef.current = engine;
        peer.on("connection", setupHostConnection);
        const rs = engine.getState();
        setState((s) => {
          const next: GameState = {
            ...s,
            connected: true,
            connectionError: false,
            restoring: false,
            myId: session.playerId,
            shareUrl: origin(),
            room: rs,
            question: null,
            reveal: null,
            finished: null,
          };
          if (rs.phase === "question") {
            const q = engine.currentQuestionPayload();
            if (q) next.question = { data: q, receivedAt: Date.now() - q.elapsedMs };
          } else if (rs.phase === "leaderboard") {
            const q = engine.revealQuestionPayload();
            if (q) next.question = { data: q, receivedAt: Date.now() };
            next.reveal = engine.currentRevealPayload();
          } else if (rs.phase === "finished") {
            next.finished = engine.leaderboard();
          }
          return next;
        });
        persistHost();
      };
      peer.once("open", onOpen);
      peer.on("error", onError);
    };
    tryOpen();
  };

  // ---- actions (role-aware) ----
  const setNotions = useCallback((n: NotionId[]) => {
    engineRef.current?.setNotions(n);
  }, []);
  const setQuestionCount = useCallback((c: number) => {
    engineRef.current?.setQuestionCount(c);
  }, []);
  const setQuestionDuration = useCallback((s: number) => {
    engineRef.current?.setQuestionDuration(s);
  }, []);
  const start = useCallback(() => engineRef.current?.start(), []);
  const next = useCallback(() => engineRef.current?.next(), []);
  const restart = useCallback(() => engineRef.current?.restart(), []);

  const answer = useCallback((i: number) => {
    if (roleRef.current === "host") {
      engineRef.current?.recordAnswer(myIdRef.current, i);
    } else {
      try {
        hostConnRef.current?.send({ type: "answer", answerIndex: i });
      } catch {
        /* ignore */
      }
    }
  }, []);

  const leave = useCallback(() => {
    intentionalLeaveRef.current = true;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
    if (roleRef.current === "player") {
      try {
        hostConnRef.current?.send({ type: "leave" });
      } catch {
        /* ignore */
      }
    }
    clearSession();
    teardown();
    metaRef.current = null;
    roleRef.current = null;
    setState(INITIAL);
  }, [teardown]);

  return {
    ...state,
    createRoom,
    joinRoom,
    setNotions,
    setQuestionCount,
    setQuestionDuration,
    start,
    answer,
    next,
    restart,
    leave,
  };
}

function eventToMessage(e: EngineEvent): HostMessage {
  switch (e.kind) {
    case "room":
      return { type: "room", state: e.state };
    case "question":
      return { type: "question", question: e.question };
    case "reveal":
      return { type: "reveal", result: e.result };
    case "finished":
      return { type: "finished", leaderboard: e.leaderboard };
    case "answered":
      return { type: "answered", count: e.count, total: e.total };
  }
}
