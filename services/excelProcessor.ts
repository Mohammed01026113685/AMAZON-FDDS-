
import { DASummary, PickupSummary, ProcessedResult, StatusMapping, TrackingDetail } from '../types';
import * as XLSX from 'xlsx';

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
export const cleanName = (s: string) => {
    if (!s) return 'UNKNOWN';
    let name = s.trim().replace(/\s+/g, ' ').toUpperCase();
    name = name.replace(' CUSTOMER', '');
    name = name.replace('P2PTRANSPORTREQUESTAS:', '');
    name = name.replace('P2PTRANSPORTREQUESTASSIGNMENTSERVICE', 'SYSTEM'); // Clean system name
    return name.trim();
};

// --- GAMIFICATION LOGIC ---
const calculateBadges = (s: DASummary): string[] => {
    const badges: string[] = [];
    if (s.successRate === 100 && s.total >= 10) badges.push('sniper');
    if (s.total >= 80) badges.push('turbo');
    if (s.rto === 0 && s.total >= 20) badges.push('guardian');
    if (s.successRate >= 98 && s.total >= 50) badges.push('fire');
    if (s.total >= 120) badges.push('beast');
    return badges;
};

// --- PROCESS PICKUP SHEET ---
const processPickupData = (rawData: any[], aliases: Record<string, string> = {}): { summaries: PickupSummary[], grandTotal: any } => {
    const summariesMap: Record<string, PickupSummary> = {};
    const reasonsBreakdown: Record<string, number> = {};
    const cancelReasonBreakdown: Record<string, number> = {};
    
    // Header detection
    const headerRow = rawData.find(row => Object.values(row).some(v => v));
    if (!headerRow) return { summaries: [], grandTotal: {} };
    
    const keys = Object.keys(headerRow);
    const agentKey = keys.find(k => normalize(k).includes('last scan by') || normalize(k).includes('agent'));
    const stateKey = keys.find(k => normalize(k) === 'state');
    const operationKey = keys.find(k => normalize(k) === 'operation');
    const reasonKey = keys.find(k => normalize(k) === 'reason'); // Capture Reason explicitly
    const trackKey = keys.find(k => normalize(k).includes('tracking id'));

    // Even if we don't find all keys, try to process if state exists
    if (!stateKey) return { summaries: [], grandTotal: {} }; 

    rawData.forEach(row => {
        let rawName = agentKey ? (row[agentKey] || 'UNKNOWN').toString() : 'UNKNOWN';
        if (rawName === agentKey) return; // Skip header row if iterated
        
        const name = cleanName(rawName);
        const officialName = aliases[name] || name;

        const state = (row[stateKey] || '').toString().toUpperCase().trim();
        const operation = operationKey ? (row[operationKey] || '').toString().toUpperCase().trim() : '';
        const reasonRaw = reasonKey ? (row[reasonKey] || '').toString().trim() : '';
        const reason = reasonRaw.replace(/\s+/g, ' '); // Clean extra spaces
        const reasonLower = reason.toLowerCase();
        const tracking = trackKey ? (row[trackKey] || '').toString() : '';

        if (!summariesMap[officialName]) {
            summariesMap[officialName] = {
                daName: officialName,
                picked: 0, ofd: 0, failed: 0, cancelled: 0, rvp: 0, web: 0, total: 0, successRate: 0,
                trackings: []
            };
        }

        const s = summariesMap[officialName];
        let status = 'ofd'; 

        // 1. Check RVP (Return Verification Problem - Failed Verification)
        if (
            reasonLower.includes('failed verification') || 
            reasonLower.includes('verification failed') || 
            reasonLower.includes('صورة غير مطابقة')
        ) {
            s.rvp++;
            status = 'rvp';
            const r = reason || 'Failed Verification';
            reasonsBreakdown[r] = (reasonsBreakdown[r] || 0) + 1; 
        }
        // 2. Check WEB (The phone is off)
        else if (
            reasonLower.includes('the phone is off') || 
            reasonLower.includes('mobile switched off') ||
            reasonLower.includes('الهاتف مغلق')
        ) {
            s.web++;
            status = 'web';
            // Count as failure reason generally? Or separate? 
            // Usually web reasons might be grouped in failure breakdown for viewing
            const r = reason || 'Web (Phone Off)';
            reasonsBreakdown[r] = (reasonsBreakdown[r] || 0) + 1;
        }
        // 3. Check Cancellation (Custom Reasons + Standard)
        else if (
            reasonLower.includes("he didn't ask for anything") ||
            reasonLower.includes("doesn't want to ship") ||
            reasonLower.includes("he wants to open the shipment") ||
            operation.includes('CANCELLED') || 
            state.includes('CANCELLED') ||
            state.includes('PICKUP FAILED') || 
            state.includes('PICKUP FAILE')
        ) {
            s.cancelled++;
            status = 'cancelled';
            const r = reason || 'Unknown';
            cancelReasonBreakdown[r] = (cancelReasonBreakdown[r] || 0) + 1;
        } 
        // 4. Check Picked/Received (Success)
        else if (
            state.includes('RECEIVED') || 
            state.includes('PICKED') || 
            state.includes('SUCCESS') || 
            state.includes('IN TRANSIT (DS -> FC)') || 
            state.includes('IN TRANSIT (CUSTOMER -> DS)') ||
            state.includes('DS -> FC') || 
            state.includes('CUSTOMER -> DS')
        ) {
            s.picked++;
            status = 'picked';
        } 
        // 5. Check Failed (Custom Reasons + Standard)
        else if (
            reasonLower.includes('not answer') ||
            reasonLower.includes('request for postponement') ||
            reasonLower.includes('merchant shipments') ||
            reasonLower.includes('otp incorrect') ||
            state.includes('FAILED') || 
            state.includes('REJECTED') || 
            state.includes('ATTEMPTED') ||
            state.includes('RETURNED')
        ) {
            s.failed++;
            status = 'failed';
            const r = reason || 'Unknown';
            reasonsBreakdown[r] = (reasonsBreakdown[r] || 0) + 1;
        } 
        // 6. Default to OFD (Pending)
        else {
            s.ofd++;
            status = 'ofd';
        }
        
        // Count EVERYTHING in total
        s.total++;
        
        if(tracking) s.trackings.push({ id: tracking, status, reason });
    });

    const summaries = Object.values(summariesMap).map(s => {
        // Success Rate = Picked / Total Active (Picked + Failed + RVP + Web + OFD)
        const activeTotal = s.picked + s.failed + s.rvp + s.web + s.ofd; 
        s.successRate = activeTotal > 0 ? (s.picked / activeTotal) * 100 : 0;
        return s;
    }).sort((a, b) => b.successRate - a.successRate);

    const grandTotal = summaries.reduce((acc, curr) => ({
        picked: acc.picked + curr.picked,
        ofd: acc.ofd + curr.ofd,
        failed: acc.failed + curr.failed,
        cancelled: acc.cancelled + curr.cancelled,
        rvp: acc.rvp + curr.rvp,
        web: acc.web + curr.web,
        total: acc.total + curr.total,
        successRate: 0,
        reasonsBreakdown,
        cancelReasonBreakdown
    }), { picked: 0, ofd: 0, failed: 0, cancelled: 0, rvp: 0, web: 0, total: 0, successRate: 0, reasonsBreakdown, cancelReasonBreakdown });

    const gtActive = grandTotal.picked + grandTotal.failed + grandTotal.rvp + grandTotal.web + grandTotal.ofd;
    grandTotal.successRate = gtActive > 0 ? (grandTotal.picked / gtActive) * 100 : 0;

    return { summaries, grandTotal };
};

// --- MAIN PROCESSOR ---
export const processWorkbook = (workbook: XLSX.WorkBook, aliases: Record<string, string> = {}, typeHint?: 'FDDS' | 'PICKUP'): ProcessedResult => {
    let deliveryResult: any = null;
    let pickupResult: any = null;

    const firstSheetName = workbook.SheetNames[0];
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);
    
    if (rawData.length === 0) throw new Error("الملف فارغ");

    if (typeHint === 'PICKUP') {
        pickupResult = processPickupData(rawData, aliases);
    } else if (typeHint === 'FDDS') {
        deliveryResult = processSingleDeliverySheet(rawData, aliases);
    } else {
        // Auto-detect
        const headerRow = rawData[0] as any; 
        const keys = Object.keys(headerRow || {}).map(normalize).join(' ');
        const isPickup = keys.includes('source') && keys.includes('destination');
        
        if (isPickup) pickupResult = processPickupData(rawData, aliases);
        else deliveryResult = processSingleDeliverySheet(rawData, aliases);
    }

    if (!deliveryResult) {
        deliveryResult = {
            summaries: [],
            grandTotal: { delivered: 0, failed: 0, ofd: 0, rto: 0, total: 0, successRate: 0 }
        };
    }

    return {
        ...deliveryResult,
        pickupSummaries: pickupResult ? pickupResult.summaries : undefined,
        pickupGrandTotal: pickupResult ? pickupResult.grandTotal : undefined
    };
};

const processSingleDeliverySheet = (rawData: any[], aliases: Record<string, string>): { summaries: DASummary[], grandTotal: any } => {
    const headerRow = rawData.find(row => Object.values(row).some(v => v));
    if (!headerRow) return { summaries: [], grandTotal: {} }; 

    const keys = Object.keys(headerRow);
    const stationKey = keys.find(k => normalize(k).includes('station') || normalize(k).includes('hub'));
    const isSummarySheet = keys.some(k => normalize(k) === 'delivered' || normalize(k) === 'ofd');
    const summariesMap: Record<string, DASummary> = {};

    const getOfficialName = (raw: string): string => {
      const cleaned = cleanName(raw);
      if (aliases[cleaned]) return aliases[cleaned];
      return cleaned;
    };

    if (isSummarySheet) {
        const daKey = keys.find(k => normalize(k).includes('da name') || normalize(k).includes('agent'));
        const delKey = keys.find(k => normalize(k) === 'delivered');
        const failKey = keys.find(k => normalize(k).startsWith('fail'));
        const ofdKey = keys.find(k => normalize(k) === 'ofd');
        const rtoKey = keys.find(k => normalize(k) === 'rto');

        rawData.forEach(row => {
            if (stationKey) {
                const stationVal = normalize(row[stationKey]);
                if (stationVal && !stationVal.includes('dqn3')) return;
            }
            let rawName = (row[daKey!] || '').toString();
            if (!rawName || normalize(rawName).includes('total')) return;
            const name = getOfficialName(rawName) || "⚠️ Unknown";

            if (!summariesMap[name]) {
                summariesMap[name] = { daName: name, delivered: 0, failed: 0, ofd: 0, rto: 0, total: 0, successRate: 0, pendingTrackings: [], allTrackings: [], badges: [] };
            }
            const s = summariesMap[name];
            s.delivered += parseInt(row[delKey!] || 0);
            s.failed += parseInt(row[failKey!] || 0);
            s.ofd += parseInt(row[ofdKey!] || 0);
            s.rto += parseInt(row[rtoKey!] || 0);
            s.total = s.delivered + s.failed + s.ofd + s.rto;
        });
    } else {
        const daKey = keys.find(k => normalize(k).includes('da name') || normalize(k).includes('driver'));
        const statusKey = keys.find(k => normalize(k).includes('status'));
        const trackKey = keys.find(k => normalize(k).includes('tracking') || normalize(k).includes('airbill'));

        if (daKey && statusKey) {
            rawData.forEach(row => {
                if (stationKey) {
                    const stationVal = normalize(row[stationKey]);
                    if (stationVal && !stationVal.includes('dqn3')) return;
                }
                let rawName = (row[daKey] || '').toString();
                const name = getOfficialName(rawName) || "⚠️ Unknown";
                const status = (row[statusKey] || '').toString().toUpperCase().trim();
                const track = trackKey ? (row[trackKey] || '').toString().trim() : '';

                let cat: 'delivered' | 'failed' | 'ofd' | 'rto' | 'ignored' = 'ignored';
                if (DEFAULT_STATUS_MAPPING[status]) cat = DEFAULT_STATUS_MAPPING[status];
                else {
                    for (const [key, val] of Object.entries(DEFAULT_STATUS_MAPPING)) {
                        if (status.includes(key)) { cat = val; break; }
                    }
                }
                if (cat === 'ignored') return;

                if (!summariesMap[name]) {
                    summariesMap[name] = { daName: name, delivered: 0, failed: 0, ofd: 0, rto: 0, total: 0, successRate: 0, pendingTrackings: [], allTrackings: [], badges: [] };
                }
                summariesMap[name][cat]++;
                summariesMap[name].total++;
                if (cat !== 'delivered' && track) summariesMap[name].pendingTrackings.push(track);
                if (track) summariesMap[name].allTrackings.push({ id: track, status: cat });
            });
        }
    }

    const summaries = Object.values(summariesMap).map(s => {
        const successRate = s.total > 0 ? (s.delivered / s.total) * 100 : 0;
        const sWithRate = { ...s, successRate };
        sWithRate.badges = calculateBadges(sWithRate);
        return sWithRate;
    }).sort((a, b) => b.successRate - a.successRate);

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

export const processShipments = (rawData: any[], aliases: Record<string, string> = {}): ProcessedResult => {
    const result = processSingleDeliverySheet(rawData, aliases);
    return { ...result, pickupSummaries: undefined, pickupGrandTotal: undefined };
};
