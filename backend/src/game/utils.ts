export const generateCode = (length: number, rng: () => number = Math.random) =>
  Array.from({ length }, () => Math.floor(rng() * 10)).join("");

export const parseGuess = (message: string, codeLength = 4) => {
  const regex = new RegExp(`(?:^|\\D)(\\d{${codeLength}})(?!\\d)`);
  return message.match(regex)?.[1] ?? null;
};

export const matchingPositions = (guess: string, secretCode: string) =>
  Array.from(secretCode)
    .map((digit, index) => (guess[index] === digit ? index : -1))
    .filter((index) => index >= 0);

export const maxRevealedDigitsForElapsed = (elapsedSeconds: number) => {
  if (elapsedSeconds < 30) {
    return 0;
  }

  if (elapsedSeconds < 60) {
    return 1;
  }

  if (elapsedSeconds < 90) {
    return 2;
  }

  return 3;
};

export const secondsUntilNextLeak = (elapsedSeconds: number) => {
  if (elapsedSeconds < 30) {
    return 30 - elapsedSeconds;
  }

  if (elapsedSeconds < 60) {
    return 60 - elapsedSeconds;
  }

  if (elapsedSeconds < 90) {
    return 90 - elapsedSeconds;
  }

  return null;
};
