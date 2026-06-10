"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import type {
  ClientToServerEvents,
  CreateRoomResult,
  JoinResult,
  LiveQuestion,
  ServerToClientEvents,
} from "@/lib/socket-events";
import type {
  LeaderboardEntry,
  NotionId,
  QuestionResult,
  RoomState,
} from "@/lib/types";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface GameState {
  connected: boolean;
  room: RoomState | null;
  question: { data: LiveQuestion; receivedAt: number } | null;
  reveal: QuestionResult | null;
  finished: LeaderboardEntry[] | null;
  answered: { count: number; total: number } | null;
  error: string | null;
  myId: string | null;
  urls: string[];
}

export function useGame() {
  const socketRef = useRef<GameSocket | null>(null);
  const [state, setState] = useState<GameState>({
    connected: false,
    room: null,
    question: null,
    reveal: null,
    finished: null,
    answered: null,
    error: null,
    myId: null,
    urls: [],
  });

  useEffect(() => {
    const socket: GameSocket = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () =>
      setState((s) => ({ ...s, connected: true, myId: socket.id ?? null })),
    );
    socket.on("disconnect", () =>
      setState((s) => ({ ...s, connected: false })),
    );
    socket.on("room", (room) => setState((s) => ({ ...s, room })));
    socket.on("question", (q: LiveQuestion) =>
      setState((s) => ({
        ...s,
        question: { data: q, receivedAt: Date.now() },
        reveal: null,
        finished: null,
        answered: null,
      })),
    );
    socket.on("reveal", (reveal) => setState((s) => ({ ...s, reveal })));
    socket.on("finished", (finished) =>
      setState((s) => ({ ...s, finished, question: null })),
    );
    socket.on("answered", (answered) =>
      setState((s) => ({ ...s, answered })),
    );
    socket.on("errorMsg", (error) => setState((s) => ({ ...s, error })));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const createRoom = useCallback(
    (name: string, emoji: string) =>
      new Promise<CreateRoomResult>((resolve) => {
        socketRef.current?.emit("host:create", { name, emoji }, (res) => {
          setState((s) => ({ ...s, myId: res.playerId, urls: res.urls }));
          resolve(res);
        });
      }),
    [],
  );

  const joinRoom = useCallback(
    (pin: string, name: string, emoji: string) =>
      new Promise<JoinResult>((resolve) => {
        socketRef.current?.emit(
          "player:join",
          { pin, name, emoji },
          (res) => {
            if (res.ok && res.playerId) {
              setState((s) => ({ ...s, myId: res.playerId!, error: null }));
            }
            resolve(res);
          },
        );
      }),
    [],
  );

  const setNotions = useCallback((notions: NotionId[]) => {
    socketRef.current?.emit("host:setNotions", notions);
  }, []);

  const setQuestionCount = useCallback((count: number) => {
    socketRef.current?.emit("host:setQuestionCount", count);
  }, []);

  const start = useCallback(() => socketRef.current?.emit("host:start"), []);
  const answer = useCallback(
    (i: number) => socketRef.current?.emit("player:answer", i),
    [],
  );
  const next = useCallback(() => socketRef.current?.emit("host:next"), []);
  const restart = useCallback(() => socketRef.current?.emit("host:restart"), []);
  const leave = useCallback(() => socketRef.current?.emit("leave"), []);

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
