import { Activity, Crosshair, Radio, Timer, Users } from "lucide-react";

import type { GameSnapshot } from "@hacker-game/shared";
import { formatClock } from "../lib/format";

interface StatsGridProps {
  snapshot: GameSnapshot;
}

const StatsGrid = ({ snapshot }: StatsGridProps) => {
  const stats = [
    { label: "ROUND", value: snapshot.roundId, icon: <Radio size={18} /> },
    { label: "ATTEMPTS", value: snapshot.attempts, icon: <Crosshair size={18} /> },
    { label: "USERS", value: snapshot.participants, icon: <Users size={18} /> },
    { label: "OPEN", value: `${snapshot.revealedPositions.length}/3`, icon: <Activity size={18} /> },
    { label: "TIMER", value: formatClock(snapshot.elapsedSeconds), icon: <Timer size={18} /> }
  ];

  return (
    <section className="stats-grid" aria-label="Round stats">
      {stats.map((item) => (
        <div className="stat-tile" key={item.label}>
          <span>{item.icon}</span>
          <strong>{item.value}</strong>
          <small>{item.label}</small>
        </div>
      ))}
    </section>
  );
};

export default StatsGrid;
