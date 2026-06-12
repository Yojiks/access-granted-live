import { Dice5, RotateCcw, Send } from "lucide-react";
import { FormEvent, useState } from "react";

import type { GameSnapshot } from "@hacker-game/shared";

interface DevPanelProps {
  snapshot: GameSnapshot | null;
  onSendMessage: (payload: { nickname: string; message: string }) => void;
  onRandomGuess: (payload: { nickname: string }) => void;
  onForceNewRound: () => void;
}

const DevPanel = ({ snapshot, onSendMessage, onRandomGuess, onForceNewRound }: DevPanelProps) => {
  const [nickname, setNickname] = useState("debug_user");
  const [message, setMessage] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSendMessage({ nickname, message });
    setMessage("");
  };

  return (
    <form className="dev-panel" onSubmit={submit}>
      <div className="dev-panel__secret">
        SECRET: <strong>{snapshot?.debugSecretCode ?? "----"}</strong>
      </div>
      <label>
        <span>nickname</span>
        <input value={nickname} onChange={(event) => setNickname(event.target.value)} />
      </label>
      <label>
        <span>message</span>
        <input value={message} onChange={(event) => setMessage(event.target.value)} />
      </label>
      <div className="dev-panel__actions">
        <button type="submit" title="Send message">
          <Send size={16} />
          Send
        </button>
        <button type="button" onClick={() => onRandomGuess({ nickname })} title="Random guess">
          <Dice5 size={16} />
          Random Guess
        </button>
        <button type="button" onClick={onForceNewRound} title="Force new round">
          <RotateCcw size={16} />
          Force New Round
        </button>
      </div>
    </form>
  );
};

export default DevPanel;
