
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
  badges: string[]; // NEW: Gamification Badges
}

export interface ProcessedResult {
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
  date: string; // ISO Date String YYYY-MM-DD
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
