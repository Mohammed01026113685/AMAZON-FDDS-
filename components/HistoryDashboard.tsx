
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { HistoryRecord, TrackingDetail, STATIONS } from '../types';
import { exportAgentHistory, exportMonthlyReport, exportAdvancedReport, exportComplexMonthlyReport, exportFailedRtoReport } from '../services/exportService';
import { deleteOldRecords, saveGlobalSettings } from '../services/firebase';
import { Chart } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, Filler, ScriptableContext } from 'chart.js/auto';
import { useSettings } from '../contexts/SettingsContext';
import HeatMap from './HeatMap';
import BranchCompetition from './BranchCompetition';

// Register ChartJS Components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, Filler);

interface HistoryDashboardProps {
  history: HistoryRecord[];
  onDeleteRecord?: (date: string) => void;
  onUpdateRecord?: (date: string, agents: any[], stationTotal: any) => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  onOpenUserManagement?: () => void;
  onOpenAliasManagement?: () => void;
  showMessage: (type: 'alert' | 'confirm' | 'info', title: string, msg: string, onConfirm: () => void) => void;
  onRefresh?: () => void;
}

type Tab = 'overview' | 'competition' | 'advanced' | 'manage';
type ReportType = 'yearly' | 'monthly' | 'custom';

// --- HELPER FUNCTIONS ---
const getRateColor = (rate: number) => {
    if (rate >= 95) return '#007185'; // Amazon Blue
    if (rate >= 90) return '#10B981'; // Emerald
    if (rate >= 80) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
};

const getRateClass = (rate: number) => {
    if (rate >= 95) return 'text-[#007185] bg-cyan-50 dark:bg-cyan-900/20 dark:text-cyan-300';
    if (rate >= 90) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400';
    if (rate >= 80) return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400';
    return 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400';
};

// --- COMPONENTS ---

// 1. Edit Day Modal
const EditDayModal = ({ record, onClose, onSave, showMessage }: { record: HistoryRecord, onClose: () => void, onSave: (agents: any[], total: any) => void, showMessage: any }) => {
    const { t } = useSettings();
    const [agents, setAgents] = useState(() => {
        try {
            return JSON.parse(JSON.stringify(record.agents || []));
        } catch (e) {
            console.error("Failed to clone agents", e instanceof Error ? e.message : e);
            return [];
        }
    });
    const [newAgentName, setNewAgentName] = useState('');
    const [newAgentDelivered, setNewAgentDelivered] = useState(0);
    const [newAgentTotal, setNewAgentTotal] = useState(0);

    const handleAgentChange = (index: number, field: string, value: any) => {
        const updated = [...agents];
        updated[index] = { ...updated[index], [field]: value };
        if (field === 'delivered' || field === 'total') {
            updated[index].total = Number(updated[index].total);
            updated[index].delivered = Number(updated[index].delivered);
            updated[index].successRate = updated[index].total > 0 ? (updated[index].delivered / updated[index].total) * 100 : 0;
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
        setNewAgentName(''); setNewAgentDelivered(0); setNewAgentTotal(0);
    };

    const handleSave = () => {
        const stationTotal = agents.reduce((acc: any, curr: any) => ({
            delivered: acc.delivered + curr.delivered,
            total: acc.total + curr.total,
        }), { delivered: 0, total: 0 });
        stationTotal.successRate = stationTotal.total > 0 ? (stationTotal.delivered / stationTotal.total) * 100 : 0;
        onSave(agents, stationTotal);
    };

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 modal-overlay animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-[#191E26] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="bg-[#232F3E] text-white p-6 flex justify-between items-center">
                    <h3 className="font-bold text-lg">{t('editRecord')}: {record.date}</h3>
                    <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20"><i className="fa-solid fa-xmark"></i></button>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                    <form onSubmit={handleAddAgent} className="flex gap-2 items-end">
                        <input type="text" placeholder={t('agentName')} value={newAgentName} onChange={e => setNewAgentName(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1 focus:ring-2 focus:ring-[#FF9900] outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                        <input type="number" placeholder={t('delivered')} value={newAgentDelivered} onChange={e => setNewAgentDelivered(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm w-20 focus:ring-2 focus:ring-[#FF9900] outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        <input type="number" placeholder={t('total')} value={newAgentTotal} onChange={e => setNewAgentTotal(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm w-20 focus:ring-2 focus:ring-[#FF9900] outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                        <button type="submit" className="bg-[#FF9900] text-[#232F3E] px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-[#F7CA00]">{t('add')}</button>
                    </form>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white dark:bg-[#191E26]">
                    <table className="w-full text-center text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 text-gray-500 dark:text-gray-400 uppercase text-xs">
                            <tr><th>{t('agentName')}</th><th>{t('delivered')}</th><th>{t('total')}</th><th>{t('performance')}</th><th>{t('delete')}</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {agents.map((agent: any, i: number) => (
                                <tr key={i} className="dark:text-gray-300">
                                    <td className="p-2"><input type="text" value={agent.daName} onChange={(e) => handleAgentChange(i, 'daName', e.target.value)} className="border rounded px-2 py-1 w-full text-center dark:bg-gray-700 dark:border-gray-600" /></td>
                                    <td className="p-2"><input type="number" value={agent.delivered} onChange={(e) => handleAgentChange(i, 'delivered', Number(e.target.value))} className="border rounded px-2 py-1 w-20 text-center dark:bg-gray-700 dark:border-gray-600" /></td>
                                    <td className="p-2"><input type="number" value={agent.total} onChange={(e) => handleAgentChange(i, 'total', Number(e.target.value))} className="border rounded px-2 py-1 w-20 text-center dark:bg-gray-700 dark:border-gray-600" /></td>
                                    <td className="p-2 font-bold text-[#007185] dark:text-[#4DB6AC]">{agent.successRate.toFixed(1)}%</td>
                                    <td className="p-2"><button onClick={() => handleDeleteAgent(i)} className="text-rose-500 hover:text-rose-700"><i className="fa-solid fa-trash"></i></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">{t('cancel')}</button>
                    <button onClick={handleSave} className="px-8 py-2.5 bg-[#232F3E] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">{t('saveChanges')}</button>
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
                backgroundColor: '#232F3E', // Solid Amazon Dark
                hoverBackgroundColor: '#37475A',
                barPercentage: 0.6,
                yAxisID: 'y',
                order: 2
            },
            {
                type: 'line' as const,
                label: t('successRate'),
                data: data.map(d => d.rate),
                borderColor: '#FF9900', // Amazon Orange
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointBackgroundColor: '#FF9900',
                pointBorderColor: '#fff',
                pointRadius: 5,
                pointHoverRadius: 8,
                fill: false,
                tension: 0.1, // Less curvy for clearer reading
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
                    font: { family: "'Noto Sans Arabic', sans-serif", weight: 'bold' as any, size: 12 },
                    usePointStyle: true,
                    boxWidth: 8,
                    padding: 20,
                }
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#000',
                bodyColor: '#333',
                titleFont: { family: "'Noto Sans Arabic', sans-serif", size: 13, weight: 'bold' as any },
                bodyFont: { family: "'Noto Sans Arabic', sans-serif", size: 12 },
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
                             label += context.parsed.y;
                             if(context.dataset.yAxisID === 'y1') label += '%';
                         }
                         return label;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { font: { size: 11, family: "'Noto Sans Arabic', sans-serif", weight: 'bold' }, color: '#64748b' }
            },
            y: {
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                title: { display: true, text: t('volume'), color: '#232F3E', font: { weight: 'bold' } },
                grid: { color: '#f1f5f9' },
                ticks: { color: '#64748b', font: { weight: 'bold' } }
            },
            y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                min: 60,
                max: 105,
                title: { display: true, text: t('successRate'), color: '#FF9900', font: { weight: 'bold' } },
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
        <div className="modern-card p-6 h-[400px] flex flex-col">
            <h3 className="text-[#232F3E] dark:text-white font-bold mb-4 flex items-center gap-2">
                <i className="fa-solid fa-chart-simple text-[#FF9900]"></i>
                {title}
            </h3>
            <div className="flex-1 w-full min-h-0 bg-white/50 rounded-lg">
                <Chart ref={chartRef} type='bar' data={chartData} options={options} />
            </div>
        </div>
    );
};

// 3. Agent Detail Modal (Updated for Shipments)
const AgentDetailModal = ({ agent, onClose, showNumbers = true }: { agent: any, onClose: () => void, showNumbers?: boolean }) => {
    const { t } = useSettings();
    const [selectedDayShipments, setSelectedDayShipments] = useState<{date: string, trackings: TrackingDetail[]} | null>(null);
    const [detailModalTab, setDetailModalTab] = useState<'Delivered' | 'Failed' | 'OFD' | 'RTO'>('Failed');

    if (!agent) return null;

    const agentChartData = {
        labels: agent.history.map((h: any) => h.date?.slice(5) || ''),
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
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#FF9900',
            pointRadius: 4
        }]
    };

    const agentOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
        },
        scales: {
            y: { min: 0, max: 105, grid: { color: '#f3f4f6' } },
            x: { grid: { display: false } }
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
                                    Shipments for {selectedDayShipments.date}
                                </h3>
                                <p className="text-xs text-gray-300">{agent.name}</p>
                            </div>
                            <button onClick={() => setSelectedDayShipments(null)} className="text-gray-300 hover:text-white flex items-center gap-1 text-sm bg-white/10 px-3 py-1 rounded-lg">
                                <i className="fa-solid fa-arrow-left"></i> Back
                            </button>
                        </div>
                        
                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 dark:border-gray-700">
                            {['Failed', 'OFD', 'RTO', 'Delivered'].map(tab => (
                                <button 
                                    key={tab} 
                                    onClick={() => setDetailModalTab(tab as any)}
                                    className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 
                                        ${detailModalTab === tab 
                                            ? 'border-[#FF9900] text-[#FF9900] bg-gray-50 dark:bg-white/5' 
                                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-white dark:bg-[#191E26]">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {getFilteredTrackings().length > 0 ? (
                                    getFilteredTrackings().map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#232F3E] rounded-xl border border-gray-100 dark:border-gray-700">
                                            <span className="text-sm font-mono font-bold text-[#232F3E] dark:text-gray-200 tracking-tight">{item.id}</span>
                                            <button onClick={() => navigator.clipboard.writeText(item.id)} className="text-gray-300 hover:text-[#FF9900] transition-colors"><i className="fa-regular fa-copy"></i></button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-2 py-10 text-center text-gray-400">No {detailModalTab} shipments found.</div>
                                )}
                            </div>
                        </div>
                        
                        <div className="p-4 bg-gray-50 dark:bg-[#111315] border-t border-gray-100 dark:border-gray-700 text-right">
                            <button onClick={() => {
                                const list = getFilteredTrackings().map(t => t.id).join('\n');
                                if(list) navigator.clipboard.writeText(list);
                            }} className="text-xs bg-[#232F3E] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#37475A]">
                                Copy All
                            </button>
                        </div>
                    </>
                ) : (
                    // --- MAIN OVERVIEW ---
                    <>
                        <div className="bg-[#232F3E] text-white p-6 flex justify-between items-center relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-64 h-64 bg-[#FF9900] rounded-full opacity-10 blur-[80px] pointer-events-none"></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-14 h-14 bg-white text-[#232F3E] rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg">
                                    {agent.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">{agent.name}</h2>
                                    <p className="text-gray-300 text-xs">Performance History Report</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors relative z-10">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto bg-gray-50 dark:bg-gray-800 flex-1 custom-scrollbar">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <div className="bg-white dark:bg-[#191E26] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{t('totalVolume')}</p>
                                    <p className="text-3xl font-black text-[#232F3E] dark:text-white">{showNumbers ? agent.total : '***'}</p>
                                </div>
                                <div className="bg-white dark:bg-[#191E26] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{t('delivered')}</p>
                                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{showNumbers ? agent.delivered : '***'}</p>
                                </div>
                                <div className="bg-white dark:bg-[#191E26] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{t('failed')} / {t('rto')}</p>
                                    <p className="text-3xl font-black text-rose-600 dark:text-rose-400">{showNumbers ? agent.failed : '***'}</p>
                                </div>
                                <div className="bg-white dark:bg-[#191E26] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{t('successRate')}</p>
                                    <p className="text-3xl font-black text-[#007185] dark:text-[#4DB6AC]">{agent.successRate.toFixed(1)}%</p>
                                </div>
                            </div>
                            
                            <div className="bg-white dark:bg-[#191E26] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 h-[250px]" dir="ltr">
                                <Chart type='line' data={agentChartData} options={agentOptions} />
                            </div>
                            
                            <div className="bg-white dark:bg-[#191E26] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                <table className="w-full text-sm text-center">
                                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase text-xs"><tr><th className="p-4">{t('days')}</th><th className="p-4">{t('performance')}</th><th className="p-4">{t('delivered')}</th><th className="p-4">{t('total')}</th><th className="p-4">Trackings</th></tr></thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700">{agent.history.map((h: any, i: number) => (
                                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                            <td className="p-3 font-mono text-gray-500 dark:text-gray-400 font-bold">{h.date}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded font-bold text-xs ${getRateClass(h.successRate)}`}>
                                                    {h.successRate.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="p-3 text-emerald-600 dark:text-emerald-400 font-bold">{showNumbers ? h.delivered : '***'}</td>
                                            <td className="p-3 text-gray-700 dark:text-gray-300 font-mono">{showNumbers ? h.total : '***'}</td>
                                            <td className="p-3">
                                                {h.shipmentDetails && h.shipmentDetails.length > 0 ? (
                                                    <button onClick={() => setSelectedDayShipments({date: h.date, trackings: h.shipmentDetails})} className="text-xs bg-[#232F3E] text-white px-2 py-1 rounded hover:bg-[#37475A]">
                                                        Show
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-300 text-xs">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            </div>
                        </div>
                        <div className="p-4 bg-white dark:bg-[#191E26] border-t border-gray-100 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <button onClick={() => exportAgentHistory(agent.name, agent.history)} className="w-full bg-[#232F3E] text-white py-3.5 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                                <i className="fa-solid fa-file-export"></i> {t('exportReport')}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const HistoryDashboard: React.FC<HistoryDashboardProps> = ({ history, isAdmin, isSuperAdmin, onOpenUserManagement, onOpenAliasManagement, onDeleteRecord, onUpdateRecord, showMessage, onRefresh, userStationAccess = 'All' }) => {
    const { t, dir, appTitle, setAppTitle, dailyGoal, setDailyGoal, autoSortByFailed, setAutoSortByFailed } = useSettings();
    // State
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    
    // Overview State
    const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 10); return d.toISOString().split('T')[0]; });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAgent, setSelectedAgent] = useState<any>(null);
    const [filterStation, setFilterStation] = useState<string>(userStationAccess === 'All' ? 'All' : userStationAccess);

    // Advanced Report State
    const [reportType, setReportType] = useState<ReportType>('yearly');
    const [selectedYear, setSelectedYear] = useState<string>('2026');
    const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
    const [customStart, setCustomStart] = useState<string>(new Date().toISOString().split('T')[0]);
    const [customEnd, setCustomEnd] = useState<string>(new Date().toISOString().split('T')[0]);

    // Management State
    const [recordToEdit, setRecordToEdit] = useState<HistoryRecord | null>(null);
    const [manageYear, setManageYear] = useState<string>('all');
    const [manageStation, setManageStation] = useState<string>(userStationAccess === 'All' ? 'All' : userStationAccess);
    const [manageMonth, setManageMonth] = useState<string>('all');
    const [manageSearch, setManageSearch] = useState<string>('');
    const [tempAppTitle, setTempAppTitle] = useState(appTitle);
    const [tempDailyGoal, setTempDailyGoal] = useState(dailyGoal.toString());
    const [tempAutoSort, setTempAutoSort] = useState(autoSortByFailed);
    const [showNumbers, setShowNumbers] = useState(true);

    // --- LOGIC: OVERVIEW ---
    const { filteredData, stationStats, agentStats, topPerformers, lowPerformers, allFilteredTrackings } = useMemo(() => {
        if (!history || history.length === 0) return { filteredData: [], stationStats: [], agentStats: [], topPerformers: [], lowPerformers: [], allFilteredTrackings: [] };
        
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        const filtered = history.filter(rec => {
            const recStation = rec.station || 'DQN3'; // Legacy fallback
            if (filterStation !== 'All' && recStation !== filterStation) return false;

            const d = new Date(rec.date || 0).getTime();
            return d >= start && d <= end;
        }).sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

        const dateAggMap: Record<string, any> = {};
        filtered.forEach(rec => {
            const dStr = rec.date || '';
            if (!dateAggMap[dStr]) dateAggMap[dStr] = { date: dStr, dateShort: dStr.slice(5), volume: 0, delivered: 0 };
            dateAggMap[dStr].volume += rec.stationTotal?.total || 0;
            dateAggMap[dStr].delivered += rec.stationTotal?.delivered || 0;
        });

        const stationChartData = Object.values(dateAggMap).map((d: any) => ({
            date: d.date,
            dateShort: d.dateShort,
            volume: d.volume,
            rate: d.volume > 0 ? (d.delivered / d.volume) * 100 : 0
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const agentsMap: Record<string, any> = {};
        filtered.forEach(rec => {
            (rec.agents || []).forEach(a => {
                if (!agentsMap[a.daName]) agentsMap[a.daName] = { name: a.daName, total: 0, delivered: 0, failed: 0, daysWorked: 0, history: [] };
                const ag = agentsMap[a.daName];
                ag.total += a.total; ag.delivered += a.delivered; ag.failed += (a.total - a.delivered); ag.daysWorked += 1;
                ag.history.push({ 
                    date: rec.date, 
                    total: a.total, 
                    delivered: a.delivered, 
                    successRate: a.successRate,
                    shipmentDetails: a.shipmentDetails || a.trackings || []
                });
            });
        });

        const agentsArray = Object.values(agentsMap).map(ag => ({ ...ag, successRate: ag.total > 0 ? (ag.delivered / ag.total) * 100 : 0 }));
        const meaningfulAgents = agentsArray.filter(a => a.total > 5);

        const topPerformers = [...meaningfulAgents].sort((a, b) => b.successRate - a.successRate).slice(0, 10);
        const lowPerformers = [...meaningfulAgents].sort((a, b) => a.successRate - b.successRate).slice(0, 10);
        const sortedAgents = agentsArray.sort((a, b) => b.successRate - a.successRate);

        const allFilteredTrackings: TrackingDetail[] = [];
        filtered.forEach(rec => {
            (rec.agents || []).forEach(a => {
                if (a.shipmentDetails && a.shipmentDetails.length > 0) {
                    allFilteredTrackings.push(...a.shipmentDetails);
                } else if (a.total > 0) {
                    // Fallback for legacy history records from the database
                    const del = a.delivered || 0;
                    const remaining = (a.total || 0) - del;
                    
                    for (let i = 0; i < del; i++) {
                        allFilteredTrackings.push({ id: `mock-${rec.date}-${a.daName}-del-${i}`, status: 'delivered' });
                    }
                    for (let i = 0; i < remaining; i++) {
                        const seed = i % 3;
                        let status = 'failed';
                        if (seed === 1) status = 'rto';
                        else if (seed === 2) status = 'ofd';
                        
                        allFilteredTrackings.push({ id: `mock-${rec.date}-${a.daName}-rem-${i}`, status: status as any });
                    }
                }
            });
        });

        return { 
            filteredData: filtered, 
            stationStats: stationChartData, 
            agentStats: sortedAgents.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase())),
            topPerformers,
            lowPerformers,
            allFilteredTrackings
        };
    }, [history, startDate, endDate, searchTerm, filterStation]);

    // --- LOGIC: ADVANCED REPORT (Formerly Yearly) ---
    const advancedData = useMemo(() => {
        let records: HistoryRecord[] = [];
        let title = '';
        
        // Base station filter
        const stationFiltered = history.filter(h => {
            const recStation = h.station || 'DQN3';
            if (filterStation !== 'All' && recStation !== filterStation) return false;
            return true;
        });

        if (reportType === 'yearly') {
            records = stationFiltered.filter(h => h.date?.startsWith(selectedYear));
            title = `${t('yearlyReport')} - ${selectedYear}`;
        } else if (reportType === 'monthly') {
            const m = selectedMonth.padStart(2, '0');
            records = stationFiltered.filter(h => h.date?.startsWith(`${selectedYear}-${m}`));
            title = `${t('monthlyReport')} - ${selectedMonth}/${selectedYear}`;
        } else if (reportType === 'custom') {
            const start = new Date(customStart).getTime();
            const end = new Date(customEnd).getTime();
            records = stationFiltered.filter(h => {
                const d = new Date(h.date || 0).getTime();
                return d >= start && d <= end;
            });
            title = `${t('customRange')} (${customStart} - ${customEnd})`;
        }

        const agentsMap: Record<string, any> = {};
        let grandTotal = 0, grandDelivered = 0;
        let busiestDay = { date: '', vol: 0 };
        let bestDay = { date: '', rate: 0 };

        records.forEach(rec => {
            const dailyVol = rec.stationTotal?.total || 0;
            const dailyRate = rec.stationTotal?.successRate || 0;
            
            grandTotal += dailyVol;
            grandDelivered += rec.stationTotal?.delivered || 0;

            if (dailyVol > busiestDay.vol) busiestDay = { date: rec.date, vol: dailyVol };
            if (dailyRate > bestDay.rate) bestDay = { date: rec.date, rate: dailyRate };

            (rec.agents || []).forEach(a => {
                if (!agentsMap[a.daName]) agentsMap[a.daName] = { name: a.daName, total: 0, delivered: 0, failed: 0, daysWorked: 0, history: [] };
                const ag = agentsMap[a.daName];
                ag.total += a.total; 
                ag.delivered += a.delivered; 
                ag.failed += (a.total - a.delivered); // Calculate failed
                ag.daysWorked += 1;
                // Add to history so detail modal works
                ag.history.push({ 
                    date: rec.date, 
                    total: a.total, 
                    delivered: a.delivered, 
                    successRate: a.successRate,
                    shipmentDetails: a.shipmentDetails || []
                });
            });
        });

        const report = Object.values(agentsMap).map(a => ({ ...a, successRate: a.total > 0 ? (a.delivered / a.total) * 100 : 0 })).sort((a, b) => b.successRate - a.successRate);
        const podium = report.filter(r => r.total > 20).slice(0, 3);
        
        const overallRate = grandTotal > 0 ? (grandDelivered / grandTotal) * 100 : 0;
        const avgDailyVolume = records.length > 0 ? Math.round(grandTotal / records.length) : 0;

        return { 
            report, 
            podium, 
            title,
            stats: { 
                total: grandTotal, 
                rate: overallRate,
                busiestDay,
                bestDay,
                daysCount: records.length,
                activeAgents: Object.keys(agentsMap).length,
                avgDailyVolume
            },
            rawRecords: records // Pass filtered records for new export
        };
    }, [history, reportType, selectedYear, selectedMonth, customStart, customEnd, t, filterStation]);

    // --- LOGIC: MANAGE TAB FILTERING ---
    const availableYears = useMemo(() => {
        const years = new Set(history.map(h => h.date?.split('-')[0] || ''));
        return Array.from(years).filter(Boolean).sort().reverse();
    }, [history]);

    const filteredManagementRecords = useMemo(() => {
        return history.filter(rec => {
            const [y, m] = (rec.date || '').split('-'); // YYYY-MM-DD
            const recStation = rec.station || 'DQN3';
            
            const matchYear = manageYear === 'all' || y === manageYear;
            const matchMonth = manageMonth === 'all' || parseInt(m).toString() === manageMonth;
            const matchSearch = !manageSearch || (rec.date || '').includes(manageSearch);
            const matchStation = manageStation === 'All' || recStation === manageStation;

            return matchYear && matchMonth && matchSearch && matchStation;
        });
    }, [history, manageYear, manageMonth, manageSearch, manageStation]);


    // --- BULK ACTIONS ---
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
        try {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href",     dataStr);
            downloadAnchorNode.setAttribute("download", "qena_history_backup.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        } catch (e) {
            console.error("Backup failed", e instanceof Error ? e.message : e);
            alert("Failed to create backup.");
        }
    };

    const handleSaveSettings = async () => {
        try {
            const parsedGoal = parseInt(tempDailyGoal, 10) || 100;
            await saveGlobalSettings({ appTitle: tempAppTitle, dailyGoal: parsedGoal, autoSortByFailed: tempAutoSort });
            setAppTitle(tempAppTitle);
            setDailyGoal(parsedGoal);
            setAutoSortByFailed(tempAutoSort);
            showMessage('info', 'Success', 'Settings updated successfully!', () => {});
        } catch (error) {
            console.error(error instanceof Error ? error.message : error);
            showMessage('alert', 'Error', 'Failed to update settings', () => {});
        }
    };

    // --- HANDLERS ---
    const setQuickDate = (days: number) => {
        const end = new Date(); const start = new Date(); start.setDate(end.getDate() - days);
        setEndDate(end.toISOString().split('T')[0]); setStartDate(start.toISOString().split('T')[0]);
    };
    const setThisMonth = () => {
        const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), 1);
        setEndDate(now.toISOString().split('T')[0]); setStartDate(start.toISOString().split('T')[0]);
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in pb-12 font-sans" dir={dir}>
            
            {/* Modal for Edit */}
            {recordToEdit && <EditDayModal record={recordToEdit} showMessage={showMessage} onClose={() => setRecordToEdit(null)} onSave={async (a, t) => { if (onUpdateRecord) await onUpdateRecord(recordToEdit.station ? `${recordToEdit.station}_${recordToEdit.date}` : recordToEdit.date, a, t); setRecordToEdit(null); }} />}

            {/* Navigation Tabs */}
                        <div className="bg-white dark:bg-[#191E26] p-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-wrap gap-2 sticky top-20 z-40 justify-center md:justify-start items-center">
                <button onClick={() => setActiveTab('overview')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'bg-[#232F3E] text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                    <i className="fa-solid fa-chart-line"></i> {t('timeAnalysis')}
                </button>
                <button onClick={() => setActiveTab('competition')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'competition' ? 'bg-[#007185] text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                    <i className="fa-solid fa-trophy"></i>
                    منافسة الفروع
                </button>

                <button onClick={() => setActiveTab('advanced')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'advanced' ? 'bg-[#FF9900] text-[#232F3E] shadow-lg' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                    <i className="fa-solid fa-trophy"></i> {t('advancedReports')}
                </button>
                {isSuperAdmin && (
                    <button onClick={() => setActiveTab('manage')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'manage' ? 'bg-rose-500 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                        <i className="fa-solid fa-sliders"></i> {t('management')}
                    </button>
                )}
                <div className="flex-1"></div>
                <div className="flex items-center gap-2">
                    
                </div>
            </div>

            {/* --- TAB 1: OVERVIEW --- */}
            
            {activeTab === 'competition' && (
                <BranchCompetition history={history} />
            )}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Date Filters */}
                    <div className="bg-white dark:bg-[#191E26] p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                            <div className="flex gap-2 items-center overflow-x-auto w-full lg:w-auto pb-1">
                                <button onClick={() => setQuickDate(6)} className="whitespace-nowrap px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-[#FF9900] hover:text-white rounded-xl text-xs font-bold transition-colors">7 {t('days')}</button>
                                <button onClick={() => setQuickDate(9)} className="whitespace-nowrap px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-[#FF9900] hover:text-white rounded-xl text-xs font-bold transition-colors">10 {t('days')}</button>
                                <button onClick={setThisMonth} className="whitespace-nowrap px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-[#FF9900] hover:text-white rounded-xl text-xs font-bold transition-colors">Month</button>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-1.5 rounded-xl border border-gray-100 dark:border-gray-600 w-full lg:w-auto">
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none outline-none text-sm font-bold flex-1 text-center dark:text-white" />
                                <i className="fa-solid fa-arrow-left text-gray-300"></i>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none outline-none text-sm font-bold flex-1 text-center dark:text-white" />
                            </div>
                            
                            {userStationAccess === 'All' ? (
                                <select 
                                        value={filterStation} 
                                        onChange={(e) => setFilterStation(e.target.value)}
                                        className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-xl text-sm font-bold outline-none border border-blue-100 dark:border-blue-800"
                                    >
                                        <option value="All">كل المحطات (All Stations)</option>
                                        {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            ) : (
                                <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-xl text-sm font-bold border border-blue-100 dark:border-blue-800">
                                    المحطة: {filterStation}
                                </div>
                            )}

                            <button onClick={() => setShowNumbers(!showNumbers)} className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                                <i className={`fa-solid ${showNumbers ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                            </button>
                            {/* REFRESH BUTTON */}
                            {onRefresh && (
                                <button onClick={onRefresh} className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-2">
                                    <i className="fa-solid fa-arrows-rotate"></i> Refresh Data
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-[#232F3E] text-white p-8 rounded-3xl shadow-lg relative overflow-hidden group">
                            <div className="absolute -right-6 -top-6 w-32 h-32 bg-[#37475A] rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 relative z-10">{t('totalVolume')}</p>
                            <h3 className="text-4xl font-black relative z-10">{stationStats.reduce((a, c) => a + c.volume, 0).toLocaleString()}</h3>
                            <div className="absolute bottom-4 left-4 text-[#FF9900] opacity-20"><i className="fa-solid fa-box text-6xl"></i></div>
                        </div>
                        <div className="modern-card p-8 rounded-3xl relative overflow-hidden">
                            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{t('successRate')}</p>
                            <h3 className={`text-4xl font-black ${getRateClass(stationStats.length ? stationStats.reduce((a, c) => a + (c.volume * c.rate), 0) / stationStats.reduce((a, c) => a + c.volume, 0) : 0).split(' ')[0]}`}>
                                {stationStats.length ? (stationStats.reduce((a, c) => a + (c.volume * c.rate), 0) / stationStats.reduce((a, c) => a + c.volume, 0)).toFixed(1) : 0}%
                            </h3>
                            <div className="absolute bottom-4 left-4 text-gray-200 dark:text-gray-700"><i className="fa-solid fa-chart-pie text-6xl"></i></div>
                        </div>
                        <button onClick={() => exportMonthlyReport(agentStats, `Custom_${startDate}_to_${endDate}`)} className="modern-card bg-[#F2F4F8] dark:bg-[#191E26] hover:bg-white dark:hover:bg-[#232F3E] text-[#232F3E] dark:text-white font-bold p-6 rounded-3xl transition-all flex flex-col items-center justify-center gap-3 border border-dashed border-gray-300 dark:border-gray-700 hover:border-[#FF9900]">
                            <div className="w-12 h-12 bg-white dark:bg-[#2A2F3A] rounded-full flex items-center justify-center shadow-sm text-[#FF9900] text-xl">
                                <i className="fa-solid fa-file-csv"></i>
                            </div>
                            <span>{t('exportReport')}</span>
                        </button>
                    </div>

                    {/* HeatMap */}
                    <HeatMap trackings={allFilteredTrackings} />

                    {/* Chart */}
                    <ChartSection data={stationStats} title={t('performanceTrend')} />

                    {/* --- NEW SECTIONS: Top 10 & Worst 10 --- */}
                    {topPerformers.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top 10 */}
                            <div className="modern-card overflow-hidden">
                                <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-emerald-50/50 to-white dark:from-emerald-900/10 dark:to-[#191E26] flex items-center justify-between">
                                    <h3 className="font-bold text-[#232F3E] dark:text-white flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400 flex items-center justify-center"><i className="fa-solid fa-medal"></i></div>
                                        {t('topHeroes')}
                                    </h3>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-400 text-[10px] uppercase tracking-wider">
                                            <tr><th className="p-3 text-right">{t('agentName')}</th><th className="p-3 text-center">Vol</th><th className="p-3 text-center">Rate</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                            {topPerformers.map((agent, i) => (
                                                <tr key={i} onClick={() => setSelectedAgent(agent)} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 cursor-pointer transition-colors">
                                                    <td className="p-3 font-bold text-[#232F3E] dark:text-gray-200 flex items-center gap-3">
                                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${i < 3 ? 'bg-[#FF9900] text-[#232F3E]' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>{i+1}</span>
                                                        {agent.name}
                                                    </td>
                                                    <td className="p-3 text-center font-mono text-gray-500 dark:text-gray-400">{showNumbers ? agent.total : '***'}</td>
                                                    <td className="p-3 text-center font-black text-emerald-600 dark:text-emerald-400">{agent.successRate.toFixed(1)}%</td>
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
                                        <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-400 flex items-center justify-center"><i className="fa-solid fa-triangle-exclamation"></i></div>
                                        {t('needsAttention')}
                                    </h3>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-400 text-[10px] uppercase tracking-wider">
                                            <tr><th className="p-3 text-right">{t('agentName')}</th><th className="p-3 text-center">{t('failed')}</th><th className="p-3 text-center">{t('performance')}</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                            {lowPerformers.map((agent, i) => (
                                                <tr key={i} onClick={() => setSelectedAgent(agent)} className="hover:bg-rose-50/30 dark:hover:bg-rose-900/10 cursor-pointer transition-colors">
                                                    <td className="p-3 font-bold text-[#232F3E] dark:text-gray-200 flex items-center gap-3">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                                        {agent.name}
                                                    </td>
                                                    <td className="p-3 text-center font-mono text-rose-600 dark:text-rose-400 font-bold">{showNumbers ? agent.failed : '***'}</td>
                                                    <td className="p-3 text-center font-black text-rose-600 dark:text-rose-400">{agent.successRate.toFixed(1)}%</td>
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
                            <h3 className="font-bold text-[#232F3E] dark:text-white">{t('agentName')} ({agentStats.length})</h3>
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
                                <thead className="bg-[#232F3E] text-white"><tr><th className="p-4 text-right">{t('agentName')}</th><th className="p-4 hidden sm:table-cell">Bar</th><th className="p-4">{t('days')}</th><th className="p-4">Vol</th><th className="p-4">Rate</th></tr></thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {agentStats.map((agent: any, i: number) => (
                                        <tr key={i} onClick={() => setSelectedAgent(agent)} className="hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer group transition-colors">
                                            <td className="p-4 text-right font-bold text-[#232F3E] dark:text-gray-200">{agent.name}</td>
                                            <td className="p-4 w-1/3 hidden sm:table-cell">
                                                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex shadow-inner">
                                                    <div className="h-full rounded-full" style={{ width: `${agent.successRate}%`, backgroundColor: getRateColor(agent.successRate) }}></div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-600 dark:text-gray-400">{agent.daysWorked}</td>
                                            <td className="p-4 font-mono text-gray-500 dark:text-gray-400">{showNumbers ? agent.total : '***'}</td>
                                            <td className={`p-4 font-black ${getRateClass(agent.successRate).split(' ')[0]}`}>{agent.successRate.toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB 2: ADVANCED REPORTS (Formerly Yearly) --- */}
            {activeTab === 'advanced' && (
                <div className="animate-slide-up space-y-8">
                    {/* Header & Filters */}
                    <div className="bg-[#232F3E] text-white p-6 md:p-8 rounded-3xl shadow-xl">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <h2 className="text-2xl font-black mb-1 flex items-center gap-2">
                                    <i className="fa-solid fa-magnifying-glass-chart text-[#FF9900]"></i>
                                    {t('advancedReports')}
                                </h2>
                                <p className="text-gray-400 text-sm">Extract and analyze data for any period</p>
                            </div>

                            <div className="flex flex-wrap gap-3 items-center bg-white/10 p-2 rounded-2xl">
                               {userStationAccess === 'All' ? (
                                    <select 
                                        value={filterStation} 
                                        onChange={(e) => setFilterStation(e.target.value)}
                                        className="bg-[#232F3E] text-white border border-gray-600 rounded-xl px-4 py-2 font-bold outline-none focus:border-[#FF9900]"
                                    >
                                        <option value="All">كل المحطات</option>
                                        {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                ) : (
                                    <div className="bg-[#232F3E] text-white border border-gray-600 rounded-xl px-4 py-2 font-bold">
                                        المحطة: {filterStation}
                                    </div>
                                )}

                                {/* Type Selector */}
                                <select 
                                    value={reportType} 
                                    onChange={(e) => setReportType(e.target.value as ReportType)}
                                    className="bg-[#232F3E] text-white border border-gray-600 rounded-xl px-4 py-2 font-bold outline-none focus:border-[#FF9900]"
                                >
                                    <option value="yearly">{t('yearlyReport')}</option>
                                    <option value="monthly">{t('monthlyReport')}</option>
                                    <option value="custom">{t('customRange')}</option>
                                </select>

                                {/* Conditionals */}
                                {(reportType === 'yearly' || reportType === 'monthly') && (
                                    <select 
                                        value={selectedYear} 
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        className="bg-[#232F3E] text-white border border-gray-600 rounded-xl px-4 py-2 font-bold outline-none focus:border-[#FF9900]"
                                    >
                                        <option value="2026">2026</option>
                                        <option value="2025">2025</option>
                                        <option value="2024">2024</option>
                                    </select>
                                )}

                                {reportType === 'monthly' && (
                                    <select 
                                        value={selectedMonth} 
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="bg-[#232F3E] text-white border border-gray-600 rounded-xl px-4 py-2 font-bold outline-none focus:border-[#FF9900]"
                                    >
                                        {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                            <option key={m} value={m.toString()}>{m} - {new Date(0, m-1).toLocaleString('default', {month: 'short'})}</option>
                                        ))}
                                    </select>
                                )}

                                {reportType === 'custom' && (
                                    <div className="flex gap-2 items-center">
                                        <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-[#232F3E] text-white border border-gray-600 rounded-xl px-3 py-2 text-sm font-bold outline-none" />
                                        <span className="text-gray-400"><i className="fa-solid fa-arrow-left"></i></span>
                                        <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-[#232F3E] text-white border border-gray-600 rounded-xl px-3 py-2 text-sm font-bold outline-none" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid (Advanced KPIs) */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="modern-card p-6 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-[#191E26]">
                            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">{t('totalVolume')}</p>
                            <h3 className="text-3xl font-black text-[#232F3E] dark:text-white">{advancedData.stats.total.toLocaleString()}</h3>
                            <div className="text-xs text-gray-400 mt-2 font-mono">{t('avgVolume')}: {advancedData.stats.avgDailyVolume}/day</div>
                        </div>
                        <div className="modern-card p-6 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-[#191E26]">
                            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">{t('successRate')}</p>
                            <h3 className={`text-3xl font-black ${getRateClass(advancedData.stats.rate).split(' ')[0]}`}>{advancedData.stats.rate.toFixed(1)}%</h3>
                            <div className="text-xs text-gray-400 mt-2">Overall Performance</div>
                        </div>
                        <div className="modern-card p-6 bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-[#191E26] relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-2 opacity-10"><i className="fa-solid fa-calendar-day text-4xl text-amber-500"></i></div>
                            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">{t('busiestDay')}</p>
                            <h3 className="text-xl font-black text-[#232F3E] dark:text-white">{advancedData.stats.busiestDay.date || 'N/A'}</h3>
                            <div className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-1">{advancedData.stats.busiestDay.vol} Shipments</div>
                        </div>
                        <div className="modern-card p-6 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-[#191E26] relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10"><i className="fa-solid fa-star text-4xl text-purple-500"></i></div>
                            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">{t('bestDay')}</p>
                            <h3 className="text-xl font-black text-[#232F3E] dark:text-white">{advancedData.stats.bestDay.date || 'N/A'}</h3>
                            <div className="text-xs text-purple-600 dark:text-purple-400 font-bold mt-1">{advancedData.stats.bestDay.rate.toFixed(1)}% Success</div>
                        </div>
                    </div>

                    {/* Podium (FULL WIDTH NAMES) */}
                    {advancedData.podium.length >= 3 && (
                        <div className="flex justify-center items-end gap-2 md:gap-4 h-[300px] py-6">
                            {/* 2nd Place */}
                            <div className="flex flex-col items-center group w-1/3 max-w-[30%]">
                                <div className="font-bold text-[#232F3E] dark:text-gray-200 mb-2 text-center text-sm md:text-base leading-tight whitespace-normal">{advancedData.podium[1].name}</div>
                                <div className="w-full bg-gradient-to-t from-gray-300 to-gray-200 dark:from-gray-700 dark:to-gray-600 h-[120px] rounded-t-2xl flex items-end justify-center pb-4 shadow-lg group-hover:h-[130px] transition-all relative overflow-hidden">
                                    <span className="text-4xl font-black text-white/60 relative z-10">2</span>
                                </div>
                            </div>
                            
                            {/* 1st Place */}
                            <div className="flex flex-col items-center z-10 group w-1/3 max-w-[35%]">
                                <i className="fa-solid fa-crown text-[#FFD814] text-4xl mb-4 animate-bounce"></i>
                                <div className="font-bold text-[#232F3E] dark:text-gray-200 mb-2 text-center text-sm md:text-base leading-tight whitespace-normal">{advancedData.podium[0].name}</div>
                                <div className="w-full bg-gradient-to-t from-[#FF9900] to-[#FFD814] h-[180px] rounded-t-2xl flex items-end justify-center pb-6 shadow-2xl group-hover:h-[190px] transition-all relative overflow-hidden">
                                    <span className="text-6xl font-black text-white/60 relative z-10">1</span>
                                </div>
                            </div>
                            
                            {/* 3rd Place */}
                            <div className="flex flex-col items-center group w-1/3 max-w-[30%]">
                                <div className="font-bold text-[#232F3E] dark:text-gray-200 mb-2 text-center text-sm md:text-base leading-tight whitespace-normal">{advancedData.podium[2].name}</div>
                                <div className="w-full bg-gradient-to-t from-[#CD7F32] to-[#e6a26b] h-[90px] rounded-t-2xl flex items-end justify-center pb-4 shadow-lg group-hover:h-[100px] transition-all relative overflow-hidden">
                                    <span className="text-4xl font-black text-white/60 relative z-10">3</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Report Table */}
                    <div className="modern-card overflow-hidden">
                        <div className="p-5 bg-gray-50 dark:bg-[#232F3E] border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0">
                            <h3 className="font-bold text-[#232F3E] dark:text-white">{advancedData.title}</h3>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => exportFailedRtoReport(advancedData.rawRecords, advancedData.title, `${reportType}_failed_rto_report`)} 
                                    className="bg-rose-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-rose-700 transition-all flex items-center gap-2"
                                >
                                    <i className="fa-solid fa-triangle-exclamation"></i> Failed & RTO
                                </button>
                                <button 
                                    onClick={() => exportComplexMonthlyReport(advancedData.rawRecords, advancedData.title, `${reportType}_complex_report`)} 
                                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2"
                                >
                                    <i className="fa-solid fa-table-cells"></i> Detailed Excel
                                </button>
                                <button 
                                    onClick={() => exportAdvancedReport(advancedData.report, advancedData.title, `${reportType}_report`)} 
                                    className="bg-[#232F3E] dark:bg-black text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-[#37475A] transition-all flex items-center gap-2"
                                >
                                    <i className="fa-solid fa-file-export"></i> {t('exportReport')}
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                            <table className="w-full text-center text-sm">
                                <thead className="bg-[#232F3E] text-white sticky top-0 z-10"><tr><th className="p-4">{t('rank')}</th><th className="p-4">{t('agentName')}</th><th className="p-4">{t('days')}</th><th className="p-4">Vol</th><th className="p-4">Rate</th></tr></thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {advancedData.report.length > 0 ? (
                                        advancedData.report.map((a, i) => (
                                            <tr 
                                                key={i} 
                                                onClick={() => setSelectedAgent(a)} 
                                                className="hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors cursor-pointer group"
                                            >
                                                <td className="p-4 font-black text-[#FF9900] text-lg">#{i + 1}</td>
                                                <td className="p-4 font-bold text-[#232F3E] dark:text-gray-200">{a.name}</td>
                                                <td className="p-4 text-gray-600 dark:text-gray-400">{a.daysWorked}</td>
                                                <td className="p-4 font-mono text-gray-500 dark:text-gray-400">{showNumbers ? a.total : '***'}</td>
                                                <td className={`p-4 font-black ${getRateClass(a.successRate)}`}>{a.successRate.toFixed(1)}%</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={5} className="p-8 text-gray-400">{t('noData')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB 3: MANAGE (Enhanced) --- */}
            {activeTab === 'manage' && isSuperAdmin && (
                <div className="space-y-8 animate-fade-in">
                    
                    {/* General Settings (App Name) */}
                    <div className="modern-card p-8 border-l-4 border-[#FF9900]">
                        <h3 className="font-bold text-[#232F3E] dark:text-white mb-4 flex items-center gap-2">
                            <i className="fa-solid fa-sliders text-[#FF9900]"></i> {t('settings')}
                        </h3>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">{t('appNameLabel')}</label>
                                <input 
                                    type="text" 
                                    value={tempAppTitle} 
                                    onChange={e => setTempAppTitle(e.target.value)} 
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 font-bold text-[#232F3E] dark:text-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-[#FF9900] transition-all"
                                />
                            </div>
                            <div className="w-full md:w-1/3">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">الهدف اليومي (شحنة)</label>
                                <input 
                                    type="number" 
                                    value={tempDailyGoal} 
                                    onChange={e => setTempDailyGoal(e.target.value)} 
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 font-bold text-[#232F3E] dark:text-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-[#FF9900] transition-all"
                                    placeholder="مثال: 120"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={tempAutoSort} onChange={e => setTempAutoSort(e.target.checked)} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#FF9900]"></div>
                                </label>
                                <div>
                                    <h4 className="font-bold text-[#232F3E] dark:text-white">الترتيب التلقائي حسب المرتجعات (Failed)</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">يتم ترتيب الجدول تنازلياً للمندوبين ذوي المرتجعات الأعلى فور معالجة البيانات.</p>
                                </div>
                            </div>
                            <button onClick={handleSaveSettings} className="bg-[#232F3E] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#37475A] transition-all shadow-md">
                                حفظ الإعدادات
                            </button>
                        </div>
                    </div>

                    {/* System Health Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="modern-card p-6 border-l-4 border-[#FF9900]">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{t('totalRecords')}</p>
                                    <h3 className="text-3xl font-black text-[#232F3E] dark:text-white">{history.length}</h3>
                                </div>
                                <div className="bg-orange-50 text-[#FF9900] w-10 h-10 rounded-full flex items-center justify-center text-lg"><i className="fa-solid fa-database"></i></div>
                            </div>
                            <div className="mt-4 text-xs text-gray-500 font-medium">Daily archives</div>
                        </div>

                        <div className="modern-card p-6 border-l-4 border-[#007185]">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{t('firstRecord')}</p>
                                    <h3 className="text-lg font-black text-[#232F3E] dark:text-white">{history.length > 0 ? history[history.length-1].date : 'N/A'}</h3>
                                </div>
                                <div className="bg-cyan-50 text-[#007185] w-10 h-10 rounded-full flex items-center justify-center text-lg"><i className="fa-solid fa-calendar-alt"></i></div>
                            </div>
                             <div className="mt-4 text-xs text-gray-500 font-medium">Data start date</div>
                        </div>

                        <div className="modern-card p-6 border-l-4 border-[#232F3E]">
                             <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{t('backup')}</p>
                                    <button onClick={handleBackupData} className="text-xs bg-[#232F3E] text-white px-3 py-1.5 rounded hover:bg-[#37475A] transition-colors mt-1">{t('downloadJson')}</button>
                                </div>
                                <div className="bg-gray-100 text-[#232F3E] w-10 h-10 rounded-full flex items-center justify-center text-lg"><i className="fa-solid fa-download"></i></div>
                            </div>
                             <div className="mt-4 text-xs text-gray-500 font-medium">Full external backup</div>
                        </div>
                    </div>

                    {/* Management Tools */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {isSuperAdmin && (
                            <div onClick={onOpenUserManagement} className="modern-card p-8 cursor-pointer flex items-center gap-6 group hover:border-[#FF9900] transition-colors relative overflow-hidden">
                                <div className="absolute right-0 top-0 p-3 opacity-5"><i className="fa-solid fa-users text-8xl"></i></div>
                                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center text-3xl group-hover:bg-[#232F3E] group-hover:text-white transition-all shadow-sm z-10"><i className="fa-solid fa-users-gear"></i></div>
                                <div className="z-10"><h3 className="text-xl font-bold mb-1 text-[#232F3E] dark:text-white">{t('users')}</h3><p className="text-gray-400 text-sm">Add/Remove Admins</p></div>
                            </div>
                        )}
                        <div onClick={onOpenAliasManagement} className="modern-card p-8 cursor-pointer flex items-center gap-6 group hover:border-[#FF9900] transition-colors relative overflow-hidden">
                            <div className="absolute right-0 top-0 p-3 opacity-5"><i className="fa-solid fa-tags text-8xl"></i></div>
                            <div className="w-16 h-16 bg-orange-50 dark:bg-orange-900/20 text-[#FF9900] rounded-3xl flex items-center justify-center text-3xl group-hover:bg-[#232F3E] group-hover:text-white transition-all shadow-sm z-10"><i className="fa-solid fa-shuffle"></i></div>
                            <div className="z-10"><h3 className="text-xl font-bold mb-1 text-[#232F3E] dark:text-white">{t('aliases')}</h3><p className="text-gray-400 text-sm">{t('aliasDesc')}</p></div>
                        </div>
                    </div>

                    {/* Data Maintenance */}
                    <div className="modern-card p-8 border border-rose-100 dark:border-rose-900/30">
                        <h3 className="font-bold text-[#232F3E] dark:text-white mb-4 flex items-center gap-2"><i className="fa-solid fa-trash-arrow-up text-rose-500"></i> {t('dataMaintenance')}</h3>
                        <div className="flex flex-wrap gap-4">
                             <button onClick={() => handleCleanOldData(6)} className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-rose-600 hover:border-rose-200 rounded-lg text-sm font-bold transition-all shadow-sm">
                                {t('deleteOld6m')}
                             </button>
                             <button onClick={() => handleCleanOldData(12)} className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-rose-600 hover:border-rose-200 rounded-lg text-sm font-bold transition-all shadow-sm">
                                {t('deleteOld1y')}
                             </button>
                        </div>
                         <p className="text-xs text-gray-400 mt-2">* {t('irreversibleAction')}</p>
                    </div>
                    
                    {/* History Edit Table */}
                    <div className="modern-card overflow-hidden">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-[#191E26] flex flex-col md:flex-row justify-between items-center gap-4">
                            <h3 className="font-bold text-[#232F3E] dark:text-white">{t('editManual')}</h3>
                            
                            {/* Management Filter Bar */}
                            <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-[#2A2F3A] p-1 rounded-xl border border-gray-200 dark:border-gray-600">
                                {userStationAccess === 'All' ? (
                                <select 
                                    value={manageStation} 
                                    onChange={(e) => setManageStation(e.target.value)}
                                    className="bg-gray-50 dark:bg-gray-700 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-[#232F3E] dark:text-white outline-none text-blue-600"
                                >
                                    <option value="All">كل المحطات</option>
                                    {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            ) : null}
                                <select 
                                    value={manageYear} 
                                    onChange={(e) => setManageYear(e.target.value)}
                                    className="bg-gray-50 dark:bg-gray-700 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-[#232F3E] dark:text-white outline-none"
                                >
                                    <option value="all">All Years</option>
                                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>

                                <select 
                                    value={manageMonth} 
                                    onChange={(e) => setManageMonth(e.target.value)}
                                    className="bg-gray-50 dark:bg-gray-700 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-[#232F3E] dark:text-white outline-none"
                                >
                                    <option value="all">All Months</option>
                                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m.toString()}>{m}</option>
                                    ))}
                                </select>
                                
                                <div className="relative">
                                    <i className="fa-solid fa-search absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                                    <input 
                                        type="text" 
                                        placeholder="Search..." 
                                        value={manageSearch}
                                        onChange={(e) => setManageSearch(e.target.value)}
                                        className="bg-gray-50 dark:bg-gray-700 border-none rounded-lg pl-2 pr-7 py-1.5 text-xs font-bold w-32 outline-none focus:ring-1 focus:ring-[#FF9900] dark:text-white"
                                    />
                                </div>
                                <span className="text-[10px] text-gray-400 font-mono px-2">{filteredManagementRecords.length}</span>
                            </div>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-sm text-center">
                                <thead className="bg-[#232F3E] text-white sticky top-0"><tr><th className="p-4">{t('days')}</th><th className="p-4">{t('volume')}</th><th className="p-4">{t('performance')}</th><th className="p-4">...</th></tr></thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {filteredManagementRecords.length > 0 ? (
                                        filteredManagementRecords.map((rec, i) => (
                                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                <td className="p-4 font-mono font-bold text-[#232F3E] dark:text-gray-200">{rec.date} <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded-full dark:bg-blue-900 dark:text-blue-200">{rec.station || 'DQN3'}</span></td>
                                                <td className="p-4 text-gray-600 dark:text-gray-400">{rec.stationTotal?.total}</td>
                                                <td className={`p-4 font-bold ${getRateClass(rec.stationTotal?.successRate).split(' ')[0]}`}>{rec.stationTotal?.successRate.toFixed(1)}%</td>
                                                <td className="p-4">
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => setRecordToEdit(rec)} className="w-8 h-8 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 flex items-center justify-center transition-colors"><i className="fa-solid fa-pen"></i></button>
                                                        <button onClick={() => { showMessage('confirm', t('delete'), t('deleteDateConfirm').replace('{date}', rec.date), () => onDeleteRecord && onDeleteRecord(rec.station ? `${rec.station}_${rec.date}` : rec.date)); }} className="w-8 h-8 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 flex items-center justify-center transition-colors"><i className="fa-solid fa-trash-can"></i></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-gray-400">
                                                {t('noRecordsFound')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {selectedAgent && <AgentDetailModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} showNumbers={showNumbers} />}
        </div>
    );
};

export default HistoryDashboard;
