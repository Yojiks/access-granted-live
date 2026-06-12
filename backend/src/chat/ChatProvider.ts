import type { ChatMessage } from "@hacker-game/shared";

export type ChatMessageHandler = (message: ChatMessage) => void;

export interface ChatProvider {
  readonly name: string;
  start(onMessage: ChatMessageHandler): Promise<void> | void;
  stop(): Promise<void> | void;
}
