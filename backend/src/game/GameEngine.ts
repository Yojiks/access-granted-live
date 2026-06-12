import { EventEmitter } from "node:events";

import type {
  ChatMessage,
  GameConfig,
  GameEvent,
  GameEventSeverity,
  GameEventType,
  GameSnapshot,
  Leaderboard,
  PlayerStats,
  WinnerMessage,
  WinnerWindow
} from "@hacker-game/shared";

import {
  generateCode,
  matchingPositions,
  maxRevealedDigitsForElapsed,
  parseGuess,
  secondsUntilNextLeak
} from "./utils.js";

export interface GameEngineOptions {
  config: GameConfig;
  now?: () => number;
  rng?: () => number;
  codeGenerator?: () => string;
}

type EngineEventName = "event";

let eventSequence = 0;

const normalizeNickname = (nickname: string) => {
  const clean = nickname.trim().replace(/^@/, "");
  return clean.length > 0 ? clean : "anonymous";
};

export class GameEngine {
  private readonly emitter = new EventEmitter();
  private readonly now: () => number;
  private readonly rng: () => number;
  private readonly codeGenerator: () => string;
  private readonly stats = new Map<string, PlayerStats>();
  private readonly events: GameEvent[] = [];
  private readonly participants = new Set<string>();
  private readonly revealedPositions = new Set<number>();
  private readonly lastGuessAt = new Map<string, number>();

  private roundId = 0;
  private secretCode = "";
  private roundStartedAt = 0;
  private attempts = 0;
  private status: GameSnapshot["status"] = "running";
  private winnerWindow: WinnerWindow | null = null;
  private winnerMessage: WinnerMessage | null = null;
  private winnerTimer: NodeJS.Timeout | null = null;
  private resetTimer: NodeJS.Timeout | null = null;

  constructor(private readonly options: GameEngineOptions) {
    this.now = options.now ?? (() => Date.now());
    this.rng = options.rng ?? Math.random;
    this.codeGenerator = options.codeGenerator ?? (() => generateCode(options.config.codeLength, this.rng));
    this.startNewRound();
  }

  on(eventName: EngineEventName, listener: (event: GameEvent) => void) {
    this.emitter.on(eventName, listener);
    return () => this.emitter.off(eventName, listener);
  }

  handleChatMessage(rawMessage: ChatMessage) {
    const message: ChatMessage = {
      ...rawMessage,
      nickname: normalizeNickname(rawMessage.nickname),
      receivedAt: rawMessage.receivedAt || this.now()
    };

    if (this.status === "winner_message_window") {
      this.tryCaptureWinnerMessage(message);
      return;
    }

    if (this.status !== "running") {
      return;
    }

    const guess = parseGuess(message.message, this.options.config.codeLength);
    if (!guess) {
      return;
    }

    this.participants.add(message.nickname);

    if (guess === this.secretCode) {
      this.recordValidGuess(message.nickname);
      this.crackCode(message.nickname, guess);
      return;
    }

    if (this.isCoolingDown(message.nickname)) {
      this.addEvent(
        "guess_received",
        `${formatNick(message.nickname)} слишком быстро стучит по firewall: cooldown активен`,
        "warning",
        { nickname: message.nickname, guess }
      );
      return;
    }

    this.recordValidGuess(message.nickname);
    this.processPartialGuess(message.nickname, guess);
  }

  forceNewRound() {
    this.clearTimers();
    this.status = "round_resetting";
    this.addEvent("round_reset", "ROUND RESET // новый ключ шифрования запрошен", "warning");
    this.startNewRound();
  }

  dispose() {
    this.clearTimers();
    this.emitter.removeAllListeners();
  }

  getSnapshot(options: { debug?: boolean } = {}): GameSnapshot {
    const elapsedSeconds = this.elapsedSeconds();
    const maxRevealedDigits = maxRevealedDigitsForElapsed(elapsedSeconds);
    const visibleCode = Array.from(this.secretCode).map((digit, index) =>
      this.revealedPositions.has(index) ? digit : null
    );

    return {
      roundId: this.roundId,
      status: this.status,
      roundStartedAt: this.roundStartedAt,
      elapsedSeconds,
      visibleCode,
      revealedPositions: [...this.revealedPositions].sort((a, b) => a - b),
      attempts: this.attempts,
      participants: this.participants.size,
      maxRevealedDigits,
      secondsUntilNextLeak: this.status === "running" ? secondsUntilNextLeak(elapsedSeconds) : null,
      events: [...this.events],
      leaderboard: this.leaderboard(),
      winnerWindow: this.currentWinnerWindow(),
      winnerMessage: this.winnerMessage,
      config: this.options.config,
      ...(options.debug ? { debugSecretCode: this.secretCode } : {})
    };
  }

  private startNewRound() {
    this.clearTimers();
    this.roundId += 1;
    this.secretCode = this.codeGenerator();
    this.roundStartedAt = this.now();
    this.attempts = 0;
    this.status = "running";
    this.winnerWindow = null;
    this.winnerMessage = null;
    this.participants.clear();
    this.revealedPositions.clear();
    this.lastGuessAt.clear();
    this.addEvent("round_started", `ROUND ${this.roundId} // BRUTEFORCE MODULE ONLINE`, "info");
  }

  private processPartialGuess(nickname: string, guess: string) {
    const matchedPositions = matchingPositions(guess, this.secretCode);
    const maxRevealed = maxRevealedDigitsForElapsed(this.elapsedSeconds());
    const canRevealMore = this.revealedPositions.size < maxRevealed;
    const revealablePosition = matchedPositions.find(
      (position) =>
        position < this.options.config.codeLength - 1 &&
        !this.revealedPositions.has(position)
    );

    if (maxRevealed === 0) {
      this.addEvent(
        "guess_received",
        `${formatNick(nickname)} пытается взломать код: ${guess} // доступ запрещен`,
        "warning",
        { nickname, guess }
      );
      this.maybeEmitGlitch();
      return;
    }

    this.addEvent(
      "guess_received",
      `${formatNick(nickname)} пытается взломать код: ${guess} // ${matchedPositions.length}/4`,
      "info",
      { nickname, guess, matchedPositions }
    );

    if (canRevealMore && revealablePosition !== undefined) {
      this.revealedPositions.add(revealablePosition);
      this.incrementRevealStats(nickname);
      this.addEvent(
        "digit_revealed",
        `${formatNick(nickname)} открыл фрагмент кода: позиция ${revealablePosition + 1}`,
        "success",
        { nickname, guess, matchedPositions, revealedPosition: revealablePosition }
      );
      this.addEvent(
        "micro_reward",
        `MICRO REWARD // ${formatNick(nickname)} получил доступ к сектору ${revealablePosition + 1}`,
        "success",
        { nickname, guess, matchedPositions, revealedPosition: revealablePosition }
      );
      this.maybeEmitGlitch();
      return;
    }

    this.resetStreak(nickname);

    if (matchedPositions.length >= 3) {
      this.incrementNearMissStats(nickname);
      this.addEvent(
        "near_miss",
        `${formatNick(nickname)} был очень близко: 3/4, но получил 403 ошибку`,
        "warning",
        { nickname, guess, matchedPositions }
      );
      return;
    }

    if (matchedPositions.length >= 2) {
      this.addEvent(
        "micro_reward",
        `SIGNAL DETECTED // ${formatNick(nickname)} поймал ${matchedPositions.length}/4`,
        "info",
        { nickname, guess, matchedPositions }
      );
    }

    this.maybeEmitGlitch();
  }

  private crackCode(nickname: string, guess: string) {
    this.status = "winner_message_window";
    this.revealedPositions.clear();
    Array.from(this.secretCode).forEach((_, index) => this.revealedPositions.add(index));
    this.incrementWinStats(nickname);
    this.addEvent(
      "code_cracked",
      `ACCESS GRANTED // код взломан пользователем ${formatNick(nickname)}`,
      "success",
      { nickname, guess, matchedPositions: Array.from(this.secretCode).map((_, index) => index) }
    );
    this.startWinnerWindow(nickname);
  }

  private startWinnerWindow(nickname: string) {
    const endsAt = this.now() + this.options.config.winnerMessageWindowSeconds * 1000;
    this.winnerWindow = {
      nickname,
      endsAt,
      remainingSeconds: this.options.config.winnerMessageWindowSeconds
    };
    this.addEvent(
      "winner_message_window_started",
      `${formatNick(nickname)} получил 15 секунд на сообщение победителя`,
      "success",
      { nickname }
    );
    this.winnerTimer = setTimeout(
      () => this.handleWinnerTimeout(),
      this.options.config.winnerMessageWindowSeconds * 1000
    );
  }

  private tryCaptureWinnerMessage(message: ChatMessage) {
    if (!this.winnerWindow || normalizeNickname(message.nickname) !== this.winnerWindow.nickname) {
      return;
    }

    const text = message.message.trim();
    if (text.length === 0) {
      return;
    }

    if (this.winnerTimer) {
      clearTimeout(this.winnerTimer);
      this.winnerTimer = null;
    }

    this.winnerMessage = {
      nickname: this.winnerWindow.nickname,
      message: text,
      receivedAt: this.now(),
      expiresAt: this.now() + this.options.config.roundResetDelaySeconds * 1000
    };
    this.winnerWindow = null;
    this.status = "round_resetting";
    this.addEvent(
      "winner_message_received",
      `Сообщение победителя // ${formatNick(message.nickname)}: ${text}`,
      "success",
      { nickname: message.nickname }
    );
    this.scheduleRoundReset();
  }

  private handleWinnerTimeout() {
    if (this.status !== "winner_message_window" || !this.winnerWindow) {
      return;
    }

    const nickname = this.winnerWindow.nickname;
    this.winnerTimer = null;
    this.winnerWindow = null;
    this.status = "round_resetting";
    this.addEvent(
      "winner_message_timeout",
      "Победитель не успел отправить сообщение",
      "warning",
      { nickname }
    );
    this.scheduleRoundReset();
  }

  private scheduleRoundReset() {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(
      () => this.forceNewRound(),
      this.options.config.roundResetDelaySeconds * 1000
    );
  }

  private isCoolingDown(nickname: string) {
    const lastGuessAt = this.lastGuessAt.get(nickname);
    if (lastGuessAt === undefined) {
      return false;
    }

    return this.now() - lastGuessAt < this.options.config.guessCooldownSeconds * 1000;
  }

  private recordValidGuess(nickname: string) {
    this.attempts += 1;
    this.lastGuessAt.set(nickname, this.now());
    this.getOrCreateStats(nickname).attempts += 1;
    this.emitStatsUpdated();
  }

  private incrementRevealStats(nickname: string) {
    const stats = this.getOrCreateStats(nickname);
    stats.revealedDigits += 1;
    stats.streak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
    this.emitStatsUpdated();
  }

  private incrementNearMissStats(nickname: string) {
    const stats = this.getOrCreateStats(nickname);
    stats.nearMisses += 1;
    this.emitStatsUpdated();
  }

  private incrementWinStats(nickname: string) {
    const stats = this.getOrCreateStats(nickname);
    stats.wins += 1;
    stats.streak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
    this.emitStatsUpdated();
  }

  private resetStreak(nickname: string) {
    this.getOrCreateStats(nickname).streak = 0;
    this.emitStatsUpdated();
  }

  private emitStatsUpdated() {
    this.addEvent("stats_updated", "STATS SYNC // leaderboard обновлен", "info");
  }

  private getOrCreateStats(nickname: string) {
    const cleanNickname = normalizeNickname(nickname);
    const existing = this.stats.get(cleanNickname);
    if (existing) {
      existing.lastActiveAt = this.now();
      return existing;
    }

    const created: PlayerStats = {
      nickname: cleanNickname,
      wins: 0,
      revealedDigits: 0,
      attempts: 0,
      nearMisses: 0,
      streak: 0,
      bestStreak: 0,
      lastActiveAt: this.now()
    };
    this.stats.set(cleanNickname, created);
    return created;
  }

  private leaderboard(): Leaderboard {
    const players = [...this.stats.values()].map((player) => ({ ...player }));
    const top = (key: keyof Pick<PlayerStats, "wins" | "revealedDigits" | "attempts">) =>
      [...players].sort((a, b) => b[key] - a[key] || b.bestStreak - a.bestStreak).slice(0, 5);

    return {
      byWins: top("wins"),
      byReveals: top("revealedDigits"),
      byAttempts: top("attempts")
    };
  }

  private currentWinnerWindow(): WinnerWindow | null {
    if (!this.winnerWindow) {
      return null;
    }

    return {
      ...this.winnerWindow,
      remainingSeconds: Math.max(0, Math.ceil((this.winnerWindow.endsAt - this.now()) / 1000))
    };
  }

  private elapsedSeconds() {
    return Math.max(0, Math.floor((this.now() - this.roundStartedAt) / 1000));
  }

  private maybeEmitGlitch() {
    if (!this.options.config.enableRandomGlitches || this.rng() >= 0.08) {
      return;
    }

    const messages = [
      "FIREWALL ALERT // внешний шум усиливается",
      "TRACE DETECTED // протокол маскировки перезапущен",
      "OVERRIDE IN PROGRESS // ядро отвечает с задержкой",
      "SYSTEM GLITCH // цифры ускоряются"
    ];
    const message = messages[Math.floor(this.rng() * messages.length)] ?? messages[0];
    this.addEvent("system_glitch", message, "danger");
  }

  private addEvent(
    type: GameEventType,
    message: string,
    severity: GameEventSeverity,
    details: Partial<Pick<GameEvent, "nickname" | "guess" | "matchedPositions" | "revealedPosition">> = {}
  ) {
    const event: GameEvent = {
      id: `event-${this.now()}-${eventSequence++}`,
      type,
      timestamp: this.now(),
      message,
      severity,
      ...details
    };
    this.events.unshift(event);
    this.events.splice(this.options.config.maxEventsOnScreen);
    this.emitter.emit("event", event);
  }

  private clearTimers() {
    if (this.winnerTimer) {
      clearTimeout(this.winnerTimer);
      this.winnerTimer = null;
    }

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }
}

const formatNick = (nickname: string) => `@${normalizeNickname(nickname)}`;
