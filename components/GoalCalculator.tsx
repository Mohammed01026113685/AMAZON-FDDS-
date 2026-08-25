import React, { useState, useEffect } from 'react';
import { DASummary } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, X, Ban, Target, PackageCheck } from 'lucide-react';

interface GoalCalculatorProps {
    isOpen: boolean;
    onClose: () => void;
    summaries: DASummary[];
}

const GoalCalculator: React.FC<GoalCalculatorProps> = ({ isOpen, onClose, summaries }) => {
    const { t, dir } = useSettings();
    const [targetRate, setTargetRate] = useState<number>(95);
    const [selectedAgentName, setSelectedAgentName] = useState<string>('');
    const [calculation, setCalculation] = useState<{needed: number, possible: boolean, maxRate: number} | null>(null);

    const eligibleAgents = summaries.filter(s => s.successRate < targetRate && (s.ofd + s.failed) > 0);

    const calculate = (agentName: string, target: number) => {
        const agent = summaries.find(s => s.daName === agentName);
        if (!agent) return;
        
        const currentDelivered = agent.delivered;
        const total = agent.total;
        const pending = agent.ofd + agent.failed; 
        
        const needed = Math.ceil((target / 100 * total) - currentDelivered);
        const maxPossibleDelivered = currentDelivered + pending;
        const maxPossibleRate = (maxPossibleDelivered / total) * 100;
        const isPossible = needed <= pending && needed > 0;
        
        setCalculation({
            needed: Math.max(0, needed),
            possible: isPossible,
            maxRate: maxPossibleRate
        });
    };

    useEffect(() => {
        if (selectedAgentName) {
            calculate(selectedAgentName, targetRate);
        } else {
            setCalculation(null);
        }
    }, [selectedAgentName, targetRate]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white dark:bg-[#1A1A1A] w-full max-w-md rounded-xl shadow-2xl overflow-hidden relative z-10 border border-[#D5D9D9] dark:border-gray-800" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-gray-50 dark:bg-white/5 border-b border-[#D5D9D9] dark:border-white/10 p-5 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#FF9900]/20 flex items-center justify-center text-[#FF9900]">
                                    <Calculator size={18} />
                                </div>
                                {t('smartCalculator')}
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors bg-white dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center shadow-sm">
                                <X size={16} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6" dir={dir}>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <Target size={16} className="text-blue-500" />
                                    {t('targetRateLabel')}
                                </label>
                                <div className="flex gap-2 bg-gray-50 dark:bg-[#111111] p-1.5 rounded-xl border border-[#D5D9D9] dark:border-gray-800">
                                    {[90, 95, 98, 100].map(rate => (
                                        <button 
                                            key={rate}
                                            onClick={() => setTargetRate(rate)}
                                            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${targetRate === rate ? 'bg-white dark:bg-[#1A1A1A] text-[#FF9900] shadow-md border-transparent' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border-transparent'}`}
                                        >
                                            {rate}%
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('selectAgentAnalysis')}</label>
                                <select 
                                    value={selectedAgentName} 
                                    onChange={(e) => setSelectedAgentName(e.target.value)}
                                    className="w-full bg-white dark:bg-[#141414] border border-[#D5D9D9] dark:border-gray-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#FF9900] font-bold text-[#232F3E] dark:text-white shadow-sm appearance-none cursor-pointer"
                                >
                                    <option value="">{t('selectAgentPlaceholder')}</option>
                                    {eligibleAgents.map(agent => (
                                        <option key={agent.daName} value={agent.daName}>
                                            {agent.daName} ({Math.round(agent.successRate)}%)
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-gray-400 mt-2 font-medium">
                                    * {t('calcNote')}
                                </p>
                            </div>

                            <AnimatePresence mode="wait">
                                {selectedAgentName && calculation && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className={`rounded-2xl p-6 border ${calculation.possible ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30'}`}
                                    >
                                        {calculation.possible ? (
                                            <div className="text-center">
                                                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                                    <PackageCheck size={24} />
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 font-bold mb-1">{t('toReach')} <span className="text-[#232F3E] dark:text-white">{targetRate}%</span></p>
                                                <h4 className="text-4xl font-black text-emerald-600 dark:text-emerald-400 mb-2">{calculation.needed}</h4>
                                                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800/70 dark:text-emerald-400/70">{t('shipment')}</p>
                                                <p className="text-[11px] text-emerald-700/60 dark:text-emerald-400/60 mt-3">{t('convertNote')}</p>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                                    <Ban size={24} />
                                                </div>
                                                <h4 className="font-bold text-rose-700 dark:text-rose-400 mb-2">{t('impossible')}</h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {t('maxPossibleNote')} <br/><span className="font-black text-xl text-[#232F3E] dark:text-white mt-1 block">{calculation.maxRate.toFixed(1)}%</span>
                                                </p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default GoalCalculator;
