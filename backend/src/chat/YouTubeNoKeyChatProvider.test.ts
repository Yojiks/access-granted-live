import type { ChatMessage } from "@hacker-game/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

import { YouTubeNoKeyChatProvider } from "./YouTubeNoKeyChatProvider.js";

const watchHtml = `
  <html>
    <script>
      ytcfg.set({
        "INNERTUBE_API_KEY": "inner-api-key",
        "VISITOR_DATA": "visitor-token",
        "INNERTUBE_CONTEXT": {
          "client": {
            "clientName": "WEB",
            "clientVersion": "2.20260601.00.00",
            "visitorData": "visitor-token"
          }
        }
      });
    </script>
    <script>
      var ytInitialData = {
        "contents": {
          "twoColumnWatchNextResults": {
            "conversationBar": {
              "liveChatRenderer": {
                "continuations": [
                  {
                    "reloadContinuationData": {
                      "continuation": "initial-continuation"
                    }
                  }
                ]
              }
            }
          }
        }
      };
    </script>
  </html>
`;

const htmlResponse = (html: string) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  text: async () => html
}) as Response;

const jsonResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  json: async () => body
}) as Response;

const chatResponse = (messageId: string, text: string, nextContinuation = "next-continuation") => ({
  continuationContents: {
    liveChatContinuation: {
      actions: [
        {
          addChatItemAction: {
            item: {
              liveChatTextMessageRenderer: {
                id: messageId,
                authorName: { simpleText: "Hacker" },
                message: { runs: [{ text }] },
                timestampUsec: "1781265600000000"
              }
            }
          }
        }
      ],
      continuations: [
        {
          timedContinuationData: {
            continuation: nextContinuation,
            timeoutMs: 4000
          }
        }
      ]
    }
  }
});

describe("YouTubeNoKeyChatProvider", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("extracts watch page config and forwards live chat messages", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(htmlResponse(watchHtml))
      .mockResolvedValueOnce(jsonResponse(chatResponse("msg-1", "4821")));
    vi.stubGlobal("fetch", fetchMock);
    const received: ChatMessage[] = [];
    const provider = new YouTubeNoKeyChatProvider({
      videoId: "video-id",
      pollIntervalMs: 2500,
      skipInitialMessages: false
    });

    provider.start((message) => received.push(message));
    await vi.runOnlyPendingTimersAsync();
    provider.stop();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("watch?v=video-id");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("youtubei/v1/live_chat/get_live_chat");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      continuation: "initial-continuation"
    });
    expect(received).toMatchObject([
      {
        id: "msg-1",
        nickname: "Hacker",
        message: "4821",
        source: "youtube"
      }
    ]);
  });

  it("skips first response when configured and forwards later messages only once", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(htmlResponse(watchHtml))
      .mockResolvedValueOnce(jsonResponse(chatResponse("old-msg", "1111", "page-2")))
      .mockResolvedValueOnce(jsonResponse(chatResponse("new-msg", "2222", "page-3")));
    vi.stubGlobal("fetch", fetchMock);
    const received: ChatMessage[] = [];
    const provider = new YouTubeNoKeyChatProvider({
      videoId: "video-id",
      pollIntervalMs: 2500,
      skipInitialMessages: true
    });

    provider.start((message) => received.push(message));
    await vi.runOnlyPendingTimersAsync();
    expect(received).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(4000);
    provider.stop();

    expect(received).toMatchObject([
      {
        id: "new-msg",
        message: "2222"
      }
    ]);
  });
});
