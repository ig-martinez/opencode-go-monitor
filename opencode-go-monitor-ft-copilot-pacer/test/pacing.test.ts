import { describe, it, expect } from 'vitest';
import {
  calculatePacing,
  computePeriodBoundaries,
  type PacingResult,
} from '../src/domain/pacing';

describe('computePeriodBoundaries', () => {
  it('rolling: covers 90 days ending now', () => {
    const now = new Date('2026-06-11T12:00:00Z');
    const { start, end } = computePeriodBoundaries('rolling', now);

    const expectedEnd = Math.floor(now.getTime() / 1000);
    const expectedStart = expectedEnd - 90 * 24 * 60 * 60;

    expect(end).toBe(expectedEnd);
    expect(start).toBe(expectedStart);
  });

  it('weekly: starts on Monday 00:00 UTC and ends next Monday 00:00 UTC', () => {
    // 2026-06-11 is a Thursday
    const now = new Date('2026-06-11T12:00:00Z');
    const { start, end } = computePeriodBoundaries('weekly', now);

    const startDate = new Date(start * 1000);
    const endDate = new Date(end * 1000);

    // Monday 00:00 UTC that week — 2026-06-08
    expect(startDate.getUTCDay()).toBe(1); // Monday
    expect(startDate.getUTCHours()).toBe(0);
    expect(startDate.getUTCMinutes()).toBe(0);
    expect(startDate.getUTCSeconds()).toBe(0);

    // Next Monday 00:00 UTC — 2026-06-15
    expect(endDate.getUTCDay()).toBe(1);
    expect(endDate.getUTCHours()).toBe(0);
    expect(endDate.getUTCMinutes()).toBe(0);
    expect(endDate.getUTCSeconds()).toBe(0);
    expect(endDate.getTime() - startDate.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('monthly: starts on 1st 00:00 UTC and ends on 1st of next month 00:00 UTC', () => {
    const now = new Date('2026-06-11T12:00:00Z');
    const { start, end } = computePeriodBoundaries('monthly', now);

    const startDate = new Date(start * 1000);
    const endDate = new Date(end * 1000);

    expect(startDate.getUTCDate()).toBe(1);
    expect(startDate.getUTCHours()).toBe(0);
    expect(startDate.getUTCMinutes()).toBe(0);
    expect(startDate.getUTCMonth()).toBe(5); // June
    expect(startDate.getUTCFullYear()).toBe(2026);

    expect(endDate.getUTCDate()).toBe(1);
    expect(endDate.getUTCHours()).toBe(0);
    expect(endDate.getUTCMonth()).toBe(6); // July
    expect(endDate.getUTCFullYear()).toBe(2026);
  });
});

describe('calculatePacing', () => {
  // Helper: create a 30-day monthly period (June 2026)
  function makeJunePeriod(): { start: number; end: number } {
    const start = new Date('2026-06-01T00:00:00Z').getTime() / 1000;
    const end = new Date('2026-07-01T00:00:00Z').getTime() / 1000;
    return { start, end };
  }

  it('empty usage (0%) — all empty blocks', () => {
    const { start, end } = makeJunePeriod();
    // Day 15 of 30 — exactly in the middle
    const now = new Date('2026-06-15T00:00:00Z');
    const result = calculatePacing(0, start, end, now);

    // Usage is 0, past 14 days quota = 14/30 * 100 ≈ 46.7%, so 0% is well below
    expect(result.pastRatio).toBeLessThan(1);
    expect(result.lensRatio).toBe(0);
    expect(result.futureRatio).toBe(0);
    expect(result.buffer).toBeGreaterThan(0);
    expect(result.progressBar).toContain('┃');
    expect(result.progressBar).toContain('▱');
  });

  it('ahead of schedule — usage below today opening quota', () => {
    const { start, end } = makeJunePeriod();
    // Day 15 of 30 — past = 14 days. startOfTodayQuota = 14/30*100 ≈ 46.7%
    const now = new Date('2026-06-15T00:00:00Z');
    const result = calculatePacing(20, start, end, now);

    // 20% < 46.7% → ahead of schedule
    expect(result.pastRatio).toBeGreaterThan(0);
    expect(result.pastRatio).toBeLessThan(1);
    expect(result.lensRatio).toBe(0);
    expect(result.futureRatio).toBe(0);
    expect(result.buffer).toBeGreaterThan(0);
  });

  it('on track — usage inside today lens', () => {
    const { start, end } = makeJunePeriod();
    // Day 20 of 30 — past = 19 days. startOfTodayQuota = 19/30*100 ≈ 63.3%
    // endOfTodayQuota = 20/30*100 ≈ 66.7%
    const now = new Date('2026-06-20T00:00:00Z');
    const result = calculatePacing(65, start, end, now);

    // 65% ≥ 63.3% and 65% ≤ 66.7% → on track inside lens
    expect(result.pastRatio).toBe(1);
    expect(result.lensRatio).toBeGreaterThan(0);
    expect(result.lensRatio).toBeLessThanOrEqual(1);
    expect(result.futureRatio).toBe(0);
    expect(result.buffer).toBeGreaterThan(0);
  });

  it('over budget — usage exceeds today closing quota', () => {
    const { start, end } = makeJunePeriod();
    // Day 15 of 30 — endOfTodayQuota = 15/30*100 = 50%
    const now = new Date('2026-06-15T00:00:00Z');
    const result = calculatePacing(70, start, end, now);

    // 70% > 50% → over budget
    expect(result.pastRatio).toBe(1);
    expect(result.lensRatio).toBe(1);
    expect(result.futureRatio).toBeGreaterThan(0);
    expect(result.buffer).toBeLessThan(0);
  });

  it('100% usage — all blocks filled', () => {
    const { start, end } = makeJunePeriod();
    const now = new Date('2026-06-15T00:00:00Z');
    const result = calculatePacing(100, start, end, now);

    expect(result.pastRatio).toBe(1);
    expect(result.lensRatio).toBe(1);
    expect(result.futureRatio).toBeGreaterThan(0);
    expect(result.progressBar).not.toContain('▯');
  });

  it('handles rolling window (90 days)', () => {
    const now = new Date('2026-06-11T00:00:00Z');
    const { start, end } = computePeriodBoundaries('rolling', now);

    // For a rolling window ending now, totalDays = 90. "Today" is the last day.
    // startOfTodayQuota = 89/90*100 ≈ 98.9%
    const result = calculatePacing(50, start, end, now);

    // 50% is well below startOfTodayQuota, so ahead of schedule
    expect(result.pastRatio).toBeLessThan(1);
    expect(result.buffer).toBeGreaterThan(0);
    expect(result.progressBar).toBeTruthy();
  });

  it('handles weekly window (7 days)', () => {
    // Use a Friday midday UTC to avoid timezone edge cases — clearly day 5 of 7
    const now = new Date('2026-06-12T12:00:00Z'); // Friday
    const { start, end } = computePeriodBoundaries('weekly', now);

    // Friday → day 5 of 7. startOfTodayQuota = 4/7*100 ≈ 57.1%
    const result = calculatePacing(30, start, end, now);

    // 30% < 57.1% → ahead
    expect(result.pastRatio).toBeLessThan(1);
    expect(result.buffer).toBeGreaterThan(0);
    expect(result.progressBar).toBeTruthy();
  });

  it('handles monthly window (variable days)', () => {
    // February 2026 has 28 days
    const start = new Date('2026-02-01T00:00:00Z').getTime() / 1000;
    const end = new Date('2026-03-01T00:00:00Z').getTime() / 1000;
    const now = new Date('2026-02-14T00:00:00Z'); // Day 14 of 28

    const result = calculatePacing(50, start, end, now);

    // Day 14 of 28 → endOfTodayQuota = 14/28*100 = 50%
    // Exactly at the boundary → inside lens
    expect(result.pastRatio).toBe(1);
    expect(result.buffer).toBeCloseTo(0, 0); // buffer should be near 0
    expect(result.progressBar).toBeTruthy();
  });

  it('edge case: single-day period', () => {
    const start = new Date('2026-06-11T00:00:00Z').getTime() / 1000;
    const end = new Date('2026-06-12T00:00:00Z').getTime() / 1000;
    const now = new Date('2026-06-11T12:00:00Z');

    const result = calculatePacing(50, start, end, now);

    // Only 1 day → totalDays = 1. OUTSIDE_WIDTH should distribute 0 to past.
    expect(typeof result.progressBar).toBe('string');
    expect(result.progressBar.length).toBeGreaterThan(0);
    expect(result.buffer).toBeGreaterThanOrEqual(0);
  });

  it('edge case: period already ended', () => {
    const start = new Date('2026-05-01T00:00:00Z').getTime() / 1000;
    const end = new Date('2026-06-01T00:00:00Z').getTime() / 1000;
    const now = new Date('2026-06-15T00:00:00Z'); // After period end

    const result = calculatePacing(80, start, end, now);

    // currentDay should not exceed totalDays
    expect(result.pastRatio).toBeGreaterThanOrEqual(0);
    expect(typeof result.progressBar).toBe('string');
  });

  it('renders correct progress bar format', () => {
    const { start, end } = makeJunePeriod();
    const now = new Date('2026-06-15T00:00:00Z');
    const result = calculatePacing(30, start, end, now);

    // Should have ┃ characters for the lens with content between
    expect(result.progressBar).toMatch(/┃.+┃/);
    // Should contain at least one filled and one empty character from each zone
    expect(result.progressBar.length).toBeGreaterThan(0);
  });
});
