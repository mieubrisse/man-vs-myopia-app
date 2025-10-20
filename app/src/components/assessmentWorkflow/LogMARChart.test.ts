import { describe, it, expect } from 'vitest';
import { calculateLetterPixelSizeForLogMAR } from './LogMARChart.tsx';

describe('calculateLetterPixelSizeForLogMAR', () => {
  it('calculates correct pixel size for LogMAR 0.0 (6/6) at 6m, 40px/cm', () => {
    // Typical: 40cm viewing, 40px/cm calibration, LogMAR 0.0
    const px = calculateLetterPixelSizeForLogMAR(0.0, 600, 40);
    // Reference: Should be about 7.8px (for 20/20 at 40cm)
    expect(px).toBe(35);
  });

  it('calculates correct pixel size for LogMAR 1.0 (6/6) at 6m, 40px/cm', () => {
    const px = calculateLetterPixelSizeForLogMAR(1.0, 600, 40);
    // Should be about 78px (10x the 20/20 size)
    expect(px).toBe(349);
  });

  // TODO
  it('calculates correct pixel size for LogMAR 1.0 in the home lab: 458.2cm and TODO ', () => {
    /*
    const px = calculateLetterPixelSizeForLogMAR(1.0, 600, 40);
    // Should be about 78px (10x the 20/20 size)
    expect(px).toBe(349);
    */
  });

  it('handles negative LogMAR (better than 6/6 at 6m)', () => {
    const px = calculateLetterPixelSizeForLogMAR(-0.2, 600, 40);
    expect(px).toBeLessThan(8);
  });

  it('throws if viewingDistanceCm is zero', () => {
    expect(() => calculateLetterPixelSizeForLogMAR(0.0, 0, 40)).toThrow(
      'viewingDistanceCm must be nonzero'
    );
  });

  it('throws if fontSizePxPerCm is zero', () => {
    expect(() => calculateLetterPixelSizeForLogMAR(0.0, 40, 0)).toThrow(
      'fontSizePxPerCm must be nonzero'
    );
  });
});
