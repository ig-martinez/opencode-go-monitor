import type { QuotaSnapshot, QuotaWindow, StatusBarState } from '../domain/types';
import { formatTime, formatPercent } from '../domain/format';
import { calculatePacing } from '../domain/pacing';
import type { Translations } from '../i18n';

export interface ThemeColor {
  id: string;
}

export interface StatusBarItem {
  text: string;
  tooltip: string | { value: string; isTrusted?: boolean } | undefined;
  command: string | undefined;
  color: string | ThemeColor | undefined;
  backgroundColor: string | ThemeColor | undefined;
  show(): void;
  hide(): void;
  dispose(): void;
}

export type StatusBarItemFactory = (alignment: number, priority: number) => StatusBarItem;

export class StatusBarManager {
  private _item: StatusBarItem | undefined;

  constructor(
    private readonly factory: StatusBarItemFactory,
    private readonly t: Translations,
  ) {}

  create(): StatusBarItem {
    this._item = this.factory(2, 100); // Right = 2, priority = 100
    this._item.command = 'opencodeGoPacer.statusBarClick';
    this._item.tooltip = 'OpenCode Go Pacer';
    this._item.show();
    return this._item;
  }

  /**
   * Build a pacing line for one window, e.g.:
   *   `▰▰▰┃▮▮▯▯▯┃▱▱▱▱  Rolling: 37% (resets in 2h 15m)`
   */
  private pacingLine(window: QuotaWindow, label: string): string {
    const result = calculatePacing(
      window.usagePercent,
      window.periodStartSeconds,
      window.periodEndSeconds,
    );
    return `${result.progressBar}  **${label}**: ${formatPercent(window.usagePercent)} (${this.t.statusBarReset(formatTime(window.resetsInSeconds))})`;
  }

  update(
    snapshot: QuotaSnapshot,
    thresholds: { warning: number; error: number },
    displayWindow: 'rolling' | 'weekly' | 'monthly' = 'rolling',
  ): void {
    if (!this._item) {
      return;
    }

    const window = snapshot[displayWindow];

    // --- Status bar text: visual pacing bar for the selected window ---
    const pacingResult = calculatePacing(
      window.usagePercent,
      window.periodStartSeconds,
      window.periodEndSeconds,
    );
    this._item.text = pacingResult.progressBar;
    this._item.command = 'opencodeGoPacer.statusBarClick';

    // --- Tooltip: all three windows as pacing bars + buffer info ---
    const tooltipLines: string[] = [
      '**OpenCode Go Pacer — Pacing**',
      '',
      this.pacingLine(snapshot.rolling, this.t.statusBarRolling),
      '',
      this.pacingLine(snapshot.weekly, this.t.statusBarWeekly),
      '',
      this.pacingLine(snapshot.monthly, this.t.statusBarMonthly),
      '',
    ];

    // Buffer info
    if (pacingResult.buffer > 0) {
      tooltipLines.push(`✅ ${this.t.pacingOnTrack(Math.round(pacingResult.buffer))}`);
    } else if (pacingResult.buffer < 0) {
      tooltipLines.push(`🔥 ${this.t.pacingOverBudget(Math.round(Math.abs(pacingResult.buffer)))}`);
    } else {
      tooltipLines.push(`⚡ ${this.t.pacingExact}`);
    }

    // Footer
    tooltipLines.push(
      '',
      `---`,
      `${this.t.statusBarSource(snapshot.source)} | ${this.t.statusBarUpdated(new Date(snapshot.timestamp).toLocaleTimeString())}`,
    );

    this._item.tooltip = tooltipLines.join('\n');

    // Color reflects the WORST scenario among all windows
    const maxPercent = Math.max(
      snapshot.rolling.usagePercent,
      snapshot.weekly.usagePercent,
      snapshot.monthly.usagePercent
    );
    if (maxPercent >= thresholds.error) {
      this._item.backgroundColor = { id: 'statusBarItem.errorBackground' };
      this._item.color = undefined;
    } else if (maxPercent >= thresholds.warning) {
      this._item.backgroundColor = { id: 'statusBarItem.warningBackground' };
      this._item.color = undefined;
    } else {
      this._item.backgroundColor = undefined;
      this._item.color = undefined;
    }
  }

  setState(state: StatusBarState): void {
    if (!this._item) {
      return;
    }

    switch (state) {
      case 'setup':
        this._item.text = this.t.stateSetup;
        this._item.color = undefined;
        this._item.backgroundColor = undefined;
        this._item.tooltip = 'OpenCode Go Quota';
        break;
      case 'loading':
        this._item.text = this.t.stateLoading;
        this._item.color = undefined;
        this._item.backgroundColor = undefined;
        this._item.tooltip = 'OpenCode Go Quota';
        break;
      case 'auth':
        this._item.text = this.t.stateAuthExpired;
        this._item.backgroundColor = { id: 'statusBarItem.errorBackground' };
        this._item.color = undefined;
        this._item.tooltip = 'OpenCode Go Quota';
        break;
      case 'error':
        this._item.text = this.t.stateError;
        this._item.backgroundColor = { id: 'statusBarItem.errorBackground' };
        this._item.color = undefined;
        this._item.tooltip = 'OpenCode Go Quota';
        break;
      case 'active':
        // Handled by update()
        break;
    }
  }

  dispose(): void {
    this._item?.dispose();
    this._item = undefined;
  }

  get item(): StatusBarItem | undefined {
    return this._item;
  }
}
