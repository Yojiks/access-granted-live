import type { Server as HttpServer } from "node:http";

import type {
  ChatMessage,
  ClientToServerEvents,
  DebugRandomGuessPayload,
  DebugSendMessagePayload,
  ServerToClientEvents
} from "@hacker-game/shared";
import { Server } from "socket.io";

import { serverConfig } from "./config.js";
import type { MockChatProvider } from "./chat/MockChatProvider.js";
import type { GameEngine } from "./game/GameEngine.js";

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  debug: boolean;
}

let debugMessageSequence = 0;

const randomGuess = () =>
  Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join("");

const normalizeNickname = (nickname: string) => {
  const clean = nickname.trim().replace(/^@/, "");
  return clean.length > 0 ? clean : "anonymous";
};

const createDebugMessage = (nickname: string, message: string): ChatMessage => ({
  id: `debug-${Date.now()}-${debugMessageSequence++}`,
  nickname: normalizeNickname(nickname),
  message,
  receivedAt: Date.now(),
  source: "debug"
});

export const attachSocketServer = (
  httpServer: HttpServer,
  engine: GameEngine,
  mockProvider: MockChatProvider
) => {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: serverConfig.frontendOrigin,
      methods: ["GET", "POST"]
    }
  });

  const emitSnapshots = () => {
    for (const [, socket] of io.of("/").sockets) {
      socket.emit("snapshot", engine.getSnapshot({ debug: socket.data.debug }));
    }
  };

  engine.on("event", (event) => {
    io.emit(event.type, event);
    emitSnapshots();
  });

  const clock = setInterval(emitSnapshots, 1000);

  io.on("connection", (socket) => {
    socket.data.debug = socket.handshake.query.debug === "true";
    socket.emit("snapshot", engine.getSnapshot({ debug: socket.data.debug }));

    socket.on("client:request_snapshot", () => {
      socket.emit("snapshot", engine.getSnapshot({ debug: socket.data.debug }));
    });

    socket.on("debug:send_message", (payload: DebugSendMessagePayload) => {
      const nickname = normalizeNickname(payload.nickname);
      const message = payload.message.trim();
      if (message.length === 0) {
        return;
      }

      mockProvider.pushMessage(nickname, message);
    });

    socket.on("debug:random_guess", (payload: DebugRandomGuessPayload) => {
      const nickname = normalizeNickname(payload.nickname);
      mockProvider.pushMessage(nickname, randomGuess());
    });

    socket.on("debug:force_new_round", () => {
      engine.forceNewRound();
    });
  });

  return {
    io,
    close: () => {
      clearInterval(clock);
      io.close();
    },
    pushDebugMessage: (nickname: string, message: string) => {
      engine.handleChatMessage(createDebugMessage(nickname, message));
    }
  };
};
