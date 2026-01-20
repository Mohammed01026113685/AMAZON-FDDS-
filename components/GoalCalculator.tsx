
import React, { useState, useEffect } from 'react';
import { DASummary } from '../types';
import { useSettings } from '../contexts/SettingsContext';

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

    // Filter agents who haven't achieved the target yet and have pending shipments
    const eligibleAgents = summaries.filter(s => s.successRate < targetRate && (s.ofd + s.failed) > 0);

    const calculate = (agentName: string, target: number) => {
        const agent = summaries.find(s => s.daName === agentName);
        if (!agent) return;

        // Current stats
        const currentDelivered = agent.delivered;
        const total = agent.total;
        const pending = agent.ofd + agent.failed; // These are the ones we can convert to Delivered
        
        // Formula: (CurrentDelivered + Needed) / Total >= Target/100
        // Needed >= (Target/100 * Total) - CurrentDelivered
        
        const needed = Math.ceil((target / 100 * total) - currentDelivered);
        
        // Check if it's possible (can't deliver more than what's pending)
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 modal-overlay animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-[#191E26] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="bg-[#232F3E] text-white p-5 flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <i className="fa-solid fa-calculator text-[#FF9900]"></i>
                        {t('smartCalculator')}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
                </div>
                
                <div className="p-6 space-y-6" dir={dir}>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('targetRateLabel')}</label>
                        <div className="flex gap-2">
                            {[90, 95, 98, 100].map(rate => (
                                <button 
                                    key={rate}
                                    onClick={() => setTargetRate(rate)}
                                    className={`flex-1 py-2 rounded-lg font-bold text-sm border transition-all ${targetRate === rate ? 'bg-[#FF9900] text-[#232F3E] border-[#FF9900]' : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
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
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#FF9900] font-bold text-[#232F3E] dark:text-white"
                        >
                            <option value="">{t('selectAgentPlaceholder')}</option>
                            {eligibleAgents.map(agent => (
                                <option key={agent.daName} value={agent.daName}>
                                    {agent.daName} ({Math.round(agent.successRate)}%)
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-2">
                            * {t('calcNote')}
                        </p>
                    </div>

                    {selectedAgentName && calculation && (
                        <div className={`rounded-xl p-5 border ${calculation.possible ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800'} animate-fade-in`}>
                            {calculation.possible ? (
                                <div className="text-center">
                                    <p className="text-sm text-gray-600 dark:text-gray-300 font-bold mb-1">{t('toReach')} <span className="text-[#232F3E] dark:text-white">{targetRate}%</span></p>
                                    <h4 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-1">{calculation.needed} {t('shipment')}</h4>
                                    <p className="text-xs text-emerald-800 dark:text-emerald-300">{t('convertNote')}</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">
                                        <i className="fa-solid fa-ban"></i>
                                    </div>
                                    <h4 className="font-bold text-rose-700 dark:text-rose-400 mb-1">{t('impossible')}</h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                        {t('maxPossibleNote')} <span className="font-black">{calculation.maxRate.toFixed(1)}%</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GoalCalculator;
