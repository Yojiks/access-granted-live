# YouTubeChatProvider

Backend can read real YouTube Live Chat messages and feed them into the game loop through the shared `ChatProvider` interface.

## Official Setup

Use `.env`:

```env
CHAT_PROVIDER=youtube
YOUTUBE_API_KEY=your_api_key
YOUTUBE_VIDEO_ID=your_live_video_id
```

You can also set `YOUTUBE_LIVE_CHAT_ID` directly. If both are present, `YOUTUBE_LIVE_CHAT_ID` wins.

## No-Key Setup

If Google Cloud billing/payment is unavailable, use the no-key provider:

```env
CHAT_PROVIDER=youtube_nokey
YOUTUBE_VIDEO_ID=your_live_video_id
YOUTUBE_NOKEY_POLL_INTERVAL_MS=2500
YOUTUBE_SKIP_INITIAL_MESSAGES=true
```

This provider reads the public YouTube watch page, extracts Innertube config and live-chat continuation, then polls YouTube's internal live chat endpoint. It does not need `YOUTUBE_API_KEY` or OAuth.

This is intentionally less stable than the official API. YouTube can change the page structure or internal endpoint at any time.

## Options

```env
YOUTUBE_LIVE_CHAT_ID=
YOUTUBE_VIDEO_ID=
YOUTUBE_API_KEY=
YOUTUBE_OAUTH_ACCESS_TOKEN=
YOUTUBE_POLL_MAX_RESULTS=200
YOUTUBE_MIN_POLL_INTERVAL_MS=2000
YOUTUBE_SKIP_INITIAL_MESSAGES=true
YOUTUBE_NOKEY_POLL_INTERVAL_MS=2500
```

- `YOUTUBE_VIDEO_ID`: video id from the live stream URL.
- `YOUTUBE_LIVE_CHAT_ID`: direct live chat id, if you already know it.
- `YOUTUBE_API_KEY`: YouTube Data API key.
- `YOUTUBE_OAUTH_ACCESS_TOKEN`: optional bearer token for setups that require OAuth.
- `YOUTUBE_SKIP_INITIAL_MESSAGES`: skips old history from the first API response so a running stream does not flood the game on startup.
- `YOUTUBE_NOKEY_POLL_INTERVAL_MS`: fallback no-key polling interval when YouTube does not return a timeout.

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

Debug messages also work while `CHAT_PROVIDER=youtube_nokey` is active.
