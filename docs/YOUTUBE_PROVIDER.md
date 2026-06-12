# YouTubeChatProvider

Backend can read real YouTube Live Chat messages and feed them into the game loop through the shared `ChatProvider` interface.

## Setup

Use `.env`:

```env
CHAT_PROVIDER=youtube
YOUTUBE_API_KEY=your_api_key
YOUTUBE_VIDEO_ID=your_live_video_id
```

You can also set `YOUTUBE_LIVE_CHAT_ID` directly. If both are present, `YOUTUBE_LIVE_CHAT_ID` wins.

## Options

```env
YOUTUBE_LIVE_CHAT_ID=
YOUTUBE_VIDEO_ID=
YOUTUBE_API_KEY=
YOUTUBE_OAUTH_ACCESS_TOKEN=
YOUTUBE_POLL_MAX_RESULTS=200
YOUTUBE_MIN_POLL_INTERVAL_MS=2000
YOUTUBE_SKIP_INITIAL_MESSAGES=true
```

- `YOUTUBE_VIDEO_ID`: video id from the live stream URL.
- `YOUTUBE_LIVE_CHAT_ID`: direct live chat id, if you already know it.
- `YOUTUBE_API_KEY`: YouTube Data API key.
- `YOUTUBE_OAUTH_ACCESS_TOKEN`: optional bearer token for setups that require OAuth.
- `YOUTUBE_SKIP_INITIAL_MESSAGES`: skips old history from the first API response so a running stream does not flood the game on startup.

## Behavior

- Resolves `activeLiveChatId` from `videos.list` when only `YOUTUBE_VIDEO_ID` is provided.
- Polls `liveChat/messages` with `part=snippet,authorDetails`.
- Preserves `nextPageToken` and uses YouTube `pollingIntervalMillis`.
- Deduplicates message ids.
- Maps YouTube messages into:

```ts
{
  id: youtubeMessage.id,
  nickname: authorDetails.displayName,
  message: snippet.displayMessage,
  receivedAt: Date.parse(snippet.publishedAt),
  source: "youtube"
}
```

Debug messages still work through `?debug=true`, even while `CHAT_PROVIDER=youtube` is active.
