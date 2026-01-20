import React, { useMemo, useState, useRef, useEffect } from 'react';
import { HistoryRecord, TrackingDetail } from '../types';
import { 
  exportAgentHistory, 
  exportAdvancedReport, 
  exportComplexMonthlyReport 
} from '../services/exportService';
import { deleteOldRecords, saveAppTitle } from '../services/firebase';
import { Chart } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  PointElement, 
  LineElement, 
  Filler,
  ArcElement
} from 'chart.js/auto';
import { useSettings } from '../contexts/SettingsContext';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  PointElement, 
  LineElement, 
  Filler,
  ArcElement
);

interface HistoryDashboardProps {
  history: HistoryRecord[];
  onDeleteRecord?: (date: string) => void;
  onUpdateRecord?: (date: string, agents: any[], stationTotal: any) => Promise<void>;
  isAdmin: boolean;
  onOpenUserManagement?: () => void;
  onOpenAliasManagement?: () => void;
  showMessage: (type: 'alert' | 'confirm' | 'info', title: string, msg: string, onConfirm: () => void) => void;
  onRefresh?: () => void;
}

type Tab = 'overview' | 'advanced' | 'manage';
type ReportType = 'yearly' | 'monthly' | 'custom';

// ============= UTILITIES =============
const getRateColor = (rate: number) => {
  if (rate >= 95) return '#007185';
  if (rate >= 90) return '#10B981';
  if (rate >= 80) return '#F59E0B';
  return '#EF4444';
};

const getRateClass = (rate: number) => {
  if (rate >= 95) return 'text-[#007185] bg-cyan-50 dark:bg-cyan-900/20 dark:text-cyan-300';
  if (rate >= 90) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400';
  if (rate >= 80) return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400';
  return 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400';
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-SA', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// ============= تحليل الأيام المميزة =============
const analyzeDays = (data: any[]) => {
  if (!data || data.length === 0) {
    return {
      peakDay: null,
      bestPerformanceDay: null,
      mostConsistentDay: null,
      avgPerformance: 0,
      worstDay: null,
      dayOfWeekStats: {},
      totalDays: 0
    };
  }

  let peakDay = { date: '', volume: 0, formattedDate: '' };
  let bestPerformanceDay = { date: '', rate: 0, formattedDate: '' };
  let worstDay = { date: '', rate: 100, formattedDate: '' };
  let mostConsistentDay = { date: '', agentsCount: 0, formattedDate: '' };
  let totalRate = 0;
  let totalDays = 0;
  
  const dayOfWeekStats: Record<string, { totalVolume: number, count: number, totalRate: number }> = {};

  data.forEach(day => {
    if (!day.date) return;
    
    const date = new Date(day.date);
    const dayOfWeek = date.getDay();
    const dayName = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][dayOfWeek];
    
    if (!dayOfWeekStats[dayName]) {
      dayOfWeekStats[dayName] = { totalVolume: 0, count: 0, totalRate: 0 };
    }
    
    const volume = day.stationTotal?.total || 0;
    const rate = day.stationTotal?.successRate || 0;
    
    // تحديث إحصائيات يوم الأسبوع
    dayOfWeekStats[dayName].totalVolume += volume;
    dayOfWeekStats[dayName].count += 1;
    dayOfWeekStats[dayName].totalRate += rate;

    // أكثر يوم في الشحنات
    if (volume > peakDay.volume) {
      peakDay = { 
        date: day.date, 
        volume, 
        formattedDate: formatDate(day.date) 
      };
    }

    // أعلى يوم في نسبة المناديب
    if (rate > bestPerformanceDay.rate) {
      bestPerformanceDay = { 
        date: day.date, 
        rate, 
        formattedDate: formatDate(day.date) 
      };
    }

    // أسوأ يوم في نسبة المناديب
    if (rate < worstDay.rate) {
      worstDay = { 
        date: day.date, 
        rate, 
        formattedDate: formatDate(day.date) 
      };
    }

    // عدد الفعالين في اليوم
    const activeAgents = day.agents?.length || 0;
    if (activeAgents > mostConsistentDay.agentsCount) {
      mostConsistentDay = { 
        date: day.date, 
        agentsCount: activeAgents,
        formattedDate: formatDate(day.date)
      };
    }

    if (rate > 0) {
      totalRate += rate;
      totalDays++;
    }
  });

  // حساب متوسط أيام الأسبوع
  const dayOfWeekAnalysis = Object.entries(dayOfWeekStats).map(([dayName, stats]) => ({
    day: dayName,
    avgVolume: stats.count > 0 ? Math.round(stats.totalVolume / stats.count) : 0,
    avgRate: stats.count > 0 ? stats.totalRate / stats.count : 0,
    count: stats.count
  })).sort((a, b) => b.avgVolume - a.avgVolume);

  return {
    peakDay: peakDay.date ? peakDay : null,
    bestPerformanceDay: bestPerformanceDay.date ? bestPerformanceDay : null,
    worstDay: worstDay.date ? worstDay : null,
    mostConsistentDay: mostConsistentDay.date ? mostConsistentDay : null,
    avgPerformance: totalDays > 0 ? totalRate / totalDays : 0,
    dayOfWeekAnalysis,
    totalDays: data.length
  };
};

// ============= COMPONENTS =============

// 1. Edit Day Modal Component
const EditDayModal = ({ 
  record, 
  onClose, 
  onSave, 
  showMessage 
}: { 
  record: HistoryRecord, 
  onClose: () => void, 
  onSave: (agents: any[], total: any) => void, 
  showMessage: any 
}) => {
  const { t, language } = useSettings();
  const [agents, setAgents] = useState(JSON.parse(JSON.stringify(record.agents || [])));
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentDelivered, setNewAgentDelivered] = useState(0);
  const [newAgentTotal, setNewAgentTotal] = useState(0);

  const handleAgentChange = (index: number, field: string, value: any) => {
    const updated = [...agents];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'delivered' || field === 'total') {
      updated[index].total = Number(updated[index].total);
      updated[index].delivered = Number(updated[index].delivered);
      updated[index].successRate = updated[index].total > 0 
        ? (updated[index].delivered / updated[index].total) * 100 
        : 0;
    }
    setAgents(updated);
  };

  const handleDeleteAgent = (index: number) => {
    showMessage('confirm', t('delete'), t('deleteAgentConfirm'), () => {
      const updated = [...agents];
      updated.splice(index, 1);
      setAgents(updated);
    });
  };

  const handleAddAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName || newAgentTotal <= 0) return;
    
    const newAgent = {
      daName: newAgentName,
      delivered: Number(newAgentDelivered),
      total: Number(newAgentTotal),
      successRate: (Number(newAgentDelivered) / Number(newAgentTotal)) * 100
    };
    
    setAgents([...agents, newAgent]);
    setNewAgentName('');
    setNewAgentDelivered(0);
    setNewAgentTotal(0);
  };

  const handleSave = () => {
    const stationTotal = agents.reduce((acc: any, curr: any) => ({
      delivered: acc.delivered + curr.delivered,
      total: acc.total + curr.total,
    }), { delivered: 0, total: 0 });
    
    stationTotal.successRate = stationTotal.total > 0 
      ? (stationTotal.delivered / stationTotal.total) * 100 
      : 0;
    
    onSave(agents, stationTotal);
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-[#191E26] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#232F3E] to-[#37475A] text-white p-6 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-xl">{t('editRecord')}</h3>
            <p className="text-sm text-gray-300 mt-1">{record.date} • {formatDate(record.date)}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Add Agent Form */}
        <div className="p-5 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
          <div className="mb-3">
            <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <i className="fa-solid fa-user-plus text-[#FF9900]"></i>
              إضافة مندوب جديد
            </h4>
          </div>
          <form onSubmit={handleAddAgent} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 mb-1">{t('agentName')}</label>
              <input 
                type="text" 
                placeholder="اسم المندوب" 
                value={newAgentName} 
                onChange={e => setNewAgentName(e.target.value)} 
                className="w-full border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#FF9900] outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-right" 
                required 
                dir="rtl"
              />
            </div>
            <div className="w-32">
              <label className="block text-xs font-bold text-gray-500 mb-1">{t('delivered')}</label>
              <input 
                type="number" 
                placeholder="تم توصيله" 
                value={newAgentDelivered} 
                onChange={e => setNewAgentDelivered(Number(e.target.value))} 
                className="w-full border rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-[#FF9900] outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center" 
              />
            </div>
            <div className="w-32">
              <label className="block text-xs font-bold text-gray-500 mb-1">{t('total')}</label>
              <input 
                type="number" 
                placeholder="الإجمالي" 
                value={newAgentTotal} 
                onChange={e => setNewAgentTotal(Number(e.target.value))} 
                className="w-full border rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-[#FF9900] outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center" 
                required 
              />
            </div>
            <button type="submit" className="bg-gradient-to-r from-[#FF9900] to-[#F7CA00] text-[#232F3E] px-6 py-3 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <i className="fa-solid fa-plus mr-2"></i> {t('add')}
            </button>
          </form>
        </div>

        {/* Agents Table */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-white dark:bg-[#191E26]">
          <div className="mb-4 flex justify-between items-center">
            <h4 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <i className="fa-solid fa-list-check text-[#007185]"></i>
              المناديب ({agents.length})
            </h4>
            <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg">
              إجمالي الشحنات: {agents.reduce((sum, agent) => sum + (agent.total || 0), 0)}
            </div>
          </div>
          
          {agents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <i className="fa-solid fa-users-slash text-5xl mb-4 opacity-20"></i>
              <p className="font-bold">لا توجد فروع مضافة لهذا اليوم</p>
              <p className="text-sm mt-1">قم بإضافة المناديب من النموذج أعلاه</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="p-4 text-right">اسم المندوب</th>
                    <th className="p-4 text-center">تم التوصيل</th>
                    <th className="p-4 text-center">الإجمالي</th>
                    <th className="p-4 text-center">النسبة %</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {agents.map((agent: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="p-4">
                        <input 
                          type="text" 
                          value={agent.daName} 
                          onChange={(e) => handleAgentChange(i, 'daName', e.target.value)} 
                          className="border rounded-lg px-3 py-2 w-full text-right focus:ring-2 focus:ring-[#FF9900] outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                          dir="rtl"
                        />
                      </td>
                      <td className="p-4">
                        <input 
                          type="number" 
                          value={agent.delivered} 
                          onChange={(e) => handleAgentChange(i, 'delivered', Number(e.target.value))} 
                          className="border rounded-lg px-3 py-2 w-24 text-center focus:ring-2 focus:ring-[#FF9900] outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                        />
                      </td>
                      <td className="p-4">
                        <input 
                          type="number" 
                          value={agent.total} 
                          onChange={(e) => handleAgentChange(i, 'total', Number(e.target.value))} 
                          className="border rounded-lg px-3 py-2 w-24 text-center focus:ring-2 focus:ring-[#FF9900] outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                        />
                      </td>
                      <td className="p-4">
                        <div className={`px-3 py-1.5 rounded-lg font-bold text-center ${getRateClass(agent.successRate)}`}>
                          {agent.successRate.toFixed(1)}%
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => handleDeleteAgent(i)} 
                            className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 flex items-center justify-center transition-colors"
                            title="حذف"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                          <button 
                            onClick={() => {
                              setNewAgentName(agent.daName);
                              setNewAgentDelivered(agent.delivered);
                              setNewAgentTotal(agent.total);
                              handleDeleteAgent(i);
                            }}
                            className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center justify-center transition-colors"
                            title="نسخ"
                          >
                            <i className="fa-regular fa-copy"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-bold">{agents.length}</span> مندوب | 
            <span className="mx-2">•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {agents.reduce((sum, agent) => sum + (agent.delivered || 0), 0)}
            </span> تم توصيله
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
              {t('cancel')}
            </button>
            <button onClick={handleSave} className="px-8 py-3 bg-gradient-to-r from-[#232F3E] to-[#37475A] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
              {t('saveChanges')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. Chart Section Component
const ChartSection = ({ data, title, height = 400 }: { data: any[], title: string, height?: number }) => {
  const { t, language } = useSettings();
  const chartRef = useRef<any>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-[#191E26] p-8 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400" style={{ height: `${height}px` }}>
        <i className="fa-solid fa-chart-area text-5xl mb-4 opacity-20"></i>
        <p>{t('noData')}</p>
      </div>
    );
  }

  const chartData = {
    labels: data.map(d => d.dateShort),
    datasets: [
      {
        type: 'bar' as const,
        label: t('volume'),
        data: data.map(d => d.volume),
        backgroundColor: '#232F3E',
        hoverBackgroundColor: '#37475A',
        barPercentage: 0.6,
        borderRadius: 6,
        yAxisID: 'y',
        order: 2
      },
      {
        type: 'line' as const,
        label: t('successRate'),
        data: data.map(d => d.rate),
        borderColor: '#FF9900',
        backgroundColor: 'rgba(255, 153, 0, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#FF9900',
        pointBorderColor: '#fff',
        pointRadius: 5,
        pointHoverRadius: 8,
        fill: true,
        tension: 0.3,
        yAxisID: 'y1',
        order: 1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          font: { 
            family: "'Noto Sans Arabic', sans-serif", 
            weight: 'bold', 
            size: 12 
          },
          usePointStyle: true,
          boxWidth: 8,
          padding: 20,
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#000',
        bodyColor: '#333',
        titleFont: { 
          family: "'Noto Sans Arabic', sans-serif", 
          size: 13, 
          weight: 'bold' 
        },
        bodyFont: { 
          family: "'Noto Sans Arabic', sans-serif", 
          size: 12 
        },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        borderWidth: 1,
        borderColor: '#ddd',
        callbacks: {
          label: (context: any) => {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += context.parsed.y.toLocaleString();
              if (context.dataset.yAxisID === 'y1') label += '%';
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { 
          font: { 
            size: 11, 
            family: "'Noto Sans Arabic', sans-serif", 
            weight: 'bold' 
          }, 
          color: '#64748b' 
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: { 
          display: true, 
          text: t('volume'), 
          color: '#232F3E', 
          font: { weight: 'bold' } 
        },
        grid: { color: '#f1f5f9' },
        ticks: { 
          color: '#64748b', 
          font: { weight: 'bold' },
          callback: function(value: any) {
            return value.toLocaleString();
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        min: 60,
        max: 105,
        title: { 
          display: true, 
          text: t('successRate'), 
          color: '#FF9900', 
          font: { weight: 'bold' } 
        },
        grid: { display: false },
        ticks: {
          callback: function(value: any) { return value + "%" },
          color: '#FF9900',
          font: { weight: 'bold', size: 11 }
        }
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  };

  return (
    <div className="modern-card p-6 flex flex-col" style={{ height: `${height}px` }}>
      <h3 className="text-[#232F3E] dark:text-white font-bold mb-4 flex items-center gap-2">
        <i className="fa-solid fa-chart-simple text-[#FF9900]"></i>
        {title}
      </h3>
      <div className="flex-1 w-full min-h-0 bg-white/50 dark:bg-gray-800/50 rounded-xl p-2">
        <Chart ref={chartRef} type='bar' data={chartData} options={options} />
      </div>
    </div>
  );
};

// 3. Agent Detail Modal Component
const AgentDetailModal = ({ agent, onClose }: { agent: any, onClose: () => void }) => {
  const { t, language } = useSettings();
  const [selectedDayShipments, setSelectedDayShipments] = useState<{date: string, trackings: TrackingDetail[]} | null>(null);
  const [detailModalTab, setDetailModalTab] = useState<'Delivered' | 'Failed' | 'OFD' | 'RTO'>('Delivered');

  if (!agent) return null;

  const agentChartData = {
    labels: agent.history.map((h: any) => h.date && typeof h.date === 'string' ? h.date.slice(5) : ''),
    datasets: [{
      label: 'Success Rate (%)',
      data: agent.history.map((h: any) => h.successRate),
      borderColor: '#FF9900',
      backgroundColor: (context: any) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, 'rgba(255, 153, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 153, 0, 0)');
        return gradient;
      },
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#fff',
      pointBorderColor: '#FF9900',
      pointRadius: 4,
      pointHoverRadius: 7
    }]
  };

  const agentOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => `الأداء: ${context.parsed.y.toFixed(1)}%`
        }
      }
    },
    scales: {
      y: { 
        min: 0, 
        max: 105, 
        grid: { color: '#f3f4f6' },
        ticks: {
          callback: function(value: any) { return value + "%" }
        }
      },
      x: { 
        grid: { display: false } 
      }
    }
  };

  const getFilteredTrackings = () => {
    if (!selectedDayShipments || !selectedDayShipments.trackings) return [];
    const statusMap: Record<string, string> = {
      'Delivered': 'delivered',
      'Failed': 'failed',
      'OFD': 'ofd',
      'RTO': 'rto'
    };
    return selectedDayShipments.trackings.filter(t => t.status === statusMap[detailModalTab]);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Delivered': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30';
      case 'Failed': return 'text-rose-600 bg-rose-50 dark:bg-rose-900/30';
      case 'OFD': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/30';
      case 'RTO': return 'text-amber-600 bg-amber-50 dark:bg-amber-900/30';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/30';
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-[#191E26] w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {selectedDayShipments ? (
          // Shipments Sub-view
          <>
            <div className="bg-gradient-to-r from-[#232F3E] to-[#37475A] text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-xl flex items-center gap-2">
                  <i className="fa-solid fa-box-open text-[#FF9900]"></i>
                  شحنات يوم {selectedDayShipments.date}
                </h3>
                <p className="text-sm text-gray-300 mt-1" dir="rtl">
                  <i className="fa-solid fa-user mr-2"></i>
                  {agent.name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedDayShipments(null)} className="text-gray-300 hover:text-white flex items-center gap-2 text-sm bg-white/10 px-4 py-2 rounded-xl hover:bg-white/20 transition-colors">
                  <i className="fa-solid fa-arrow-left"></i> رجوع
                </button>
                <button onClick={onClose} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              {['Delivered', 'Failed', 'OFD', 'RTO'].map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setDetailModalTab(tab as any)}
                  className={`flex-1 py-4 text-sm font-bold transition-all border-b-2 relative 
                    ${detailModalTab === tab 
                      ? 'border-[#FF9900] text-[#FF9900]' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                  {tab}
                  <span className={`absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded ${getStatusColor(tab)}`}>
                    {getFilteredTrackings().length}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-white dark:bg-[#191E26]">
              {getFilteredTrackings().length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {getFilteredTrackings().map((item, i) => (
                    <div key={i} className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-[#191E26] rounded-xl border border-gray-100 dark:border-gray-700 hover:border-[#FF9900] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:bg-[#FF9900] group-hover:text-white transition-colors">
                          <i className="fa-solid fa-barcode"></i>
                        </div>
                        <div>
                          <span className="text-sm font-mono font-bold text-[#232F3E] dark:text-gray-200 block">{item.id}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {item.status === 'delivered' ? 'تم التوصيل' : 
                             item.status === 'failed' ? 'فشل' : 
                             item.status === 'ofd' ? 'قيد التوصيل' : 'مرتجع'}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(item.id);
                        }}
                        className="text-gray-300 hover:text-[#FF9900] transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        title="نسخ الرقم"
                      >
                        <i className="fa-regular fa-copy"></i>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-400">
                  <i className="fa-solid fa-box-open text-5xl mb-4 opacity-20"></i>
                  <p className="font-bold">لا توجد شحنات {detailModalTab === 'Delivered' ? 'تم توصيلها' : 
                    detailModalTab === 'Failed' ? 'فاشلة' : 
                    detailModalTab === 'OFD' ? 'قيد التوصيل' : 'مرتجعة'} لهذا اليوم</p>
                </div>
              )}
            </div>
            
            <div className="p-5 bg-gray-50 dark:bg-[#111315] border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-bold">{getFilteredTrackings().length}</span> شحنة {detailModalTab === 'Delivered' ? 'تم توصيلها' : 
                detailModalTab === 'Failed' ? 'فاشلة' : 
                detailModalTab === 'OFD' ? 'قيد التوصيل' : 'مرتجعة'}
              </div>
              <div className="flex gap-3">
                <button onClick={() => {
                  const list = getFilteredTrackings().map(t => t.id).join('\n');
                  if (list) {
                    navigator.clipboard.writeText(list);
                  }
                }} className="text-sm bg-gradient-to-r from-[#232F3E] to-[#37475A] text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all">
                  <i className="fa-regular fa-copy mr-2"></i> نسخ الكل
                </button>
                <button onClick={() => {
                  const list = getFilteredTrackings().map(t => t.id).join('\n');
                  if (list) {
                    const blob = new Blob([list], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${agent.name}_${selectedDayShipments.date}_${detailModalTab}.txt`;
                    a.click();
                  }
                }} className="text-sm bg-gradient-to-r from-[#007185] to-[#4DB6AC] text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all">
                  <i className="fa-solid fa-download mr-2"></i> تحميل ملف
                </button>
              </div>
            </div>
          </>
        ) : (
          // Main Overview
          <>
            <div className="bg-gradient-to-r from-[#232F3E] to-[#37475A] text-white p-6 flex justify-between items-center relative overflow-hidden">
              <div className="absolute right-0 top-0 w-64 h-64 bg-[#FF9900] rounded-full opacity-10 blur-[80px] pointer-events-none"></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 bg-white text-[#232F3E] rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg">
                  {agent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-right" dir="rtl">{agent.name}</h2>
                  <p className="text-gray-300 text-sm text-right">تقرير الأداء التفصيلي</p>
                </div>
              </div>
              <div className="flex items-center gap-3 relative z-10">
                <button onClick={() => exportAgentHistory(agent.name, agent.history)} className="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2">
                  <i className="fa-solid fa-file-export"></i> تصدير
                </button>
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto bg-gray-50 dark:bg-gray-800 flex-1 custom-scrollbar">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-[#191E26] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center group hover:shadow-lg transition-shadow">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{t('totalVolume')}</p>
                  <p className="text-3xl font-black text-[#232F3E] dark:text-white group-hover:text-[#FF9900] transition-colors">{agent.total}</p>
                </div>
                <div className="bg-white dark:bg-[#191E26] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center group hover:shadow-lg transition-shadow">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{t('delivered')}</p>
                  <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-500 transition-colors">{agent.delivered}</p>
                </div>
                <div className="bg-white dark:bg-[#191E26] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center group hover:shadow-lg transition-shadow">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{t('failed')} / {t('rto')}</p>
                  <p className="text-3xl font-black text-rose-600 dark:text-rose-400 group-hover:text-rose-500 transition-colors">{agent.failed}</p>
                </div>
                <div className="bg-white dark:bg-[#191E26] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center group hover:shadow-lg transition-shadow">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{t('successRate')}</p>
                  <p className="text-3xl font-black text-[#007185] dark:text-[#4DB6AC] group-hover:text-[#FF9900] transition-colors">{agent.successRate.toFixed(1)}%</p>
                </div>
              </div>
              
              {/* Chart */}
              <div className="bg-white dark:bg-[#191E26] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8 h-[250px]">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-[#232F3E] dark:text-white">تطور الأداء اليومي</h4>
                  <div className="text-xs text-gray-500">
                    <i className="fa-solid fa-calendar-days mr-1"></i>
                    {agent.daysWorked} يوم
                  </div>
                </div>
                <Chart type='line' data={agentChartData} options={agentOptions} />
              </div>
              
              {/* History Table */}
              <div className="bg-white dark:bg-[#191E26] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <h4 className="font-bold text-[#232F3E] dark:text-white">السجل اليومي</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-center">
                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase text-xs">
                      <tr>
                        <th className="p-4">اليوم</th>
                        <th className="p-4">الأداء %</th>
                        <th className="p-4">تم التوصيل</th>
                        <th className="p-4">الإجمالي</th>
                        <th className="p-4">الشحنات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                      {agent.history.map((h: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="p-4 font-mono text-gray-500 dark:text-gray-400 font-bold">{h.date}</td>
                          <td className="p-4">
                            <span className={`px-3 py-1.5 rounded-lg font-bold text-xs ${getRateClass(h.successRate)}`}>
                              {h.successRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold">{h.delivered}</td>
                          <td className="p-4 text-gray-700 dark:text-gray-300 font-mono">{h.total}</td>
                          <td className="p-4">
                            {h.shipmentDetails && h.shipmentDetails.length > 0 ? (
                              <button 
                                onClick={() => setSelectedDayShipments({date: h.date, trackings: h.shipmentDetails})} 
                                className="text-xs bg-gradient-to-r from-[#232F3E] to-[#37475A] text-white px-3 py-1.5 rounded-lg hover:shadow-md transition-all"
                              >
                                عرض الشحنات
                              </button>
                            ) : (
                              <span className="text-gray-300 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-5 bg-white dark:bg-[#191E26] border-t border-gray-100 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button 
                onClick={() => exportAgentHistory(agent.name, agent.history)} 
                className="w-full bg-gradient-to-r from-[#232F3E] to-[#37475A] text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
              >
                <i className="fa-solid fa-file-export text-xl"></i> 
                <span>تصدير التقرير الكامل لـ {agent.name}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// 4. Day Analysis Component
const DayAnalysisSection = ({ analysis }: { analysis: any }) => {
  const { language } = useSettings();

  if (!analysis) return null;

  return (
    <div className="space-y-6">
      {/* Best Days Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Peak Day */}
        <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 dark:to-[#191E26] p-5 rounded-2xl border border-blue-100 dark:border-blue-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg">
                <i className="fa-solid fa-fire"></i>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 dark:text-gray-200">أكثر يوم في الشحنات</h4>
                <p className="text-xs text-gray-500">Peak Volume Day</p>
              </div>
            </div>
            <div className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg font-bold">
              رقم قياسي
            </div>
          </div>
          {analysis.peakDay ? (
            <>
              <div className="mb-3">
                <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mb-1">
                  {analysis.peakDay.volume.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  شحنة في يوم واحد
                </div>
              </div>
              <div className="pt-3 border-t border-blue-100 dark:border-blue-800">
                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <i className="fa-solid fa-calendar-day text-blue-500"></i>
                  {analysis.peakDay.formattedDate}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <i className="fa-solid fa-chart-bar text-3xl mb-2 opacity-20"></i>
              <p>لا توجد بيانات</p>
            </div>
          )}
        </div>

        {/* Best Performance Day */}
        <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/10 dark:to-[#191E26] p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg">
                <i className="fa-solid fa-trophy"></i>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 dark:text-gray-200">أعلى يوم في نسبة المناديب</h4>
                <p className="text-xs text-gray-500">Best Performance Day</p>
              </div>
            </div>
            <div className={`text-xs px-3 py-1 rounded-lg font-bold ${getRateClass(analysis.bestPerformanceDay?.rate || 0)}`}>
              {analysis.bestPerformanceDay?.rate?.toFixed(1) || 0}%
            </div>
          </div>
          {analysis.bestPerformanceDay ? (
            <>
              <div className="mb-3">
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-1">
                  {analysis.bestPerformanceDay.rate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  نسبة نجاح المناديب
                </div>
              </div>
              <div className="pt-3 border-t border-emerald-100 dark:border-emerald-800">
                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <i className="fa-solid fa-calendar-star text-emerald-500"></i>
                  {analysis.bestPerformanceDay.formattedDate}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <i className="fa-solid fa-chart-line text-3xl mb-2 opacity-20"></i>
              <p>لا توجد بيانات</p>
            </div>
          )}
        </div>

        {/* Most Agents Day */}
        <div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/10 dark:to-[#191E26] p-5 rounded-2xl border border-purple-100 dark:border-purple-800">
          
          {analysis.mostConsistentDay ? (
            <>
              <div className="mb-3">
                <div className="text-3xl font-black text-purple-600 dark:text-purple-400 mb-1">
                  {analysis.mostConsistentDay.agentsCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  مندوب مختلف في يوم واحد
                </div>
              </div>
              <div className="pt-3 border-t border-purple-100 dark:border-purple-800">
                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <i className="fa-solid fa-calendar-check text-purple-500"></i>
                  {analysis.mostConsistentDay.formattedDate}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <i className="fa-solid fa-users text-3xl mb-2 opacity-20"></i>
              <p>لا توجد بيانات</p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Average Performance */}
        <div className="bg-white dark:bg-[#191E26] p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <i className="fa-solid fa-chart-line"></i>
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">متوسط الأداء</h4>
              <p className="text-xs text-gray-500">Average Performance</p>
            </div>
          </div>
          <div className="mb-3">
            <div className={`text-2xl font-black ${getRateClass(analysis.avgPerformance).split(' ')[0]}`}>
              {analysis.avgPerformance.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              على مدار {analysis.totalDays} يوم
            </div>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${Math.min(analysis.avgPerformance, 100)}%`,
                backgroundColor: getRateColor(analysis.avgPerformance)
              }}
            ></div>
          </div>
        </div>

        {/* Worst Day */}
        <div className="bg-white dark:bg-[#191E26] p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">أقل يوم أداءً</h4>
              <p className="text-xs text-gray-500">Worst Performance Day</p>
            </div>
          </div>
          {analysis.worstDay ? (
            <>
              <div className="mb-2">
                <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                  {analysis.worstDay.rate.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">
                  أدنى نسبة نجاح
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <i className="fa-solid fa-calendar-times text-rose-500 mr-2"></i>
                {analysis.worstDay.formattedDate}
              </div>
            </>
          ) : (
            <div className="text-gray-400 text-sm py-2">لا توجد بيانات</div>
          )}
        </div>

        {/* Day of Week Analysis */}
        <div className="bg-white dark:bg-[#191E26] p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <i className="fa-solid fa-calendar-week"></i>
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">أفضل أيام الأسبوع</h4>
              <p className="text-xs text-gray-500">Best Week Days</p>
            </div>
          </div>
          {analysis.dayOfWeekAnalysis && analysis.dayOfWeekAnalysis.length > 0 ? (
            <div className="space-y-2">
              {analysis.dayOfWeekAnalysis.slice(0, 2).map((day: any, i: number) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{day.day}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500">{day.avgVolume.toLocaleString()} شحنة</span>
                    <span className={`text-xs font-bold ${getRateClass(day.avgRate).split(' ')[0]}`}>
                      {day.avgRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-sm py-2">لا توجد بيانات</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============= MAIN COMPONENT =============
const HistoryDashboard: React.FC<HistoryDashboardProps> = ({ 
  history, 
  isAdmin, 
  onOpenUserManagement, 
  onOpenAliasManagement, 
  onDeleteRecord, 
  onUpdateRecord, 
  showMessage, 
  onRefresh 
}) => {
  const { t, dir, appTitle, setAppTitle, language } = useSettings();
  
  // State
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  
  // Overview State
  const [startDate, setStartDate] = useState(() => { 
    const d = new Date(); 
    d.setDate(d.getDate() - 10); 
    return d.toISOString().split('T')[0]; 
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  // Advanced Report State
  const [reportType, setReportType] = useState<ReportType>('yearly');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [customStart, setCustomStart] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Advanced Filters
  const [advSearchTerm, setAdvSearchTerm] = useState('');
  const [advMinVol, setAdvMinVol] = useState<number>(0);
  const [advMinRate, setAdvMinRate] = useState<number>(0);
  const [advMaxRate, setAdvMaxRate] = useState<number>(100);

  // Management State
  const [recordToEdit, setRecordToEdit] = useState<HistoryRecord | null>(null);
  const [manageYear, setManageYear] = useState<string>('all');
  const [manageMonth, setManageMonth] = useState<string>('all');
  const [manageSearch, setManageSearch] = useState<string>('');
  const [tempAppTitle, setTempAppTitle] = useState(appTitle);

  // ============= LOGIC =============

  // Overview Logic
  const { filteredData, stationStats, agentStats, topPerformers, lowPerformers } = useMemo(() => {
    if (!history || history.length === 0) {
      return { 
        filteredData: [], 
        stationStats: [], 
        agentStats: [], 
        topPerformers: [], 
        lowPerformers: [] 
      };
    }
    
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    
    const filtered = history
      .filter(rec => {
        if (!rec.date) return false;
        const d = new Date(rec.date).getTime();
        return d >= start && d <= end;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const stationChartData = filtered.map(rec => ({
      date: rec.date, 
      dateShort: rec.date && typeof rec.date === 'string' ? rec.date.slice(5) : '??',
      volume: rec.stationTotal?.total || 0,
      rate: rec.stationTotal?.successRate || 0
    }));

    const agentsMap: Record<string, any> = {};
    
    filtered.forEach(rec => {
      (rec.agents || []).forEach(a => {
        if (!agentsMap[a.daName]) {
          agentsMap[a.daName] = { 
            name: a.daName, 
            total: 0, 
            delivered: 0, 
            failed: 0, 
            daysWorked: 0, 
            history: [] 
          };
        }
        
        const ag = agentsMap[a.daName];
        ag.total += a.total; 
        ag.delivered += a.delivered; 
        ag.failed += (a.total - a.delivered); 
        ag.daysWorked += 1;
        
        ag.history.push({ 
          date: rec.date, 
          total: a.total, 
          delivered: a.delivered, 
          successRate: a.successRate,
          shipmentDetails: a.shipmentDetails || a.trackings || []
        });
      });
    });

    const agentsArray = Object.values(agentsMap)
      .map(ag => ({ 
        ...ag, 
        successRate: ag.total > 0 ? (ag.delivered / ag.total) * 100 : 0 
      }));
    
    const meaningfulAgents = agentsArray.filter(a => a.total > 5);
    const topPerformers = [...meaningfulAgents]
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 10);
    
    const lowPerformers = [...meaningfulAgents]
      .sort((a, b) => a.successRate - b.successRate)
      .slice(0, 10);
    
    const sortedAgents = agentsArray.sort((a, b) => b.successRate - a.successRate);

    return { 
      filteredData: filtered, 
      stationStats: stationChartData, 
      agentStats: sortedAgents.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
      topPerformers,
      lowPerformers
    };
  }, [history, startDate, endDate, searchTerm]);

  // تحليل الأيام المميزة
  const dayAnalysis = useMemo(() => {
    return analyzeDays(filteredData);
  }, [filteredData]);

  // Advanced Report Logic
  const advancedData = useMemo(() => {
    let records: HistoryRecord[] = [];
    let title = '';

    // Filter records based on report type
    if (reportType === 'yearly') {
      records = history.filter(h => 
        h.date && typeof h.date === 'string' && h.date.startsWith(selectedYear)
      );
      title = `${t('yearlyReport')} - ${selectedYear}`;
    } else if (reportType === 'monthly') {
      const m = selectedMonth.padStart(2, '0');
      records = history.filter(h => 
        h.date && typeof h.date === 'string' && h.date.startsWith(`${selectedYear}-${m}`)
      );
      title = `${t('monthlyReport')} - ${selectedMonth}/${selectedYear}`;
    } else if (reportType === 'custom') {
      const start = new Date(customStart).getTime();
      const end = new Date(customEnd).getTime();
      records = history.filter(h => {
        if (!h.date) return false;
        const d = new Date(h.date).getTime();
        return d >= start && d <= end;
      });
      title = `${t('customRange')} (${customStart} - ${customEnd})`;
    }
    
    // Sort chronologically
    records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const agentsMap: Record<string, any> = {};
    let grandTotal = 0, grandDelivered = 0;
    let busiestDay = { date: '', vol: 0 };
    let bestDay = { date: '', rate: 0 };
    
    // Day of week statistics
    const dayOfWeekStats: Record<string, {total: number, count: number}> = {};

    records.forEach(rec => {
      const dailyVol = rec.stationTotal?.total || 0;
      const dailyRate = rec.stationTotal?.successRate || 0;
      
      // Update day of week stats
      const dayName = new Date(rec.date).toLocaleDateString('ar-SA', {weekday: 'short'});
      if (!dayOfWeekStats[dayName]) {
        dayOfWeekStats[dayName] = {total: 0, count: 0};
      }
      dayOfWeekStats[dayName].total += dailyVol;
      dayOfWeekStats[dayName].count += 1;

      // Update overall stats
      grandTotal += dailyVol;
      grandDelivered += rec.stationTotal?.delivered || 0;

      if (dailyVol > busiestDay.vol) busiestDay = { date: rec.date, vol: dailyVol };
      if (dailyRate > bestDay.rate) bestDay = { date: rec.date, rate: dailyRate };

      // Process agents
      (rec.agents || []).forEach(a => {
        if (!agentsMap[a.daName]) {
          agentsMap[a.daName] = { 
            name: a.daName, 
            total: 0, 
            delivered: 0, 
            failed: 0, 
            daysWorked: 0, 
            history: [] 
          };
        }
        
        const ag = agentsMap[a.daName];
        ag.total += a.total; 
        ag.delivered += a.delivered; 
        ag.failed += (a.total - a.delivered); 
        ag.daysWorked += 1;
        
        ag.history.push({ 
          date: rec.date, 
          total: a.total, 
          delivered: a.delivered, 
          successRate: a.successRate,
          shipmentDetails: a.shipmentDetails || []
        });
      });
    });

    // Calculate best day of week
    let bestWeekDay = '-';
    let maxAvg = 0;
    Object.entries(dayOfWeekStats).forEach(([day, stat]) => {
      const avg = stat.count > 0 ? stat.total / stat.count : 0;
      if (avg > maxAvg) {
        maxAvg = avg;
        bestWeekDay = day;
      }
    });

    const fullReport = Object.values(agentsMap)
      .map(a => ({ 
        ...a, 
        successRate: a.total > 0 ? (a.delivered / a.total) * 100 : 0 
      }))
      .sort((a, b) => b.successRate - a.successRate);
    
    // Top 10 with volume threshold
    const averageVolumePerAgent = fullReport.length > 0 ? grandTotal / fullReport.length : 0;
    const volumeThreshold = Math.max(5, averageVolumePerAgent * 0.2);

    const top10 = fullReport
      .filter(r => r.total >= volumeThreshold)
      .sort((a, b) => {
        if (Math.abs(b.successRate - a.successRate) > 0.1) {
          return b.successRate - a.successRate;
        }
        return b.total - a.total;
      })
      .slice(0, 10);

    // Filtered report for table
    const filteredReport = fullReport.filter(a => {
      const nameMatch = a.name.toLowerCase().includes(advSearchTerm.toLowerCase());
      const volMatch = a.total >= advMinVol;
      const rateMatch = a.successRate >= advMinRate && a.successRate <= advMaxRate;
      return nameMatch && volMatch && rateMatch;
    });

    const podium = fullReport.filter(r => r.total > 20).slice(0, 3);
    const overallRate = grandTotal > 0 ? (grandDelivered / grandTotal) * 100 : 0;
    const avgDailyVolume = records.length > 0 ? Math.round(grandTotal / records.length) : 0;

    // Chart data for advanced tab
    const trendData = records.map(r => ({
      dateShort: r.date ? r.date.slice(5) : '',
      volume: r.stationTotal?.total || 0,
      rate: r.stationTotal?.successRate || 0
    }));

    return { 
      report: filteredReport,
      top10,
      podium, 
      title,
      stats: { 
        total: grandTotal, 
        rate: overallRate,
        busiestDay,
        bestDay,
        daysCount: records.length,
        activeAgents: Object.keys(agentsMap).length,
        avgDailyVolume,
        bestWeekDay
      },
      trendData,
      rawRecords: records
    };
  }, [history, reportType, selectedYear, selectedMonth, customStart, customEnd, advSearchTerm, advMinVol, advMinRate, advMaxRate, t]);

  // Management Tab Filtering
  const availableYears = useMemo(() => {
    const validRecords = history.filter(h => h.date && typeof h.date === 'string');
    const years = new Set(validRecords.map(h => h.date.split('-')[0]));
    return Array.from(years).sort().reverse();
  }, [history]);

  const filteredManagementRecords = useMemo(() => {
    return history.filter(rec => {
      if (!rec.date || typeof rec.date !== 'string') return false;
      const [y, m] = rec.date.split('-');
      
      const matchYear = manageYear === 'all' || y === manageYear;
      const matchMonth = manageMonth === 'all' || parseInt(m).toString() === manageMonth;
      const matchSearch = !manageSearch || rec.date.includes(manageSearch);

      return matchYear && matchMonth && matchSearch;
    });
  }, [history, manageYear, manageMonth, manageSearch]);

  // ============= HANDLERS =============

  const handleCleanOldData = async (months: number) => {
    showMessage('confirm', t('warning'), t('irreversibleAction'), async () => {
      try {
        const date = new Date();
        date.setMonth(date.getMonth() - months);
        const cutoff = date.toISOString().split('T')[0];
        await deleteOldRecords(cutoff);
        window.location.reload();
      } catch (e: any) {
        alert("Error: " + e.message);
      }
    });
  };

  const handleBackupData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `qena_history_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleSaveTitle = async () => {
    try {
      await saveAppTitle(tempAppTitle);
      setAppTitle(tempAppTitle);
      showMessage('info', t('success'), t('titleUpdated'), () => {});
    } catch (error) {
      console.error(error);
      showMessage('alert', t('error'), t('updateFailed'), () => {});
    }
  };

  const setQuickDate = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  const setThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    setEndDate(now.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  const setThisYear = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    setEndDate(now.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  const setLastMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  const getDaysBetween = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-12 font-sans" dir={dir}>
      
      {/* Edit Modal */}
      {recordToEdit && (
        <EditDayModal 
          record={recordToEdit} 
          showMessage={showMessage} 
          onClose={() => setRecordToEdit(null)} 
          onSave={async (a, t) => { 
            if (onUpdateRecord) await onUpdateRecord(recordToEdit.date, a, t); 
            setRecordToEdit(null); 
          }} 
        />
      )}

      {/* Agent Detail Modal */}
      {selectedAgent && <AgentDetailModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />}

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-[#191E26] p-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-wrap gap-2 sticky top-20 z-40 backdrop-blur-sm bg-white/80 dark:bg-[#191E26]/80">
        <button 
          onClick={() => setActiveTab('overview')} 
          className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 flex-1 md:flex-none justify-center ${
            activeTab === 'overview' 
              ? 'bg-gradient-to-r from-[#232F3E] to-[#37475A] text-white shadow-lg' 
              : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <i className="fa-solid fa-chart-line"></i> 
          <span className="hidden sm:inline">{t('timeAnalysis')}</span>
          <span className="sm:hidden">نظرة عامة</span>
        </button>
        <button 
          onClick={() => setActiveTab('advanced')} 
          className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 flex-1 md:flex-none justify-center ${
            activeTab === 'advanced' 
              ? 'bg-gradient-to-r from-[#FF9900] to-[#F7CA00] text-[#232F3E] shadow-lg' 
              : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <i className="fa-solid fa-trophy"></i> 
          <span className="hidden sm:inline">{t('advancedReports')}</span>
          <span className="sm:hidden">تقارير متقدمة</span>
        </button>
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('manage')} 
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 flex-1 md:flex-none justify-center ${
              activeTab === 'manage' 
                ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg' 
                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <i className="fa-solid fa-sliders"></i> 
            <span className="hidden sm:inline">{t('management')}</span>
            <span className="sm:hidden">الإدارة</span>
          </button>
        )}
      </div>

      {/* --- TAB 1: OVERVIEW --- */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Date Filters */}
          <div className="bg-white dark:bg-[#191E26] p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
              <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
                <div className="text-sm font-bold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  <i className="fa-solid fa-filter mr-2 text-[#FF9900]"></i>
                  التصفية السريعة:
                </div>
                <button onClick={() => setQuickDate(6)} className="px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gradient-to-r hover:from-[#FF9900] hover:to-[#F7CA00] hover:text-white rounded-xl text-xs font-bold transition-all">
                  <i className="fa-solid fa-calendar-week mr-1"></i>
                  7 أيام
                </button>
                <button onClick={() => setQuickDate(9)} className="px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gradient-to-r hover:from-[#FF9900] hover:to-[#F7CA00] hover:text-white rounded-xl text-xs font-bold transition-all">
                  <i className="fa-solid fa-calendar-days mr-1"></i>
                  10 أيام
                </button>
                <button onClick={setThisMonth} className="px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gradient-to-r hover:from-[#FF9900] hover:to-[#F7CA00] hover:text-white rounded-xl text-xs font-bold transition-all">
                  <i className="fa-solid fa-calendar mr-1"></i>
                  هذا الشهر
                </button>
                <button onClick={setLastMonth} className="px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gradient-to-r hover:from-[#FF9900] hover:to-[#F7CA00] hover:text-white rounded-xl text-xs font-bold transition-all">
                  <i className="fa-solid fa-calendar-xmark mr-1"></i>
                  الشهر الماضي
                </button>
                <button onClick={setThisYear} className="px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gradient-to-r hover:from-[#FF9900] hover:to-[#F7CA00] hover:text-white rounded-xl text-xs font-bold transition-all">
                  <i className="fa-solid fa-calendar-alt mr-1"></i>
                  هذه السنة
                </button>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-xl border border-gray-100 dark:border-gray-600 w-full lg:w-auto">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-bold px-2">
                  من
                </div>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  className="bg-transparent border-none outline-none text-sm font-bold flex-1 text-center dark:text-white min-w-[120px]" 
                />
                <i className="fa-solid fa-arrow-left text-gray-300 mx-2"></i>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-bold px-2">
                  إلى
                </div>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  className="bg-transparent border-none outline-none text-sm font-bold flex-1 text-center dark:text-white min-w-[120px]" 
                />
              </div>
              {onRefresh && (
                <button onClick={onRefresh} className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2 whitespace-nowrap">
                  <i className="fa-solid fa-arrows-rotate"></i> تحديث البيانات
                </button>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-3 items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <i className="fa-solid fa-calendar-check text-[#FF9900] mr-2"></i>
                <span className="font-bold">{filteredData.length}</span> يوم | 
                <span className="mx-2">•</span>
                <span className="font-bold">{getDaysBetween(startDate, endDate)}</span> يوم محددة
              </div>
              <button 
                onClick={() => exportComplexMonthlyReport(filteredData, `تقرير ${startDate} إلى ${endDate}`, `تقرير_${startDate}_${endDate}`)} 
                className="text-sm bg-gradient-to-r from-[#007185] to-[#4DB6AC] text-white px-5 py-2 rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-file-export"></i> تصدير هذا النطاق
              </button>
            </div>
          </div>

          {/* === تحليل الأيام المميزة === */}
          <div className="animate-slide-up">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#232F3E] to-[#37475A] text-white flex items-center justify-center">
                  <i className="fa-solid fa-star"></i>
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#232F3E] dark:text-white">الأيام المميزة</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">تحليل أدق للأيام الاستثنائية</p>
                </div>
              </div>
              <div className="text-xs px-3 py-1.5 bg-gradient-to-r from-[#FF9900] to-[#F7CA00] text-[#232F3E] rounded-lg font-bold">
                {dayAnalysis.totalDays} يوم محللة
              </div>
            </div>
            <DayAnalysisSection analysis={dayAnalysis} />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up">
            <div className="bg-gradient-to-br from-[#232F3E] to-[#37475A] text-white p-8 rounded-3xl shadow-xl relative overflow-hidden group hover:shadow-2xl transition-shadow">
              <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
              <div className="relative z-10">
                <p className="text-gray-300 text-sm font-bold uppercase tracking-wider mb-2">
                  إجمالي الشحنات
                </p>
                <h3 className="text-5xl font-black mb-2">
                  {stationStats.reduce((a, c) => a + c.volume, 0).toLocaleString()}
                </h3>
                <div className="flex items-center text-sm text-gray-300">
                  <i className="fa-solid fa-boxes-stacked mr-2"></i>
                  شحنة في {filteredData.length} يوم
                </div>
              </div>
              <div className="absolute bottom-4 left-4 text-white/10">
                <i className="fa-solid fa-box text-8xl"></i>
              </div>
            </div>
            <div className="bg-white dark:bg-[#191E26] p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden group hover:shadow-xl transition-shadow">
              <div className="relative z-10">
                <p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">
                  نسبة النجاح الإجمالية
                </p>
                <h3 className={`text-5xl font-black mb-2 ${
                  getRateClass(
                    stationStats.length 
                      ? stationStats.reduce((a, c) => a + (c.volume * c.rate), 0) / stationStats.reduce((a, c) => a + c.volume, 0) 
                      : 0
                  ).split(' ')[0]
                }`}>
                  {stationStats.length 
                    ? (stationStats.reduce((a, c) => a + (c.volume * c.rate), 0) / stationStats.reduce((a, c) => a + c.volume, 0)).toFixed(1) 
                    : 0}%
                </h3>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <i className="fa-solid fa-chart-line mr-2"></i>
                  متوسط الأداء اليومي
                </div>
              </div>
              <div className="absolute bottom-4 left-4 text-gray-200 dark:text-gray-700">
                <i className="fa-solid fa-chart-pie text-8xl"></i>
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-[#191E26] p-8 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-[#FF9900] group transition-all cursor-pointer hover:shadow-xl">
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-[#FF9900] to-[#F7CA00] rounded-full flex items-center justify-center text-2xl text-[#232F3E] mb-4 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-file-csv"></i>
                </div>
                <h4 className="font-bold text-lg text-[#232F3E] dark:text-white mb-2">تصدير التقرير</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  تصدير جميع البيانات بشكل منظم
                </p>
                <button 
                  onClick={() => exportComplexMonthlyReport(filteredData, `تقرير ${startDate} إلى ${endDate}`, `تقرير_${startDate}_${endDate}`)} 
                  className="px-6 py-3 bg-gradient-to-r from-[#232F3E] to-[#37475A] text-white font-bold rounded-xl hover:shadow-lg transition-all"
                >
                  تصدير الآن
                </button>
              </div>
            </div>
          </div>

          {/* Chart */}
          <ChartSection data={stationStats} title="تطور الأداء والشحنات" />

          {/* Top/Low Performers */}
          {topPerformers.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
              {/* Top 10 */}
              <div className="bg-white dark:bg-[#191E26] rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-emerald-50/50 to-white dark:from-emerald-900/10 dark:to-[#191E26] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <i className="fa-solid fa-medal"></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-[#232F3E] dark:text-white">أفضل 10 فروع</h3>
                      <p className="text-xs text-gray-500">أعلى نسبة نجاح</p>
                    </div>
                  </div>
                  <div className="text-xs px-3 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-lg font-bold">
                    {topPerformers.length} مندوب
                  </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-400 text-[10px] uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="p-4 text-right">الترتيب</th>
                        <th className="p-4 text-right">اسم المندوب</th>
                        <th className="p-4 text-center">الشحنات</th>
                        <th className="p-4 text-center">النسبة %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                      {topPerformers.map((agent, i) => (
                        <tr 
                          key={i} 
                          onClick={() => setSelectedAgent(agent)} 
                          className="hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 cursor-pointer transition-colors group"
                        >
                          <td className="p-4">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${
                              i === 0 ? 'bg-gradient-to-r from-[#FFD814] to-[#F7CA00] text-[#232F3E]' :
                              i === 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' :
                              i === 2 ? 'bg-gradient-to-r from-[#CD7F32] to-[#B87333] text-white' :
                              'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                            }`}>
                              {i+1}
                            </div>
                          </td>
                          <td className="p-4 font-bold text-[#232F3E] dark:text-gray-200 text-right" dir="rtl">
                            <div className="flex items-center gap-3 justify-start">
                              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-500">
                                {agent.name.charAt(0)}
                              </div>
                              <span className="group-hover:text-[#FF9900] transition-colors">{agent.name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <div className="font-mono text-gray-500 dark:text-gray-400">{agent.total}</div>
                          </td>
                          <td className="p-4 text-center">
                            <div className={`px-3 py-1.5 rounded-lg font-bold ${getRateClass(agent.successRate)}`}>
                              {agent.successRate.toFixed(1)}%
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Low Performers */}
              <div className="bg-white dark:bg-[#191E26] rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-rose-50/50 to-white dark:from-rose-900/10 dark:to-[#191E26] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-[#232F3E] dark:text-white">فروع تحتاج تحسين</h3>
                      <p className="text-xs text-gray-500">أقل نسبة نجاح</p>
                    </div>
                  </div>
                  <div className="text-xs px-3 py-1 bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400 rounded-lg font-bold">
                    {lowPerformers.length} مندوب
                  </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-400 text-[10px] uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="p-4 text-right">اسم المندوب</th>
                        <th className="p-4 text-center">الفاشلة</th>
                        <th className="p-4 text-center">الإجمالي</th>
                        <th className="p-4 text-center">النسبة %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                      {lowPerformers.map((agent, i) => (
                        <tr 
                          key={i} 
                          onClick={() => setSelectedAgent(agent)} 
                          className="hover:bg-rose-50/30 dark:hover:bg-rose-900/10 cursor-pointer transition-colors group"
                        >
                          <td className="p-4 font-bold text-[#232F3E] dark:text-gray-200 text-right" dir="rtl">
                            <div className="flex items-center gap-3 justify-last">
                              <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                              <span className="group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">{agent.name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <div className="font-mono text-rose-600 dark:text-rose-400 font-bold">{agent.failed}</div>
                          </td>
                          <td className="p-4 text-center">
                            <div className="font-mono text-gray-500 dark:text-gray-400">{agent.total}</div>
                          </td>
                          <td className="p-4 text-center">
                            <div className={`px-3 py-1.5 rounded-lg font-bold ${getRateClass(agent.successRate)}`}>
                              {agent.successRate.toFixed(1)}%
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Agent List */}
          <div className="bg-white dark:bg-[#191E26] rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-[#191E26] flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="font-bold text-lg text-[#232F3E] dark:text-white">جميع المناديب</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {agentStats.length} مندوب • {stationStats.reduce((a, c) => a + c.volume, 0).toLocaleString()} شحنة
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <i className="fa-solid fa-search"></i>
                </div>
                <input 
                  type="text" 
                  placeholder="ابحث عن مندوب..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl pl-4 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-[#FF9900] bg-white dark:bg-[#2A2F3A] dark:text-white text-right" 
                  dir="rtl"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-center text-sm">
                <thead className="bg-gradient-to-r from-[#232F3E] to-[#37475A] text-white">
                  <tr>
                    <th className="p-4 text-right">اسم المندوب</th>
                    <th className="p-4 hidden md:table-cell">التقدم</th>
                    <th className="p-4 hidden sm:table-cell">الأيام</th>
                    <th className="p-4">الشحنات</th>
                    <th className="p-4">النسبة %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {agentStats.map((agent: any, i: number) => (
                    <tr 
                      key={i} 
                      onClick={() => setSelectedAgent(agent)} 
                      className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-white dark:hover:from-blue-900/10 dark:hover:to-[#191E26] cursor-pointer group transition-all"
                    >
                      <td className="p-4 text-right font-bold text-[#232F3E] dark:text-gray-200" dir="rtl">
                        <div className="flex items-center justify-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-500 group-hover:bg-[#FF9900] group-hover:text-white transition-colors">
                                {agent.name.charAt(0)}
                          </div>
                          <span className="group-hover:text-[#FF9900] transition-colors text-right">{agent.name}</span>
                        </div>
                      </td>
                      <td className="p-4 w-1/3 hidden md:table-cell">
                        <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex shadow-inner">
                          <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ 
                              width: `${Math.min(agent.successRate, 100)}%`, 
                              backgroundColor: getRateColor(agent.successRate) 
                            }}
                          ></div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                        <div className="flex items-center justify-center gap-1">
                          <i className="fa-solid fa-calendar-days text-gray-400"></i>
                          <span className="font-mono">{agent.daysWorked}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-gray-700 dark:text-gray-300 font-bold">{agent.total}</div>
                      </td>
                      <td className="p-4">
                        <div className={`px-3 py-1.5 rounded-lg font-bold ${getRateClass(agent.successRate)}`}>
                          {agent.successRate.toFixed(1)}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {agentStats.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <i className="fa-solid fa-users-slash text-5xl mb-4 opacity-20"></i>
                <p className="font-bold">لا توجد فروع تطابق البحث</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: ADVANCED REPORTS --- */}
      {activeTab === 'advanced' && (
        <div className="animate-fade-in space-y-8">
          {/* Header & Date Controls */}
          <div className="bg-gradient-to-r from-[#232F3E] to-[#37475A] text-white p-6 md:p-8 rounded-3xl shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h2 className="text-2xl font-black mb-2 flex items-center gap-2">
                  <i className="fa-solid fa-magnifying-glass-chart text-[#FF9900]"></i>
                  التقارير المتقدمة
                </h2>
                <p className="text-gray-300 text-sm">تحليل عميق واستخراج تقارير مفصلة لاتخاذ القرارات</p>
              </div>
              
              <div className="flex flex-wrap gap-2 items-center">
                {/* Type Selector */}
                <div className="bg-white/10 p-1 rounded-xl flex backdrop-blur-sm">
                  <button 
                    onClick={() => setReportType('yearly')} 
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      reportType === 'yearly' 
                        ? 'bg-gradient-to-r from-[#FF9900] to-[#F7CA00] text-[#232F3E]' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    سنوي
                  </button>
                  <button 
                    onClick={() => setReportType('monthly')} 
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      reportType === 'monthly' 
                        ? 'bg-gradient-to-r from-[#FF9900] to-[#F7CA00] text-[#232F3E]' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    شهري
                  </button>
                  <button 
                    onClick={() => setReportType('custom')} 
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      reportType === 'custom' 
                        ? 'bg-gradient-to-r from-[#FF9900] to-[#F7CA00] text-[#232F3E]' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    مخصص
                  </button>
                </div>

                {/* Controls */}
                {reportType === 'yearly' && (
                  <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(e.target.value)} 
                    className="bg-white/10 text-white border-none rounded-xl px-4 py-2.5 font-bold outline-none cursor-pointer hover:bg-white/20 transition-colors backdrop-blur-sm"
                  >
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                )}

                {reportType === 'monthly' && (
                  <div className="flex gap-2">
                    <select 
                      value={selectedYear} 
                      onChange={(e) => setSelectedYear(e.target.value)} 
                      className="bg-white/10 text-white border-none rounded-xl px-4 py-2.5 font-bold outline-none cursor-pointer hover:bg-white/20 backdrop-blur-sm"
                    >
                      {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select 
                      value={selectedMonth} 
                      onChange={(e) => setSelectedMonth(e.target.value)} 
                      className="bg-white/10 text-white border-none rounded-xl px-4 py-2.5 font-bold outline-none cursor-pointer hover:bg-white/20 backdrop-blur-sm"
                    >
                      {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>
                          {new Date(0, m-1).toLocaleString('ar-SA', {month: 'long'})}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {reportType === 'custom' && (
                  <div className="flex items-center gap-2 bg-white/10 p-2 rounded-xl backdrop-blur-sm">
                    <input 
                      type="date" 
                      value={customStart} 
                      onChange={e => setCustomStart(e.target.value)} 
                      className="bg-transparent text-white font-bold outline-none text-sm min-w-[130px]" 
                    />
                    <i className="fa-solid fa-arrow-left text-gray-400 mx-1"></i>
                    <input 
                      type="date" 
                      value={customEnd} 
                      onChange={e => setCustomEnd(e.target.value)} 
                      className="bg-transparent text-white font-bold outline-none text-sm min-w-[130px]" 
                    />
                  </div>
                )}

                <button 
                  onClick={() => exportAdvancedReport(advancedData.report, advancedData.title, `تقرير_${reportType}_${Date.now()}`)} 
                  className="px-5 py-2.5 bg-gradient-to-r from-[#FF9900] to-[#F7CA00] text-[#232F3E] font-bold rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <i className="fa-solid fa-file-export"></i> تصدير
                </button>
              </div>
            </div>
          </div>

          {/* Top 10 Performers Section */}
          {advancedData.top10.length > 0 && (
            <div className="animate-slide-up">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-[#FF9900] to-[#F7CA00] text-[#232F3E] flex items-center justify-center text-xl">
                    <i className="fa-solid fa-crown"></i>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[#232F3E] dark:text-white">أفضل 10 فروع</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">الأكثر تميزاً في الفترة المحددة</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {advancedData.top10.map((agent, i) => (
                    <div 
                      key={i} 
                      onClick={() => setSelectedAgent(agent)} 
                      className={`group relative overflow-hidden rounded-2xl border transition-all cursor-pointer hover:-translate-y-2 hover:shadow-2xl bg-white dark:bg-[#191E26] ${
                        i < 3 
                          ? 'border-[#FF9900] dark:border-[#FF9900] shadow-lg' 
                          : 'border-gray-100 dark:border-gray-700 hover:border-[#FF9900]'
                      }`}
                    >
                      {/* Rank Badge */}
                      <div className={`absolute top-0 right-0 w-10 h-10 rounded-bl-2xl flex items-center justify-center font-black text-sm z-10 ${
                        i === 0 
                          ? 'bg-gradient-to-r from-[#FFD814] to-[#F7CA00] text-[#232F3E]' 
                          : i === 1 
                          ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-[#232F3E]' 
                          : i === 2 
                          ? 'bg-gradient-to-r from-[#CD7F32] to-[#B87333] text-white' 
                          : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-500 dark:text-gray-400'
                      }`}>
                        #{i+1}
                      </div>
                      
                      <div className="p-5 flex flex-col items-center text-center relative z-10">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-3 shadow-lg ${
                          i < 3 
                            ? 'bg-gradient-to-r from-[#232F3E] to-[#37475A] text-white' 
                            : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-500 dark:text-gray-400'
                        }`}>
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                        <h4 
                          className="font-bold text-sm text-[#232F3E] dark:text-gray-200 line-clamp-2 h-10 mb-3 text-right" 
                          title={agent.name}
                          dir="rtl"
                        >
                          {agent.name}
                        </h4>
                        <div className="grid grid-cols-2 gap-3 w-full">
                          <div className="text-center">
                            <span className="block text-[10px] text-gray-400 uppercase">النسبة</span>
                            <span className={`font-black text-base ${getRateClass(agent.successRate).split(' ')[0]}`}>
                              {agent.successRate.toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-center">
                            <span className="block text-[10px] text-gray-400 uppercase">الشحنات</span>
                            <span className="font-bold text-base text-gray-700 dark:text-gray-300">
                              {agent.total}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 text-xs text-gray-500">
                          <i className="fa-solid fa-calendar-days mr-1"></i>
                          {agent.daysWorked} يوم
                        </div>
                      </div>
                      {/* Background Decoration */}
                      {i < 3 && <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-[#FF9900] to-[#F7CA00]"></div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Smart Insights Cards */}
          {advancedData.report.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
              <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 dark:to-[#191E26] p-5 rounded-2xl border border-blue-100 dark:border-blue-800">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shadow-sm">
                    <i className="fa-solid fa-calendar-star"></i>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">أفضل يوم أسبوع</p>
                    <h4 className="text-xl font-black text-[#232F3E] dark:text-white">
                      {advancedData.stats.bestWeekDay}
                    </h4>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/10 dark:to-[#191E26] p-5 rounded-2xl border border-orange-100 dark:border-orange-800">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xl shadow-sm">
                    <i className="fa-solid fa-fire"></i>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">أعلى حجم يومي</p>
                    <h4 className="text-xl font-black text-[#232F3E] dark:text-white">
                      {advancedData.stats.busiestDay.vol.toLocaleString()}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">{advancedData.stats.busiestDay.date}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/10 dark:to-[#191E26] p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shadow-sm">
                    <i className="fa-solid fa-chart-line"></i>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">معدل النجاح العام</p>
                    <h4 className={`text-xl font-black ${getRateClass(advancedData.stats.rate).split(' ')[0]}`}>
                      {advancedData.stats.rate.toFixed(1)}%
                    </h4>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/10 dark:to-[#191E26] p-5 rounded-2xl border border-purple-100 dark:border-purple-800">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl shadow-sm">
                    <i className="fa-solid fa-people-group"></i>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">متوسط العاملين</p>
                    <h4 className="text-xl font-black text-[#232F3E] dark:text-white">
                      ~{Math.round(advancedData.report.reduce((a,b)=>a+b.daysWorked,0)/advancedData.stats.daysCount) || 0}
                    </h4>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trend Chart */}
          {advancedData.report.length > 0 && (
            <div className="bg-white dark:bg-[#191E26] p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm h-[400px] animate-slide-up">
              <h3 className="font-bold text-[#232F3E] dark:text-white mb-4 flex items-center gap-2">
                <i className="fa-solid fa-arrow-trend-up text-[#FF9900]"></i>
                التطور الزمني للأداء
              </h3>
              <div className="h-[calc(100%-40px)] w-full">
                <Chart 
                  type='line'
                  data={{
                    labels: advancedData.trendData.map(d => d.dateShort),
                    datasets: [
                      {
                        type: 'line',
                        label: 'نسبة النجاح %',
                        data: advancedData.trendData.map(d => d.rate),
                        borderColor: '#FF9900',
                        backgroundColor: 'rgba(255, 153, 0, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#FF9900',
                        pointHoverRadius: 7,
                        yAxisID: 'y1'
                      },
                      {
                        type: 'bar',
                        label: 'حجم الشحنات',
                        data: advancedData.trendData.map(d => d.volume),
                        backgroundColor: '#232F3E',
                        barPercentage: 0.5,
                        borderRadius: 6,
                        yAxisID: 'y',
                        order: 2
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { 
                        position: 'top', 
                        align: 'end',
                        labels: {
                          font: {
                            family: "'Noto Sans Arabic', sans-serif"
                          }
                        }
                      } 
                    },
                    scales: {
                      x: { 
                        grid: { display: false },
                        ticks: {
                          font: {
                            family: "'Noto Sans Arabic', sans-serif"
                          }
                        }
                      },
                      y: { 
                        type: 'linear', 
                        position: 'left', 
                        grid: { display: false },
                        ticks: {
                          callback: function(value: any) {
                            return value.toLocaleString();
                          }
                        }
                      },
                      y1: { 
                        type: 'linear', 
                        position: 'right', 
                        min: 70, 
                        max: 105, 
                        grid: { color: '#f3f4f6' },
                        ticks: {
                          callback: function(value: any) { return value + "%" }
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Advanced Filters Bar */}
          <div className="bg-white dark:bg-[#191E26] p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm animate-slide-up flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-500 mb-1">
                <i className="fa-solid fa-search mr-1"></i>
                بحث عن مندوب
              </label>
              <div className="relative">
                <i className="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input 
                  type="text" 
                  value={advSearchTerm}
                  onChange={e => setAdvSearchTerm(e.target.value)}
                  placeholder="اكتب اسم المندوب للبحث..."
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-4 pl-10 py-3 text-sm font-bold focus:ring-2 focus:ring-[#FF9900] outline-none dark:text-white text-right"
                  dir="rtl"
                />
              </div>
            </div>
            <div className="w-full md:w-40">
              <label className="block text-xs font-bold text-gray-500 mb-1">أقل عدد شحنات</label>
              <input 
                type="number" 
                value={advMinVol}
                onChange={e => setAdvMinVol(Number(e.target.value))}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 text-sm font-bold focus:ring-2 focus:ring-[#FF9900] outline-none dark:text-white text-center"
                min="0"
              />
            </div>
            <div className="w-full md:w-64">
              <label className="block text-xs font-bold text-gray-500 mb-1">
                نطاق النسبة المئوية
              </label>
              <div className="flex gap-2 items-center">
                <input 
                  type="number" 
                  min="0" 
                  max="100"
                  value={advMinRate}
                  onChange={e => setAdvMinRate(Number(e.target.value))}
                  className="w-24 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-2 py-3 text-sm font-bold focus:ring-2 focus:ring-[#FF9900] outline-none dark:text-white text-center"
                  placeholder="الحد الأدنى"
                />
                <span className="text-gray-400">-</span>
                <input 
                  type="number" 
                  min="0" 
                  max="100"
                  value={advMaxRate}
                  onChange={e => setAdvMaxRate(Number(e.target.value))}
                  className="w-24 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-2 py-3 text-sm font-bold focus:ring-2 focus:ring-[#FF9900] outline-none dark:text-white text-center"
                  placeholder="الحد الأقصى"
                />
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button 
                onClick={() => { 
                  setAdvSearchTerm(''); 
                  setAdvMinVol(0); 
                  setAdvMinRate(0); 
                  setAdvMaxRate(100); 
                }} 
                className="flex-1 md:w-auto px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-rotate-left"></i> إعادة تعيين
              </button>
              <button 
                onClick={() => exportAdvancedReport(advancedData.report, advancedData.title, `تقرير_${reportType}_${Date.now()}`)} 
                className="flex-1 md:w-auto px-4 py-3 bg-gradient-to-r from-[#232F3E] to-[#37475A] text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-file-export"></i> تصدير
              </button>
            </div>
          </div>

          {/* Report Content */}
          {advancedData.report.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-slide-up">
              {/* Left: Summary Panel */}
              <div className="space-y-6">
                {/* Key Stats */}
                <div className="bg-white dark:bg-[#191E26] p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h4 className="text-gray-400 font-bold uppercase text-xs tracking-wider mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-chart-pie text-[#FF9900]"></i>
                    ملخص التقرير
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end pb-3 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-300">إجمالي الشحنات</span>
                      <span className="text-xl font-black text-[#232F3E] dark:text-white">
                        {advancedData.stats.total.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-end pb-3 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-300">متوسط يومي</span>
                      <span className="text-xl font-black text-[#232F3E] dark:text-white">
                        {advancedData.stats.avgDailyVolume}
                      </span>
                    </div>
                    <div className="flex justify-between items-end pb-3 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-300">نسبة النجاح</span>
                      <span className={`text-xl font-black ${getRateClass(advancedData.stats.rate).split(' ')[0]}`}>
                        {advancedData.stats.rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-end pb-3 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-300">عدد المناديب</span>
                      <span className="text-xl font-black text-[#232F3E] dark:text-white">
                        {advancedData.stats.activeAgents}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-300">عدد الأيام</span>
                      <span className="text-xl font-black text-[#232F3E] dark:text-white">
                        {advancedData.stats.daysCount}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button 
                      onClick={() => exportAdvancedReport(advancedData.report, advancedData.title, `ملخص_تقرير_${reportType}_${Date.now()}`)} 
                      className="w-full bg-gradient-to-r from-[#232F3E] to-[#37475A] text-white py-3.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all mb-3 flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-file-excel"></i> تصدير الملخص
                    </button>
                    
                    <button 
                      onClick={() => exportComplexMonthlyReport(advancedData.rawRecords, advancedData.title, `تقرير_مفصل_${reportType}_${Date.now()}`)}
                      className="w-full bg-gradient-to-r from-[#007185] to-[#4DB6AC] text-white py-3.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-table"></i> تصدير المفصل
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Main Table - Performance Ranking */}
              <div className="lg:col-span-3 bg-white dark:bg-[#191E26] rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-[#191E26] flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#232F3E] to-[#37475A] text-white flex items-center justify-center">
                      <i className="fa-solid fa-ranking-star"></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-[#232F3E] dark:text-white">تصنيف المندوب </h3>
                      <p className="text-xs text-gray-500">حسب الأداء والشحنات</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                    {advancedData.report.length} مندوب
                  </span>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-center text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 sticky top-0 z-10">
                      <tr>
                        <th className="p-4 text-left">الترتيب</th>
                        <th className="p-4 text-right">اسم المندوب</th>
                        <th className="p-4">الأيام</th>
                        <th className="p-4">إجمالي الشحنات</th>
                        <th className="p-4">تم التوصيل</th>
                        <th className="p-4">الأداء %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                      {advancedData.report.map((agent, i) => (
                        <tr 
                          key={i} 
                          onClick={() => setSelectedAgent(agent)} 
                          className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-white dark:hover:from-blue-900/10 dark:hover:to-[#191E26] cursor-pointer transition-all group"
                        >
                          <td className="p-4 text-left text-gray-400 font-mono text-xs">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-bold">
                              {i+1}
                            </div>
                          </td>
                          <td 
                            className="p-4 text-right font-bold text-[#232F3E] dark:text-gray-200" 
                            dir="rtl"
                          >
                            <div className="flex items-center justify-start  gap-3 ">
                              
                              
                              <span className="group-hover:text-[#FF9900] transition-colors text-lift">{agent.name}</span>
                              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-500 group-hover:bg-[#FF9900] group-hover:text-white transition-colors">
                                {agent.name.charAt(0)}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-gray-500 dark:text-gray-400">
                            <div className="flex items-center justify-center gap-1">
                              <i className="fa-solid fa-calendar-days text-gray-400"></i>
                              {agent.daysWorked}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-mono font-bold text-gray-700 dark:text-gray-300">
                              {agent.total}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                              {agent.delivered}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className={`px-3 py-1.5 rounded-lg font-bold text-xs ${getRateClass(agent.successRate)}`}>
                              {agent.successRate.toFixed(1)}%
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                  <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    تم تصنيف {advancedData.report.length} مندوب بناءً على الفلترة المطبقة
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#191E26] p-12 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-center text-gray-400 flex flex-col items-center">
              <i className="fa-solid fa-filter-circle-xmark text-7xl mb-6 opacity-20"></i>
              <p className="font-bold text-xl mb-2">لا توجد نتائج تطابق الفلترة</p>
              <p className="text-sm mb-6">جرب تعديل معايير البحث للحصول على نتائج</p>
              <button 
                onClick={() => { 
                  setAdvSearchTerm(''); 
                  setAdvMinVol(0); 
                  setAdvMinRate(0); 
                  setAdvMaxRate(100); 
                }} 
                className="px-6 py-3 bg-gradient-to-r from-[#FF9900] to-[#F7CA00] text-[#232F3E] font-bold rounded-xl hover:shadow-lg transition-all"
              >
                إعادة تعيين الفلاتر
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: MANAGEMENT --- */}
      {activeTab === 'manage' && isAdmin && (
        <div className="animate-fade-in space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* App Settings */}
            <div className="bg-white dark:bg-[#191E26] p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-[#232F3E] dark:text-white">
                <i className="fa-solid fa-sliders text-[#FF9900]"></i> إعدادات التطبيق
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-2">
                    اسم التطبيق
                  </label>
                  <input 
                    type="text" 
                    value={tempAppTitle}
                    onChange={e => setTempAppTitle(e.target.value)}
                    placeholder="أدخل اسم التطبيق..."
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#FF9900] bg-gray-50 dark:bg-gray-700 dark:text-white font-bold text-right"
                    dir="rtl"
                  />
                </div>
                <button 
                  onClick={handleSaveTitle} 
                  className="w-full bg-gradient-to-r from-[#232F3E] to-[#37475A] text-white px-4 py-3 rounded-xl font-bold text-sm shadow hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-floppy-disk"></i> حفظ التغييرات
                </button>
              </div>
            </div>

            {/* Data Maintenance */}
            <div className="bg-white dark:bg-[#191E26] p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-[#232F3E] dark:text-white">
                <i className="fa-solid fa-server text-rose-500"></i> صيانة البيانات
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleCleanOldData(6)} 
                  className="p-4 border border-rose-100 dark:border-rose-900 bg-gradient-to-br from-rose-50 to-white dark:from-rose-900/10 dark:to-[#191E26] text-rose-600 dark:text-rose-400 rounded-xl text-sm font-bold hover:shadow-lg transition-all flex flex-col items-center justify-center group"
                >
                  <i className="fa-solid fa-trash-can text-xl mb-2 group-hover:scale-110 transition-transform"></i>
                  حذف بيانات قد 6 شهور
                </button>
                <button 
                  onClick={() => handleCleanOldData(12)} 
                  className="p-4 border border-rose-100 dark:border-rose-900 bg-gradient-to-br from-rose-50 to-white dark:from-rose-900/10 dark:to-[#191E26] text-rose-600 dark:text-rose-400 rounded-xl text-sm font-bold hover:shadow-lg transition-all flex flex-col items-center justify-center group"
                >
                  <i className="fa-solid fa-calendar-xmark text-xl mb-2 group-hover:scale-110 transition-transform"></i>
                  حذف بيانات قد سنة
                </button>
                <button 
                  onClick={handleBackupData} 
                  className="p-4 col-span-2 border border-blue-100 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 dark:to-[#191E26] text-blue-600 dark:text-blue-400 rounded-xl text-sm font-bold hover:shadow-lg transition-all flex flex-col items-center justify-center group"
                >
                  <i className="fa-solid fa-cloud-arrow-down text-2xl mb-2 group-hover:scale-110 transition-transform"></i>
                  نسخ احتياطي للبيانات
                  <span className="text-xs text-gray-500 mt-1">تحميل ملف JSON</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button 
              onClick={onOpenUserManagement} 
              className="bg-white dark:bg-[#191E26] p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all group cursor-pointer text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-users-gear"></i>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-[#232F3E] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    إدارة المستخدمين
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">إضافة/حذف المشرفين</p>
                </div>
                <i className="fa-solid fa-chevron-left text-gray-300 group-hover:text-[#FF9900] transition-colors"></i>
              </div>
            </button>

            <button 
              onClick={onOpenAliasManagement} 
              className="bg-white dark:bg-[#191E26] p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all group cursor-pointer text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-shuffle"></i>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-[#232F3E] dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    مركز الأسماء البديلة
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">دمج الأسماء المكررة</p>
                </div>
                <i className="fa-solid fa-chevron-left text-gray-300 group-hover:text-[#FF9900] transition-colors"></i>
              </div>
            </button>
          </div>

          {/* Manual Record Edit */}
          <div className="bg-white dark:bg-[#191E26] rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-[#191E26] flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#FF9900] to-[#F7CA00] text-[#232F3E] flex items-center justify-center">
                  <i className="fa-solid fa-pen-to-square"></i>
                </div>
                <div>
                  <h3 className="font-bold text-[#232F3E] dark:text-white">التعديل اليدوي للسجلات</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">تعديل أو حذف سجلات أيام محددة</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <select 
                  value={manageYear} 
                  onChange={e => setManageYear(e.target.value)} 
                  className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-bold outline-none dark:text-white min-w-[120px]"
                >
                  <option value="all">كل السنوات</option>
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select 
                  value={manageMonth} 
                  onChange={e => setManageMonth(e.target.value)} 
                  className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-bold outline-none dark:text-white min-w-[120px]"
                >
                  <option value="all">كل الشهور</option>
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>
                      {new Date(0, m-1).toLocaleString('ar-SA', {month: 'long'})}
                    </option>
                  ))}
                </select>
                <input 
                  type="text" 
                  placeholder="بحث عن تاريخ..." 
                  value={manageSearch} 
                  onChange={e => setManageSearch(e.target.value)} 
                  className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-bold outline-none w-full md:w-48 dark:text-white" 
                />
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
              {filteredManagementRecords.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <i className="fa-solid fa-calendar-xmark text-5xl mb-4 opacity-20"></i>
                  <p className="font-bold">لا توجد سجلات تطابق البحث</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 sticky top-0">
                    <tr>
                      <th className="p-4 text-right">التاريخ</th>
                      <th className="p-4 text-right">ملخص المحطة</th>
                      <th className="p-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {filteredManagementRecords.map((rec) => (
                      <tr key={rec.date} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
                        <td className="p-4">
                          <div className="font-mono font-bold text-[#232F3E] dark:text-gray-200 text-right">
                            {rec.date}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">
                            {formatDate(rec.date)}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-right">
                            <div className="font-bold text-[#232F3E] dark:text-white text-lg">
                              {rec.stationTotal?.total?.toLocaleString() || 0}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              شحنة • 
                              <span className={`mx-2 font-bold ${getRateClass(rec.stationTotal?.successRate || 0).split(' ')[0]}`}>
                                {rec.stationTotal?.successRate?.toFixed(1) || 0}%
                              </span>
                              نسبة نجاح
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              <i className="fa-solid fa-users mr-1"></i>
                              {rec.agents?.length || 0} مندوب
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button 
                              onClick={() => setRecordToEdit(rec)} 
                              className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg flex items-center justify-center transition-all group-hover:scale-110"
                              title="تعديل"
                            >
                              <i className="fa-solid fa-pen"></i>
                            </button>
                            <button 
                              onClick={() => showMessage('confirm', t('warning'), t('deleteDateConfirm').replace('{date}', rec.date), () => onDeleteRecord && onDeleteRecord(rec.date))} 
                              className="w-10 h-10 rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:shadow-lg flex items-center justify-center transition-all group-hover:scale-110"
                              title="حذف"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                تم العثور على {filteredManagementRecords.length} سجل
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryDashboard;