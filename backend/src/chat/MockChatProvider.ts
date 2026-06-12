import type { ChatMessage } from "@hacker-game/shared";
import type { ChatMessageHandler, ChatProvider } from "./ChatProvider.js";

let messageSequence = 0;

const nextId = () => `mock-${Date.now()}-${messageSequence++}`;

export class MockChatProvider implements ChatProvider {
  readonly name = "mock";
  private handler: ChatMessageHandler | null = null;

  start(onMessage: ChatMessageHandler) {
    this.handler = onMessage;
  }

  stop() {
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
}

const normalizeNickname = (nickname: string) => {
  const clean = nickname.trim().replace(/^@/, "");
  return clean.length > 0 ? clean : "anonymous";
};
