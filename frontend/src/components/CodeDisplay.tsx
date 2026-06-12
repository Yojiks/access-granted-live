import { Lock, Unlock } from "lucide-react";
import { useEffect, useState } from "react";

import type { GameSnapshot } from "@hacker-game/shared";

interface CodeDisplayProps {
  snapshot: GameSnapshot;
}

const symbols = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "#", "%", "▓"];

const CodeDisplay = ({ snapshot }: CodeDisplayProps) => {
  const [scramble, setScramble] = useState(() => snapshot.visibleCode.map(() => "▓"));
  const locked = snapshot.status !== "running";

  useEffect(() => {
    if (locked) {
      return;
    }

    const timer = window.setInterval(() => {
      setScramble((current) =>
        current.map(() => symbols[Math.floor(Math.random() * symbols.length)] ?? "▓")
      );
    }, 90);

    return () => window.clearInterval(timer);
  }, [locked]);

  return (
    <section className="code-panel" aria-label="Current encrypted code">
      <div className="code-panel__scan" />
      <div className="code-panel__meta">
        <span>PASSWORD CRACKING MODULE</span>
        <span>ROUND {snapshot.roundId.toString().padStart(3, "0")}</span>
      </div>
      <div className="code-digits">
        {snapshot.visibleCode.map((digit, index) => {
          const revealed = digit !== null;
          return (
            <div className={`code-digit ${revealed ? "is-revealed" : "is-hidden"}`} key={index}>
              <span>{revealed ? digit : scramble[index] ?? "▓"}</span>
              <small>{revealed ? "OPEN" : "LOCK"}</small>
            </div>
          );
        })}
      </div>
      <div className="code-panel__footer">
        <span className="chip">
          {snapshot.status === "running" ? <Lock size={15} /> : <Unlock size={15} />}
          {snapshot.status === "running" ? "ENCRYPTED" : "ACCESS GRANTED"}
        </span>
        <span>{snapshot.revealedPositions.length}/3 leak sectors open</span>
      </div>
    </section>
  );
};

export default CodeDisplay;
