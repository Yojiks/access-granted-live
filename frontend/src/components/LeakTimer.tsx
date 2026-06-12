import { ShieldAlert } from "lucide-react";

import type { GameSnapshot } from "@hacker-game/shared";

interface LeakTimerProps {
  snapshot: GameSnapshot;
}

const formatCountdown = (seconds: number | null) => {
  if (seconds === null) {
    return "MAX LEAK";
  }

  return `00:${Math.max(0, seconds).toString().padStart(2, "0")}`;
};

const leakLabel = (snapshot: GameSnapshot) => {
  if (snapshot.maxRevealedDigits === 0) {
    return "Частичные совпадения заблокированы";
  }

  if (snapshot.maxRevealedDigits >= 3) {
    return "Открыт максимум: финальная цифра только полным кодом";
  }

  return `Можно открыть до ${snapshot.maxRevealedDigits} фрагм. кода`;
};

const LeakTimer = ({ snapshot }: LeakTimerProps) => (
  <section className="leak-timer" aria-label="System leak timer">
    <div className="section-title">
      <ShieldAlert size={16} />
      <span>SYSTEM LEAK TIMER</span>
    </div>
    <strong>{formatCountdown(snapshot.secondsUntilNextLeak)}</strong>
    <p>{leakLabel(snapshot)}</p>
  </section>
);

export default LeakTimer;
