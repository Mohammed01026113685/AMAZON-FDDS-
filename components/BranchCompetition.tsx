import React, { useMemo, useState } from 'react';
import { HistoryRecord, STATIONS } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js/auto';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface BranchCompetitionProps {
    history: HistoryRecord[];
}

type Timeframe = 'week' | 'month' | '6months' | 'year';

const getRateColor = (rate: number) => {
    if (rate >= 95) return '#007185'; // Amazon Blue
    if (rate >= 90) return '#10B981'; // Emerald
    if (rate >= 80) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
};

export default function BranchCompetition({ history }: BranchCompetitionProps) {
    const { t } = useSettings();
    const [timeframe, setTimeframe] = useState<Timeframe>('week');

    const filteredData = useMemo(() => {
        const now = new Date();
        now.setHours(0,0,0,0);
        
        let startDate = new Date(now);
        if (timeframe === 'week') startDate.setDate(now.getDate() - 7);
        if (timeframe === 'month') startDate.setMonth(now.getMonth() - 1);
        if (timeframe === '6months') startDate.setMonth(now.getMonth() - 6);
        if (timeframe === 'year') startDate.setFullYear(now.getFullYear() - 1);

        const recentHistory = history.filter(h => new Date(h.date) >= startDate);

        const stationStats = STATIONS.map(station => {
            const stationRecords = recentHistory.filter(h => (h.station || 'DQN3') === station);
            let totalDelivered = 0;
            let totalAttempted = 0;
            
            stationRecords.forEach(r => {
                totalDelivered += r.stationTotal.delivered;
                totalAttempted += r.stationTotal.total;
            });

            const successRate = totalAttempted > 0 ? (totalDelivered / totalAttempted) * 100 : 0;
            return {
                station,
                delivered: totalDelivered,
                total: totalAttempted,
                successRate,
                daysActive: stationRecords.length
            };
        }).filter(s => s.total > 0).sort((a, b) => b.successRate - a.successRate);

        return stationStats;
    }, [history, timeframe]);

    // Generate Notifications/Insights
    const insights = useMemo(() => {
        if (filteredData.length === 0) return [];
        const notes = [];
        
        // 1st place
        const winner = filteredData[0];
        if (winner.total > 0) {
            notes.push({
                icon: 'fa-trophy',
                color: 'text-amber-500',
                bg: 'bg-amber-50 dark:bg-amber-900/20',
                title: `المركز الأول: ${winner.station} 🏆`,
                desc: `حققت أعلى نسبة نجاح (${winner.successRate.toFixed(1)}%) بإجمالي ${winner.delivered} شحنة ناجحة!`
            });
        }

        // Top Volume
        const topVolume = [...filteredData].sort((a, b) => b.total - a.total)[0];
        if (topVolume && topVolume.total > 0 && topVolume.station !== winner.station) {
            notes.push({
                icon: 'fa-box-open',
                color: 'text-blue-500',
                bg: 'bg-blue-50 dark:bg-blue-900/20',
                title: `أعلى كثافة تشغيل: ${topVolume.station} 📦`,
                desc: `تعاملت مع أكبر عدد من الشحنات (${topVolume.total} شحنة) بنسبة نجاح ${topVolume.successRate.toFixed(1)}%.`
            });
        } else if (topVolume && topVolume.total > 0 && topVolume.station === winner.station) {
             notes.push({
                icon: 'fa-star',
                color: 'text-emerald-500',
                bg: 'bg-emerald-50 dark:bg-emerald-900/20',
                title: `أداء استثنائي: ${topVolume.station} 🌟`,
                desc: `تجمّع بين المركز الأول وأعلى كثافة تشغيل (${topVolume.total} شحنة)!`
            });
        }

        // Needs attention
        const lowest = filteredData[filteredData.length - 1];
        if (lowest && lowest.total > 0 && lowest.successRate < 90) {
            notes.push({
                icon: 'fa-triangle-exclamation',
                color: 'text-rose-500',
                bg: 'bg-rose-50 dark:bg-rose-900/20',
                title: `تنبيه أداء: ${lowest.station} ⚠️`,
                desc: `نسبة النجاح (${lowest.successRate.toFixed(1)}%) تحتاج إلى تركيز ومتابعة خلال هذه الفترة.`
            });
        }

        return notes;
    }, [filteredData]);

    const chartData = {
        labels: filteredData.map(s => s.station),
        datasets: [
            {
                label: 'نسبة النجاح (%)',
                data: filteredData.map(s => s.successRate),
                backgroundColor: filteredData.map(s => getRateColor(s.successRate)),
                borderRadius: 6,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context: any) => '' + context.raw.toFixed(1) + '%'
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                ticks: { callback: (val: any) => val + '%' }
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Controls */}
            <div className="bg-white dark:bg-[#191E26] p-4 rounded-xl border border-[#D5D9D9] dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                        <i className="fa-solid fa-ranking-star text-lg"></i>
                    </div>
                    <div>
                        <h2 className="font-bold text-lg text-[#232F3E] dark:text-gray-100">منافسة المحطات (Branch Leaderboard)</h2>
                        <p className="text-sm text-gray-500">تحليل الأداء والمنافسة بين الفروع</p>
                    </div>
                </div>

                <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    {[
                        { id: 'week', label: 'أسبوع' },
                        { id: 'month', label: 'شهر' },
                        { id: '6months', label: '6 أشهر' },
                        { id: 'year', label: 'سنة' }
                    ].map(tf => (
                        <button
                            key={tf.id}
                            onClick={() => setTimeframe(tf.id as Timeframe)}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                                timeframe === tf.id 
                                ? 'bg-white dark:bg-gray-600 shadow text-[#007185] dark:text-cyan-400' 
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Leaderboard & Insights */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Insights Notifications */}
                    <div className="bg-white dark:bg-[#191E26] rounded-xl border border-[#D5D9D9] dark:border-gray-700 overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 border-b border-[#D5D9D9] dark:border-gray-700 font-bold text-[#232F3E] dark:text-gray-200 flex items-center gap-2">
                            <i className="fa-solid fa-bell text-amber-500"></i> إشعارات الأداء
                        </div>
                        <div className="p-4 space-y-3">
                            {insights.length > 0 ? insights.map((note, idx) => (
                                <div key={idx} className={`p-3 rounded-lg flex items-start gap-3 ${note.bg}`}>
                                    <i className={`fa-solid ${note.icon} mt-1 ${note.color}`}></i>
                                    <div>
                                        <h4 className={`text-sm font-bold ${note.color}`}>{note.title}</h4>
                                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{note.desc}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center text-gray-400 text-sm py-4">لا توجد بيانات كافية لهذه الفترة</div>
                            )}
                        </div>
                    </div>

                    {/* Leaderboard */}
                    <div className="bg-white dark:bg-[#191E26] rounded-xl border border-[#D5D9D9] dark:border-gray-700 overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 border-b border-[#D5D9D9] dark:border-gray-700 font-bold text-[#232F3E] dark:text-gray-200 flex items-center gap-2">
                            <i className="fa-solid fa-medal text-[#FF9900]"></i> الترتيب العام (Leaderboard)
                        </div>
                        <div className="p-4 space-y-3">
                            {filteredData.map((station, idx) => (
                                <div key={station.station} className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/30">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-sm
                                            ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-700' : 'bg-[#232F3E]'}
                                        `}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-[#232F3E] dark:text-gray-200">{station.station}</div>
                                            <div className="text-xs text-gray-500">{station.total} شحنة</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-lg" style={{ color: getRateColor(station.successRate) }}>
                                            {station.successRate.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Charts */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-[#191E26] rounded-xl border border-[#D5D9D9] dark:border-gray-700 p-4">
                        <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                            <i className="fa-solid fa-chart-column text-[#007185]"></i> نسبة النجاح للمحطات
                        </h3>
                        <div className="h-64">
                            <Bar data={chartData} options={chartOptions as any} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-[#191E26] rounded-xl border border-[#D5D9D9] dark:border-gray-700 p-4">
                            <div className="text-sm text-gray-500 mb-1">إجمالي الشحنات للفترة</div>
                            <div className="text-2xl font-black text-[#232F3E] dark:text-gray-100">
                                {filteredData.reduce((acc, curr) => acc + curr.total, 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#191E26] rounded-xl border border-[#D5D9D9] dark:border-gray-700 p-4">
                            <div className="text-sm text-gray-500 mb-1">متوسط نسبة النجاح</div>
                            <div className="text-2xl font-black text-[#007185] dark:text-cyan-400">
                                {(filteredData.length > 0 
                                    ? filteredData.reduce((acc, curr) => acc + curr.successRate, 0) / filteredData.length 
                                    : 0).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
