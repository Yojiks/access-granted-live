import { describe, expect, it } from "vitest";

import { generateCode, maxRevealedDigitsForElapsed, parseGuess } from "./utils.js";

describe("game utils", () => {
  it("generates fixed-length numeric codes with leading zeroes", () => {
    const digits = [0.01, 0.02, 0.03, 0.79];
    let index = 0;

    expect(generateCode(4, () => digits[index++] ?? 0)).toBe("0007");
  });

  it("parses the first standalone four-digit guess", () => {
    expect(parseGuess("try 1234 then 9876")).toBe("1234");
    expect(parseGuess("0007")).toBe("0007");
    expect(parseGuess("abc12345")).toBeNull();
    expect(parseGuess("12 3456")).toBe("3456");
  });

  it("calculates timed reveal limits", () => {
    expect(maxRevealedDigitsForElapsed(0)).toBe(0);
    expect(maxRevealedDigitsForElapsed(29)).toBe(0);
    expect(maxRevealedDigitsForElapsed(30)).toBe(1);
    expect(maxRevealedDigitsForElapsed(60)).toBe(2);
    expect(maxRevealedDigitsForElapsed(90)).toBe(3);
  });
});
