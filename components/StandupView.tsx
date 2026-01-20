
import React, { useEffect, useState } from 'react';
import { ProcessedResult, DASummary } from '../types';
import confetti from 'canvas-confetti';
import { useSettings } from '../contexts/SettingsContext';

interface StandupViewProps {
    data: ProcessedResult;
    onClose: () => void;
}

const StandupView: React.FC<StandupViewProps> = ({ data, onClose }) => {
    const { t, dir } = useSettings();
    // Top 3 Heroes
    const heroes = [...data.summaries].sort((a, b) => b.successRate - a.successRate).slice(0, 3);
    
    // Bottom 3 (Opportunities)
    const opportunities = [...data.summaries]
        .filter(s => s.successRate < 90 && s.total > 5)
        .sort((a, b) => a.successRate - b.successRate)
        .slice(0, 3);

    useEffect(() => {
        // Trigger confetti for the winners on mount
        const end = Date.now() + 1000;
        const colors = ['#FFD814', '#ffffff', '#FF9900'];

        (function frame() {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: colors
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: colors
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }, []);

    return (
        <div className="fixed inset-0 z-[300] bg-[#1a202c] text-white overflow-y-auto animate-fade-in custom-scrollbar" dir={dir}>
            {/* Header */}
            <div className="p-6 flex justify-between items-center border-b border-gray-700 bg-[#232F3E]">
                <div className="flex items-center gap-4">
                    <i className="fa-brands fa-amazon text-[#FF9900] text-4xl"></i>
                    <div>
                        <h1 className="text-2xl font-black tracking-widest uppercase">{t('morningStandup')}</h1>
                        <p className="text-gray-400 text-xs">{t('stationOverviewSubtitle')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className={dir==='rtl'?'text-left':'text-right'}>
                        <div className="text-3xl font-black font-mono text-emerald-400">{data.grandTotal.successRate.toFixed(1)}%</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-widest">{t('stationRate')}</div>
                    </div>
                    <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors">
                        <i className="fa-solid fa-compress"></i>
                    </button>
                </div>
            </div>

            <div className="p-8 max-w-[1600px] mx-auto space-y-12">
                
                {/* 1. The Podium */}
                <div className="flex justify-center items-end gap-6 h-[400px] pt-10">
                    {/* 2nd Place */}
                    {heroes[1] && (
                        <div className="flex flex-col items-center w-64 animate-slide-up" style={{animationDelay: '0.2s'}}>
                            <div className="mb-4 text-center">
                                <h3 className="text-xl font-bold truncate w-full">{heroes[1].daName}</h3>
                                <p className="text-emerald-400 font-black text-2xl">{heroes[1].successRate.toFixed(1)}%</p>
                                <p className="text-gray-500 text-sm font-mono">{heroes[1].delivered} / {heroes[1].total}</p>
                            </div>
                            <div className="w-full bg-gradient-to-t from-gray-600 to-gray-400 h-48 rounded-t-3xl flex items-end justify-center pb-6 relative shadow-[0_0_30px_rgba(255,255,255,0.1)] border-t border-white/20">
                                <span className="text-6xl font-black text-white/30">2</span>
                            </div>
                        </div>
                    )}

                    {/* 1st Place */}
                    {heroes[0] && (
                        <div className="flex flex-col items-center w-72 z-10 animate-slide-up">
                            <i className="fa-solid fa-crown text-[#FFD814] text-5xl mb-4 animate-float"></i>
                            <div className="mb-4 text-center">
                                <h3 className="text-2xl font-black text-[#FF9900] truncate w-full">{heroes[0].daName}</h3>
                                <p className="text-emerald-400 font-black text-4xl">{heroes[0].successRate.toFixed(1)}%</p>
                                <p className="text-gray-500 text-sm font-mono">{heroes[0].delivered} / {heroes[0].total}</p>
                            </div>
                            <div className="w-full bg-gradient-to-t from-[#e68a00] to-[#FFD814] h-64 rounded-t-3xl flex items-end justify-center pb-6 relative shadow-[0_0_50px_rgba(255,153,0,0.3)] border-t border-white/40">
                                <span className="text-8xl font-black text-white/40">1</span>
                            </div>
                        </div>
                    )}

                    {/* 3rd Place */}
                    {heroes[2] && (
                        <div className="flex flex-col items-center w-64 animate-slide-up" style={{animationDelay: '0.4s'}}>
                            <div className="mb-4 text-center">
                                <h3 className="text-xl font-bold truncate w-full">{heroes[2].daName}</h3>
                                <p className="text-emerald-400 font-black text-2xl">{heroes[2].successRate.toFixed(1)}%</p>
                                <p className="text-gray-500 text-sm font-mono">{heroes[2].delivered} / {heroes[2].total}</p>
                            </div>
                            <div className="w-full bg-gradient-to-t from-[#8B4513] to-[#cd7f32] h-32 rounded-t-3xl flex items-end justify-center pb-6 relative shadow-[0_0_30px_rgba(205,127,50,0.2)] border-t border-white/20">
                                <span className="text-6xl font-black text-white/30">3</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Grid Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Station Metrics */}
                    <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
                        <h3 className="text-gray-400 font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                            <i className="fa-solid fa-chart-pie"></i> {t('stationOverviewTitle')}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#232F3E] p-6 rounded-2xl border border-gray-700">
                                <div className="text-4xl font-black text-white">{data.grandTotal.total}</div>
                                <div className="text-xs text-gray-400 uppercase mt-1">{t('totalVolume')}</div>
                            </div>
                            <div className="bg-[#232F3E] p-6 rounded-2xl border border-gray-700">
                                <div className="text-4xl font-black text-amber-500">{data.grandTotal.ofd + data.grandTotal.failed}</div>
                                <div className="text-xs text-gray-400 uppercase mt-1">{t('pending')}</div>
                            </div>
                            <div className="col-span-2 bg-[#232F3E] p-6 rounded-2xl border border-gray-700 flex items-center justify-between">
                                <div>
                                    <div className="text-4xl font-black text-rose-500">{data.grandTotal.failed}</div>
                                    <div className="text-xs text-gray-400 uppercase mt-1">{t('failed')} / {t('rto')}</div>
                                </div>
                                <div className="h-full w-px bg-gray-700 mx-4"></div>
                                <div className="text-right">
                                    <div className="text-4xl font-black text-emerald-500">{data.grandTotal.delivered}</div>
                                    <div className="text-xs text-gray-400 uppercase mt-1">{t('delivered')}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Focus Area (Low Performers) */}
                    <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
                        <h3 className="text-rose-400 font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                            <i className="fa-solid fa-crosshairs"></i> {t('focusArea')}
                        </h3>
                        <div className="space-y-4">
                            {opportunities.map((agent, i) => (
                                <div key={i} className="flex items-center justify-between bg-[#232F3E] p-4 rounded-xl border border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-rose-500/20 text-rose-500 flex items-center justify-center font-bold">{i+1}</div>
                                        <div>
                                            <div className="font-bold">{agent.daName}</div>
                                            <div className="text-xs text-gray-400">Fail: {agent.failed} / OFD: {agent.ofd}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-rose-400">{agent.successRate.toFixed(1)}%</div>
                                    </div>
                                </div>
                            ))}
                            {opportunities.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                    <i className="fa-solid fa-check-circle text-4xl mb-2 text-emerald-500"></i>
                                    <p>{t('allGood')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StandupView;
