import { Terminal } from "lucide-react";

import type { GameEvent } from "@hacker-game/shared";

interface EventFeedProps {
  events: GameEvent[];
}

const formatTime = (timestamp: number) =>
  new Intl.DateTimeFormat("ru", {
    minute: "2-digit",
    second: "2-digit"
  }).format(timestamp);

const EventFeed = ({ events }: EventFeedProps) => (
  <section className="terminal-panel event-feed" aria-label="Event feed">
    <div className="section-title">
      <Terminal size={16} />
      <span>LIVE SYSTEM LOG</span>
    </div>
    <div className="event-feed__list">
      {events.map((event) => (
        <article className={`event-line event-line--${event.severity}`} key={event.id}>
          <time>{formatTime(event.timestamp)}</time>
          <p>{event.message}</p>
        </article>
      ))}
    </div>
  </section>
);

export default EventFeed;
