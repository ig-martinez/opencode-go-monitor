export interface QuotaWindow {
  status: 'ok' | 'error' | 'unknown';
  usagePercent: number; // 0..100
  resetsInSeconds: number; // seconds until reset
  periodStartSeconds: number; // Unix epoch seconds of window start
  periodEndSeconds: number; // Unix epoch seconds of window end
}

export interface QuotaSnapshot {
  timestamp: number; // ms epoch
  rolling: QuotaWindow;
  weekly: QuotaWindow;
  monthly: QuotaWindow;
  source: 'api' | 'scraping';
}

export interface QuotaFetcher {
  fetch(): Promise<QuotaSnapshot>;
  isAvailable(): Promise<boolean>;
}

export type StatusBarState = 'setup' | 'loading' | 'active' | 'auth' | 'error';
