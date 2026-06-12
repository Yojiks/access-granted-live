import { resolve } from "node:path";

import type { GameConfig } from "@hacker-game/shared";
import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), "../.env") });
loadEnv({ path: resolve(process.cwd(), ".env"), override: true });

const parseInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const banner = (prefix: "BANNER_1" | "BANNER_2", fallback: string) => ({
  mode: process.env[`${prefix}_MODE`] === "image" ? "image" as const : "text" as const,
  content: process.env[`${prefix}_CONTENT`] ?? fallback,
  alt: process.env[`${prefix}_ALT`] ?? fallback
});

export const serverConfig = {
  port: parseInteger(process.env.BACKEND_PORT, 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  chatProvider: process.env.CHAT_PROVIDER ?? "mock",
  youtubeLiveChatId: process.env.YOUTUBE_LIVE_CHAT_ID ?? "",
  youtubeApiKey: process.env.YOUTUBE_API_KEY ?? ""
};

export const gameConfig: GameConfig = {
  codeLength: parseInteger(process.env.CODE_LENGTH, 4),
  winnerMessageWindowSeconds: parseInteger(process.env.WINNER_MESSAGE_WINDOW_SECONDS, 15),
  guessCooldownSeconds: parseInteger(process.env.GUESS_COOLDOWN_SECONDS, 2),
  maxEventsOnScreen: parseInteger(process.env.MAX_EVENTS_ON_SCREEN, 12),
  banner1: banner("BANNER_1", "AD SLOT // TOP NODE"),
  banner2: banner("BANNER_2", "AD SLOT // BOTTOM NODE"),
  enableHints: parseBoolean(process.env.ENABLE_HINTS, true),
  enableRandomGlitches: parseBoolean(process.env.ENABLE_RANDOM_GLITCHES, true),
  roundResetDelaySeconds: parseInteger(process.env.ROUND_RESET_DELAY_SECONDS, 5)
};
