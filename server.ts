import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import next from "next";
import { Server } from "socket.io";

import { buildQuiz } from "./lib/questions";
import { notionLabel } from "./lib/notions";
import { computeScore } from "./lib/scoring";
import {
  DEFAULT_QUESTION_COUNT,
  DEFAULT_QUESTION_DURATION,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "./lib/socket-events";
import type {
  LeaderboardEntry,
  NotionId,
  Player,
  Question,
  RoomState,
} from "./lib/types";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
const hostname = "0.0.0.0";

// ---------------------------------------------------------------------------
// In-memory game state. The host's machine runs this; clients connect over LAN.
// ---------------------------------------------------------------------------

interface RoomPlayer extends Player {
  /** Answer index chosen for the current question (null = not answered). */
  currentAnswer: number | null;
  /** Time left (seconds) when the player answered the current question. */
  currentTimeLeft: number;
  lastGain: number;
  lastCorrect: boolean;
}

interface Room {
  pin: string;
  hostId: string;
  players: Map<string, RoomPlayer>;
  selectedNotions: NotionId[];
  questionCount: number;
  phase: RoomState["phase"];
  quiz: Question[];
  currentIndex: number;
  questionStartedAt: number;
  timer: NodeJS.Timeout | null;
}

const rooms = new Map<string, Room>();
/** socketId -> pin, so we can find a player's room on any event. */
const socketRoom = new Map<string, string>();

function generatePin(): string {
  let pin: string;
  do {
    pin = String(Math.floor(100000 + Math.random() * 900000));
  } while (rooms.has(pin));
  return pin;
}

function getLanUrls(): string[] {
  const urls: string[] = [];
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        urls.push(`http://${net.address}:${port}`);
      }
    }
  }
  return urls.length ? urls : [`http://localhost:${port}`];
}

function publicPlayers(room: Room): Player[] {
  return [...room.players.values()].map((p) => ({
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    score: p.score,
    isHost: p.isHost,
    connected: p.connected,
  }));
}

function roomState(room: Room): RoomState {
  return {
    pin: room.pin,
    phase: room.phase,
    players: publicPlayers(room),
    selectedNotions: room.selectedNotions,
    hostId: room.hostId,
    questionCount: room.questionCount,
    currentQuestionIndex: room.currentIndex,
    totalQuestions: room.quiz.length,
  };
}

function leaderboard(room: Room): LeaderboardEntry[] {
  const sorted = [...room.players.values()].sort((a, b) => b.score - a.score);
  return sorted.map((p, i) => ({
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    score: p.score,
    lastGain: p.lastGain,
    lastCorrect: p.lastCorrect,
    rank: i + 1,
  }));
}

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();

  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: "*" },
  });

  function broadcastRoom(room: Room) {
    io.to(room.pin).emit("room", roomState(room));
  }

  function startQuestion(room: Room) {
    if (room.timer) clearTimeout(room.timer);
    const question = room.quiz[room.currentIndex];
    for (const p of room.players.values()) {
      p.currentAnswer = null;
      p.currentTimeLeft = 0;
      p.lastGain = 0;
      p.lastCorrect = false;
    }
    room.phase = "question";
    room.questionStartedAt = Date.now();
    broadcastRoom(room);
    io.to(room.pin).emit("question", {
      index: room.currentIndex,
      total: room.quiz.length,
      notion: question.notion,
      notionLabel: notionLabel(question.notion),
      question: question.question,
      answers: question.answers,
      duration: DEFAULT_QUESTION_DURATION,
      startedAt: room.questionStartedAt,
    });
    room.timer = setTimeout(
      () => endQuestion(room),
      DEFAULT_QUESTION_DURATION * 1000,
    );
  }

  function endQuestion(room: Room) {
    if (room.timer) {
      clearTimeout(room.timer);
      room.timer = null;
    }
    if (room.phase !== "question") return;
    const question = room.quiz[room.currentIndex];
    const answerCounts = [0, 0, 0, 0];
    for (const p of room.players.values()) {
      if (p.currentAnswer === null) continue;
      answerCounts[p.currentAnswer]++;
      const correct = p.currentAnswer === question.correct;
      const gain = computeScore(
        correct,
        p.currentTimeLeft,
        DEFAULT_QUESTION_DURATION,
      );
      p.score += gain;
      p.lastGain = gain;
      p.lastCorrect = correct;
    }
    room.phase = "leaderboard";
    broadcastRoom(room);
    io.to(room.pin).emit("reveal", {
      correctIndex: question.correct,
      explanation: question.explanation,
      answerCounts,
      leaderboard: leaderboard(room),
    });
  }

  function maybeEndEarly(room: Room) {
    const active = [...room.players.values()].filter((p) => p.connected);
    if (active.length > 0 && active.every((p) => p.currentAnswer !== null)) {
      endQuestion(room);
    }
  }

  function nextQuestion(room: Room) {
    room.currentIndex++;
    if (room.currentIndex >= room.quiz.length) {
      room.phase = "finished";
      broadcastRoom(room);
      io.to(room.pin).emit("finished", leaderboard(room));
      return;
    }
    startQuestion(room);
  }

  io.on("connection", (socket) => {
    socket.on("host:create", ({ name, emoji }, cb) => {
      const pin = generatePin();
      const room: Room = {
        pin,
        hostId: socket.id,
        players: new Map(),
        selectedNotions: [],
        questionCount: DEFAULT_QUESTION_COUNT,
        phase: "lobby",
        quiz: [],
        currentIndex: 0,
        questionStartedAt: 0,
        timer: null,
      };
      room.players.set(socket.id, {
        id: socket.id,
        name: name.trim().slice(0, 20) || "Hôte",
        emoji: emoji || "🧑",
        score: 0,
        isHost: true,
        connected: true,
        currentAnswer: null,
        currentTimeLeft: 0,
        lastGain: 0,
        lastCorrect: false,
      });
      rooms.set(pin, room);
      socketRoom.set(socket.id, pin);
      socket.join(pin);
      cb({ pin, playerId: socket.id, urls: getLanUrls() });
      broadcastRoom(room);
    });

    socket.on("player:join", ({ pin, name, emoji }, cb) => {
      const room = rooms.get(pin);
      if (!room) {
        cb({ ok: false, error: "Aucune partie trouvée pour ce code PIN." });
        return;
      }
      if (room.phase !== "lobby") {
        cb({ ok: false, error: "La partie a déjà commencé." });
        return;
      }
      const cleanName = name.trim().slice(0, 20);
      if (!cleanName) {
        cb({ ok: false, error: "Choisis un prénom." });
        return;
      }
      room.players.set(socket.id, {
        id: socket.id,
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
      socketRoom.set(socket.id, pin);
      socket.join(pin);
      cb({ ok: true, playerId: socket.id });
      broadcastRoom(room);
    });

    socket.on("host:setNotions", (notions) => {
      const room = rooms.get(socketRoom.get(socket.id) ?? "");
      if (!room || room.hostId !== socket.id || room.phase !== "lobby") return;
      room.selectedNotions = notions;
      broadcastRoom(room);
    });

    socket.on("host:setQuestionCount", (count) => {
      const room = rooms.get(socketRoom.get(socket.id) ?? "");
      if (!room || room.hostId !== socket.id || room.phase !== "lobby") return;
      room.questionCount = count;
      broadcastRoom(room);
    });

    socket.on("host:start", () => {
      const room = rooms.get(socketRoom.get(socket.id) ?? "");
      if (!room || room.hostId !== socket.id || room.phase !== "lobby") return;
      if (room.selectedNotions.length === 0) return;
      room.quiz = buildQuiz(room.selectedNotions, room.questionCount);
      if (room.quiz.length === 0) return;
      room.currentIndex = 0;
      for (const p of room.players.values()) p.score = 0;
      startQuestion(room);
    });

    socket.on("player:answer", (answerIndex) => {
      const room = rooms.get(socketRoom.get(socket.id) ?? "");
      if (!room || room.phase !== "question") return;
      const player = room.players.get(socket.id);
      if (!player || player.currentAnswer !== null) return;
      if (answerIndex < 0 || answerIndex > 3) return;
      const elapsed = (Date.now() - room.questionStartedAt) / 1000;
      player.currentAnswer = answerIndex;
      player.currentTimeLeft = Math.max(0, DEFAULT_QUESTION_DURATION - elapsed);
      const answered = [...room.players.values()].filter(
        (p) => p.connected && p.currentAnswer !== null,
      ).length;
      const total = [...room.players.values()].filter((p) => p.connected).length;
      io.to(room.pin).emit("answered", { count: answered, total });
      maybeEndEarly(room);
    });

    socket.on("host:next", () => {
      const room = rooms.get(socketRoom.get(socket.id) ?? "");
      if (!room || room.hostId !== socket.id) return;
      if (room.phase !== "leaderboard") return;
      nextQuestion(room);
    });

    socket.on("host:restart", () => {
      const room = rooms.get(socketRoom.get(socket.id) ?? "");
      if (!room || room.hostId !== socket.id) return;
      if (room.timer) clearTimeout(room.timer);
      room.timer = null;
      room.phase = "lobby";
      room.quiz = [];
      room.currentIndex = 0;
      for (const p of room.players.values()) {
        p.score = 0;
        p.currentAnswer = null;
        p.lastGain = 0;
        p.lastCorrect = false;
      }
      broadcastRoom(room);
    });

    function leaveRoom() {
      const pin = socketRoom.get(socket.id);
      if (!pin) return;
      const room = rooms.get(pin);
      socketRoom.delete(socket.id);
      if (!room) return;
      const player = room.players.get(socket.id);
      if (player) player.connected = false;

      const connectedPlayers = [...room.players.values()].filter(
        (p) => p.connected,
      );
      if (connectedPlayers.length === 0) {
        if (room.timer) clearTimeout(room.timer);
        rooms.delete(pin);
        return;
      }
      // Promote a new host if the host left.
      if (room.hostId === socket.id) {
        const newHost = connectedPlayers[0];
        room.hostId = newHost.id;
        for (const p of room.players.values()) p.isHost = p.id === newHost.id;
      }
      // If everyone still connected has answered, the question can end.
      if (room.phase === "question") maybeEndEarly(room);
      broadcastRoom(room);
    }

    socket.on("leave", () => {
      leaveRoom();
      socket.leave(socket.id);
    });

    socket.on("disconnect", () => {
      leaveRoom();
    });
  });

  httpServer.listen(port, hostname, () => {
    const urls = getLanUrls();
    console.log("\n  🧠  PhiloQuiz est lancé !\n");
    console.log(`  ▸ Local :   http://localhost:${port}`);
    for (const url of urls) {
      if (!url.includes("localhost")) console.log(`  ▸ Réseau :  ${url}`);
    }
    console.log(
      "\n  Partagez l'adresse « Réseau » et le code PIN avec les autres joueurs.\n",
    );
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
