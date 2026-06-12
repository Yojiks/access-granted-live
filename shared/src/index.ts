export type ChatSource = "mock" | "youtube" | "debug";

export interface ChatMessage {
  id: string;
  nickname: string;
  message: string;
  receivedAt: number;
  source: ChatSource;
}

export type GameStatus =
  | "running"
  | "code_cracked"
  | "winner_message_window"
  | "round_resetting";

export type GameEventType =
  | "round_started"
  | "guess_received"
  | "digit_revealed"
  | "near_miss"
  | "code_cracked"
  | "winner_message_window_started"
  | "winner_message_received"
  | "winner_message_timeout"
  | "round_reset"
  | "stats_updated"
  | "system_glitch"
  | "micro_reward";

export type GameEventSeverity = "info" | "success" | "warning" | "danger";

export interface GameEvent {
  id: string;
  type: GameEventType;
  timestamp: number;
  message: string;
  severity: GameEventSeverity;
  nickname?: string;
  guess?: string;
  matchedPositions?: number[];
  revealedPosition?: number;
}

export interface PlayerStats {
  nickname: string;
  wins: number;
  revealedDigits: number;
  attempts: number;
  nearMisses: number;
  streak: number;
  bestStreak: number;
  lastActiveAt: number;
}

export interface Leaderboard {
  byWins: PlayerStats[];
  byReveals: PlayerStats[];
  byAttempts: PlayerStats[];
}

export type BannerMode = "text" | "image";

export interface BannerConfig {
  mode: BannerMode;
  content: string;
  alt?: string;
}

export interface GameConfig {
  codeLength: number;
  winnerMessageWindowSeconds: number;
  guessCooldownSeconds: number;
  maxEventsOnScreen: number;
  banner1: BannerConfig;
  enableHints: boolean;
  enableRandomGlitches: boolean;
  roundResetDelaySeconds: number;
}

export interface WinnerWindow {
  nickname: string;
  endsAt: number;
  remainingSeconds: number;
}

export interface WinnerMessage {
  nickname: string;
  message: string;
  receivedAt: number;
  expiresAt: number;
}

export interface GameSnapshot {
  roundId: number;
  status: GameStatus;
  roundStartedAt: number;
  elapsedSeconds: number;
  visibleCode: Array<string | null>;
  revealedPositions: number[];
  attempts: number;
  participants: number;
  maxRevealedDigits: number;
  secondsUntilNextLeak: number | null;
  events: GameEvent[];
  leaderboard: Leaderboard;
  winnerWindow: WinnerWindow | null;
  winnerMessage: WinnerMessage | null;
  config: GameConfig;
  debugSecretCode?: string;
}

export interface DebugSendMessagePayload {
  nickname: string;
  message: string;
}

export interface DebugRandomGuessPayload {
  nickname: string;
}

export interface ServerToClientEvents {
  snapshot: (snapshot: GameSnapshot) => void;
  round_started: (event: GameEvent) => void;
  guess_received: (event: GameEvent) => void;
  digit_revealed: (event: GameEvent) => void;
  near_miss: (event: GameEvent) => void;
  code_cracked: (event: GameEvent) => void;
  winner_message_window_started: (event: GameEvent) => void;
  winner_message_received: (event: GameEvent) => void;
  winner_message_timeout: (event: GameEvent) => void;
  round_reset: (event: GameEvent) => void;
  stats_updated: (event: GameEvent) => void;
  system_glitch: (event: GameEvent) => void;
  micro_reward: (event: GameEvent) => void;
}

export interface ClientToServerEvents {
  "client:request_snapshot": () => void;
  "debug:send_message": (payload: DebugSendMessagePayload) => void;
  "debug:random_guess": (payload: DebugRandomGuessPayload) => void;
  "debug:force_new_round": () => void;
}
