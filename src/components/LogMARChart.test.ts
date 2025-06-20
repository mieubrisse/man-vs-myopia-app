import { describe, it, expect } from "vitest";
import { calculateLetterPixelSizeForLogMAR } from "./LogMARChart";

// Helper for approximate equality
function expectCloseTo(actual: number, expected: number, precision = 1) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(precision);
}

describe("calculateLetterPixelSizeForLogMAR", () => {
  it("calculates correct pixel size for LogMAR 0.0 (20/20) at 40cm, 40px/cm", () => {
    // Typical: 40cm viewing, 40px/cm calibration, LogMAR 0.0
    const px = calculateLetterPixelSizeForLogMAR(0.0, 40, 40);
    // Reference: Should be about 7.8px (for 20/20 at 40cm)
    expectCloseTo(px, 8, 1);
  });

  it("calculates correct pixel size for LogMAR 1.0 (20/200) at 40cm, 40px/cm", () => {
    const px = calculateLetterPixelSizeForLogMAR(1.0, 40, 40);
    // Should be about 78px (10x the 20/20 size)
    expectCloseTo(px, 78, 2);
  });

  it("scales with viewing distance", () => {
    const px40 = calculateLetterPixelSizeForLogMAR(0.0, 40, 40);
    const px80 = calculateLetterPixelSizeForLogMAR(0.0, 80, 40);
    expect(px80).toBeGreaterThan(px40);
    expectCloseTo(px80, px40 * 2, 2);
  });

  it("scales with px/cm calibration", () => {
    const px40 = calculateLetterPixelSizeForLogMAR(0.0, 40, 40);
    const px80 = calculateLetterPixelSizeForLogMAR(0.0, 40, 80);
    expect(px80).toBeGreaterThan(px40);
    expectCloseTo(px80, px40 * 2, 2);
  });

  it("returns 0 for zero viewing distance", () => {
    const px = calculateLetterPixelSizeForLogMAR(0.0, 0, 40);
    expect(px).toBe(0);
  });

  it("returns 0 for zero px/cm calibration", () => {
    const px = calculateLetterPixelSizeForLogMAR(0.0, 40, 0);
    expect(px).toBe(0);
  });

  it("handles negative LogMAR (better than 20/20)", () => {
    const px = calculateLetterPixelSizeForLogMAR(-0.2, 40, 40);
    expect(px).toBeLessThan(8);
  });
});
