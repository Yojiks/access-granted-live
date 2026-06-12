export const formatClock = (seconds: number) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
};

export const formatEventTime = (timestamp: number) =>
  new Intl.DateTimeFormat("ru", {
    minute: "2-digit",
    second: "2-digit"
  }).format(timestamp);
