import MatrixRain from "./components/MatrixRain";

const App = () => {
  return (
    <main className="app-shell">
      <MatrixRain />
      <section className="overlay-frame">
        <p>BOOTING BREACH SIMULATOR...</p>
      </section>
    </main>
  );
};

export default App;
