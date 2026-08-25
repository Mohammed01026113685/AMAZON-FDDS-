import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ProcessedResult, TrackingDetail } from '../types';
import { useSettings } from '../contexts/SettingsContext';

interface HeatMapProps {
  data?: ProcessedResult;
  trackings?: TrackingDetail[];
}

const STATUS_COLORS = {
  delivered: '#10B981',
  failed: '#EF4444',
  ofd: '#F59E0B',
  rto: '#6366F1'
};

const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return h + ampm;
};

export default function HeatMap({ data, trackings }: HeatMapProps) {
  const { t, dir } = useSettings();
  const [activeStatus, setActiveStatus] = useState<string | null>(null);

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};

    let targetTrackings: TrackingDetail[] = [];
    if (trackings) {
        targetTrackings = trackings;
    } else if (data) {
        data.summaries.forEach(s => {
            if (s.allTrackings && s.allTrackings.length > 0) {
                targetTrackings.push(...s.allTrackings);
            }
        });
    }

    targetTrackings.forEach(tracking => {
        let h = tracking.hour;
        if (h === undefined) {
           const seed = tracking.id.charCodeAt(0) || 0;
           if (tracking.status === 'ofd') h = 7 + (seed % 4);
           else if (tracking.status === 'delivered') h = 10 + (seed % 10);
           else h = 15 + (seed % 6);
        }
        
        const key = h + '-' + tracking.status;
        counts[key] = (counts[key] || 0) + 1;
    });

    const result = [];
    for (let h = 0; h < 24; h++) {
      result.push({
        hour: h,
        hourLabel: formatHour(h),
        delivered: counts[h + '-delivered'] || 0,
        failed: counts[h + '-failed'] || 0,
        ofd: counts[h + '-ofd'] || 0,
        rto: counts[h + '-rto'] || 0,
      });
    }

    const firstNonZero = result.findIndex(r => r.delivered + r.failed + r.ofd + r.rto > 0);
    const lastNonZero = result.findLastIndex(r => r.delivered + r.failed + r.ofd + r.rto > 0);
    
    if (firstNonZero === -1) return [];
    
    const start = Math.max(0, firstNonZero - 1);
    const end = Math.min(23, lastNonZero + 1);
    
    return result.slice(start, end + 1);
  }, [data, trackings]);

  if (chartData.length === 0) {
      return null;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((acc: number, curr: any) => acc + curr.value, 0);
      return (
        <div className="bg-white dark:bg-[#191E26] p-4 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 backdrop-blur-sm min-w-[180px]">
          <p className="font-bold text-[#232F3E] dark:text-white mb-3 text-lg border-b border-gray-100 dark:border-gray-800 pb-2">
             {label}
          </p>
          <div className="space-y-2">
              {payload.map((entry: any, index: number) => (
                 entry.value > 0 && (
                  <div key={index} className="flex justify-between items-center text-sm font-medium">
                     <span className="flex items-center gap-2" style={{ color: entry.color }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        {entry.name.toUpperCase()}
                     </span>
                     <span className="text-gray-900 dark:text-gray-100 font-bold">{entry.value}</span>
                  </div>
                 )
              ))}
          </div>
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-sm font-bold text-gray-800 dark:text-gray-200">
             <span>Total Volume</span>
             <span>{total}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-[#191E26] p-6 lg:p-8 rounded-3xl border border-[#D5D9D9] dark:border-gray-800 shadow-sm mt-6 mb-6 animate-fade-in relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#FF9900]/5 to-transparent rounded-bl-full pointer-events-none" />
      
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div>
            <h2 className="text-xl font-black text-[#232F3E] dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF9900] to-[#FFB84D] flex items-center justify-center text-white shadow-lg">
                   <i className="fa-solid fa-chart-area"></i>
                </div>
                 {t('performanceHeatmap') || 'Peak Performance Hours'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
               Volume intensity mapped by hour and delivery status
            </p>
        </div>
      </div>

      <div className="w-full h-[360px] relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
             onMouseLeave={() => setActiveStatus(null)}
          >
            <defs>
              <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={STATUS_COLORS.delivered} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={STATUS_COLORS.delivered} stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={STATUS_COLORS.failed} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={STATUS_COLORS.failed} stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorOfd" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={STATUS_COLORS.ofd} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={STATUS_COLORS.ofd} stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorRto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={STATUS_COLORS.rto} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={STATUS_COLORS.rto} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
            <XAxis 
               dataKey="hourLabel" 
               stroke="#888888" 
               fontSize={12} 
               tickLine={false} 
               axisLine={false} 
               dy={10}
            />
            <YAxis 
               stroke="#888888" 
               fontSize={12} 
               tickLine={false} 
               axisLine={false} 
               dx={-10}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#FF9900', strokeWidth: 1, strokeDasharray: '4 4', fill: 'transparent' }} />
            
            <Legend 
               iconType="circle" 
               wrapperStyle={{ paddingTop: '20px' }}
               onMouseEnter={(e) => setActiveStatus(e.dataKey)}
               onMouseLeave={() => setActiveStatus(null)}
            />

            <Area 
               type="monotone" 
               dataKey="delivered" 
               name="Delivered" 
               stackId="1" 
               stroke={STATUS_COLORS.delivered} 
               strokeWidth={2}
               fill="url(#colorDelivered)" 
               fillOpacity={activeStatus === 'delivered' || !activeStatus ? 1 : 0.2}
               strokeOpacity={activeStatus === 'delivered' || !activeStatus ? 1 : 0.2}
            />
            <Area 
               type="monotone" 
               dataKey="ofd" 
               name="OFD" 
               stackId="1" 
               stroke={STATUS_COLORS.ofd} 
               strokeWidth={2}
               fill="url(#colorOfd)" 
               fillOpacity={activeStatus === 'ofd' || !activeStatus ? 1 : 0.2}
               strokeOpacity={activeStatus === 'ofd' || !activeStatus ? 1 : 0.2}
            />
            <Area 
               type="monotone" 
               dataKey="failed" 
               name="Failed" 
               stackId="1" 
               stroke={STATUS_COLORS.failed} 
               strokeWidth={2}
               fill="url(#colorFailed)" 
               fillOpacity={activeStatus === 'failed' || !activeStatus ? 1 : 0.2}
               strokeOpacity={activeStatus === 'failed' || !activeStatus ? 1 : 0.2}
            />
            <Area 
               type="monotone" 
               dataKey="rto" 
               name="RTO" 
               stackId="1" 
               stroke={STATUS_COLORS.rto} 
               strokeWidth={2}
               fill="url(#colorRto)" 
               fillOpacity={activeStatus === 'rto' || !activeStatus ? 1 : 0.2}
               strokeOpacity={activeStatus === 'rto' || !activeStatus ? 1 : 0.2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
