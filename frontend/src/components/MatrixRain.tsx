import { useEffect, useRef } from "react";

const glyphs = "0123456789$#@%&<>/\\[]{}ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let animationFrame = 0;
    let columns: number[] = [];
    let width = 0;
    let height = 0;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width * ratio));
      height = Math.max(1, Math.floor(rect.height * ratio));
      canvas.width = width;
      canvas.height = height;
      const columnCount = Math.floor(width / 28);
      columns = Array.from({ length: columnCount }, () => Math.random() * height);
    };

    const draw = () => {
      context.fillStyle = "rgba(2, 5, 4, 0.18)";
      context.fillRect(0, 0, width, height);
      context.font = `${18 * (window.devicePixelRatio || 1)}px Consolas, monospace`;

      columns.forEach((y, index) => {
        const glyph = glyphs[Math.floor(Math.random() * glyphs.length)] ?? "0";
        const x = index * 28 * (window.devicePixelRatio || 1);
        context.fillStyle = index % 7 === 0 ? "rgba(37, 199, 255, 0.45)" : "rgba(72, 255, 175, 0.42)";
        context.fillText(glyph, x, y);
        columns[index] = y > height + Math.random() * 600 ? 0 : y + 21 * (window.devicePixelRatio || 1);
      });

      animationFrame = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas className="matrix-rain" ref={canvasRef} aria-hidden="true" />;
};

export default MatrixRain;
