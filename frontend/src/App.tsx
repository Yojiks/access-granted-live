import BannerSlot from "./components/BannerSlot";
import CodeDisplay from "./components/CodeDisplay";
import DevPanel from "./components/DevPanel";
import EventFeed from "./components/EventFeed";
import LeaderboardPanel from "./components/LeaderboardPanel";
import LeakTimer from "./components/LeakTimer";
import MatrixRain from "./components/MatrixRain";
import StatsGrid from "./components/StatsGrid";
import WinnerOverlay from "./components/WinnerOverlay";
import { useGameSocket } from "./hooks/useGameSocket";

const isDebugMode = () => new URLSearchParams(window.location.search).get("debug") === "true";

const App = () => {
  const debug = isDebugMode();
  const { snapshot, connectionState, sendMessage, sendRandomGuess, forceNewRound } = useGameSocket(debug);

  return (
    <main className="app-shell">
      <MatrixRain />
      <section className={`overlay-frame overlay-frame--${connectionState}`}>
        <div className="scanline-layer" aria-hidden="true" />
        <header className="app-header">
          <div>
            <h1>SYSTEM BREACH SIMULATOR</h1>
          </div>
          <div className={`connection-pill connection-pill--${connectionState}`}>
            <span />
            {connectionState.toUpperCase()}
          </div>
        </header>

        {snapshot ? (
          <>
            <BannerSlot banner={snapshot.config.banner1} position="top" />
            <StatsGrid snapshot={snapshot} />
            <CodeDisplay snapshot={snapshot} />
            <LeakTimer snapshot={snapshot} />
            <EventFeed events={snapshot.events} />
            <LeaderboardPanel leaderboard={snapshot.leaderboard} />
            <WinnerOverlay snapshot={snapshot} />
          </>
        ) : (
          <section className="boot-panel">
            <strong>BOOTING BREACH SIMULATOR</strong>
            <p>Ожидание backend-сигнала...</p>
          </section>
        )}
      </section>
      {debug && (
        <DevPanel
          snapshot={snapshot}
          onSendMessage={sendMessage}
          onRandomGuess={sendRandomGuess}
          onForceNewRound={forceNewRound}
        />
      )}
    </main>
  );
};

export default App;
