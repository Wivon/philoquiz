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
import type {
  LeaderboardEntry,
  LiveQuestion,
  NotionId,
  QuestionResult,
  RoomState,
} from "@/lib/types";

export const CONNECTION_ERROR = CONNECTION_ERROR_MESSAGE;

export interface GameState {
  connected: boolean;
  connectionError: boolean;
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

export function useGame() {
  const [state, setState] = useState<GameState>(INITIAL);

  const peerRef = useRef<Peer | null>(null);
  const engineRef = useRef<HostEngine | null>(null);
  const roleRef = useRef<"host" | "player" | null>(null);
  const myIdRef = useRef<string>("");
  // host: playerId -> connection, and the reverse lookup
  const connsRef = useRef<Map<string, DataConnection>>(new Map());
  const connPidRef = useRef<Map<DataConnection, string>>(new Map());
  // player: the single connection to the host
  const hostConnRef = useRef<DataConnection | null>(null);

  const teardown = useCallback(() => {
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
    roleRef.current = null;
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  // ---- host: render engine events locally, then broadcast to all players ----
  const applyEvent = useCallback((e: EngineEvent) => {
    switch (e.kind) {
      case "room":
        setState((s) => ({ ...s, room: e.state }));
        break;
      case "question":
        setState((s) => ({
          ...s,
          question: { data: e.question, receivedAt: Date.now() },
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
    },
    [applyEvent, broadcast],
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
          question: { data: msg.question, receivedAt: Date.now() },
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
        break; // handled in joinRoom
    }
  }, []);

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
      }
    });
    conn.on("close", () => {
      const pid = connPidRef.current.get(conn);
      if (pid) {
        engineRef.current?.removePlayer(pid);
        connsRef.current.delete(pid);
      }
      connPidRef.current.delete(conn);
    });
  }, []);

  // ---- HOST: create a room ----
  const createRoom = useCallback(
    async (
      name: string,
      emoji: string,
      play = true,
    ): Promise<CreateRoomResult> => {
      roleRef.current = "host";
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
            peer.on("connection", setupHostConnection);
            setState((s) => ({
              ...s,
              connected: true,
              connectionError: false,
              myId,
              shareUrl:
                typeof window !== "undefined" ? window.location.origin : "",
              room: engine.getState(),
            }));
            resolve({ pin, playerId: myId });
          };

          peer.once("open", onOpen);
          peer.on("error", onError);
        };
        tryOpen();
      });
    },
    [emitEngineEvent, setupHostConnection],
  );

  // ---- PLAYER: join a room ----
  const joinRoom = useCallback(
    async (pin: string, name: string, emoji: string): Promise<JoinResult> => {
      roleRef.current = "player";
      const myId = genId();
      myIdRef.current = myId;

      let PeerCtor: typeof import("peerjs").Peer;
      try {
        PeerCtor = (await import("peerjs")).Peer;
      } catch {
        return { ok: false, error: CONNECTION_ERROR_MESSAGE };
      }

      return new Promise<JoinResult>((resolve) => {
        const peer = new PeerCtor();
        peerRef.current = peer;
        let settled = false;
        const finish = (res: JoinResult) => {
          if (settled) return;
          settled = true;
          resolve(res);
        };

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
              playerId: myId,
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
                setState((s) => ({
                  ...s,
                  connected: true,
                  connectionError: false,
                  myId,
                  error: null,
                }));
                finish({ ok: true, playerId: myId });
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
          conn.on("close", () =>
            setState((s) => ({ ...s, connected: false })),
          );
        });
      });
    },
    [applyHostMessage],
  );

  // ---- actions (role-aware) ----
  const setNotions = useCallback((n: NotionId[]) => {
    engineRef.current?.setNotions(n);
  }, []);
  const setQuestionCount = useCallback((c: number) => {
    engineRef.current?.setQuestionCount(c);
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
    if (roleRef.current === "player") {
      try {
        hostConnRef.current?.send({ type: "leave" });
      } catch {
        /* ignore */
      }
    }
    teardown();
    setState(INITIAL);
  }, [teardown]);

  return {
    ...state,
    createRoom,
    joinRoom,
    setNotions,
    setQuestionCount,
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
