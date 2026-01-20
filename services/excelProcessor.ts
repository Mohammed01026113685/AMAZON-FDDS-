
import { DASummary, ProcessedResult, StatusMapping, TrackingDetail } from '../types';

export const DEFAULT_STATUS_MAPPING: StatusMapping = {
  'DELIVERED': 'delivered',
  'CASH_IN_ASSOCIATE': 'delivered',
  'SUCCESS': 'delivered',
  'AT_STATION': 'ofd',                      
  'ON_ROAD_WITH_DELIVERY_ASSOCIATE': 'ofd', 
  'OUT_FOR_DELIVERY': 'ofd',
  'OFD': 'ofd',
  'REJECTED': 'rto',         
  'DEPARTED_FOR_FC': 'rto',  
  'RTO': 'rto',
  'RETURNED': 'rto',
  'DAMAGED': 'rto',
  'DELIVERY_ATTEMPTED': 'failed', 
  'HOLD_FOR_REDELIVERY': 'failed', 
  'FAILED': 'failed',
  'FLD': 'failed',
  'DELAYED': 'failed'
};

const normalize = (s: any) => (s || '').toString().trim().toLowerCase();
// دالة لتنظيف اسم المندوب (توحيد الأحرف، إزالة مسافات)
export const cleanName = (s: string) => s.trim().replace(/\s+/g, ' ').toUpperCase();

// --- GAMIFICATION LOGIC ---
const calculateBadges = (s: DASummary): string[] => {
    const badges: string[] = [];
    
    // 1. Sniper: 100% Success Rate (min 10 shipments)
    if (s.successRate === 100 && s.total >= 10) {
        badges.push('sniper');
    }
    
    // 2. Turbo: High Volume (> 80 shipments)
    if (s.total >= 80) {
        badges.push('turbo');
    }

    // 3. Guardian: 0 RTO (min 20 shipments)
    if (s.rto === 0 && s.total >= 20) {
        badges.push('guardian');
    }

    // 4. On Fire: High Rate & High Volume
    if (s.successRate >= 98 && s.total >= 50) {
        badges.push('fire');
    }

    // 5. Hard Worker: Total > 120 (Regardless of rate)
    if (s.total >= 120) {
        badges.push('beast');
    }

    return badges;
};

export const processShipments = (rawData: any[], aliases: Record<string, string> = {}): ProcessedResult => {
  if (!rawData || rawData.length === 0) throw new Error("الملف فارغ أو غير صالح.");

  const headerRow = rawData.find(row => Object.values(row).some(v => v));
  if (!headerRow) throw new Error("لم يتم العثور على رؤوس أعمدة صالحة.");

  const keys = Object.keys(headerRow);
  
  // Detect Station Column
  const stationKey = keys.find(k => 
    normalize(k).includes('station') || 
    normalize(k).includes('hub') || 
    normalize(k).includes('location')
  );

  const isSummarySheet = keys.some(k => {
    const nk = normalize(k);
    return nk === 'delivered' || nk === 'ofd' || nk === 'rto';
  });

  const summariesMap: Record<string, DASummary> = {};

  const getOfficialName = (raw: string): string => {
      const cleaned = cleanName(raw);
      // Check alias map (key is expected to be uppercased cleaned name)
      if (aliases[cleaned]) {
          return aliases[cleaned];
      }
      return cleaned;
  };

  if (isSummarySheet) {
    // معالجة شيت الملخصات (Summary Sheet usually doesn't have trackings, so we can't store per-shipment data here)
    const daKey = keys.find(k => normalize(k).includes('da name') || normalize(k).includes('agent') || normalize(k).includes('name'));
    const delKey = keys.find(k => normalize(k) === 'delivered');
    const failKey = keys.find(k => normalize(k).startsWith('fail'));
    const ofdKey = keys.find(k => normalize(k) === 'ofd');
    const rtoKey = keys.find(k => normalize(k) === 'rto');

    rawData.forEach(row => {
      // Station filtering: Only process DQN3
      if (stationKey) {
        const stationVal = normalize(row[stationKey]);
        if (stationVal && !stationVal.includes('dqn3')) return;
      }

      let rawName = (row[daKey!] || '').toString();
      if (!rawName || normalize(rawName).includes('total')) return;

      const name = getOfficialName(rawName) || "⚠️ Unknown Agent";

      // إذا المندوب موجود مسبقاً، نجمع عليه (منع التكرار)
      if (!summariesMap[name]) {
          summariesMap[name] = {
            daName: name, // نستخدم الاسم الرسمي (الموحد)
            delivered: 0, failed: 0, ofd: 0, rto: 0, total: 0, successRate: 0, 
            pendingTrackings: [], 
            allTrackings: [], // No individual trackings in summary sheet usually
            badges: []
          };
      }

      const s = summariesMap[name];
      s.delivered += parseInt(row[delKey!] || 0);
      s.failed += parseInt(row[failKey!] || 0);
      s.ofd += parseInt(row[ofdKey!] || 0);
      s.rto += parseInt(row[rtoKey!] || 0);
      s.total = s.delivered + s.failed + s.ofd + s.rto;
    });

  } else {
    // معالجة شيت الشحنات الخام (Detailed Sheet)
    const daKey = keys.find(k => normalize(k).includes('da name') || normalize(k).includes('driver') || normalize(k).includes('associate'));
    const statusKey = keys.find(k => normalize(k).includes('status'));
    const trackKey = keys.find(k => normalize(k).includes('tracking') || normalize(k).includes('airbill'));

    if (!daKey || !statusKey) throw new Error("لم يتم العثور على عمود اسم المندوب (DA Name) أو الحالة (Status).");

    rawData.forEach(row => {
      // Station filtering: Only process DQN3
      if (stationKey) {
        const stationVal = normalize(row[stationKey]);
        if (stationVal && !stationVal.includes('dqn3')) return;
      }

      let rawName = (row[daKey!] || '').toString();
      const name = getOfficialName(rawName) || "⚠️ Unknown Agent";
      
      const status = (row[statusKey!] || '').toString().toUpperCase().trim();
      const track = trackKey ? (row[trackKey] || '').toString().trim() : '';

      let cat: 'delivered' | 'failed' | 'ofd' | 'rto' | 'ignored' = 'ignored';
      
      if (DEFAULT_STATUS_MAPPING[status]) {
        cat = DEFAULT_STATUS_MAPPING[status];
      } else {
        for (const [key, val] of Object.entries(DEFAULT_STATUS_MAPPING)) {
          if (status.includes(key)) {
            cat = val;
            break;
          }
        }
      }

      if (cat === 'ignored') return;

      if (!summariesMap[name]) {
        summariesMap[name] = { 
            daName: name, 
            delivered: 0, failed: 0, ofd: 0, rto: 0, total: 0, successRate: 0, 
            pendingTrackings: [],
            allTrackings: [],
            badges: []
        };
      }

      summariesMap[name][cat]++;
      summariesMap[name].total++;
      
      // Store Pending Trackings (for copy/paste features)
      if (cat !== 'delivered' && track) {
          summariesMap[name].pendingTrackings.push(track);
      }

      // Store ALL Trackings with Status (for DB Search)
      if (track) {
          summariesMap[name].allTrackings.push({
              id: track,
              status: cat
          });
      }
    });
  }

  const summaries = Object.values(summariesMap).map(s => {
    const successRate = s.total > 0 ? (s.delivered / s.total) * 100 : 0;
    const sWithRate = { ...s, successRate };
    sWithRate.badges = calculateBadges(sWithRate);
    return sWithRate;
  }).sort((a, b) => {
    if (a.daName.includes("⚠️")) return 1;
    if (b.daName.includes("⚠️")) return -1;
    return b.successRate - a.successRate; // الترتيب الافتراضي بالأداء
  });

  const grandTotal = summaries.reduce((acc, curr) => ({
    delivered: acc.delivered + curr.delivered,
    failed: acc.failed + curr.failed,
    ofd: acc.ofd + curr.ofd,
    rto: acc.rto + curr.rto,
    total: acc.total + curr.total,
    successRate: 0
  }), { delivered: 0, failed: 0, ofd: 0, rto: 0, total: 0, successRate: 0 });

  grandTotal.successRate = grandTotal.total > 0 ? (grandTotal.delivered / grandTotal.total) * 100 : 0;

  return { summaries, grandTotal };
};
