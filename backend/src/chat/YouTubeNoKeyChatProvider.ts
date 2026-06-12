import type { ChatMessage } from "@hacker-game/shared";
import type { ChatMessageHandler, ChatProvider } from "./ChatProvider.js";

export interface YouTubeNoKeyChatProviderOptions {
  videoId: string;
  pollIntervalMs: number;
  skipInitialMessages: boolean;
}

interface YouTubeNoKeySession {
  apiKey: string;
  context: Record<string, unknown>;
  continuation: string;
  visitorData?: string;
}

interface ContinuationResult {
  continuation: string;
  timeoutMs?: number;
}

interface LiveChatRenderer {
  id?: string;
  authorName?: TextObject;
  message?: TextObject;
  timestampUsec?: string;
  timestampText?: TextObject;
}

interface TextObject {
  simpleText?: string;
  runs?: Array<{
    text?: string;
    emoji?: {
      shortcuts?: string[];
      emojiId?: string;
      image?: {
        accessibility?: {
          accessibilityData?: {
            label?: string;
          };
        };
      };
    };
  }>;
}

let messageSequence = 0;

export class YouTubeNoKeyChatProvider implements ChatProvider {
  readonly name = "youtube_nokey";

  private handler: ChatMessageHandler | null = null;
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private session: YouTubeNoKeySession | null = null;
  private firstPoll = true;
  private consecutiveErrors = 0;
  private readonly seenMessageIds = new Set<string>();

  constructor(private readonly options: YouTubeNoKeyChatProviderOptions) {}

  start(onMessage: ChatMessageHandler) {
    this.handler = onMessage;
    this.running = true;

    if (!this.options.videoId.trim()) {
      console.warn("[YouTubeNoKeyChatProvider] Missing YOUTUBE_VIDEO_ID.");
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
      const session = await this.ensureSession();
      const response = await this.fetchChatContinuation(session);
      const liveChat = response.continuationContents?.liveChatContinuation;
      const messages = extractMessages(liveChat?.actions ?? []);
      const continuationData = findContinuation(liveChat?.continuations);

      if (continuationData?.continuation) {
        session.continuation = continuationData.continuation;
      }

      this.forwardMessages(messages);
      this.firstPoll = false;
      this.consecutiveErrors = 0;
      this.schedulePoll(continuationData?.timeoutMs ?? this.options.pollIntervalMs);
    } catch (error) {
      this.session = null;
      this.consecutiveErrors += 1;
      const delay = Math.min(60_000, this.options.pollIntervalMs * 2 ** this.consecutiveErrors);
      console.warn(`[YouTubeNoKeyChatProvider] Poll failed. Retrying in ${delay}ms.`, error);
      this.schedulePoll(delay);
    }
  }

  private async ensureSession() {
    if (this.session) {
      return this.session;
    }

    const html = await this.fetchWatchPage();
    const ytcfg = extractYtcfg(html);
    const initialData = extractInitialData(html);
    const liveChatRenderer = findProperty(initialData, "liveChatRenderer");
    const continuation = findContinuation(liveChatRenderer)?.continuation;
    const apiKey = readString(ytcfg, "INNERTUBE_API_KEY") ?? extractString(html, "INNERTUBE_API_KEY");
    const context = readObject(ytcfg, "INNERTUBE_CONTEXT") ?? createFallbackContext(ytcfg);
    const visitorData = readString(ytcfg, "VISITOR_DATA");

    if (!apiKey) {
      throw new Error("Cannot find INNERTUBE_API_KEY on YouTube watch page.");
    }

    if (!continuation) {
      throw new Error("Cannot find live chat continuation. Is the stream live and chat enabled?");
    }

    const session: YouTubeNoKeySession = {
      apiKey,
      context,
      continuation,
      visitorData: visitorData ?? undefined
    };
    this.session = session;
    console.log("[YouTubeNoKeyChatProvider] Live chat continuation resolved.");
    return session;
  }

  private async fetchWatchPage() {
    const url = new URL("https://www.youtube.com/watch");
    url.searchParams.set("v", this.options.videoId.trim());

    const response = await fetch(url, {
      headers: defaultHeaders()
    });

    if (!response.ok) {
      throw new Error(`YouTube watch page ${response.status}: ${response.statusText}`);
    }

    return response.text();
  }

  private async fetchChatContinuation(session: YouTubeNoKeySession) {
    const url = new URL("https://www.youtube.com/youtubei/v1/live_chat/get_live_chat");
    url.searchParams.set("key", session.apiKey);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...defaultHeaders(),
        "content-type": "application/json",
        "x-youtube-client-name": readNestedString(session.context, ["client", "clientName"]) ?? "WEB",
        "x-youtube-client-version":
          readNestedString(session.context, ["client", "clientVersion"]) ?? "2.20260601.00.00",
        ...(session.visitorData ? { "x-goog-visitor-id": session.visitorData } : {})
      },
      body: JSON.stringify({
        context: session.context,
        continuation: session.continuation
      })
    });

    const json = await response.json() as {
      continuationContents?: {
        liveChatContinuation?: {
          actions?: unknown[];
          continuations?: unknown[];
        };
      };
      error?: {
        message?: string;
        status?: string;
        code?: number;
      };
    };

    if (!response.ok || json.error) {
      const message = json.error?.message ?? response.statusText;
      const status = json.error?.status ?? response.status;
      throw new Error(`YouTube no-key API ${status}: ${message}`);
    }

    return json;
  }

  private forwardMessages(messages: ChatMessage[]) {
    const handler = this.handler;
    if (!handler) {
      return;
    }

    for (const message of messages) {
      if (this.seenMessageIds.has(message.id)) {
        continue;
      }

      this.seenMessageIds.add(message.id);

      if (this.firstPoll && this.options.skipInitialMessages) {
        continue;
      }

      if (message.message.trim().length > 0) {
        handler(message);
      }
    }
  }
}

const defaultHeaders = () => ({
  "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
});

const extractYtcfg = (html: string) => extractJsonAfterMarker(html, "ytcfg.set(") ?? {};

const extractInitialData = (html: string) => {
  const markers = [
    "var ytInitialData =",
    "window[\"ytInitialData\"] =",
    "window['ytInitialData'] =",
    "ytInitialData ="
  ];

  for (const marker of markers) {
    const json = extractJsonAfterMarker(html, marker);
    if (json) {
      return json;
    }
  }

  throw new Error("Cannot find ytInitialData on YouTube watch page.");
};

const extractJsonAfterMarker = (html: string, marker: string) => {
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }

  const braceIndex = html.indexOf("{", markerIndex + marker.length);
  if (braceIndex < 0) {
    return null;
  }

  const jsonText = readBalancedJsonObject(html, braceIndex);
  return JSON.parse(jsonText) as Record<string, unknown>;
};

const readBalancedJsonObject = (text: string, startIndex: number) => {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  throw new Error("Cannot parse balanced JSON object from YouTube page.");
};

const extractString = (html: string, key: string) => {
  const pattern = new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`);
  const value = html.match(pattern)?.[1];
  return value ? unescapeJsonString(value) : null;
};

const unescapeJsonString = (value: string) => JSON.parse(`"${value.replace(/"/g, "\\\"")}"`) as string;

const readString = (value: unknown, key: string) => {
  if (!isRecord(value)) {
    return null;
  }

  const candidate = value[key];
  return typeof candidate === "string" ? candidate : null;
};

const readObject = (value: unknown, key: string) => {
  if (!isRecord(value)) {
    return null;
  }

  const candidate = value[key];
  return isRecord(candidate) ? candidate : null;
};

const readNestedString = (value: unknown, path: string[]) => {
  let current: unknown = value;

  for (const key of path) {
    if (!isRecord(current)) {
      return null;
    }
    current = current[key];
  }

  return typeof current === "string" ? current : null;
};

const createFallbackContext = (ytcfg: Record<string, unknown>) => ({
  client: {
    clientName: "WEB",
    clientVersion: readString(ytcfg, "INNERTUBE_CLIENT_VERSION") ?? "2.20260601.00.00",
    visitorData: readString(ytcfg, "VISITOR_DATA") ?? undefined
  }
});

const findProperty = (value: unknown, propertyName: string): unknown => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findProperty(item, propertyName);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  if (value[propertyName]) {
    return value[propertyName];
  }

  for (const nested of Object.values(value)) {
    const found = findProperty(nested, propertyName);
    if (found) {
      return found;
    }
  }

  return null;
};

const findContinuation = (value: unknown): ContinuationResult | null => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findContinuation(item);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  for (const key of ["timedContinuationData", "invalidationContinuationData", "reloadContinuationData"]) {
    const candidate = value[key];
    if (isRecord(candidate) && typeof candidate.continuation === "string") {
      return {
        continuation: candidate.continuation,
        timeoutMs: typeof candidate.timeoutMs === "number" ? candidate.timeoutMs : undefined
      };
    }
  }

  if (typeof value.continuation === "string") {
    return { continuation: value.continuation };
  }

  for (const nested of Object.values(value)) {
    const found = findContinuation(nested);
    if (found) {
      return found;
    }
  }

  return null;
};

const extractMessages = (actions: unknown[]) =>
  actions
    .map((action) => {
      const renderer = findLiveChatRenderer(action);
      return renderer ? mapRenderer(renderer) : null;
    })
    .filter((message): message is ChatMessage => Boolean(message));

const findLiveChatRenderer = (value: unknown): LiveChatRenderer | null => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findLiveChatRenderer(item);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  for (const key of [
    "liveChatTextMessageRenderer",
    "liveChatPaidMessageRenderer",
    "liveChatMembershipItemRenderer"
  ]) {
    const candidate = value[key];
    if (isRecord(candidate)) {
      return candidate as unknown as LiveChatRenderer;
    }
  }

  for (const nested of Object.values(value)) {
    const found = findLiveChatRenderer(nested);
    if (found) {
      return found;
    }
  }

  return null;
};

const mapRenderer = (renderer: LiveChatRenderer): ChatMessage | null => {
  const message = textFromObject(renderer.message).trim();
  if (!message) {
    return null;
  }

  const timestampUsec = renderer.timestampUsec ? Number.parseInt(renderer.timestampUsec, 10) : NaN;

  return {
    id: renderer.id || `youtube-nokey-${Date.now()}-${messageSequence++}`,
    nickname: normalizeNickname(textFromObject(renderer.authorName) || "youtube-user"),
    message,
    receivedAt: Number.isFinite(timestampUsec) ? Math.floor(timestampUsec / 1000) : Date.now(),
    source: "youtube"
  };
};

const textFromObject = (value: TextObject | undefined) => {
  if (!value) {
    return "";
  }

  if (typeof value.simpleText === "string") {
    return value.simpleText;
  }

  return (value.runs ?? [])
    .map((run) => {
      if (typeof run.text === "string") {
        return run.text;
      }

      return run.emoji?.shortcuts?.[0] ??
        run.emoji?.image?.accessibility?.accessibilityData?.label ??
        run.emoji?.emojiId ??
        "";
    })
    .join("");
};

const normalizeNickname = (nickname: string) => {
  const clean = nickname.trim().replace(/^@/, "");
  return clean.length > 0 ? clean : "youtube-user";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
