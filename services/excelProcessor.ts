
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
  'FLD': 'failed'
};

const normalize = (s: any) => (s || '').toString().trim().toLowerCase();
// دالة لتنظيف اسم المندوب (توحيد الأحرف، إزالة مسافات وفصل أي زيادات مثل الكود أو المحطة)
export const cleanName = (s: string) => {
    if (!s) return '';
    // إزالة أي شيء بعد علامة / أو - (مع مسافات) التي توضع غالباً قبل كود المحطة أو المندوب
    let cleaned = s.split('/')[0];
    cleaned = cleaned.split(' - ')[0]; 
    return cleaned.trim().replace(/\s+/g, ' ').toUpperCase();
};


// --- Fuzzy Matching Logic ---
function levenshtein(a: string, b: string): number {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
}

function wordSimilarity(a: string, b: string): number {
    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    return maxLen === 0 ? 1 : (maxLen - dist) / maxLen;
}

function normalizeNameForMatch(name: string) {
    let n = name.toUpperCase().trim();
    n = n.replace(/ABO\s+/g, 'ABU ');
    n = n.replace(/EL\s+/g, 'AL ');
    n = n.replace(/ABD\s+AL\s+/g, 'ABDEL');
    n = n.replace(/ABD\s+EL\s+/g, 'ABDEL');
    n = n.replace(/QASSEM/g, 'QASIM');
    n = n.replace(/MOHAMMED/g, 'MOHAMED');
    n = n.replace(/AHMAD/g, 'AHMED');
    return n;
}

function getWords(name: string) {
    let n = normalizeNameForMatch(name);
    n = n.replace(/\bAL\b/g, '').replace(/\bEL\b/g, '');
    n = n.replace(/\bAL(?=[A-Z])/g, '');
    return n.split(/\s+/).filter(w => w.length > 2);
}

function calculateRobustSimilarity(name1: string, name2: string) {
    const w1 = getWords(name1);
    const w2 = getWords(name2);
    if (w1.length === 0 || w2.length === 0) return 0;
    
    let matches = 0;
    for (const word1 of w1) {
        let bestMatch = 0;
        for (const word2 of w2) {
            const sim = wordSimilarity(word1, word2);
            if (sim > bestMatch) bestMatch = sim;
        }
        if (bestMatch > 0.75) matches++;
    }
    
    const maxLen = Math.max(w1.length, w2.length);
    if (matches < 2) return 0; 
    
    let score = matches / maxLen;
    // Penalize if only 2 words match out of 3 (e.g. "Ahmed Mohamed Ali" vs "Ahmed Mohamed Mahmoud")
    // But allow 3 out of 5 (e.g. user's example)
    if (matches === 2 && maxLen <= 3) {
        score -= 0.1; // Drops 0.66 to 0.56, failing the 0.6 threshold
    }
    
    return score;
}

export function findBestMatch(rawName: string, knownNames: string[]): string | null {
    let bestName = null;
    let bestScore = 0;
    for (const known of knownNames) {
        const score = calculateRobustSimilarity(rawName, known);
        if (score > bestScore) {
            bestScore = score;
            bestName = known;
        }
    }
    // Threshold is 60% words match
    if (bestScore >= 0.6) {
        return bestName;
    }
    return null;
}
// ----------------------------


let cache = {
    rawDataRef: null,
    aliasesRef: null,
    knownNamesRef: null,
    results: {}
};

export const processShipments = (rawData: any[], aliases: Record<string, string>, selectedStation: string, knownNames: string[] = []): ProcessedResult => {
  if (cache.rawDataRef === rawData && cache.aliasesRef === aliases && cache.knownNamesRef === knownNames) {
      if (cache.results[selectedStation]) {
          return cache.results[selectedStation];
      }
  } else {
      cache = {
          rawDataRef: rawData,
          aliasesRef: aliases,
          knownNamesRef: knownNames,
          results: {}
      };
  }

  if (!rawData || rawData.length === 0) throw new Error("الملف فارغ أو غير صالح.");

  const headerRow = rawData.find(row => Object.values(row).some(v => v));
  if (!headerRow) throw new Error("لم يتم العثور على رؤوس أعمدة صالحة.");

  const keys = Object.keys(headerRow);
  
  // Detect Station Column
  const stationKey = keys.find(k => {
    const nk = normalize(k);
    return nk.includes('station') || 
      nk.includes('hub') || 
      nk.includes('location') ||
      nk.includes('service area') ||
      nk.includes('محطة') ||
      nk.includes('المحطة') ||
      nk.includes('فرع') ||
      nk.includes('الفرع') ||
      nk.includes('موقع') ||
      nk.includes('site') ||
      nk.includes('zone') ||
      nk.includes('area') ||
      nk.includes('منطقة') ||
      nk.includes('facility');
  });

  const selectedStationLower = selectedStation.toLowerCase();
  const isSummarySheet = keys.some(k => {
    const nk = normalize(k);
    return nk === 'delivered' || nk === 'ofd' || nk === 'rto';
  });

  const summariesMap: Record<string, DASummary> = {};

  const nameCache = new Map<string, string>();
  const getOfficialName = (raw: string): string => {
      if (nameCache.has(raw)) return nameCache.get(raw)!;
      
      const cleaned = cleanName(raw);
      
      // 1. Check exact match in aliases
      if (aliases[cleaned]) {
          nameCache.set(raw, aliases[cleaned]);
          return aliases[cleaned];
      }
      
      // 2. Check exact match in known names
      if (knownNames.includes(cleaned)) {
          nameCache.set(raw, cleaned);
          return cleaned;
      }
      
      // 3. Fuzzy match against known names
      if (knownNames.length > 0) {
          const fuzzyMatch = findBestMatch(cleaned, knownNames);
          if (fuzzyMatch) {
              nameCache.set(raw, fuzzyMatch);
              return fuzzyMatch;
          }
      }
      
      nameCache.set(raw, cleaned);
      return cleaned;
  };

  if (isSummarySheet) {
    const daKey = keys.find(k => normalize(k).includes('da name') || normalize(k).includes('agent') || normalize(k).includes('name'));
    const delKey = keys.find(k => normalize(k) === 'delivered');
    const failKey = keys.find(k => normalize(k).startsWith('fail'));
    const ofdKey = keys.find(k => normalize(k) === 'ofd');
    const rtoKey = keys.find(k => normalize(k) === 'rto');

    rawData.forEach(row => {
      if (selectedStation !== 'ALL') {
        let matches = false;
        if (stationKey) {
          const stationVal = normalize(row[stationKey]);
          if (stationVal && stationVal.includes(selectedStationLower)) matches = true;
        } else {
          // Fallback: search the entire row for the station code (e.g., "daw1")
          for (const key of keys) {
            const val = (row[key] || '').toString().toLowerCase();
            if (val.includes(selectedStationLower)) {
              matches = true;
              break;
            }
          }
        }
        if (!matches) return;
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
            allTrackings: [] // No individual trackings in summary sheet usually
          };
      }

      const s = summariesMap[name];
      const addedDel = parseInt(row[delKey!] || 0);
      const addedFail = parseInt(row[failKey!] || 0);
      const addedOfd = parseInt(row[ofdKey!] || 0);
      const addedRto = parseInt(row[rtoKey!] || 0);

      s.delivered += addedDel;
      s.failed += addedFail;
      s.ofd += addedOfd;
      s.rto += addedRto;
      s.total = s.delivered + s.failed + s.ofd + s.rto;

      // Limit mock trackings to prevent memory bloat on large summary sheets
      const maxMock = 10;
      for(let i=0; i<Math.min(addedDel, maxMock); i++) s.allTrackings.push({ id: `mock-${name}-del-${i}`, status: 'delivered' });
      for(let i=0; i<Math.min(addedFail, maxMock); i++) s.allTrackings.push({ id: `mock-${name}-fail-${i}`, status: 'failed' });
      for(let i=0; i<Math.min(addedOfd, maxMock); i++) s.allTrackings.push({ id: `mock-${name}-ofd-${i}`, status: 'ofd' });
      for(let i=0; i<Math.min(addedRto, maxMock); i++) s.allTrackings.push({ id: `mock-${name}-rto-${i}`, status: 'rto' });
    });

  } else {
    // معالجة شيت الشحنات الخام (Detailed Sheet)
    const daKey = keys.find(k => {
      const nk = normalize(k);
      return nk.includes('da name') || nk.includes('driver') || nk.includes('associate') || nk.includes('agent') || nk.includes('courier') || nk.includes('مندوب') || nk.includes('اسم') || nk.includes('name') || nk.includes('da');
    });
    const statusKey = keys.find(k => {
      const nk = normalize(k);
      return nk.includes('status') || nk.includes('state') || nk.includes('حالة') || nk.includes('الحالة');
    });
    const trackKey = keys.find(k => normalize(k).includes('tracking') || normalize(k).includes('airbill'));
    const statusCache = new Map<string, any>();
    const timeKey = keys.find(k => normalize(k).includes('time') || normalize(k).includes('date') || normalize(k).includes('updated'));

    if (!daKey || !statusKey) throw new Error("لم يتم العثور على عمود اسم المندوب أو الحالة. الأعمدة المتاحة: " + keys.join(", "));

    rawData.forEach(row => {
      if (selectedStation !== 'ALL') {
        let matches = false;
        if (stationKey) {
          const stationVal = normalize(row[stationKey]);
          if (stationVal && stationVal.includes(selectedStationLower)) matches = true;
        } else {
          // Fallback: search the entire row for the station code (e.g., "daw1")
          for (const key of keys) {
            const val = (row[key] || '').toString().toLowerCase();
            if (val.includes(selectedStationLower)) {
              matches = true;
              break;
            }
          }
        }
        if (!matches) return;
      }

      let rawName = (row[daKey!] || '').toString();
      const name = getOfficialName(rawName) || "⚠️ Unknown Agent";
      
      const status = (row[statusKey!] || '').toString().toUpperCase().trim();
      const track = trackKey ? (row[trackKey] || '').toString().trim() : '';

      let cat: 'delivered' | 'failed' | 'ofd' | 'rto' | 'ignored' = 'ignored';
      
      if (statusCache.has(status)) {
        cat = statusCache.get(status)!;
      } else if (DEFAULT_STATUS_MAPPING[status]) {
        cat = DEFAULT_STATUS_MAPPING[status];
        statusCache.set(status, cat);
      } else {
        for (const [key, val] of Object.entries(DEFAULT_STATUS_MAPPING)) {
          if (status.includes(key)) {
            cat = val;
            break;
          }
        }
        statusCache.set(status, cat);
      }

      if (cat === 'ignored') return;

      let hour;
      if (timeKey && row[timeKey]) {
          const timeVal = row[timeKey];
          if (typeof timeVal === 'number') {
              const fraction = timeVal - Math.floor(timeVal);
              hour = Math.floor(fraction * 24);
          } else if (typeof timeVal === 'string') {
              const match = timeVal.match(/(\d{1,2}):\d{1,2}/);
              if (match) {
                  hour = parseInt(match[1], 10);
              } else {
                  const parsed = new Date(timeVal);
                  if (!isNaN(parsed.getTime())) hour = parsed.getHours();
              }
          }
      }

      if (!summariesMap[name]) {
        summariesMap[name] = { 
            daName: name, 
            delivered: 0, failed: 0, ofd: 0, rto: 0, total: 0, successRate: 0, 
            pendingTrackings: [],
            allTrackings: [] 
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
          const trackingData: any = {
              id: track,
              status: cat
          };
          if (hour !== undefined) {
              trackingData.hour = hour;
          }
          if (stationKey) {
              const sVal = (row[stationKey] || '').toString().trim().toUpperCase();
              if (sVal) trackingData.station = sVal;
          }
          summariesMap[name].allTrackings.push(trackingData);
      }
    });
  }

  const summaries = Object.values(summariesMap).map(s => ({
    ...s,
    successRate: s.total > 0 ? (s.delivered / s.total) * 100 : 0
  })).sort((a, b) => {
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

  
  const result = { station: selectedStation, summaries, grandTotal };
  cache.results[selectedStation] = result;
  return result;

};
