
import React, { useState, useEffect, useMemo } from 'react';
import { fetchAliases, saveAliases, batchUpdateAgentName, fetchHistory, deleteAgentGlobally } from '../services/firebase';
import { cleanName } from '../services/excelProcessor';
import { HistoryRecord } from '../types';
import { useSettings } from '../contexts/SettingsContext';

interface AliasManagementProps {
    onClose: () => void;
    onAliasesUpdated: (newAliases: Record<string, string>) => void;
}

interface AgentStat {
    name: string;
    totalOrders: number;
    totalDelivered: number;
    daysWorked: number;
    lastSeen: string;
}

const AliasManagement: React.FC<AliasManagementProps> = ({ onClose, onAliasesUpdated }) => {
    const { t, dir } = useSettings();
    // Data State
    const [history, setHistory] = useState<HistoryRecord[]>([]);
    const [aliases, setAliases] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    
    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAgent, setSelectedAgent] = useState<AgentStat | null>(null);
    const [targetName, setTargetName] = useState('');
    
    // Actions State
    const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
    const [saveAsRule, setSaveAsRule] = useState(true); // Save as future alias rule
    const [isProcessing, setIsProcessing] = useState(false);
    const [processStep, setProcessStep] = useState<string>(''); // For loading feedback

    // --- 1. Load Data ---
    const loadData = async () => {
        setIsLoading(true);
        try {
            const [histData, aliasData] = await Promise.all([
                fetchHistory(),
                fetchAliases()
            ]);
            setHistory(histData);
            setAliases(aliasData);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // --- 2. Process History to get Unique Agents ---
    const agentsList = useMemo(() => {
        const stats: Record<string, AgentStat> = {};
        
        history.forEach(record => {
            if (!record.agents) return;
            record.agents.forEach(a => {
                if (!stats[a.daName]) {
                    stats[a.daName] = { 
                        name: a.daName, 
                        totalOrders: 0, 
                        totalDelivered: 0, 
                        daysWorked: 0,
                        lastSeen: record.date
                    };
                }
                stats[a.daName].totalOrders += a.total;
                stats[a.daName].totalDelivered += a.delivered;
                stats[a.daName].daysWorked += 1;
                if (new Date(record.date) > new Date(stats[a.daName].lastSeen)) {
                    stats[a.daName].lastSeen = record.date;
                }
            });
        });

        return Object.values(stats)
            .sort((a, b) => b.totalOrders - a.totalOrders); // Sort by volume
    }, [history]);

    const filteredAgents = useMemo(() => {
        return agentsList.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [agentsList, searchTerm]);

    // --- 3. Interaction Handlers ---

    const handleSelectAgent = (agent: AgentStat) => {
        setSelectedAgent(agent);
        setTargetName(agent.name); // Default to current name
        // Find dates where this agent worked
        const dates = history
            .filter(r => r.agents && r.agents.some(a => a.daName === agent.name))
            .map(r => r.date);
        setSelectedDates(new Set(dates));
    };

    const toggleDate = (date: string) => {
        const newSet = new Set(selectedDates);
        if (newSet.has(date)) newSet.delete(date);
        else newSet.add(date);
        setSelectedDates(newSet);
    };

    const handleDeleteGlobally = async () => {
        if (!selectedAgent) return;
        const confirmMsg = `WARNING: Are you sure you want to completely erase "${selectedAgent.name}" from ALL history records?\n\nThis action cannot be undone.`;
        if (!window.confirm(confirmMsg)) return;

        setIsProcessing(true);
        setProcessStep('Deleting...');
        
        try {
            await deleteAgentGlobally(selectedAgent.name);
            await loadData();
            setSelectedAgent(null);
            setSearchTerm('');
            alert(`Agent ${selectedAgent.name} has been deleted from history.`);
        } catch (e: any) {
            alert("Error deleting agent: " + e.message);
        } finally {
            setIsProcessing(false);
            setProcessStep('');
        }
    };

    const handleExecuteChange = async () => {
        if (!selectedAgent || !targetName) return;
        
        const cleanTarget = cleanName(targetName);
        const cleanSource = cleanName(selectedAgent.name);

        if (cleanTarget === cleanSource && selectedDates.size === 0) {
            alert("No changes detected.");
            return;
        }

        if (!window.confirm(`Change "${selectedAgent.name}" to "${cleanTarget}"?\n${selectedDates.size} records will be affected.`)) return;

        setIsProcessing(true);
        setProcessStep('init');

        try {
            // 1. Database Update (Retroactive)
            if (selectedDates.size > 0 && cleanTarget !== cleanSource) {
                setProcessStep('db');
                await batchUpdateAgentName(Array.from(selectedDates), selectedAgent.name, cleanTarget);
            }

            // 2. Save as Alias Rule (Future)
            if (saveAsRule && cleanTarget !== cleanSource) {
                setProcessStep('alias');
                const newAliases = { ...aliases, [cleanSource]: cleanTarget };
                await saveAliases(newAliases);
                onAliasesUpdated(newAliases);
            }

            // 3. Refresh
            setProcessStep('done');
            await loadData(); // Reload history to reflect changes
            setSelectedAgent(null); // Close detail view
            setSearchTerm(''); // Reset search
            
        } catch (error) {
            console.error(error);
            alert("Error updating. Check console.");
        } finally {
            setIsProcessing(false);
            setProcessStep('');
        }
    };

    // --- Render Helpers ---
    const getAgentHistoryDetails = (agentName: string) => {
        return history
            .filter(r => r.agents && r.agents.some(a => a.daName === agentName))
            .map(r => {
                const data = r.agents.find(a => a.daName === agentName);
                return { date: r.date, ...data };
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 modal-overlay animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-[#191E26] w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col h-[85vh] border border-gray-700" onClick={e => e.stopPropagation()}>
                
                {/* Top Header */}
                <div className="bg-[#232F3E] text-white p-4 flex justify-between items-center shadow-md z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#FF9900] text-[#232F3E] w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-sm">
                            <i className="fa-solid fa-database"></i>
                        </div>
                        <div>
                            <h3 className="font-black text-lg">{t('aliasCenter')}</h3>
                            <p className="text-xs text-gray-400">{t('aliasDesc')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-white/10 w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Main Content - Split View */}
                <div className="flex flex-1 overflow-hidden">
                    
                    {/* LEFT PANEL: AGENT LIST */}
                    <div className={`w-1/3 bg-[#f3f4f6] dark:bg-[#111315] ${dir==='rtl'?'border-l':'border-r'} border-gray-300 dark:border-gray-700 flex flex-col`}>
                        {/* Search Bar */}
                        <div className="p-4 bg-white dark:bg-[#191E26] border-b border-gray-200 dark:border-gray-700 shadow-sm z-10">
                            <div className="relative">
                                <i className="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                <input 
                                    type="text" 
                                    placeholder={t('searchAgentHistory')}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className={`w-full ${dir==='rtl'?'pl-4 pr-10':'pr-4 pl-10'} py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] outline-none font-bold text-gray-700 dark:text-white bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 transition-all`}
                                    dir={dir}
                                />
                            </div>
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex justify-between px-1">
                                <span>{t('totalAgents').replace('{n}', agentsList.length.toString())}</span>
                                {isLoading && <span className="text-[#FF9900] animate-pulse"><i className="fa-solid fa-circle-notch fa-spin"></i> {t('updating')}</span>}
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                            {filteredAgents.map((agent) => (
                                <div 
                                    key={agent.name}
                                    onClick={() => handleSelectAgent(agent)}
                                    className={`p-3 rounded-xl cursor-pointer transition-all border group relative overflow-hidden
                                        ${selectedAgent?.name === agent.name 
                                            ? 'bg-white dark:bg-[#232F3E] border-[#FF9900] shadow-md ring-1 ring-[#FF9900]' 
                                            : 'bg-white dark:bg-[#191E26] border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#2A2F3A]'
                                        }`}
                                >
                                    <div className="flex justify-between items-center relative z-10">
                                        <div className={dir==='rtl'?'text-right':'text-left'}>
                                            <div className="font-bold text-[#232F3E] dark:text-white text-sm group-hover:text-[#007185] dark:group-hover:text-[#4DB6AC] transition-colors">{agent.name}</div>
                                            <div className="text-[10px] text-gray-400 mt-1 flex gap-2">
                                                <span><i className="fa-regular fa-clock"></i> {agent.lastSeen}</span>
                                                <span className={aliases[cleanName(agent.name)] ? "text-emerald-600 font-bold" : "hidden"}>
                                                    <i className="fa-solid fa-link"></i> {t('linked')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1.5 min-w-[50px]">
                                            <div className="text-xs font-black text-[#232F3E] dark:text-white">{agent.totalOrders}</div>
                                            <div className="text-[9px] text-gray-500 uppercase">{t('shipment')}</div>
                                        </div>
                                    </div>
                                    {selectedAgent?.name === agent.name && (
                                        <div className={`absolute ${dir==='rtl'?'left-0':'right-0'} top-0 bottom-0 w-1 bg-[#FF9900]`}></div>
                                    )}
                                </div>
                            ))}
                            {filteredAgents.length === 0 && !isLoading && (
                                <div className="text-center py-10 text-gray-400">
                                    <i className="fa-solid fa-ghost text-4xl mb-2 opacity-20"></i>
                                    <p>{t('noResults')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT PANEL: DETAILS & ACTIONS */}
                    <div className="w-2/3 bg-white dark:bg-[#191E26] flex flex-col relative">
                        {selectedAgent ? (
                            <>
                                {/* Agent Header Stats */}
                                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-br from-white to-orange-50/30 dark:from-[#191E26] dark:to-orange-900/10">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h2 className="text-3xl font-black text-[#232F3E] dark:text-white mb-1">{selectedAgent.name}</h2>
                                            <div className="flex gap-2 text-sm">
                                                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-xs font-bold border border-gray-200 dark:border-gray-600">{t('currentName')}</span>
                                                {aliases[cleanName(selectedAgent.name)] && (
                                                    <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded text-xs font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                                        <i className="fa-solid fa-arrow-right"></i>
                                                        {t('autoConvertTo')}: {aliases[cleanName(selectedAgent.name)]}
                                                    </span>
                                                )}
                                                {/* DELETE BUTTON */}
                                                <button onClick={handleDeleteGlobally} className="bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 dark:text-rose-400 px-2 py-0.5 rounded text-xs font-bold border border-rose-200 dark:border-rose-800 transition-colors flex items-center gap-1">
                                                    <i className="fa-solid fa-trash-can"></i> {t('delete')}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="text-center">
                                                <div className="text-2xl font-black text-emerald-500">{selectedAgent.totalDelivered}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase">Delivered</div>
                                            </div>
                                            <div className="w-px bg-gray-200 dark:bg-gray-700 h-10"></div>
                                            <div className="text-center">
                                                <div className="text-2xl font-black text-[#232F3E] dark:text-white">{selectedAgent.totalOrders}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase">Total</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Box */}
                                    <div className="bg-white dark:bg-[#191E26] border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">{t('editMerge')}</label>
                                        <div className="flex gap-3">
                                            <input 
                                                type="text" 
                                                value={targetName}
                                                onChange={e => setTargetName(e.target.value)}
                                                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 font-bold text-[#232F3E] dark:text-white dark:bg-gray-700 focus:ring-2 focus:ring-[#FF9900] outline-none transition-all text-lg"
                                                placeholder={t('newNamePlaceholder')}
                                                dir={dir}
                                            />
                                            <button 
                                                onClick={handleExecuteChange}
                                                disabled={isProcessing || !targetName || targetName === selectedAgent.name}
                                                className="bg-[#FF9900] hover:bg-[#e68a00] text-white px-8 py-2 rounded-lg font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center min-w-[120px]"
                                            >
                                                {isProcessing ? (
                                                    <i className="fa-solid fa-circle-notch fa-spin text-xl"></i>
                                                ) : (
                                                    <>
                                                        <span className="text-sm">{t('execute')}</span>
                                                        <span className="text-[9px] opacity-80">Update & Save</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        
                                        <div className="mt-3 flex items-center gap-6">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input 
                                                    type="checkbox" 
                                                    checked={saveAsRule}
                                                    onChange={e => setSaveAsRule(e.target.checked)}
                                                    className="w-4 h-4 text-[#FF9900] rounded focus:ring-[#FF9900]"
                                                />
                                                <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-[#232F3E] dark:group-hover:text-white transition-colors">{t('saveRule')}</span>
                                            </label>
                                            
                                            {targetName !== selectedAgent.name && agentsList.some(a => cleanName(a.name) === cleanName(targetName)) && (
                                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                                                    <i className="fa-solid fa-triangle-exclamation"></i>
                                                    {t('mergeWarning').replace('{name}', targetName)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Date Selection Area */}
                                <div className="flex-1 overflow-hidden flex flex-col bg-gray-50 dark:bg-[#111315]">
                                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-[#191E26] sticky top-0 z-10">
                                        <h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm flex items-center gap-2">
                                            <i className="fa-regular fa-calendar-check text-[#FF9900]"></i>
                                            {t('actionLog')}
                                        </h4>
                                        <div className="flex gap-2">
                                            <button onClick={() => setSelectedDates(new Set(getAgentHistoryDetails(selectedAgent.name).map(r => r.date)))} className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded">{t('selectAll')}</button>
                                            <button onClick={() => setSelectedDates(new Set())} className="text-xs text-gray-500 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded">{t('deselectAll')}</button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {getAgentHistoryDetails(selectedAgent.name).map((record, idx) => (
                                                <div 
                                                    key={idx}
                                                    onClick={() => toggleDate(record.date)}
                                                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between group select-none
                                                        ${selectedDates.has(record.date) 
                                                            ? 'bg-white dark:bg-[#232F3E] border-[#FF9900] shadow-sm ring-1 ring-[#FF9900]/20' 
                                                            : 'bg-white dark:bg-[#191E26] border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 opacity-60 hover:opacity-100'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors
                                                            ${selectedDates.has(record.date) ? 'bg-[#FF9900] border-[#FF9900]' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'}`}>
                                                            {selectedDates.has(record.date) && <i className="fa-solid fa-check text-white text-xs"></i>}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-[#232F3E] dark:text-gray-200 font-mono text-sm">{record.date}</div>
                                                            <div className="text-[10px] text-gray-400">
                                                                {record.total ? `${record.total} ${t('shipment')}` : 'Incomplete data'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={`text-xs font-black ${selectedDates.has(record.date) ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                                                        {record.successRate?.toFixed(0)}%
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 bg-gray-50/50 dark:bg-[#111315]">
                                <i className="fa-solid fa-arrow-right text-6xl mb-4 opacity-20 hidden md:block"></i>
                                <i className="fa-solid fa-arrow-up text-6xl mb-4 opacity-20 md:hidden"></i>
                                <p className="text-lg font-bold">{t('selectAgentPrompt')}</p>
                            </div>
                        )}

                        {/* Loading Overlay for Processing */}
                        {isProcessing && (
                            <div className="absolute inset-0 bg-white/90 dark:bg-[#191E26]/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-[#232F3E] dark:text-white">
                                <i className="fa-solid fa-gears fa-spin text-5xl text-[#FF9900] mb-6"></i>
                                <h3 className="text-xl font-bold mb-2">{t('processing')}</h3>
                                <div className="text-sm text-gray-500 font-mono">
                                    {processStep === 'db' && 'Updating database records...'}
                                    {processStep === 'alias' && 'Saving alias rules...'}
                                    {processStep === 'done' && 'Reloading...'}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AliasManagement;