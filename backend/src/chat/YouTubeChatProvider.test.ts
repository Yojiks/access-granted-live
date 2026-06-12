import type { ChatMessage } from "@hacker-game/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

import { YouTubeChatProvider, type YouTubeChatProviderOptions } from "./YouTubeChatProvider.js";

const baseOptions: YouTubeChatProviderOptions = {
  liveChatId: "live-chat-id",
  videoId: "",
  apiKey: "api-key",
  oauthAccessToken: "",
  maxResults: 200,
  minPollIntervalMs: 2000,
  skipInitialMessages: false
};

const youtubeResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  json: async () => body
}) as Response;

describe("YouTubeChatProvider", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("polls live chat messages and maps them into chat messages", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(youtubeResponse({
      nextPageToken: "next-page",
      pollingIntervalMillis: 7000,
      items: [
        {
          id: "msg-1",
          snippet: {
            displayMessage: "4821",
            publishedAt: "2026-06-12T08:00:00Z"
          },
          authorDetails: {
            displayName: "Neo"
          }
        }
      ]
    }));
    vi.stubGlobal("fetch", fetchMock);
    const received: ChatMessage[] = [];
    const provider = new YouTubeChatProvider(baseOptions);

    provider.start((message) => received.push(message));
    await vi.runOnlyPendingTimersAsync();
    provider.stop();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("liveChat/messages");
    expect(received).toMatchObject([
      {
        id: "msg-1",
        nickname: "Neo",
        message: "4821",
        source: "youtube"
      }
    ]);
  });

  it("skips initial history and forwards only later unseen messages", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(youtubeResponse({
        nextPageToken: "page-1",
        pollingIntervalMillis: 5000,
        items: [
          {
            id: "old-message",
            snippet: { displayMessage: "1111", publishedAt: "2026-06-12T08:00:00Z" },
            authorDetails: { displayName: "OldUser" }
          }
        ]
      }))
      .mockResolvedValueOnce(youtubeResponse({
        nextPageToken: "page-2",
        pollingIntervalMillis: 5000,
        items: [
          {
            id: "old-message",
            snippet: { displayMessage: "1111", publishedAt: "2026-06-12T08:00:00Z" },
            authorDetails: { displayName: "OldUser" }
          },
          {
            id: "new-message",
            snippet: { displayMessage: "2222", publishedAt: "2026-06-12T08:00:05Z" },
            authorDetails: { displayName: "NewUser" }
          }
        ]
      }));
    vi.stubGlobal("fetch", fetchMock);
    const received: ChatMessage[] = [];
    const provider = new YouTubeChatProvider({
      ...baseOptions,
      skipInitialMessages: true
    });

    provider.start((message) => received.push(message));
    await vi.runOnlyPendingTimersAsync();
    expect(received).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(5000);
    provider.stop();

    expect(received).toMatchObject([
      {
        id: "new-message",
        nickname: "NewUser",
        message: "2222"
      }
    ]);
  });

  it("resolves active live chat id from a video id", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(youtubeResponse({
        items: [
          {
            liveStreamingDetails: {
              activeLiveChatId: "resolved-chat-id"
            }
          }
        ]
      }))
      .mockResolvedValueOnce(youtubeResponse({
        nextPageToken: "page-1",
        pollingIntervalMillis: 5000,
        items: []
      }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new YouTubeChatProvider({
      ...baseOptions,
      liveChatId: "",
      videoId: "video-id"
    });

    provider.start(() => {});
    await vi.runOnlyPendingTimersAsync();
    provider.stop();

    const firstUrl = String(fetchMock.mock.calls[0]?.[0]);
    const secondUrl = String(fetchMock.mock.calls[1]?.[0]);
    expect(firstUrl).toContain("videos");
    expect(firstUrl).toContain("id=video-id");
    expect(secondUrl).toContain("liveChat/messages");
    expect(secondUrl).toContain("liveChatId=resolved-chat-id");
  });
});
