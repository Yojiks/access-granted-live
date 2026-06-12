import type { ChatMessage } from "@hacker-game/shared";
import type { ChatMessageHandler, ChatProvider } from "./ChatProvider.js";

let messageSequence = 0;

const nextId = () => `mock-${Date.now()}-${messageSequence++}`;
const nicknames = ["cipher", "rootkid", "bytequeen", "kernel", "hexrunner", "neon"];
const chatter = [
  "firewall looks weak",
  "almost got it",
  "try this",
  "ядро сейчас сдастся",
  "bruteforce go",
  "trace detected?"
];

export interface MockChatProviderOptions {
  autoMessages: boolean;
  autoIntervalMs: number;
}

export class MockChatProvider implements ChatProvider {
  readonly name = "mock";
  private handler: ChatMessageHandler | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly options: MockChatProviderOptions = {
    autoMessages: false,
    autoIntervalMs: 3500
  }) {}

  start(onMessage: ChatMessageHandler) {
    this.handler = onMessage;

    if (this.options.autoMessages) {
      this.timer = setInterval(() => this.pushAutoMessage(), this.options.autoIntervalMs);
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.handler = null;
  }

  pushMessage(nickname: string, message: string) {
    if (!this.handler) {
      return;
    }

    const chatMessage: ChatMessage = {
      id: nextId(),
      nickname: normalizeNickname(nickname),
      message,
      receivedAt: Date.now(),
      source: "debug"
    };

    this.handler(chatMessage);
  }

  pushRandomGuess(nickname: string) {
    const guess = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join("");
    this.pushMessage(nickname, guess);
  }

  private pushAutoMessage() {
    const nickname = pick(nicknames);
    const message = Math.random() > 0.35
      ? Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join("")
      : pick(chatter);
    this.pushMessage(nickname, message);
  }
}

const normalizeNickname = (nickname: string) => {
  const clean = nickname.trim().replace(/^@/, "");
  return clean.length > 0 ? clean : "anonymous";
};

const pick = (values: string[]) => values[Math.floor(Math.random() * values.length)] ?? values[0] ?? "debug";
