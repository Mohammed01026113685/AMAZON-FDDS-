import React, { useMemo, useState, useRef, useEffect } from 'react';
import { HistoryRecord, TrackingDetail } from '../types';
import { exportAgentHistory, exportMonthlyReport, exportAdvancedReport, exportComplexMonthlyReport } from '../services/exportService';
import { deleteOldRecords, saveAppTitle } from '../services/firebase';
import { Chart } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, Filler, ScriptableContext } from 'chart.js/auto';
import { useSettings } from '../contexts/SettingsContext';

// Register ChartJS Components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, Filler);

interface HistoryDashboardProps {
  history: HistoryRecord[];
  onDeleteRecord?: (date: string) => void;
  onUpdateRecord?: (date: string, agents: any[], stationTotal: any) => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  onOpenUserManagement?: () => void;
  onOpenAliasManagement?: () => void;
  showMessage: (type: 'alert' | 'confirm' | 'info', title: string, msg: string, onConfirm: () => void) => void;
  onRefresh?: () => void;
}

type Tab = 'overview' | 'advanced' | 'manage';
type ReportType = 'yearly' | 'monthly' | 'custom';

// --- CONSTANTS ---
const PERFORMANCE_THRESHOLDS = {
  EXCELLENT: 95,
  GOOD: 90,
  AVERAGE: 80,
  POOR: 0
};

const CHART_COLORS = {
  AMAZON_DARK: '#232F3E',
  AMAZON_ORANGE: '#FF9900',
  AMAZON_BLUE: '#007185',
  EMERALD: '#10B981',
  AMBER: '#F59E0B',
  ROSE: '#EF4444',
  LIGHT_BG: '#F2F4F8'
};

// --- HELPER FUNCTIONS ---
const getRateColor = (rate: number) => {
    if (rate >= PERFORMANCE_THRESHOLDS.EXCELLENT) return CHART_COLORS.AMAZON_BLUE;
    if (rate >= PERFORMANCE_THRESHOLDS.GOOD) return CHART_COLORS.EMERALD;
    if (rate >= PERFORMANCE_THRESHOLDS.AVERAGE) return CHART_COLORS.AMBER;
    return CHART_COLORS.ROSE;
};

const getRateClass = (rate: number) => {
    if (rate >= PERFORMANCE_THRESHOLDS.EXCELLENT) return 'text-[#007185] bg-cyan-50 dark:bg-cyan-900/20 dark:text-cyan-300';
    if (rate >= PERFORMANCE_THRESHOLDS.GOOD) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400';
    if (rate >= PERFORMANCE_THRESHOLDS.AVERAGE) return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400';
    return 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400';
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    weekday: 'short'
  });
};

const calculateTrend = (current: number, previous: number) => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

// --- COMPONENTS ---

// 1. Edit Day Modal
const EditDayModal = ({ record, onClose, onSave, showMessage }: { 
  record: HistoryRecord, 
  onClose: () => void, 
  onSave: (agents: any[], total: any) => void, 
  showMessage: any 
}) => {
    const { t } = useSettings();
    const [agents, setAgents] = useState(JSON.parse(JSON.stringify(record.agents || [])));
    const [newAgentName, setNewAgentName] = useState('');
    const [newAgentDelivered, setNewAgentDelivered] = useState(0);
    const [newAgentTotal, setNewAgentTotal] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    const handleAgentChange = (index: number, field: string, value: any) => {
        const updated = [...agents];
        updated[index] = { ...updated[index], [field]: value };
        if (field === 'delivered' || field === 'total') {
            updated[index].total = Number(updated[index].total);
            updated[index].delivered = Number(updated[index].delivered);
            updated[index].successRate = updated[index].total > 0 ? 
                (updated[index].delivered / updated[index].total) * 100 : 0;
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
        if (!newAgentName || newAgentTotal <= 0) {
            showMessage('alert', t('error'), t('fillRequiredFields'), () => {});
            return;
        }
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

    const handleSave = async () => {
        if (agents.length === 0) {
            showMessage('alert', t('error'), t('atLeastOneAgent'), () => {});
            return;
        }

        setIsSaving(true);
        try {
            const stationTotal = agents.reduce((acc: any, curr: any) => ({
                delivered: acc.delivered + curr.delivered,
                total: acc.total + curr.total,
            }), { delivered: 0, total: 0 });
            stationTotal.successRate = stationTotal.total > 0 ? 
                (stationTotal.delivered / stationTotal.total) * 100 : 0;
            
            await onSave(agents, stationTotal);
            onClose();
        } catch (error) {
            showMessage('alert', t('error'), t('saveFailed'), () => {});
        } finally {
            setIsSaving(false);
        }
    };

    const totalDelivered = agents.reduce((sum, agent) => sum + (agent.delivered || 0), 0);
    const totalShipments = agents.reduce((sum, agent) => sum + (agent.total || 0), 0);
    const overallRate = totalShipments > 0 ? (totalDelivered / totalShipments) * 100 : 0;

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 modal-overlay animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-[#191E26] w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="bg-[#232F3E] text-white p-6 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg">{t('editRecord')}: {record.date}</h3>
                        <p className="text-sm text-gray-300 mt-1">
                            {agents.length} {t('agents')} | {totalShipments} {t('totalShipments')} | {overallRate.toFixed(1)}% {t('successRate')}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
                
                {/* Summary Stats */}
                <div className="bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20 p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">{t('totalAgents')}</p>
                            <p className="text-2xl font-black text-[#232F3E] dark:text-white">{agents.length}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">{t('totalShipments')}</p>
                            <p className="text-2xl font-black text-[#232F3E] dark:text-white">{totalShipments}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">{t('overallRate')}</p>
                            <p className={`text-2xl font-black ${getRateClass(overallRate).split(' ')[0]}`}>
                                {overallRate.toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </div>

                {/* Add Agent Form */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                    <form onSubmit={handleAddAgent} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                                {t('agentName')} *
                            </label>
                            <input 
                                type="text" 
                                placeholder={t('enterAgentName')}
                                value={newAgentName} 
                                onChange={e => setNewAgentName(e.target.value)} 
                                className="border rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-[#FF9900] outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                required 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                                {t('delivered')}
                            </label>
                            <input 
                                type="number" 
                                min="0"
                                value={newAgentDelivered} 
                                onChange={e => setNewAgentDelivered(Number(e.target.value))} 
                                className="border rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-[#FF9900] outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                                {t('total')} *
                            </label>
                            <input 
                                type="number" 
                                min="1"
                                value={newAgentTotal} 
                                onChange={e => setNewAgentTotal(Number(e.target.value))} 
                                className="border rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-[#FF9900] outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                required 
                            />
                        </div>
                        <button 
                            type="submit" 
                            className="bg-[#FF9900] text-[#232F3E] px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-[#F7CA00] transition-colors h-[42px]"
                        >
                            <i className="fa-solid fa-plus mr-2"></i>
                            {t('add')}
                        </button>
                    </form>
                </div>

                {/* Agents List */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white dark:bg-[#191E26]">
                    {agents.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <i className="fa-solid fa-users-slash text-4xl mb-4 opacity-20"></i>
                            <p>{t('noAgentsAdded')}</p>
                        </div>
                    ) : (
                        <table className="w-full text-center text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 text-gray-500 dark:text-gray-400 uppercase text-xs">
                                <tr>
                                    <th className="p-3 text-right">{t('agentName')}</th>
                                    <th className="p-3">{t('delivered')}</th>
                                    <th className="p-3">{t('total')}</th>
                                    <th className="p-3">{t('failed')}</th>
                                    <th className="p-3">{t('performance')}</th>
                                    <th className="p-3">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {agents.map((agent: any, i: number) => (
                                    <tr key={i} className="dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <td className="p-3">
                                            <input 
                                                type="text" 
                                                value={agent.daName} 
                                                onChange={(e) => handleAgentChange(i, 'daName', e.target.value)} 
                                                className="border rounded px-2 py-1 w-full text-center dark:bg-gray-700 dark:border-gray-600 focus:ring-1 focus:ring-[#FF9900] outline-none"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input 
                                                type="number" 
                                                value={agent.delivered} 
                                                onChange={(e) => handleAgentChange(i, 'delivered', Number(e.target.value))} 
                                                className="border rounded px-2 py-1 w-20 text-center dark:bg-gray-700 dark:border-gray-600 focus:ring-1 focus:ring-[#FF9900] outline-none"
                                                min="0"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input 
                                                type="number" 
                                                value={agent.total} 
                                                onChange={(e) => handleAgentChange(i, 'total', Number(e.target.value))} 
                                                className="border rounded px-2 py-1 w-20 text-center dark:bg-gray-700 dark:border-gray-600 focus:ring-1 focus:ring-[#FF9900] outline-none"
                                                min="1"
                                            />
                                        </td>
                                        <td className="p-3 text-rose-600 dark:text-rose-400 font-bold">
                                            {(agent.total - agent.delivered).toLocaleString()}
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${getRateClass(agent.successRate)}`}>
                                                {agent.successRate.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <button 
                                                onClick={() => handleDeleteAgent(i)} 
                                                className="text-rose-500 hover:text-rose-700 transition-colors p-1"
                                                title={t('delete')}
                                            >
                                                <i className="fa-solid fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 flex justify-between gap-3">
                    <button 
                        onClick={onClose} 
                        className="px-6 py-2.5 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                    >
                        {t('cancel')}
                    </button>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => {
                                showMessage('confirm', t('reset'), t('resetConfirm'), () => {
                                    setAgents(JSON.parse(JSON.stringify(record.agents || [])));
                                });
                            }} 
                            className="px-4 py-2.5 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                        >
                            {t('reset')}
                        </button>
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="px-8 py-2.5 bg-[#232F3E] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                                    {t('saving')}
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-check mr-2"></i>
                                    {t('saveChanges')}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 2. Advanced Chart Section
const ChartSection = ({ data, title }: { data: any[], title: string }) => {
    const { t } = useSettings();
    const chartRef = useRef<any>(null);

    if (!data || data.length === 0) {
        return (
            <div className="bg-white dark:bg-[#191E26] p-8 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 h-[350px]">
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
                backgroundColor: CHART_COLORS.AMAZON_DARK,
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
                borderColor: CHART_COLORS.AMAZON_ORANGE,
                backgroundColor: (context: ScriptableContext<'line'>) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(255, 153, 0, 0.2)');
                    gradient.addColorStop(1, 'rgba(255, 153, 0, 0)');
                    return gradient;
                },
                borderWidth: 3,
                pointBackgroundColor: CHART_COLORS.AMAZON_ORANGE,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 10,
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
                        weight: 'bold' as const, 
                        size: 12 
                    },
                    usePointStyle: true,
                    boxWidth: 8,
                    padding: 20,
                    color: '#64748b'
                }
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#000',
                bodyColor: '#333',
                titleFont: { 
                    family: "'Noto Sans Arabic', sans-serif", 
                    size: 13, 
                    weight: 'bold' as const 
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
                             if(context.dataset.yAxisID === 'y1') label += '%';
                         }
                         return label;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: { 
                    display: false 
                },
                ticks: { 
                    font: { 
                        size: 11, 
                        family: "'Noto Sans Arabic', sans-serif", 
                        weight: 'bold' as const 
                    }, 
                    color: '#64748b',
                    maxRotation: 45,
                    minRotation: 45
                }
            },
            y: {
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                title: { 
                    display: true, 
                    text: t('volume'), 
                    color: CHART_COLORS.AMAZON_DARK, 
                    font: { 
                        weight: 'bold' as const,
                        size: 12
                    } 
                },
                grid: { 
                    color: '#f1f5f9',
                    drawBorder: false
                },
                ticks: { 
                    color: '#64748b', 
                    font: { 
                        weight: 'bold' as const 
                    },
                    callback: function(value: any) {
                        return value.toLocaleString();
                    }
                }
            },
            y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                min: 0,
                max: 100,
                title: { 
                    display: true, 
                    text: t('successRate'), 
                    color: CHART_COLORS.AMAZON_ORANGE, 
                    font: { 
                        weight: 'bold' as const,
                        size: 12
                    } 
                },
                grid: { 
                    display: false 
                },
                ticks: {
                    callback: function(value: any) { 
                        return value + "%" 
                    },
                    color: CHART_COLORS.AMAZON_ORANGE,
                    font: { 
                        weight: 'bold' as const, 
                        size: 11 
                    },
                    stepSize: 10
                }
            }
        },
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        animations: {
            tension: {
                duration: 1000,
                easing: 'linear'
            }
        }
    };

    return (
        <div className="modern-card p-6 h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-[#232F3E] dark:text-white font-bold flex items-center gap-2">
                    <i className="fa-solid fa-chart-simple text-[#FF9900]"></i>
                    {title}
                </h3>
                <div className="flex gap-2">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                        <span className="w-3 h-3 rounded bg-[#232F3E]"></span>
                        {t('volume')}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                        <span className="w-3 h-3 rounded-full bg-[#FF9900]"></span>
                        {t('successRate')}
                    </span>
                </div>
            </div>
            <div className="flex-1 w-full min-h-0 bg-white/50 rounded-lg">
                <Chart ref={chartRef} type='bar' data={chartData} options={options} />
            </div>
        </div>
    );
};

// 3. Agent Detail Modal
const AgentDetailModal = ({ agent, onClose }: { agent: any, onClose: () => void }) => {
    const { t } = useSettings();
    const [selectedDayShipments, setSelectedDayShipments] = useState<{date: string, trackings: TrackingDetail[]} | null>(null);
    const [detailModalTab, setDetailModalTab] = useState<'Delivered' | 'Failed' | 'OFD' | 'RTO'>('Failed');
    const [searchTracking, setSearchTracking] = useState('');

    if (!agent) return null;

    const agentChartData = {
        labels: agent.history.map((h: any) => h.date && typeof h.date === 'string' ? h.date.slice(5) : ''),
        datasets: [{
            label: 'Success Rate (%)',
            data: agent.history.map((h: any) => h.successRate),
            borderColor: CHART_COLORS.AMAZON_ORANGE,
            backgroundColor: (context: ScriptableContext<'line'>) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                gradient.addColorStop(0, 'rgba(255, 153, 0, 0.4)');
                gradient.addColorStop(1, 'rgba(255, 153, 0, 0)');
                return gradient;
            },
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#fff',
            pointBorderColor: CHART_COLORS.AMAZON_ORANGE,
            pointRadius: 4
        }]
    };

    const agentOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
                    }
                }
            }
        },
        scales: {
            y: { 
                min: 0, 
                max: 105, 
                grid: { color: '#f3f4f6' },
                ticks: {
                    callback: function(value: any) {
                        return value + '%';
                    }
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
        const status = statusMap[detailModalTab];
        const filteredByStatus = selectedDayShipments.trackings.filter(t => t.status === status);
        
        if (!searchTracking) return filteredByStatus;
        
        return filteredByStatus.filter(t => 
            t.id.toLowerCase().includes(searchTracking.toLowerCase()) ||
            (t.notes && t.notes.toLowerCase().includes(searchTracking.toLowerCase()))
        );
    };

    const filterStats = {
        total: getFilteredTrackings().length,
        delivered: agent.history.reduce((sum: number, h: any) => sum + (h.delivered || 0), 0),
        failed: agent.history.reduce((sum: number, h: any) => sum + (h.total - h.delivered || 0), 0),
        rto: agent.history.reduce((sum: number, h: any) => {
            const dayTrackings = h.shipmentDetails || [];
            return sum + dayTrackings.filter((t: TrackingDetail) => t.status === 'rto').length;
        }, 0)
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-[#191E26] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                {selectedDayShipments ? (
                    // --- SHIPMENTS SUB-VIEW ---
                    <>
                        <div className="bg-[#232F3E] text-white p-5 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <i className="fa-solid fa-box-open text-[#FF9900]"></i>
                                    {t('shipmentsFor')} {selectedDayShipments.date}
                                </h3>
                                <p className="text-xs text-gray-300">{agent.name}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedDayShipments(null)} 
                                className="text-gray-300 hover:text-white flex items-center gap-1 text-sm bg-white/10 px-3 py-1 rounded-lg transition-colors"
                            >
                                <i className="fa-solid fa-arrow-left"></i> {t('back')}
                            </button>
                        </div>
                        
                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            {['Failed', 'OFD', 'RTO', 'Delivered'].map(tab => (
                                <button 
                                    key={tab} 
                                    onClick={() => setDetailModalTab(tab as any)}
                                    className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 
                                        ${detailModalTab === tab 
                                            ? 'border-[#FF9900] text-[#FF9900] bg-white dark:bg-[#191E26]' 
                                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                >
                                    {t(tab.toLowerCase())} 
                                    <span className="ml-2 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                                        {agent.history.reduce((count: number, h: any) => {
                                            const dayTrackings = h.shipmentDetails || [];
                                            const statusMap: Record<string, string> = {
                                                'Failed': 'failed',
                                                'OFD': 'ofd',
                                                'RTO': 'rto',
                                                'Delivered': 'delivered'
                                            };
                                            return count + dayTrackings.filter((t: TrackingDetail) => 
                                                t.status === statusMap[tab]
                                            ).length;
                                        }, 0)}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Search in shipments */}
                        <div className="p-4 bg-white dark:bg-[#191E26] border-b border-gray-100 dark:border-gray-700">
                            <div className="relative">
                                <i className="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                <input
                                    type="text"
                                    placeholder={t('searchTrackingNumber')}
                                    value={searchTracking}
                                    onChange={e => setSearchTracking(e.target.value)}
                                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg pl-4 pr-10 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF9900] dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-white dark:bg-[#191E26]">
                            {getFilteredTrackings().length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {getFilteredTrackings().map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#232F3E] rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                                            <div className="flex-1">
                                                <span className="text-sm font-mono font-bold text-[#232F3E] dark:text-gray-200 tracking-tight block">
                                                    {item.id}
                                                </span>
                                                {item.notes && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                                                        {item.notes}
                                                    </span>
                                                )}
                                            </div>
                                            <button 
                                                onClick={() => navigator.clipboard.writeText(item.id)}
                                                className="text-gray-300 hover:text-[#FF9900] transition-colors p-1"
                                                title={t('copy')}
                                            >
                                                <i className="fa-regular fa-copy"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="col-span-3 py-10 text-center text-gray-400">
                                    <i className="fa-solid fa-box-open text-3xl mb-3 opacity-20"></i>
                                    <p>{t('noShipmentsFound')}</p>
                                    {searchTracking && (
                                        <button 
                                            onClick={() => setSearchTracking('')}
                                            className="text-sm text-[#FF9900] hover:underline mt-2"
                                        >
                                            {t('clearSearch')}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 bg-gray-50 dark:bg-[#111315] border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {t('showing')} {getFilteredTrackings().length} {t('of')} {filterStats.total} {detailModalTab.toLowerCase()} {t('shipments')}
                            </span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => {
                                        const list = getFilteredTrackings().map(t => t.id).join('\n');
                                        if(list) {
                                            navigator.clipboard.writeText(list);
                                            // Show success message
                                            alert(t('copiedToClipboard'));
                                        }
                                    }} 
                                    className="text-xs bg-[#232F3E] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#37475A] transition-colors"
                                    disabled={getFilteredTrackings().length === 0}
                                >
                                    <i className="fa-regular fa-copy mr-1"></i> {t('copyAll')}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    // --- MAIN OVERVIEW ---
                    <>
                        <div className="bg-gradient-to-r from-[#232F3E] to-[#37475A] text-white p-6 flex justify-between items-center relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-64 h-64 bg-[#FF9900] rounded-full opacity-10 blur-[80px] pointer-events-none"></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-14 h-14 bg-white text-[#232F3E] rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg">
                                    {agent.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">{agent.name}</h2>
                                    <p className="text-gray-300 text-xs">{t('performanceHistoryReport')}</p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors relative z-10"
                                title={t('close')}
                            >
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto bg-gray-50 dark:bg-gray-800 flex-1 custom-scrollbar">
                            {/* Quick Stats */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <div className="bg-white dark:bg-[#191E26] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center hover:shadow-md transition-shadow">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{t('totalVolume')}</p>
                                    <p className="text-3xl font-black text-[#232F3E] dark:text-white">{agent.total.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500 mt-1">{agent.daysWorked} {t('days')}</p>
                                </div>
                                <div className="bg-white dark:bg-[#191E26] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center hover:shadow-md transition-shadow">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{t('delivered')}</p>
                                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{agent.delivered.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500 mt-1">{((agent.delivered/agent.total)*100).toFixed(1)}%</p>
                                </div>
                                <div className="bg-white dark:bg-[#191E26] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center hover:shadow-md transition-shadow">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{t('failedRto')}</p>
                                    <p className="text-3xl font-black text-rose-600 dark:text-rose-400">{agent.failed.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500 mt-1">{((agent.failed/agent.total)*100).toFixed(1)}%</p>
                                </div>
                                <div className="bg-white dark:bg-[#191E26] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center hover:shadow-md transition-shadow">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{t('successRate')}</p>
                                    <p className={`text-3xl font-black ${getRateClass(agent.successRate).split(' ')[0]}`}>
                                        {agent.successRate.toFixed(1)}%
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">{t('overall')}</p>
                                </div>
                            </div>
                            
                            {/* Performance Chart */}
                            <div className="bg-white dark:bg-[#191E26] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 h-[250px]" dir="ltr">
                                <Chart type='line' data={agentChartData} options={agentOptions} />
                            </div>
                            
                            {/* History Table */}
                            <div className="bg-white dark:bg-[#191E26] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                <table className="w-full text-sm text-center">
                                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase text-xs">
                                        <tr>
                                            <th className="p-4">{t('day')}</th>
                                            <th className="p-4">{t('performance')}</th>
                                            <th className="p-4">{t('delivered')}</th>
                                            <th className="p-4">{t('total')}</th>
                                            <th className="p-4">{t('trackings')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                        {agent.history.map((h: any, i: number) => (
                                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                <td className="p-3 font-mono text-gray-500 dark:text-gray-400 font-bold">
                                                    {h.date}
                                                </td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded font-bold text-xs ${getRateClass(h.successRate)}`}>
                                                        {h.successRate.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="p-3 text-emerald-600 dark:text-emerald-400 font-bold">
                                                    {h.delivered}
                                                </td>
                                                <td className="p-3 text-gray-700 dark:text-gray-300 font-mono">
                                                    {h.total}
                                                </td>
                                                <td className="p-3">
                                                    {h.shipmentDetails && h.shipmentDetails.length > 0 ? (
                                                        <button 
                                                            onClick={() => setSelectedDayShipments({
                                                                date: h.date, 
                                                                trackings: h.shipmentDetails
                                                            })} 
                                                            className="text-xs bg-[#232F3E] text-white px-2 py-1 rounded hover:bg-[#37475A] transition-colors"
                                                        >
                                                            {t('show')} ({h.shipmentDetails.length})
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
                        <div className="p-4 bg-white dark:bg-[#191E26] border-t border-gray-100 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <button 
                                onClick={() => exportAgentHistory(agent.name, agent.history)} 
                                className="w-full bg-gradient-to-r from-[#232F3E] to-[#37475A] text-white py-3.5 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                            >
                                <i className="fa-solid fa-file-export"></i> {t('exportReport')}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// 4. Quick Stats Component
const QuickStats = ({ title, value, icon, color, trend }: {
    title: string;
    value: string | number;
    icon: string;
    color: string;
    trend?: number;
}) => {
    const trendColor = trend ? (trend > 0 ? 'text-emerald-500' : 'text-rose-500') : 'text-gray-400';
    
    return (
        <div className="bg-white dark:bg-[#191E26] p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">
                        {title}
                    </p>
                    <p className="text-2xl font-black text-[#232F3E] dark:text-white">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </p>
                    {trend !== undefined && (
                        <p className={`text-xs font-bold mt-1 ${trendColor}`}>
                            {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                        </p>
                    )}
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${color}20` }}>
                    <i className={`${icon}`} style={{ color }}></i>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const HistoryDashboard: React.FC<HistoryDashboardProps> = ({ 
    history, 
    isAdmin, 
    isSuperAdmin, 
    onOpenUserManagement, 
    onOpenAliasManagement, 
    onDeleteRecord, 
    onUpdateRecord, 
    showMessage, 
    onRefresh 
}) => {
    const { t, dir, appTitle, setAppTitle } = useSettings();
    
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
    const [customStart, setCustomStart] = useState<string>(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
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
    
    // Loading State
    const [isExporting, setIsExporting] = useState(false);

    // --- LOGIC: OVERVIEW ---
    const { filteredData, stationStats, agentStats, topPerformers, lowPerformers, overviewStats } = useMemo(() => {
        if (!history || history.length === 0) return { 
            filteredData: [], 
            stationStats: [], 
            agentStats: [], 
            topPerformers: [], 
            lowPerformers: [],
            overviewStats: {
                totalVolume: 0,
                totalDelivered: 0,
                totalFailed: 0,
                overallRate: 0,
                activeAgents: 0,
                totalDays: 0
            }
        };
        
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        const filtered = history.filter(rec => {
            if (!rec.date) return false;
            const d = new Date(rec.date).getTime();
            return d >= start && d <= end;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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

        const agentsArray = Object.values(agentsMap).map(ag => ({ 
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

        // Calculate overview stats
        const totalVolume = filtered.reduce((sum, rec) => sum + (rec.stationTotal?.total || 0), 0);
        const totalDelivered = filtered.reduce((sum, rec) => sum + (rec.stationTotal?.delivered || 0), 0);
        const totalFailed = totalVolume - totalDelivered;
        const overallRate = totalVolume > 0 ? (totalDelivered / totalVolume) * 100 : 0;

        return { 
            filteredData: filtered, 
            stationStats: stationChartData, 
            agentStats: sortedAgents.filter(a => 
                a.name.toLowerCase().includes(searchTerm.toLowerCase())
            ),
            topPerformers,
            lowPerformers,
            overviewStats: {
                totalVolume,
                totalDelivered,
                totalFailed,
                overallRate,
                activeAgents: Object.keys(agentsMap).length,
                totalDays: filtered.length
            }
        };
    }, [history, startDate, endDate, searchTerm]);

    // --- LOGIC: ADVANCED REPORT ---
    const advancedData = useMemo(() => {
        let records: HistoryRecord[] = [];
        let title = '';

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
        
        // Sort for chart chronologically
        records.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const agentsMap: Record<string, any> = {};
        let grandTotal = 0, grandDelivered = 0;
        let busiestDay = { date: '', vol: 0 };
        let bestDay = { date: '', rate: 0 };
        
        // Insights
        const dayOfWeekStats: Record<string, {total: number, count: number}> = {};

        records.forEach(rec => {
            const dailyVol = rec.stationTotal?.total || 0;
            const dailyRate = rec.stationTotal?.successRate || 0;
            
            // Stats
            const dayName = new Date(rec.date).toLocaleDateString('en-US', {weekday: 'short'});
            if(!dayOfWeekStats[dayName]) dayOfWeekStats[dayName] = {total: 0, count: 0};
            dayOfWeekStats[dayName].total += dailyVol;
            dayOfWeekStats[dayName].count += 1;

            grandTotal += dailyVol;
            grandDelivered += rec.stationTotal?.delivered || 0;

            if (dailyVol > busiestDay.vol) busiestDay = { date: rec.date, vol: dailyVol };
            if (dailyRate > bestDay.rate) bestDay = { date: rec.date, rate: dailyRate };

            (rec.agents || []).forEach(a => {
                if (!agentsMap[a.daName]) agentsMap[a.daName] = { 
                    name: a.daName, 
                    total: 0, 
                    delivered: 0, 
                    failed: 0, 
                    daysWorked: 0, 
                    history: [] 
                };
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
            if(avg > maxAvg) {
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
        
        // --- PRECISION TOP 10 LOGIC ---
        const averageVolumePerAgent = fullReport.length > 0 ? grandTotal / fullReport.length : 0;
        const volumeThreshold = Math.max(5, averageVolumePerAgent * 0.2);

        const top10 = fullReport
            .filter(r => r.total >= volumeThreshold) 
            .sort((a, b) => {
                if (Math.abs(b.successRate - a.successRate) > 0.1) return b.successRate - a.successRate;
                return b.total - a.total;
            })
            .slice(0, 10);

        // --- FILTERED REPORT FOR TABLE ---
        const filteredReport = fullReport.filter(a => {
            const nameMatch = a.name.toLowerCase().includes(advSearchTerm.toLowerCase());
            const volMatch = a.total >= advMinVol;
            const rateMatch = a.successRate >= advMinRate && a.successRate <= advMaxRate;
            return nameMatch && volMatch && rateMatch;
        });

        const podium = fullReport.filter(r => r.total > 20).slice(0, 3);
        
        const overallRate = grandTotal > 0 ? (grandDelivered / grandTotal) * 100 : 0;
        const avgDailyVolume = records.length > 0 ? Math.round(grandTotal / records.length) : 0;

        // Chart Data for Advanced Tab
        const trendData = records.map(r => ({
            dateShort: r.date.slice(5),
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
                bestWeekDay,
                grandDelivered,
                grandFailed: grandTotal - grandDelivered
            },
            trendData,
            rawRecords: records
        };
    }, [history, reportType, selectedYear, selectedMonth, customStart, customEnd, advSearchTerm, advMinVol, advMinRate, advMaxRate, t]);

    // --- LOGIC: MANAGE TAB FILTERING ---
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

    // --- HANDLERS ---
    const handleExport = async () => {
        if (isExporting) return;
        
        setIsExporting(true);
        try {
            if (activeTab === 'overview') {
                await exportComplexMonthlyReport(
                    filteredData, 
                    `Report_${startDate}_to_${endDate}`, 
                    `Custom_Report_${startDate}_${endDate}`
                );
            } else if (activeTab === 'advanced') {
                await exportComplexMonthlyReport(
                    advancedData.rawRecords, 
                    advancedData.title, 
                    `Advanced_Report_${Date.now()}`
                );
            }
        } catch (error) {
            showMessage('alert', t('error'), t('exportFailed'), () => {});
        } finally {
            setIsExporting(false);
        }
    };

    const handleCleanOldData = async (months: number) => {
        showMessage('confirm', t('warning'), t('irreversibleAction'), async () => {
            try {
                const date = new Date();
                date.setMonth(date.getMonth() - months);
                const cutoff = date.toISOString().split('T')[0];
                await deleteOldRecords(cutoff);
                window.location.reload(); 
            } catch (e: any) {
                showMessage('alert', t('error'), `Error: ${e.message}`, () => {});
            }
        });
    };

    const handleBackupData = () => {
        try {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `qena_history_backup_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            
            showMessage('info', t('success'), t('backupCreated'), () => {});
        } catch (error) {
            showMessage('alert', t('error'), t('backupFailed'), () => {});
        }
    };

    const handleSaveTitle = async () => {
        if (!tempAppTitle.trim()) {
            showMessage('alert', t('error'), t('titleRequired'), () => {});
            return;
        }
        
        try {
            await saveAppTitle(tempAppTitle.trim());
            setAppTitle(tempAppTitle.trim());
            showMessage('info', t('success'), t('titleUpdated'), () => {});
        } catch (error) {
            console.error(error);
            showMessage('alert', t('error'), t('saveFailed'), () => {});
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

    // Generate available years for dropdown
    const availableYearsForReport = useMemo(() => {
        const validRecords = history.filter(h => h.date && typeof h.date === 'string');
        const years = new Set(validRecords.map(h => h.date.split('-')[0]));
        return Array.from(years).sort().reverse();
    }, [history]);

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in pb-12 font-sans" dir={dir}>
            
            {/* Modal for Edit */}
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

            {/* Modal for Agent Details */}
            {selectedAgent && (
                <AgentDetailModal 
                    agent={selectedAgent} 
                    onClose={() => setSelectedAgent(null)} 
                />
            )}

            {/* Navigation Tabs */}
            <div className="bg-white dark:bg-[#191E26] p-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-wrap gap-2 sticky top-20 z-40 justify-center md:justify-start backdrop-blur-sm bg-white/80 dark:bg-[#191E26]/80">
                <button 
                    onClick={() => setActiveTab('overview')} 
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                        activeTab === 'overview' 
                            ? 'bg-[#232F3E] text-white shadow-lg' 
                            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                >
                    <i className="fa-solid fa-chart-line"></i> {t('timeAnalysis')}
                </button>
                <button 
                    onClick={() => setActiveTab('advanced')} 
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                        activeTab === 'advanced' 
                            ? 'bg-[#FF9900] text-[#232F3E] shadow-lg' 
                            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                >
                    <i className="fa-solid fa-trophy"></i> {t('advancedReports')}
                </button>
                {/* ONLY SHOW MANAGEMENT TAB IF SUPER ADMIN */}
                {isSuperAdmin && (
                    <button 
                        onClick={() => setActiveTab('manage')} 
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                            activeTab === 'manage' 
                                ? 'bg-rose-500 text-white shadow-lg' 
                                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        <i className="fa-solid fa-sliders"></i> {t('management')}
                    </button>
                )}
            </div>

            {/* --- TAB 1: OVERVIEW --- */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Date Filters */}
                    <div className="bg-white dark:bg-[#191E26] p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                            <div className="flex gap-2 items-center overflow-x-auto w-full lg:w-auto pb-1">
                                <button 
                                    onClick={() => setQuickDate(6)} 
                                    className="whitespace-nowrap px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-[#FF9900] hover:text-white rounded-xl text-xs font-bold transition-colors"
                                >
                                    7 {t('days')}
                                </button>
                                <button 
                                    onClick={() => setQuickDate(9)} 
                                    className="whitespace-nowrap px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-[#FF9900] hover:text-white rounded-xl text-xs font-bold transition-colors"
                                >
                                    10 {t('days')}
                                </button>
                                <button 
                                    onClick={setThisMonth} 
                                    className="whitespace-nowrap px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-[#FF9900] hover:text-white rounded-xl text-xs font-bold transition-colors"
                                >
                                    {t('thisMonth')}
                                </button>
                                <button 
                                    onClick={setThisYear} 
                                    className="whitespace-nowrap px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-[#FF9900] hover:text-white rounded-xl text-xs font-bold transition-colors"
                                >
                                    {t('thisYear')}
                                </button>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-1.5 rounded-xl border border-gray-100 dark:border-gray-600 w-full lg:w-auto">
                                <input 
                                    type="date" 
                                    value={startDate} 
                                    onChange={e => setStartDate(e.target.value)} 
                                    className="bg-transparent border-none outline-none text-sm font-bold flex-1 text-center dark:text-white min-w-[120px]" 
                                />
                                <i className="fa-solid fa-arrow-left text-gray-300"></i>
                                <input 
                                    type="date" 
                                    value={endDate} 
                                    onChange={e => setEndDate(e.target.value)} 
                                    className="bg-transparent border-none outline-none text-sm font-bold flex-1 text-center dark:text-white min-w-[120px]" 
                                />
                            </div>
                            {/* REFRESH BUTTON */}
                            {onRefresh && (
                                <button 
                                    onClick={onRefresh} 
                                    className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-2"
                                >
                                    <i className="fa-solid fa-arrows-rotate"></i> {t('refreshData')}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-[#232F3E] text-white p-8 rounded-3xl shadow-lg relative overflow-hidden group hover:shadow-xl transition-shadow">
                            <div className="absolute -right-6 -top-6 w-32 h-32 bg-[#37475A] rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 relative z-10">
                                {t('totalVolume')}
                            </p>
                            <h3 className="text-4xl font-black relative z-10">
                                {overviewStats.totalVolume.toLocaleString()}
                            </h3>
                            <div className="absolute bottom-4 left-4 text-[#FF9900] opacity-20">
                                <i className="fa-solid fa-box text-6xl"></i>
                            </div>
                        </div>
                        <div className="modern-card p-8 rounded-3xl relative overflow-hidden hover:shadow-lg transition-shadow">
                            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
                                {t('successRate')}
                            </p>
                            <h3 className={`text-4xl font-black ${getRateClass(overviewStats.overallRate).split(' ')[0]}`}>
                                {overviewStats.overallRate.toFixed(1)}%
                            </h3>
                            <div className="absolute bottom-4 left-4 text-gray-200 dark:text-gray-700">
                                <i className="fa-solid fa-chart-pie text-6xl"></i>
                            </div>
                        </div>
                        <button 
                            onClick={handleExport}
                            disabled={isExporting}
                            className="modern-card bg-[#F2F4F8] dark:bg-[#191E26] hover:bg-white dark:hover:bg-[#232F3E] text-[#232F3E] dark:text-white font-bold p-6 rounded-3xl transition-all flex flex-col items-center justify-center gap-3 border border-dashed border-gray-300 dark:border-gray-700 hover:border-[#FF9900] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="w-12 h-12 bg-white dark:bg-[#2A2F3A] rounded-full flex items-center justify-center shadow-sm text-[#FF9900] text-xl">
                                {isExporting ? (
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                ) : (
                                    <i className="fa-solid fa-file-csv"></i>
                                )}
                            </div>
                            <span>
                                {isExporting ? t('exporting') : t('exportReport')}
                            </span>
                        </button>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <QuickStats 
                            title={t('totalDelivered')}
                            value={overviewStats.totalDelivered}
                            icon="fa-solid fa-check-circle"
                            color="#10B981"
                        />
                        <QuickStats 
                            title={t('totalFailed')}
                            value={overviewStats.totalFailed}
                            icon="fa-solid fa-times-circle"
                            color="#EF4444"
                        />
                        <QuickStats 
                            title={t('activeAgents')}
                            value={overviewStats.activeAgents}
                            icon="fa-solid fa-users"
                            color="#3B82F6"
                        />
                        <QuickStats 
                            title={t('totalDays')}
                            value={overviewStats.totalDays}
                            icon="fa-solid fa-calendar"
                            color="#8B5CF6"
                        />
                    </div>

                    {/* Chart */}
                    <ChartSection data={stationStats} title={t('performanceTrend')} />

                    {/* Top/Low Performers */}
                    {topPerformers.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top 10 */}
                            <div className="modern-card overflow-hidden">
                                <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-emerald-50/50 to-white dark:from-emerald-900/10 dark:to-[#191E26] flex items-center justify-between">
                                    <h3 className="font-bold text-[#232F3E] dark:text-white flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400 flex items-center justify-center">
                                            <i className="fa-solid fa-medal"></i>
                                        </div>
                                        {t('topHeroes')}
                                    </h3>
                                    <span className="text-xs text-gray-500">{t('bestPerformance')}</span>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-400 text-[10px] uppercase tracking-wider">
                                            <tr>
                                                <th className="p-3 text-right">#</th>
                                                <th className="p-3 text-right">{t('agentName')}</th>
                                                <th className="p-3 text-center">Vol</th>
                                                <th className="p-3 text-center">Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                            {topPerformers.map((agent, i) => (
                                                <tr 
                                                    key={i} 
                                                    onClick={() => setSelectedAgent(agent)} 
                                                    className="hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 cursor-pointer transition-colors"
                                                >
                                                    <td className="p-3 text-center">
                                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                                                            i < 3 
                                                                ? 'bg-[#FF9900] text-[#232F3E]' 
                                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                                                        }`}>
                                                            {i+1}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right font-bold text-[#232F3E] dark:text-gray-200">
                                                        {agent.name}
                                                    </td>
                                                    <td className="p-3 text-center font-mono text-gray-500 dark:text-gray-400">
                                                        {agent.total}
                                                    </td>
                                                    <td className="p-3 text-center font-black text-emerald-600 dark:text-emerald-400">
                                                        {agent.successRate.toFixed(1)}%
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Low Performers */}
                            <div className="modern-card overflow-hidden">
                                <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-rose-50/50 to-white dark:from-rose-900/10 dark:to-[#191E26] flex items-center justify-between">
                                    <h3 className="font-bold text-[#232F3E] dark:text-white flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-400 flex items-center justify-center">
                                            <i className="fa-solid fa-triangle-exclamation"></i>
                                        </div>
                                        {t('needsAttention')}
                                    </h3>
                                    <span className="text-xs text-gray-500">{t('requiresImprovement')}</span>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-400 text-[10px] uppercase tracking-wider">
                                            <tr>
                                                <th className="p-3 text-right">#</th>
                                                <th className="p-3 text-right">{t('agentName')}</th>
                                                <th className="p-3 text-center">{t('failed')}</th>
                                                <th className="p-3 text-center">{t('performance')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                            {lowPerformers.map((agent, i) => (
                                                <tr 
                                                    key={i} 
                                                    onClick={() => setSelectedAgent(agent)} 
                                                    className="hover:bg-rose-50/30 dark:hover:bg-rose-900/10 cursor-pointer transition-colors"
                                                >
                                                    <td className="p-3 text-center">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                                    </td>
                                                    <td className="p-3 text-right font-bold text-[#232F3E] dark:text-gray-200">
                                                        {agent.name}
                                                    </td>
                                                    <td className="p-3 text-center font-mono text-rose-600 dark:text-rose-400 font-bold">
                                                        {agent.failed}
                                                    </td>
                                                    <td className="p-3 text-center font-black text-rose-600 dark:text-rose-400">
                                                        {agent.successRate.toFixed(1)}%
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
                    <div className="modern-card overflow-hidden">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-[#191E26] flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 z-10">
                            <h3 className="font-bold text-[#232F3E] dark:text-white">
                                {t('agentName')} ({agentStats.length})
                            </h3>
                            <div className="relative w-full sm:w-auto">
                                <i className="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                <input 
                                    type="text" 
                                    placeholder={t('searchAgent')} 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)} 
                                    className="border border-gray-200 dark:border-gray-700 rounded-xl pl-4 pr-9 py-2 text-sm w-full sm:w-64 outline-none focus:ring-2 focus:ring-[#FF9900] bg-white dark:bg-[#2A2F3A] dark:text-white" 
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-center text-sm">
                                <thead className="bg-[#232F3E] text-white">
                                    <tr>
                                        <th className="p-4 text-right">{t('agentName')}</th>
                                        <th className="p-4 hidden sm:table-cell">{t('performanceBar')}</th>
                                        <th className="p-4">{t('days')}</th>
                                        <th className="p-4">{t('volume')}</th>
                                        <th className="p-4">{t('successRate')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {agentStats.map((agent: any, i: number) => (
                                        <tr 
                                            key={i} 
                                            onClick={() => setSelectedAgent(agent)} 
                                            className="hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer group transition-colors"
                                        >
                                            <td className="p-4 text-right font-bold text-[#232F3E] dark:text-gray-200">
                                                {agent.name}
                                            </td>
                                            <td className="p-4 w-1/3 hidden sm:table-cell">
                                                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex shadow-inner">
                                                    <div 
                                                        className="h-full rounded-full transition-all duration-300" 
                                                        style={{ 
                                                            width: `${Math.min(agent.successRate, 100)}%`, 
                                                            backgroundColor: getRateColor(agent.successRate) 
                                                        }}
                                                    ></div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-600 dark:text-gray-400">
                                                {agent.daysWorked}
                                            </td>
                                            <td className="p-4 font-mono text-gray-500 dark:text-gray-400">
                                                {agent.total.toLocaleString()}
                                            </td>
                                            <td className={`p-4 font-black ${getRateClass(agent.successRate).split(' ')[0]}`}>
                                                {agent.successRate.toFixed(1)}%
                                            </td>
                                        </tr>
                                    ))}
                                    {agentStats.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-gray-400">
                                                <i className="fa-solid fa-users-slash text-3xl mb-2 opacity-20"></i>
                                                <p>{t('noAgentsFound')}</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB 2: ADVANCED REPORTS --- */}
            {activeTab === 'advanced' && (
                <div className="animate-slide-up space-y-8">
                    {/* Header & Date Controls */}
                    <div className="bg-[#232F3E] text-white p-6 md:p-8 rounded-3xl shadow-xl">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <h2 className="text-2xl font-black mb-1">{advancedData.title}</h2>
                                <p className="text-gray-400 text-sm font-bold">
                                    {advancedData.stats.activeAgents} {t('activeAgents')} | {advancedData.stats.daysCount} {t('days')}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3 items-center justify-center md:justify-end">
                                <div className="bg-white/10 p-1 rounded-xl flex">
                                    <button 
                                        onClick={() => setReportType('yearly')} 
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                            reportType === 'yearly' 
                                                ? 'bg-[#FF9900] text-[#232F3E]' 
                                                : 'text-gray-300 hover:bg-white/5'
                                        }`}
                                    >
                                        {t('yearlyReport')}
                                    </button>
                                    <button 
                                        onClick={() => setReportType('monthly')} 
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                            reportType === 'monthly' 
                                                ? 'bg-[#FF9900] text-[#232F3E]' 
                                                : 'text-gray-300 hover:bg-white/5'
                                        }`}
                                    >
                                        {t('monthlyReport')}
                                    </button>
                                    <button 
                                        onClick={() => setReportType('custom')} 
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                            reportType === 'custom' 
                                                ? 'bg-[#FF9900] text-[#232F3E]' 
                                                : 'text-gray-300 hover:bg-white/5'
                                        }`}
                                    >
                                        {t('customRange')}
                                    </button>
                                </div>
                                
                                {reportType === 'yearly' && (
                                    <select 
                                        value={selectedYear} 
                                        onChange={(e) => setSelectedYear(e.target.value)} 
                                        className="bg-white/10 text-white border border-white/20 rounded-xl px-4 py-2.5 outline-none font-bold text-sm cursor-pointer hover:bg-white/20"
                                    >
                                        {availableYearsForReport.map(y => (
                                            <option key={y} value={y} className="text-black">
                                                {y}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                {reportType === 'monthly' && (
                                    <div className="flex gap-2">
                                        <select 
                                            value={selectedYear} 
                                            onChange={(e) => setSelectedYear(e.target.value)} 
                                            className="bg-white/10 text-white border border-white/20 rounded-xl px-4 py-2.5 outline-none font-bold text-sm cursor-pointer hover:bg-white/20"
                                        >
                                            {availableYearsForReport.map(y => (
                                                <option key={y} value={y} className="text-black">
                                                    {y}
                                                </option>
                                            ))}
                                        </select>
                                        <select 
                                            value={selectedMonth} 
                                            onChange={(e) => setSelectedMonth(e.target.value)} 
                                            className="bg-white/10 text-white border border-white/20 rounded-xl px-4 py-2.5 outline-none font-bold text-sm cursor-pointer hover:bg-white/20"
                                        >
                                            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                                <option key={m} value={m} className="text-black">
                                                    {new Date(0, m-1).toLocaleString('default', {month: 'long'})}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {reportType === 'custom' && (
                                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
                                        <input 
                                            type="date" 
                                            value={customStart} 
                                            onChange={e => setCustomStart(e.target.value)} 
                                            className="bg-transparent text-white outline-none font-bold text-xs min-w-[120px]" 
                                        />
                                        <span className="text-gray-400">-</span>
                                        <input 
                                            type="date" 
                                            value={customEnd} 
                                            onChange={e => setCustomEnd(e.target.value)} 
                                            className="bg-transparent text-white outline-none font-bold text-xs min-w-[120px]" 
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="modern-card p-6 border-l-4 border-l-[#232F3E]">
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                                {t('totalVolume')}
                            </p>
                            <h3 className="text-3xl font-black text-[#232F3E] dark:text-white">
                                {advancedData.stats.total.toLocaleString()}
                            </h3>
                        </div>
                        <div className="modern-card p-6 border-l-4 border-l-[#FF9900]">
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                                {t('successRate')}
                            </p>
                            <h3 className={`text-3xl font-black ${getRateClass(advancedData.stats.rate).split(' ')[0]}`}>
                                {advancedData.stats.rate.toFixed(1)}%
                            </h3>
                        </div>
                        <div className="modern-card p-6 border-l-4 border-l-emerald-500">
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                                {t('bestDay')}
                            </p>
                            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                                {advancedData.stats.bestDay.date}
                            </h3>
                            <p className="text-xs text-gray-500 font-bold">
                                {advancedData.stats.bestDay.rate.toFixed(1)}%
                            </p>
                        </div>
                        <div className="modern-card p-6 border-l-4 border-l-rose-500">
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                                {t('busiestDay')}
                            </p>
                            <h3 className="text-xl font-black text-rose-600 dark:text-rose-400">
                                {advancedData.stats.busiestDay.date}
                            </h3>
                            <p className="text-xs text-gray-500 font-bold">
                                {advancedData.stats.busiestDay.vol.toLocaleString()} {t('shipments')}
                            </p>
                        </div>
                    </div>

                    {/* Additional Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="modern-card p-4">
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                                {t('avgDailyVolume')}
                            </p>
                            <p className="text-2xl font-black text-[#232F3E] dark:text-white">
                                {advancedData.stats.avgDailyVolume}
                            </p>
                        </div>
                        <div className="modern-card p-4">
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                                {t('bestWeekDay')}
                            </p>
                            <p className="text-2xl font-black text-[#FF9900] dark:text-[#FF9900]">
                                {advancedData.stats.bestWeekDay}
                            </p>
                        </div>
                        <div className="modern-card p-4">
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                                {t('totalDelivered')}
                            </p>
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                {advancedData.stats.grandDelivered.toLocaleString()}
                            </p>
                        </div>
                        <div className="modern-card p-4">
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                                {t('totalFailed')}
                            </p>
                            <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
                                {advancedData.stats.grandFailed.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <ChartSection data={advancedData.trendData} title={t('performanceTrend')} />

                    {/* Top 3 Podium */}
                    {advancedData.podium.length > 0 && (
                        <div className="modern-card p-6">
                            <h3 className="font-bold text-[#232F3E] dark:text-white mb-4 flex items-center gap-2">
                                <i className="fa-solid fa-crown text-[#FF9900]"></i> {t('topPerformers')}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {advancedData.podium.map((agent, index) => (
                                    <div 
                                        key={index} 
                                        onClick={() => setSelectedAgent(agent)}
                                        className={`p-4 rounded-2xl text-center cursor-pointer transition-all hover:scale-[1.02] ${
                                            index === 0 
                                                ? 'bg-gradient-to-b from-yellow-100 to-yellow-50 dark:from-yellow-900/20 dark:to-transparent border-2 border-yellow-200 dark:border-yellow-700' 
                                                : index === 1
                                                    ? 'bg-gradient-to-b from-gray-100 to-gray-50 dark:from-gray-900/20 dark:to-transparent border-2 border-gray-200 dark:border-gray-700'
                                                    : 'bg-gradient-to-b from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-transparent border-2 border-amber-200 dark:border-amber-700'
                                        }`}
                                    >
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black mx-auto mb-3 ${
                                            index === 0 
                                                ? 'bg-yellow-400 text-[#232F3E]' 
                                                : index === 1
                                                    ? 'bg-gray-400 text-white'
                                                    : 'bg-amber-600 text-white'
                                        }`}>
                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                        </div>
                                        <h4 className="font-bold text-lg text-[#232F3E] dark:text-white mb-1">
                                            {agent.name}
                                        </h4>
                                        <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                                            {agent.successRate.toFixed(1)}%
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {agent.total.toLocaleString()} {t('shipments')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Advanced Table */}
                    <div className="modern-card overflow-hidden">
                        <div className="p-5 bg-gray-50 dark:bg-[#191E26] border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                            <h3 className="font-bold text-[#232F3E] dark:text-white flex items-center gap-2">
                                <i className="fa-solid fa-table"></i> {t('detailedReport')}
                            </h3>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleExport}
                                    disabled={isExporting}
                                    className="bg-[#232F3E] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#37475A] transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isExporting ? (
                                        <>
                                            <i className="fa-solid fa-spinner fa-spin mr-1"></i>
                                            {t('exporting')}
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-file-excel mr-1"></i>
                                            {t('exportFullExcel')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="p-4 bg-white dark:bg-[#191E26] border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-4">
                            <div className="flex-1 min-w-[200px]">
                                <input 
                                    type="text" 
                                    placeholder={t('filterSearch')} 
                                    value={advSearchTerm} 
                                    onChange={e => setAdvSearchTerm(e.target.value)} 
                                    className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FF9900] dark:bg-gray-700 dark:text-white dark:border-gray-600 w-full"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                    {t('minVolume')}:
                                </span>
                                <input 
                                    type="number" 
                                    value={advMinVol} 
                                    onChange={e => setAdvMinVol(Number(e.target.value))} 
                                    className="border rounded-lg px-2 py-2 text-sm w-20 outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                    min="0"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                    {t('rateRange')}:
                                </span>
                                <input 
                                    type="number" 
                                    value={advMinRate} 
                                    onChange={e => setAdvMinRate(Number(e.target.value))} 
                                    className="border rounded-lg px-2 py-2 text-sm w-16 outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                    min="0"
                                    max="100"
                                />
                                <span className="text-gray-400">-</span>
                                <input 
                                    type="number" 
                                    value={advMaxRate} 
                                    onChange={e => setAdvMaxRate(Number(e.target.value))} 
                                    className="border rounded-lg px-2 py-2 text-sm w-16 outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                    min="0"
                                    max="100"
                                />
                            </div>
                            <button 
                                onClick={() => {
                                    setAdvSearchTerm('');
                                    setAdvMinVol(0);
                                    setAdvMinRate(0);
                                    setAdvMaxRate(100);
                                }}
                                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                {t('clearFilters')}
                            </button>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-center text-sm">
                                <thead className="bg-[#232F3E] text-white sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3 text-right">{t('agentName')}</th>
                                        <th className="p-3">{t('totalVolume')}</th>
                                        <th className="p-3">{t('delivered')}</th>
                                        <th className="p-3">{t('failed')}</th>
                                        <th className="p-3">{t('days')}</th>
                                        <th className="p-3">{t('successRate')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {advancedData.report.map((agent: any, i: number) => (
                                        <tr 
                                            key={i} 
                                            onClick={() => setSelectedAgent(agent)}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                                        >
                                            <td className="p-3 text-right font-bold text-[#232F3E] dark:text-gray-200">
                                                {agent.name}
                                            </td>
                                            <td className="p-3">{agent.total.toLocaleString()}</td>
                                            <td className="p-3 text-emerald-600 dark:text-emerald-400 font-bold">
                                                {agent.delivered.toLocaleString()}
                                            </td>
                                            <td className="p-3 text-rose-600 dark:text-rose-400 font-bold">
                                                {agent.failed.toLocaleString()}
                                            </td>
                                            <td className="p-3 text-gray-500">{agent.daysWorked}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${getRateClass(agent.successRate)}`}>
                                                    {agent.successRate.toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {advancedData.report.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-gray-400">
                                                <i className="fa-solid fa-filter-circle-xmark text-3xl mb-2 opacity-20"></i>
                                                <p>{t('noResultsFound')}</p>
                                                <p className="text-sm mt-1">{t('tryAdjustingFilters')}</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB 3: MANAGEMENT --- */}
            {activeTab === 'manage' && isSuperAdmin && (
                <div className="animate-slide-up grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="modern-card p-6">
                            <h3 className="font-bold text-[#232F3E] dark:text-white mb-4 flex items-center gap-2">
                                <i className="fa-solid fa-gear text-[#FF9900]"></i> {t('settings')}
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                                        {t('appNameLabel')}
                                    </label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={tempAppTitle} 
                                            onChange={e => setTempAppTitle(e.target.value)} 
                                            className="flex-1 border rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-1 focus:ring-[#FF9900] dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                            placeholder={t('enterAppName')}
                                        />
                                        <button 
                                            onClick={handleSaveTitle}
                                            className="bg-[#232F3E] text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-[#37475A] transition-colors"
                                        >
                                            {t('save')}
                                        </button>
                                    </div>
                                </div>
                                <hr className="border-gray-100 dark:border-gray-700" />
                                <button 
                                    onClick={onOpenUserManagement} 
                                    className="w-full py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <i className="fa-solid fa-users"></i> {t('users')}
                                </button>
                                <button 
                                    onClick={onOpenAliasManagement} 
                                    className="w-full py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <i className="fa-solid fa-shuffle"></i> {t('aliases')}
                                </button>
                            </div>
                        </div>

                        <div className="modern-card p-6 border-t-4 border-t-rose-500">
                            <h3 className="font-bold text-rose-600 dark:text-rose-400 mb-4 flex items-center gap-2">
                                <i className="fa-solid fa-triangle-exclamation"></i> {t('dataMaintenance')}
                            </h3>
                            <div className="space-y-3">
                                <button 
                                    onClick={handleBackupData} 
                                    className="w-full py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2 transition-colors"
                                >
                                    <i className="fa-solid fa-download"></i> {t('downloadJson')}
                                </button>
                                <button 
                                    onClick={() => handleCleanOldData(6)} 
                                    className="w-full py-2 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-2 transition-colors"
                                >
                                    <i className="fa-solid fa-trash"></i> {t('deleteOld6m')}
                                </button>
                                <button 
                                    onClick={() => handleCleanOldData(12)} 
                                    className="w-full py-2 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-2 transition-colors"
                                >
                                    <i className="fa-solid fa-trash"></i> {t('deleteOld12m')}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                                {t('totalRecords')}: {history.length}
                            </p>
                        </div>
                    </div>

                    {/* Records List */}
                    <div className="lg:col-span-2 modern-card overflow-hidden flex flex-col h-[600px]">
                        <div className="p-4 bg-[#232F3E] text-white flex flex-wrap gap-4 items-center justify-between">
                            <h3 className="font-bold flex items-center gap-2">
                                <i className="fa-solid fa-database"></i> {t('editManual')}
                            </h3>
                            <div className="flex gap-2">
                                <select 
                                    value={manageYear} 
                                    onChange={e => setManageYear(e.target.value)} 
                                    className="bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1.5 text-xs font-bold outline-none cursor-pointer"
                                >
                                    <option value="all" className="text-black">{t('allYears')}</option>
                                    {availableYears.map(y => (
                                        <option key={y} value={y} className="text-black">{y}</option>
                                    ))}
                                </select>
                                <select 
                                    value={manageMonth} 
                                    onChange={e => setManageMonth(e.target.value)} 
                                    className="bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1.5 text-xs font-bold outline-none cursor-pointer"
                                >
                                    <option value="all" className="text-black">{t('allMonths')}</option>
                                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m} className="text-black">
                                            {new Date(0, m-1).toLocaleString('default', {month: 'short'})}
                                        </option>
                                    ))}
                                </select>
                                <input 
                                    type="text" 
                                    placeholder={t('searchDate')} 
                                    value={manageSearch} 
                                    onChange={e => setManageSearch(e.target.value)} 
                                    className="bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1.5 text-xs font-bold outline-none placeholder-gray-400 w-32"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                            <table className="w-full text-center text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase text-xs sticky top-0">
                                    <tr>
                                        <th className="p-3">{t('date')}</th>
                                        <th className="p-3">{t('total')}</th>
                                        <th className="p-3">{t('rate')}</th>
                                        <th className="p-3">{t('agents')}</th>
                                        <th className="p-3">{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {filteredManagementRecords.map((rec) => (
                                        <tr key={rec.date} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                            <td className="p-3 font-mono font-bold text-[#232F3E] dark:text-gray-200">
                                                {formatDate(rec.date)}
                                            </td>
                                            <td className="p-3">{rec.stationTotal.total}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${getRateClass(rec.stationTotal.successRate)}`}>
                                                    {rec.stationTotal.successRate.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="p-3 text-gray-500">{rec.agents?.length || 0}</td>
                                            <td className="p-3 flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => setRecordToEdit(rec)} 
                                                    className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 flex items-center justify-center transition-colors"
                                                    title={t('edit')}
                                                >
                                                    <i className="fa-solid fa-pen"></i>
                                                </button>
                                                <button 
                                                    onClick={() => showMessage('confirm', t('delete'), 
                                                        t('deleteDateConfirm').replace('{date}', rec.date), 
                                                        () => { 
                                                            if (onDeleteRecord) onDeleteRecord(rec.date); 
                                                        }
                                                    )} 
                                                    className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 flex items-center justify-center transition-colors"
                                                    title={t('delete')}
                                                >
                                                    <i className="fa-solid fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredManagementRecords.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-10 text-gray-400 italic text-center">
                                                <i className="fa-solid fa-inbox text-3xl mb-2 opacity-20"></i>
                                                <p>{t('noRecordsFound')}</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoryDashboard;