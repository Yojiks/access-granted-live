import { Trophy } from "lucide-react";

import type { Leaderboard, PlayerStats } from "@hacker-game/shared";

interface LeaderboardPanelProps {
  leaderboard: Leaderboard;
}

const renderPlayers = (players: PlayerStats[], metric: keyof Pick<PlayerStats, "wins" | "revealedDigits" | "attempts">) => (
  <ol className="leaderboard-list">
    {players.slice(0, 3).map((player) => (
      <li key={`${metric}-${player.nickname}`}>
        <span>@{player.nickname}</span>
        <strong>{player[metric]}</strong>
      </li>
    ))}
    {players.length === 0 && <li className="leaderboard-list__empty">нет данных</li>}
  </ol>
);

const LeaderboardPanel = ({ leaderboard }: LeaderboardPanelProps) => (
  <section className="terminal-panel leaderboard" aria-label="Breach ranks">
    <div className="section-title">
      <Trophy size={16} />
      <span>BREACH RANKS</span>
    </div>
    <div className="leaderboard-grid">
      <div>
        <h3>WINS</h3>
        {renderPlayers(leaderboard.byWins, "wins")}
      </div>
      <div>
        <h3>LEAKS</h3>
        {renderPlayers(leaderboard.byReveals, "revealedDigits")}
      </div>
      <div>
        <h3>TRIES</h3>
        {renderPlayers(leaderboard.byAttempts, "attempts")}
      </div>
    </div>
  </section>
);

export default LeaderboardPanel;
