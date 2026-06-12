import type { ChatMessage, GameConfig } from "@hacker-game/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GameEngine } from "./GameEngine.js";

const config: GameConfig = {
  codeLength: 4,
  winnerMessageWindowSeconds: 15,
  guessCooldownSeconds: 2,
  maxEventsOnScreen: 20,
  banner1: { mode: "text", content: "TOP" },
  enableHints: true,
  enableRandomGlitches: false,
  roundResetDelaySeconds: 5
};

const chat = (nickname: string, message: string, receivedAt: number): ChatMessage => ({
  id: `${nickname}-${message}-${receivedAt}`,
  nickname,
  message,
  receivedAt,
  source: "debug"
});

const createEngine = (options: { now?: () => number; code?: string } = {}) =>
  new GameEngine({
    config,
    now: options.now ?? (() => 0),
    codeGenerator: () => options.code ?? "4821"
  });

describe("GameEngine", () => {
  let engines: GameEngine[] = [];

  beforeEach(() => {
    engines = [];
  });

  afterEach(() => {
    engines.forEach((engine) => engine.dispose());
    vi.useRealTimers();
  });

  const track = (engine: GameEngine) => {
    engines.push(engine);
    return engine;
  };

  it("discards partial matches before 30 seconds", () => {
    let now = 0;
    const engine = track(createEngine({ now: () => now }));

    now = 20_000;
    engine.handleChatMessage(chat("neo", "4729", now));

    const snapshot = engine.getSnapshot();
    expect(snapshot.visibleCode).toEqual([null, null, null, null]);
    expect(snapshot.events.some((event) => event.type === "digit_revealed")).toBe(false);
    expect(snapshot.events.some((event) => event.type === "near_miss")).toBe(false);
  });

  it("reveals at most one allowed position per timed attempt", () => {
    let now = 0;
    const engine = track(createEngine({ now: () => now }));

    now = 35_000;
    engine.handleChatMessage(chat("trinity", "4829", now));

    expect(engine.getSnapshot().visibleCode).toEqual(["4", null, null, null]);
    expect(engine.getSnapshot().revealedPositions).toEqual([0]);
  });

  it("reveals first three positions over time and never auto-reveals the fourth", () => {
    let now = 0;
    const engine = track(createEngine({ now: () => now }));

    now = 35_000;
    engine.handleChatMessage(chat("neo", "4729", now));
    expect(engine.getSnapshot().visibleCode).toEqual(["4", null, null, null]);

    now = 65_000;
    engine.handleChatMessage(chat("morpheus", "9821", now));
    expect(engine.getSnapshot().visibleCode).toEqual(["4", "8", null, null]);

    now = 95_000;
    engine.handleChatMessage(chat("trinity", "4829", now));
    expect(engine.getSnapshot().visibleCode).toEqual(["4", "8", "2", null]);

    now = 100_000;
    engine.handleChatMessage(chat("smith", "4820", now));
    expect(engine.getSnapshot().visibleCode).toEqual(["4", "8", "2", null]);
  });

  it("allows a full-code win immediately", () => {
    let now = 0;
    const engine = track(createEngine({ now: () => now }));

    now = 1_000;
    engine.handleChatMessage(chat("neo", "4821", now));

    const snapshot = engine.getSnapshot();
    expect(snapshot.status).toBe("winner_message_window");
    expect(snapshot.visibleCode).toEqual(["4", "8", "2", "1"]);
    expect(snapshot.winnerWindow?.nickname).toBe("neo");
    expect(snapshot.events.some((event) => event.type === "code_cracked")).toBe(true);
  });

  it("captures the first message from the winner during the winner window", () => {
    let now = 0;
    const engine = track(createEngine({ now: () => now }));

    now = 1_000;
    engine.handleChatMessage(chat("neo", "4821", now));
    now = 4_000;
    engine.handleChatMessage(chat("trinity", "hello from outside", now));
    expect(engine.getSnapshot().winnerMessage).toBeNull();

    now = 5_000;
    engine.handleChatMessage(chat("neo", "я лучший хакер", now));

    const snapshot = engine.getSnapshot();
    expect(snapshot.status).toBe("round_resetting");
    expect(snapshot.winnerMessage?.message).toBe("я лучший хакер");
    expect(snapshot.events[0]?.type).toBe("winner_message_received");
  });

  it("times out if the winner does not send a message", () => {
    vi.useFakeTimers();
    let now = 0;
    const engine = track(createEngine({ now: () => now }));

    now = 1_000;
    engine.handleChatMessage(chat("neo", "4821", now));
    now = 16_000;
    vi.advanceTimersByTime(15_000);

    const snapshot = engine.getSnapshot();
    expect(snapshot.status).toBe("round_resetting");
    expect(snapshot.winnerWindow).toBeNull();
    expect(snapshot.events[0]?.type).toBe("winner_message_timeout");
  });

  it("enforces per-user guess cooldown", () => {
    let now = 0;
    const engine = track(createEngine({ now: () => now }));

    now = 35_000;
    engine.handleChatMessage(chat("neo", "1111", now));
    now = 36_000;
    engine.handleChatMessage(chat("neo", "2222", now));

    const snapshot = engine.getSnapshot();
    expect(snapshot.attempts).toBe(1);
    expect(snapshot.events[0]?.message).toContain("cooldown");
  });

  it("tracks leaderboard stats for wins, reveals, attempts and near misses", () => {
    let now = 0;
    const engine = track(createEngine({ now: () => now }));

    now = 35_000;
    engine.handleChatMessage(chat("trinity", "4829", now));
    now = 65_000;
    engine.handleChatMessage(chat("trinity", "0829", now));
    now = 100_000;
    engine.handleChatMessage(chat("neo", "4821", now));

    const snapshot = engine.getSnapshot();
    expect(snapshot.leaderboard.byWins[0]?.nickname).toBe("neo");
    expect(snapshot.leaderboard.byReveals[0]?.nickname).toBe("trinity");
    expect(snapshot.leaderboard.byAttempts[0]?.attempts).toBeGreaterThan(0);
  });

  it("force-resets into a clean new round", () => {
    let now = 0;
    const engine = track(createEngine({ now: () => now }));

    now = 35_000;
    engine.handleChatMessage(chat("neo", "4729", now));
    engine.forceNewRound();

    const snapshot = engine.getSnapshot();
    expect(snapshot.roundId).toBe(2);
    expect(snapshot.attempts).toBe(0);
    expect(snapshot.visibleCode).toEqual([null, null, null, null]);
    expect(snapshot.status).toBe("running");
  });
});
