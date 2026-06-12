import type { ChatMessage } from "@hacker-game/shared";
import type { ChatMessageHandler, ChatProvider } from "./ChatProvider.js";

export interface YouTubeChatProviderOptions {
  liveChatId: string;
  videoId: string;
  apiKey: string;
  oauthAccessToken: string;
  maxResults: number;
  minPollIntervalMs: number;
  skipInitialMessages: boolean;
}

interface YouTubeLiveChatMessagesResponse {
  nextPageToken?: string;
  pollingIntervalMillis?: number;
  items?: YouTubeLiveChatMessage[];
  error?: {
    message?: string;
    status?: string;
    code?: number;
  };
}

interface YouTubeLiveChatMessage {
  id: string;
  snippet?: {
    displayMessage?: string;
    publishedAt?: string;
  };
  authorDetails?: {
    channelId?: string;
    displayName?: string;
  };
}

interface YouTubeVideosResponse {
  items?: Array<{
    liveStreamingDetails?: {
      activeLiveChatId?: string;
    };
  }>;
  error?: {
    message?: string;
    status?: string;
    code?: number;
  };
}

let messageSequence = 0;

export class YouTubeChatProvider implements ChatProvider {
  readonly name = "youtube";

  private handler: ChatMessageHandler | null = null;
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private liveChatId: string;
  private nextPageToken: string | null = null;
  private firstPoll = true;
  private consecutiveErrors = 0;
  private readonly seenMessageIds = new Set<string>();

  constructor(private readonly options: YouTubeChatProviderOptions) {
    this.liveChatId = options.liveChatId.trim();
  }

  start(onMessage: ChatMessageHandler) {
    this.handler = onMessage;
    this.running = true;

    if (!this.hasCredentials()) {
      console.warn(
        "[YouTubeChatProvider] Missing credentials. Set YOUTUBE_API_KEY or YOUTUBE_OAUTH_ACCESS_TOKEN."
      );
      return;
    }

    if (!this.liveChatId && !this.options.videoId.trim()) {
      console.warn(
        "[YouTubeChatProvider] Missing chat target. Set YOUTUBE_LIVE_CHAT_ID or YOUTUBE_VIDEO_ID."
      );
      return;
    }

    this.schedulePoll(0);
  }

  stop() {
    this.running = false;
    this.handler = null;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private schedulePoll(delayMs: number) {
    if (!this.running) {
      return;
    }

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      void this.poll();
    }, Math.max(0, delayMs));
  }

  private async poll() {
    if (!this.running) {
      return;
    }

    try {
      const liveChatId = await this.ensureLiveChatId();
      if (!liveChatId) {
        this.schedulePoll(this.options.minPollIntervalMs);
        return;
      }

      const response = await this.fetchLiveChatMessages(liveChatId);
      this.nextPageToken = response.nextPageToken ?? this.nextPageToken;
      this.forwardMessages(response.items ?? []);
      this.firstPoll = false;
      this.consecutiveErrors = 0;

      this.schedulePoll(response.pollingIntervalMillis ?? this.options.minPollIntervalMs);
    } catch (error) {
      this.consecutiveErrors += 1;
      const delay = Math.min(60_000, this.options.minPollIntervalMs * 2 ** this.consecutiveErrors);
      console.warn(`[YouTubeChatProvider] Poll failed. Retrying in ${delay}ms.`, error);
      this.schedulePoll(delay);
    }
  }

  private async ensureLiveChatId() {
    if (this.liveChatId) {
      return this.liveChatId;
    }

    const videoId = this.options.videoId.trim();
    if (!videoId) {
      return "";
    }

    const response = await this.fetchVideoDetails(videoId);
    const activeLiveChatId = response.items?.[0]?.liveStreamingDetails?.activeLiveChatId;
    if (!activeLiveChatId) {
      console.warn(
        `[YouTubeChatProvider] No activeLiveChatId for video ${videoId}. Is the stream live?`
      );
      return "";
    }

    this.liveChatId = activeLiveChatId;
    console.log(`[YouTubeChatProvider] Resolved activeLiveChatId for video ${videoId}.`);
    return this.liveChatId;
  }

  private forwardMessages(messages: YouTubeLiveChatMessage[]) {
    const handler = this.handler;
    if (!handler) {
      return;
    }

    for (const message of messages) {
      if (!message.id || this.seenMessageIds.has(message.id)) {
        continue;
      }

      this.seenMessageIds.add(message.id);

      if (this.firstPoll && this.options.skipInitialMessages) {
        continue;
      }

      const chatMessage = mapYouTubeMessage(message);
      if (chatMessage.message.trim().length > 0) {
        handler(chatMessage);
      }
    }
  }

  private async fetchLiveChatMessages(liveChatId: string) {
    const response = await this.fetchYouTube<YouTubeLiveChatMessagesResponse>("liveChat/messages", {
      part: "snippet,authorDetails",
      liveChatId,
      maxResults: String(this.options.maxResults),
      ...(this.nextPageToken ? { pageToken: this.nextPageToken } : {})
    });

    return response;
  }

  private async fetchVideoDetails(videoId: string) {
    return this.fetchYouTube<YouTubeVideosResponse>("videos", {
      part: "liveStreamingDetails",
      id: videoId
    });
  }

  private async fetchYouTube<T extends { error?: { message?: string; status?: string; code?: number } }>(
    path: string,
    params: Record<string, string>
  ): Promise<T> {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);

    for (const [key, value] of Object.entries(params)) {
      if (value.length > 0) {
        url.searchParams.set(key, value);
      }
    }

    if (this.options.apiKey.trim()) {
      url.searchParams.set("key", this.options.apiKey.trim());
    }

    const response = await fetch(url, {
      headers: this.options.oauthAccessToken.trim()
        ? { Authorization: `Bearer ${this.options.oauthAccessToken.trim()}` }
        : undefined
    });
    const json = await response.json() as T;

    if (!response.ok || json.error) {
      const message = json.error?.message ?? response.statusText;
      const status = json.error?.status ?? response.status;
      throw new Error(`YouTube API ${status}: ${message}`);
    }

    return json;
  }

  private hasCredentials() {
    return Boolean(this.options.apiKey.trim() || this.options.oauthAccessToken.trim());
  }
}

const mapYouTubeMessage = (message: YouTubeLiveChatMessage): ChatMessage => {
  const receivedAt = message.snippet?.publishedAt
    ? Date.parse(message.snippet.publishedAt)
    : Date.now();

  return {
    id: message.id || `youtube-${Date.now()}-${messageSequence++}`,
    nickname: normalizeNickname(
      message.authorDetails?.displayName ?? message.authorDetails?.channelId ?? "youtube-user"
    ),
    message: message.snippet?.displayMessage ?? "",
    receivedAt: Number.isFinite(receivedAt) ? receivedAt : Date.now(),
    source: "youtube"
  };
};

const normalizeNickname = (nickname: string) => {
  const clean = nickname.trim().replace(/^@/, "");
  return clean.length > 0 ? clean : "youtube-user";
};
