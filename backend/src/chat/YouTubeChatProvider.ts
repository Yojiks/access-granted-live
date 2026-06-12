import type { ChatMessageHandler, ChatProvider } from "./ChatProvider.js";

export interface YouTubeChatProviderOptions {
  liveChatId: string;
  apiKey: string;
}

export class YouTubeChatProvider implements ChatProvider {
  readonly name = "youtube";

  constructor(private readonly options: YouTubeChatProviderOptions) {}

  start(_onMessage: ChatMessageHandler) {
    const configured = this.options.liveChatId.length > 0 && this.options.apiKey.length > 0;

    if (!configured) {
      console.warn(
        "[YouTubeChatProvider] Missing YOUTUBE_LIVE_CHAT_ID or YOUTUBE_API_KEY. " +
        "The MVP keeps the provider as a stub until OAuth/API polling is wired."
      );
      return;
    }

    console.warn(
      "[YouTubeChatProvider] TODO: poll YouTube Live Chat API and map incoming messages " +
      "to ChatMessage. MockChatProvider is active for local testing."
    );
  }

  stop() {
    // TODO: clear YouTube polling timers once API polling is implemented.
  }
}
