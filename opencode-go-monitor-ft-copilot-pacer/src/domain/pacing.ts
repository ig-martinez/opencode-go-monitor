/**
 * Visual Pacing Bar algorithm adapted from copilot-pacer.
 *
 * Renders a "lens" style progress bar that splits the quota timeline into
 * three visual zones:
 *   Past (▰▱) — usage before today
 *   Today's Lens (┃▮▯┃) — today's budget window
 *   Future (▱▱) — remaining quota for rest of the period
 *
 * Since opencode-go-monitor-ft-copilot-pacer tracks percentage (0–100) rather than absolute
 * request counts, the algorithm uses usagePercent and derives period
 * boundaries from wall clock + window type.
 */

export interface PacingResult {
  /** The rendered progress bar string, e.g. "▰▰┃▮▮▯┯┃┃▱▱▱▱" */
  progressBar: string;
  /** Positive = remaining budget today; negative = overspent */
  buffer: number;
  /** How filled the past zone is (0..1) */
  pastRatio: number;
  /** How filled the lens zone is (0..1) */
  lensRatio: number;
  /** How filled the future zone is (0..1) */
  futureRatio: number;
}

type WindowType = 'rolling' | 'weekly' | 'monthly';

/**
 * Compute the start/end of the current period for a given window type.
 *
 * - **rolling**: Sliding 90-day window ending now.
 * - **weekly**: Fixed ISO week (Monday 00:00 → next Monday 00:00 local time).
 * - **monthly**: Fixed calendar month (1st 00:00 → 1st of next month 00:00 local time).
 *
 * All times are returned as Unix epoch *seconds*.
 */
export function computePeriodBoundaries(
  window: WindowType,
  now: Date = new Date(),
): { start: number; end: number } {
  const epochMs = now.getTime();

  switch (window) {
    case 'rolling': {
      // Sliding 90-day window ending now
      const start = now.getTime() - 90 * 24 * 60 * 60 * 1000;
      return {
        start: Math.floor(start / 1000),
        end: Math.floor(epochMs / 1000),
      };
    }
    case 'weekly': {
      // Monday 00:00 UTC of current week → next Monday 00:00 UTC
      const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(now);
      monday.setUTCDate(now.getUTCDate() - daysSinceMonday);
      monday.setUTCHours(0, 0, 0, 0);
      const nextMonday = new Date(monday);
      nextMonday.setUTCDate(monday.getUTCDate() + 7);
      return {
        start: Math.floor(monday.getTime() / 1000),
        end: Math.floor(nextMonday.getTime() / 1000),
      };
    }
    case 'monthly': {
      // 1st of current month 00:00 UTC → 1st of next month 00:00 UTC
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
      return {
        start: Math.floor(monthStart.getTime() / 1000),
        end: Math.floor(nextMonthStart.getTime() / 1000),
      };
    }
  }
}

function renderBlock(
  width: number,
  fillRatio: number,
  fillChar: string,
  emptyChar: string,
): string {
  if (width <= 0) return '';
  const filled = Math.round(Math.max(0, Math.min(width, fillRatio * width)));
  return fillChar.repeat(filled) + emptyChar.repeat(width - filled);
}

/**
 * Calculate the visual pacing bar for a given usage window.
 *
 * @param usagePercent - Current usage percentage (0–100).
 * @param periodStartSeconds - Unix epoch seconds when the period starts.
 * @param periodEndSeconds - Unix epoch seconds when the period ends.
 * @param now - Current date (default: new Date()).
 *
 * Visual layout:
 *   [past ▰▱][lens ┃▮▯┃][future ▰▱]
 *
 * The "lens" magnifies today so intra-day progress is visible precisely,
 * while the flanking zones compress the rest of the period.
 */
export function calculatePacing(
  usagePercent: number,
  periodStartSeconds: number,
  periodEndSeconds: number,
  now: Date = new Date(),
): PacingResult {
  const nowMs = now.getTime();
  const periodStartMs = periodStartSeconds * 1000;
  const periodEndMs = periodEndSeconds * 1000;

  const totalMs = periodEndMs - periodStartMs;
  const elapsedMs = Math.max(0, nowMs - periodStartMs);
  const totalDays = Math.max(1, Math.round(totalMs / (24 * 60 * 60 * 1000)));
  const elapsedDays = Math.min(totalDays, elapsedMs / (24 * 60 * 60 * 1000));
  const currentDay = Math.min(totalDays, Math.floor(elapsedDays) + 1);

  const OUTSIDE_WIDTH = 12; // Total chars shared between past and future zones
  const LENS_INNER_WIDTH = 5; // Inner width of the lens zone: ┃▮▮▯▯▯┃

  const pastDays = currentDay - 1;
  const totalOutsideDays = totalDays - 1;

  // Distribute outside character budget proportionally
  const pastChars =
    totalOutsideDays === 0
      ? 0
      : Math.round((pastDays / totalOutsideDays) * OUTSIDE_WIDTH);
  const futureChars = OUTSIDE_WIDTH - pastChars;

  // Daily budget as percentage points per day
  const dailyBudget = 100 / totalDays;
  const startOfTodayQuota = pastDays * dailyBudget;
  const endOfTodayQuota = currentDay * dailyBudget;

  let pastRatio = 0;
  let lensRatio = 0;
  let futureRatio = 0;

  if (usagePercent < startOfTodayQuota) {
    // Zone 1: Usage below today's opening quota — ahead of schedule
    pastRatio = startOfTodayQuota === 0 ? 0 : usagePercent / startOfTodayQuota;
  } else if (usagePercent <= endOfTodayQuota) {
    // Zone 2: Usage falls inside today's lens window — on track
    pastRatio = 1;
    lensRatio = dailyBudget === 0
      ? 0
      : (usagePercent - startOfTodayQuota) / dailyBudget;
  } else {
    // Zone 3: Usage exceeded today's closing quota — borrowing from the future
    pastRatio = 1;
    lensRatio = 1;
    const futureQuota = 100 - endOfTodayQuota;
    futureRatio = futureQuota === 0
      ? 1
      : (usagePercent - endOfTodayQuota) / futureQuota;
  }

  const pastStr = renderBlock(pastChars, pastRatio, '▰', '▱');
  const lensInner = renderBlock(LENS_INNER_WIDTH, lensRatio, '▮', '▯');
  const lensStr = `┃${lensInner}┃`;
  const futureStr = renderBlock(futureChars, futureRatio, '▰', '▱');

  return {
    progressBar: `${pastStr}${lensStr}${futureStr}`,
    buffer: endOfTodayQuota - usagePercent,
    pastRatio,
    lensRatio,
    futureRatio,
  };
}
