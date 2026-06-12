import { Terminal } from "lucide-react";

import type { GameEvent } from "@hacker-game/shared";
import { formatEventTime } from "../lib/format";

interface EventFeedProps {
  events: GameEvent[];
}

const EventFeed = ({ events }: EventFeedProps) => (
  <section className="terminal-panel event-feed" aria-label="Event feed">
    <div className="section-title">
      <Terminal size={16} />
      <span>LIVE SYSTEM LOG</span>
    </div>
    <div className="event-feed__list">
      {events.length === 0 && (
        <article className="event-line event-line--info">
          <time>--:--</time>
          <p>Ожидание входящих пакетов чата...</p>
        </article>
      )}
      {events.map((event) => (
        <article className={`event-line event-line--${event.severity}`} key={event.id}>
          <time>{formatEventTime(event.timestamp)}</time>
          <p>{event.message}</p>
        </article>
      ))}
    </div>
  </section>
);

export default EventFeed;
