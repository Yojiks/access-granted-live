import { KeyRound, MessageSquareText } from "lucide-react";

import type { GameSnapshot } from "@hacker-game/shared";

interface WinnerOverlayProps {
  snapshot: GameSnapshot;
}

const WinnerOverlay = ({ snapshot }: WinnerOverlayProps) => {
  if (snapshot.winnerWindow) {
    return (
      <section className="winner-overlay winner-overlay--access" aria-live="polite">
        <div className="winner-overlay__glitch">ACCESS GRANTED</div>
        <p>Код взломан пользователем: @{snapshot.winnerWindow.nickname}</p>
        <span>
          <KeyRound size={18} />
          {snapshot.winnerWindow.remainingSeconds}s на сообщение победителя
        </span>
      </section>
    );
  }

  if (snapshot.winnerMessage) {
    return (
      <section className="winner-overlay winner-overlay--message" aria-live="polite">
        <div className="winner-overlay__label">
          <MessageSquareText size={20} />
          <span>Сообщение победителя</span>
        </div>
        <strong>@{snapshot.winnerMessage.nickname}</strong>
        <p>{snapshot.winnerMessage.message}</p>
      </section>
    );
  }

  return null;
};

export default WinnerOverlay;
