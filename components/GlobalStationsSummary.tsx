import React, { useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { ProcessedResult, STATIONS, Station } from '../types';
import { processShipments } from '../services/excelProcessor';
import { motion } from 'motion/react';
import { Activity, BarChart2, PieChart, Trophy, AlertTriangle, Package, TrendingUp, Target } from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { AnimatedNumber } from './AnimatedNumber';
import 'chart.js/auto';

interface GlobalStationsSummaryProps {
    rawData: any[];
    aliases: Record<string, string>;
    knownNames?: string[];
}

const GlobalStationsSummary: React.FC<GlobalStationsSummaryProps> = ({ rawData, aliases, knownNames = [] }) => {
    const { t, dir } = useSettings();

    const stationData = useMemo(() => {
        const results: Record<Station, ProcessedResult['grandTotal']> = {} as any;
        let globalDelivered = 0, globalFailed = 0, globalOfd = 0, globalRto = 0, globalTotal = 0;

        STATIONS.forEach(station => {
            try {
                const processed = processShipments(rawData, aliases, station, knownNames);
                results[station] = processed.grandTotal;
                
                if (processed.grandTotal.total > 0) {
                    globalDelivered += processed.grandTotal.delivered;
                    globalFailed += processed.grandTotal.failed;
                    globalOfd += processed.grandTotal.ofd;
                    globalRto += processed.grandTotal.rto;
                    globalTotal += processed.grandTotal.total;
                }
            } catch (e) {
                results[station] = { delivered: 0, failed: 0, ofd: 0, rto: 0, total: 0, successRate: 0 };
            }
        });

        return {
            results,
            grandTotal: {
                delivered: globalDelivered,
                failed: globalFailed,
                ofd: globalOfd,
                rto: globalRto,
                total: globalTotal
            }
        };
    }, [rawData, aliases]);

    if (stationData.grandTotal.total === 0) return null;

    const fddsGlobal = stationData.grandTotal.total > 0 
        ? ((stationData.grandTotal.delivered + stationData.grandTotal.ofd) / stationData.grandTotal.total) * 100 
        : 0;

    const stationStats = STATIONS.map(station => {
        const data = stationData.results[station];
        const fdds = data.total > 0 ? ((data.delivered + data.ofd) / data.total) * 100 : 0;
        return { station, ...data, fdds };
    }).filter(s => s.total > 0).sort((a, b) => b.fdds - a.fdds);

    const activeStationNames = stationStats.map(s => s.station);
    const topStation = stationStats[0];
    const bottomStation = stationStats[stationStats.length - 1];
    
    // 94% target
    const TARGET = 94.0;

    const barChartData = {
        labels: activeStationNames,
        datasets: [
            {
                label: 'Delivered',
                data: activeStationNames.map(s => stationData.results[s].delivered),
                backgroundColor: '#007185',
                borderRadius: 4,
            },
            {
                label: 'Failed',
                data: activeStationNames.map(s => stationData.results[s].failed),
                backgroundColor: '#CC0C39',
                borderRadius: 4,
            },
            {
                label: 'OFD',
                data: activeStationNames.map(s => stationData.results[s].ofd),
                backgroundColor: '#FF9900',
                borderRadius: 4,
            }
        ]
    };
    
    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' as const },
        },
        scales: {
            x: { stacked: true, grid: { display: false } },
            y: { stacked: true, border: { display: false } }
        }
    };

    const performanceChartData = {
        labels: activeStationNames,
        datasets: [{
            label: 'FDDS %',
            data: activeStationNames.map(s => {
                const total = stationData.results[s].total;
                if(total === 0) return 0;
                return ((stationData.results[s].delivered + stationData.results[s].ofd) / total) * 100;
            }),
            backgroundColor: activeStationNames.map(s => {
                const rate = ((stationData.results[s].delivered + stationData.results[s].ofd) / stationData.results[s].total) * 100;
                if(rate >= 95) return '#007185';
                if(rate >= 85) return '#059669';
                if(rate >= 70) return '#FF9900';
                return '#CC0C39';
            }),
            borderRadius: 6,
        }]
    };

    const doughnutData = {
        labels: ['Delivered', 'Failed', 'OFD', 'RTO'],
        datasets: [{
            data: [
                stationData.grandTotal.delivered, 
                stationData.grandTotal.failed, 
                stationData.grandTotal.ofd, 
                stationData.grandTotal.rto
            ],
            backgroundColor: ['#007185', '#CC0C39', '#FF9900', '#9CA3AF'],
            borderWidth: 0,
        }]
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
            legend: { display: false }
        }
    };

    const renderRow = (label: string, data: any, labelBgColor: string, isTotal: boolean = false) => {
        if (!data || (data.total === 0 && !isTotal)) return null;
        
        const fdds = data.total > 0 ? ((data.delivered + data.ofd) / data.total) * 100 : 0;
        
        return (
            <tr className={`border-b border-[#D5D9D9] text-center font-bold text-[#0F1111] dark:text-gray-200`}>
                <td className={`p-3 border-r border-[#D5D9D9] ${labelBgColor} text-black`}>{label}</td>
                <td className="p-0 border-r border-[#D5D9D9] bg-[#FFE0B2]/40 dark:bg-orange-900/10">
                    <div className="p-1.5 text-[#CC0C39]">{data.failed}</div>
                    <div className="p-1 border-t border-[#D5D9D9] text-xs bg-white/50 dark:bg-black/20 text-[#565959]">
                        {data.total > 0 ? ((data.failed / data.total) * 100).toFixed(2) : 0}%
                    </div>
                </td>
                <td className="p-0 border-r border-[#D5D9D9] bg-[#C8E6C9]/40 dark:bg-emerald-900/10">
                    <div className="p-1.5 text-[#007185]">{data.delivered}</div>
                    <div className="p-1 border-t border-[#D5D9D9] text-xs bg-white/50 dark:bg-black/20 text-[#565959]">
                        {data.total > 0 ? ((data.delivered / data.total) * 100).toFixed(2) : 0}%
                    </div>
                </td>
                <td className="p-0 border-r border-[#D5D9D9] bg-[#FFE0B2]/40 dark:bg-orange-900/10">
                    <div className="p-1.5 text-[#FF9900]">{data.ofd}</div>
                    <div className="p-1 border-t border-[#D5D9D9] text-xs bg-white/50 dark:bg-black/20 text-[#565959]">
                        {data.total > 0 ? ((data.ofd / data.total) * 100).toFixed(2) : 0}%
                    </div>
                </td>
                <td className="p-0 border-r border-[#D5D9D9] bg-[#FFE0B2]/40 dark:bg-orange-900/10">
                    <div className="p-1.5 text-gray-600">{data.rto}</div>
                    <div className="p-1 border-t border-[#D5D9D9] text-xs bg-white/50 dark:bg-black/20 text-[#565959]">
                        {data.total > 0 ? ((data.rto / data.total) * 100).toFixed(2) : 0}%
                    </div>
                </td>
                <td className={`p-3 border-r border-[#D5D9D9] ${labelBgColor} text-black`}>{data.total}</td>
                <td className={`p-3 ${labelBgColor} text-black`}>{fdds.toFixed(2)}%</td>
            </tr>
        );
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
        >
            {/* Top Insight Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                
                {/* Global Score */}
                <div className="bg-white dark:bg-[#191E26] border border-[#D5D9D9] dark:border-gray-700 rounded-2xl p-6 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
                    <div className="absolute top-0 w-full h-1 bg-[#232F3E]"></div>
                    <h3 className="text-[#565959] dark:text-gray-400 font-bold text-sm mb-4">Total Network FDDS</h3>
                    <div className="w-32 h-32 relative">
                        <Doughnut data={doughnutData} options={doughnutOptions} />
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-2xl font-black text-[#0F1111] dark:text-white"><AnimatedNumber value={fddsGlobal} formatter={(v) => v.toFixed(1)} />%</span>
                        </div>
                    </div>
                </div>
                
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Top Station */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute -right-4 -top-4 opacity-10">
                            <Trophy size={120} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 mb-1">
                                <Trophy size={18} />
                                <span className="font-bold text-sm uppercase tracking-wider">Top Performer</span>
                            </div>
                            <h2 className="text-3xl font-black text-[#0F1111] dark:text-white mb-1">{topStation?.station}</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Leading the network</p>
                        </div>
                        <div className="mt-4 flex items-end justify-between">
                            <div>
                                <div className="text-3xl font-black text-amber-600 dark:text-amber-500">{topStation ? <><AnimatedNumber value={topStation.fdds} formatter={(v) => v.toFixed(1)} />%</> : "0.0%"}</div>
                            </div>
                            <div className="bg-white/60 dark:bg-black/20 px-3 py-1 rounded-full text-xs font-bold text-amber-700 dark:text-amber-400">
                                {topStation ? <AnimatedNumber value={topStation.total} formatter={(v) => Math.round(v).toLocaleString()} /> : "0"} Shipments
                            </div>
                        </div>
                    </div>

                    {/* Needs Attention */}
                    <div className="bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 border border-rose-200 dark:border-rose-800/50 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute -right-4 -top-4 opacity-10">
                            <AlertTriangle size={120} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-500 mb-1">
                                <AlertTriangle size={18} />
                                <span className="font-bold text-sm uppercase tracking-wider">Needs Attention</span>
                            </div>
                            <h2 className="text-3xl font-black text-[#0F1111] dark:text-white mb-1">{bottomStation?.station}</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Lowest FDDS score</p>
                        </div>
                        <div className="mt-4 flex items-end justify-between">
                            <div>
                                <div className="text-3xl font-black text-rose-600 dark:text-rose-500">{bottomStation ? <><AnimatedNumber value={bottomStation.fdds} formatter={(v) => v.toFixed(1)} />%</> : "0.0%"}</div>
                            </div>
                            <div className="bg-white/60 dark:bg-black/20 px-3 py-1 rounded-full text-xs font-bold text-rose-700 dark:text-rose-400">
                                Gap: {bottomStation ? <><AnimatedNumber value={TARGET - bottomStation.fdds} formatter={(v) => v.toFixed(1)} />%</> : "0.0%"}
                            </div>
                        </div>
                    </div>

                    {/* Network Volume */}
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute -right-4 -top-4 opacity-10">
                            <Package size={120} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-500 mb-1">
                                <Package size={18} />
                                <span className="font-bold text-sm uppercase tracking-wider">Network Volume</span>
                            </div>
                            <h2 className="text-3xl font-black text-[#0F1111] dark:text-white mb-1"><AnimatedNumber value={stationData.grandTotal.total} formatter={(v) => Math.round(v).toLocaleString()} /></h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total shipments processed</p>
                        </div>
                        <div className="mt-4 flex items-end justify-between">
                            <div>
                                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-500 mb-1">Delivered: <AnimatedNumber value={stationData.grandTotal.delivered} formatter={(v) => Math.round(v).toLocaleString()} /></div>
                                <div className="text-sm font-bold text-rose-600 dark:text-rose-500">Failed: <AnimatedNumber value={stationData.grandTotal.failed} formatter={(v) => Math.round(v).toLocaleString()} /></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white dark:bg-[#191E26] border border-[#D5D9D9] dark:border-gray-700 rounded-2xl p-5 shadow-sm">
                    <h3 className="text-[#0F1111] dark:text-white font-bold mb-4 flex items-center gap-2"><BarChart2 size={18} className="text-[#007185]" /> Volume Distribution</h3>
                    <div className="h-64">
                        <Bar data={barChartData} options={barOptions} />
                    </div>
                </div>
                <div className="bg-white dark:bg-[#191E26] border border-[#D5D9D9] dark:border-gray-700 rounded-2xl p-5 shadow-sm">
                    <h3 className="text-[#0F1111] dark:text-white font-bold mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-[#FF9900]" /> Station Performance (FDDS %)</h3>
                    <div className="h-64">
                        <Bar data={performanceChartData} options={{...barOptions, scales: {x: {grid: {display: false}}, y: {beginAtZero: true}}}} />
                    </div>
                </div>
            </div>

            {/* Old Table Format */}
            <div className="bg-white dark:bg-[#191E26] border border-[#D5D9D9] dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-[#131921] text-white p-4 flex items-center gap-3">
                    <PieChart size={20} className="text-[#FF9900]" />
                    <h2 className="font-bold text-lg">لوحة تحكم المحطات الشاملة (Global Stations Dashboard)</h2>
                </div>
                                
                <div className="overflow-x-auto p-4">
                    <table className="w-full text-sm border-2 border-[#D5D9D9]" dir="ltr">
                        <thead className="bg-[#F3F3F3] text-gray-800">
                            <tr>
                                <th className="p-2 border-r border-b border-[#D5D9D9]"></th>
                                <th className="p-2 border-r border-b border-[#D5D9D9] uppercase text-xs tracking-wider text-rose-700">FAILED (Attempted)</th>
                                <th className="p-2 border-r border-b border-[#D5D9D9] uppercase text-xs tracking-wider text-emerald-700">DELIVERED</th>
                                <th className="p-2 border-r border-b border-[#D5D9D9] uppercase text-xs tracking-wider text-amber-600">OFD (Pending)</th>
                                <th className="p-2 border-r border-b border-[#D5D9D9] uppercase text-xs tracking-wider text-gray-700">RTO (Rejected)</th>
                                <th className="p-2 border-r border-b border-[#D5D9D9] uppercase text-xs tracking-wider">Total</th>
                                <th className="p-2 border-b border-[#D5D9D9] uppercase text-xs tracking-wider">FDDS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {renderRow('DAW1', stationData.results['DAW1'], 'bg-[#69A042]')}
                            {renderRow('DLU4', stationData.results['DLU4'], 'bg-[#DEAB00]')}
                            {renderRow('DQN3', stationData.results['DQN3'], 'bg-[#D85B22]')}
                            {renderRow('DZA1', stationData.results['DZA1'], 'bg-[#2E79B6]')}
                            {renderRow('Total', stationData.grandTotal, 'bg-[#FFF9C4]', true)}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
};

export default GlobalStationsSummary;
