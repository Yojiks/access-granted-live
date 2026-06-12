import { createServer } from "node:http";

import cors from "cors";
import express from "express";

import { gameConfig, serverConfig } from "./config.js";
import { MockChatProvider } from "./chat/MockChatProvider.js";
import { YouTubeChatProvider } from "./chat/YouTubeChatProvider.js";
import { GameEngine } from "./game/GameEngine.js";
import { attachSocketServer } from "./socket.js";

const app = express();
const httpServer = createServer(app);
const engine = new GameEngine({ config: gameConfig });
const mockProvider = new MockChatProvider();
const youtubeProvider = new YouTubeChatProvider({
  liveChatId: serverConfig.youtubeLiveChatId,
  apiKey: serverConfig.youtubeApiKey
});

const provider = serverConfig.chatProvider === "youtube" ? youtubeProvider : mockProvider;

app.use(cors({ origin: serverConfig.frontendOrigin }));
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    provider: provider.name,
    roundId: engine.getSnapshot().roundId
  });
});

app.get("/snapshot", (_request, response) => {
  response.json(engine.getSnapshot());
});

attachSocketServer(httpServer, engine, mockProvider);
mockProvider.start((message) => engine.handleChatMessage(message));

if (provider !== mockProvider) {
  provider.start((message) => engine.handleChatMessage(message));
}

httpServer.listen(serverConfig.port, () => {
  console.log(`[backend] listening on http://localhost:${serverConfig.port}`);
  console.log(`[backend] chat provider: ${provider.name}`);
});

const shutdown = async () => {
  await provider.stop();
  httpServer.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
