
export interface ShipmentData {
  tracking: string;
  Route: string;
  "Internal Status": string;
  "DA Name": string;
  "DSP Name": string;
  Station: string;
  "Ship Method": string;
}

export interface TrackingDetail {
    id: string;
    status: 'delivered' | 'failed' | 'ofd' | 'rto' | 'ignored';
    hour?: number;
    station?: string;
}

export interface DASummary {
  daName: string;
  delivered: number;
  failed: number;
  ofd: number;
  rto: number;
  total: number;
  successRate: number;
  pendingTrackings: string[]; // For quick access to failed/ofd only
  allTrackings: TrackingDetail[]; // NEW: Store EVERYTHING
}

export interface ProcessedResult {
  station: string;
  summaries: DASummary[];
  grandTotal: {
    delivered: number;
    failed: number;
    ofd: number;
    rto: number;
    total: number;
    successRate: number;
  };
}

export interface HistoryRecord {
  id?: string; // Document ID (e.g., DAW1_2026-08-21)
  date: string; // ISO Date String YYYY-MM-DD
  station?: string;
  timestamp: number;
  stationTotal: {
    delivered: number;
    total: number;
    successRate: number;
  };
  agents: {
    daName: string;
    delivered: number;
    total: number;
    successRate: number;
    trackings?: string[]; // Legacy support
    shipmentDetails?: TrackingDetail[]; // NEW: Detailed history
  }[];
}

export type StatusMapping = Record<string, 'delivered' | 'failed' | 'ofd' | 'rto' | 'ignored'>;

export const STATIONS = ['DAW1', 'DLU4', 'DQN3', 'DZA1'] as const;
export type Station = typeof STATIONS[number] | 'ALL';
