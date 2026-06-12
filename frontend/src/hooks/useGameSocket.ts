import { useCallback, useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";

import type {
  ClientToServerEvents,
  DebugRandomGuessPayload,
  DebugSendMessagePayload,
  GameSnapshot,
  ServerToClientEvents
} from "@hacker-game/shared";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type ConnectionState = "connecting" | "connected" | "disconnected";

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4000";

export const useGameSocket = (debug: boolean) => {
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [socket, setSocket] = useState<GameSocket | null>(null);

  const query = useMemo(() => ({ debug: String(debug) }), [debug]);

  useEffect(() => {
    const nextSocket: GameSocket = io(backendUrl, {
      transports: ["websocket", "polling"],
      query,
      reconnection: true,
      reconnectionDelay: 700,
      reconnectionDelayMax: 3000
    });

    setSocket(nextSocket);

    nextSocket.on("connect", () => {
      setConnectionState("connected");
      nextSocket.emit("client:request_snapshot");
    });

    nextSocket.on("disconnect", () => {
      setConnectionState("disconnected");
    });

    nextSocket.io.on("reconnect_attempt", () => {
      setConnectionState("connecting");
    });

    nextSocket.on("snapshot", setSnapshot);

    return () => {
      nextSocket.disconnect();
      setSocket(null);
    };
  }, [query]);

  const sendMessage = useCallback(
    (payload: DebugSendMessagePayload) => {
      socket?.emit("debug:send_message", payload);
    },
    [socket]
  );

  const sendRandomGuess = useCallback(
    (payload: DebugRandomGuessPayload) => {
      socket?.emit("debug:random_guess", payload);
    },
    [socket]
  );

  const forceNewRound = useCallback(() => {
    socket?.emit("debug:force_new_round");
  }, [socket]);

  return {
    snapshot,
    connectionState,
    sendMessage,
    sendRandomGuess,
    forceNewRound
  };
};
