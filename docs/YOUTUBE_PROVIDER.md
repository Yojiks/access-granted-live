# YouTubeChatProvider Handoff

The MVP keeps YouTube integration behind `ChatProvider` so the game loop does not depend on API auth details.

## Current State

- `MockChatProvider` is production-ready for local testing and OBS rehearsals.
- `YouTubeChatProvider` reads `YOUTUBE_LIVE_CHAT_ID` and `YOUTUBE_API_KEY`.
- Real polling is intentionally TODO because YouTube auth strategy depends on the channel setup.

## Implementation Path

1. Decide whether the stream can use API key polling or needs OAuth.
2. Poll `liveChat/messages` with the live chat id.
3. Preserve YouTube `nextPageToken` and `pollingIntervalMillis`.
4. Map each message into:

```ts
{
  id: youtubeMessage.id,
  nickname: authorDetails.displayName,
  message: snippet.displayMessage,
  receivedAt: Date.parse(snippet.publishedAt),
  source: "youtube"
}
```

5. Call the existing `onMessage` handler for each unseen message.
6. Keep OAuth tokens and secrets outside git.
