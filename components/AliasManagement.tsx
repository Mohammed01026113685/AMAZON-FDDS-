
import React, { useState, useEffect, useMemo } from 'react';
import { fetchAliases, saveAliases, batchUpdateAgentName, fetchHistory, deleteAgentGlobally } from '../services/firebase';
import { cleanName } from '../services/excelProcessor';
import { HistoryRecord, STATIONS } from '../types';
import { useSettings } from '../contexts/SettingsContext';

interface AliasManagementProps {
    onClose: () => void;
    onAliasesUpdated: (newAliases: Record<string, string>) => void;
    userStationAccess: string;
}

interface AgentStat {
    name: string;
    totalOrders: number;
    totalDelivered: number;
    daysWorked: number;
    lastSeen: string;
}

const AliasManagement: React.FC<AliasManagementProps> = ({ onClose, onAliasesUpdated, userStationAccess }) => {
    const { t, dir } = useSettings();
    // Data State
    const [history, setHistory] = useState<HistoryRecord[]>([]);
    const [aliases, setAliases] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    
    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStation, setFilterStation] = useState<string>(userStationAccess === 'All' ? 'All' : userStationAccess);
    const [selectedAgent, setSelectedAgent] = useState<AgentStat | null>(null);
    const [targetName, setTargetName] = useState('');
    const [activeTab, setActiveTab] = useState<'history' | 'rules'>('history');
    
    // Actions State
    const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
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
            const recStation = record.station || 'DQN3';
            if (filterStation !== 'All' && recStation !== filterStation) return;
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
                if (new Date(record.id || record.date) > new Date(stats[a.daName].lastSeen)) {
                    stats[a.daName].lastSeen = record.date;
                }
            });
        });

        return Object.values(stats)
            .sort((a, b) => b.totalOrders - a.totalOrders); // Sort by volume
    }, [history, filterStation]);

    const filteredAgents = useMemo(() => {
        return agentsList.filter(a => (a.name || "").toLowerCase().includes((searchTerm || "").toLowerCase()));
    }, [agentsList, searchTerm]);

    // --- 3. Interaction Handlers ---

    const handleSelectAgent = (agent: AgentStat) => {
        setSelectedAgent(agent);
        setTargetName(agent.name); // Default to current name
        // Find dates where this agent worked
        const docIds = history
            .filter(r => {
                const recStation = r.station || 'DQN3';
                if (filterStation !== 'All' && recStation !== filterStation) return false;
                return r.agents && r.agents.some(a => a.daName === agent.name);
            })
            .map(r => r.id || r.date);
        setSelectedDocIds(new Set(docIds));
    };

    const toggleDocId = (id: string) => {
        const newSet = new Set(selectedDocIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedDocIds(newSet);
    };

    
    const handleDeleteRule = async (originalName: string) => {
        if (!window.confirm(`هل أنت متأكد من حذف القاعدة لـ "${originalName}"؟`)) return;
        const newAliases = { ...aliases };
        delete newAliases[originalName];
        setIsProcessing(true);
        setProcessStep('alias');
        try {
            await saveAliases(newAliases);
            setAliases(newAliases);
            onAliasesUpdated(newAliases);
        } catch(e: any) {
            alert("Error: " + e.message);
        } finally {
            setIsProcessing(false);
            setProcessStep('');
        }
    };

    const handleUpdateRule = async (originalName: string, newTargetName: string) => {
        if (!newTargetName.trim()) return;
        if (newTargetName.trim() === aliases[originalName]) return;
        
        const newAliases = { ...aliases, [originalName]: cleanName(newTargetName) };
        setIsProcessing(true);
        setProcessStep('alias');
        try {
            await saveAliases(newAliases);
            setAliases(newAliases);
            onAliasesUpdated(newAliases);
        } catch(e: any) {
            alert("Error: " + e.message);
        } finally {
            setIsProcessing(false);
            setProcessStep('');
        }
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

        if (cleanTarget === cleanSource && selectedDocIds.size === 0) {
            alert("No changes detected.");
            return;
        }

        if (!window.confirm(`Change "${selectedAgent.name}" to "${cleanTarget}"?\n${selectedDocIds.size} records will be affected.`)) return;

        setIsProcessing(true);
        setProcessStep('init');

        try {
            // 1. Database Update (Retroactive)
            if (selectedDocIds.size > 0 && cleanTarget !== cleanSource) {
                setProcessStep('db');
                await batchUpdateAgentName(Array.from(selectedDocIds), selectedAgent.name, cleanTarget);
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
            console.error(error instanceof Error ? error.message : error);
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
                return { id: r.id || r.date, date: r.date, ...data };
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 modal-overlay animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-[#191E26] w-full max-w-6xl rounded-xl shadow-2xl overflow-hidden animate-scale-in flex flex-col h-[85vh] border border-gray-700" onClick={e => e.stopPropagation()}>                
                
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
                
                {/* Tabs */}
                <div className="flex bg-white dark:bg-[#191E26] border-b border-[#D5D9D9] dark:border-gray-700 shrink-0">
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'history' ? 'border-[#FF9900] text-[#232F3E] dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        سجل التعديلات والمناديب
                    </button>
                    <button 
                        onClick={() => setActiveTab('rules')}
                        className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'rules' ? 'border-[#FF9900] text-[#232F3E] dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        قواعد التعديل الحالية (Aliases)
                    </button>
                </div>

                {/* Main Content - Split View */}
                <div className="flex flex-1 overflow-hidden relative">
                    
                    {activeTab === 'history' && (
                        <>
                            {/* LEFT PANEL: AGENT LIST */}
                            <div className={`w-1/3 bg-[#f3f4f6] dark:bg-[#111315] ${dir==='rtl'?'border-l':'border-r'} border-[#D5D9D9] dark:border-gray-700 flex flex-col`}>
                                {/* Search Bar & Station Filter */}
                                <div className="p-4 bg-white dark:bg-[#191E26] border-b border-[#D5D9D9] dark:border-gray-700 shadow-sm z-10 flex flex-col gap-3">
                                    {userStationAccess === 'All' && (
                                        <select 
                                            value={filterStation} 
                                            onChange={(e) => setFilterStation(e.target.value)}
                                            className="w-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2.5 rounded-lg text-sm font-bold outline-none border border-blue-100 dark:border-blue-800 cursor-pointer"
                                        >
                                            <option value="All">{t('allStations')}</option>
                                            {STATIONS.filter(s => s !== 'ALL').map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    )}
                                    <div className="relative">
                                        <i className={`fa-solid fa-search absolute ${dir==='rtl'?'right-3':'left-3'} top-1/2 -translate-y-1/2 text-gray-400`}></i>
                                        <input 
                                            type="text"
                                            placeholder={t('searchDa')}
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className={`w-full bg-gray-50 dark:bg-gray-800 text-[#232F3E] dark:text-white border border-[#D5D9D9] dark:border-gray-600 rounded-lg py-2 ${dir==='rtl'?'pr-9 pl-3':'pl-9 pr-3'} outline-none focus:border-[#FF9900] transition-colors text-sm font-bold`}
                                        />
                                    </div>
                                </div>
                                
                                {/* Agent List */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    {isLoading ? (
                                        <div className="flex flex-col items-center justify-center h-40 text-[#FF9900]">
                                            <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-2"></i>
                                            <span className="font-bold text-sm">{t('loading')}</span>
                                        </div>
                                    ) : filteredAgents.length === 0 ? (
                                        <div className="p-8 text-center text-gray-500 font-bold">
                                            {t('noData')}
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-[#D5D9D9] dark:divide-gray-700">
                                            {filteredAgents.map(agent => (
                                                <div 
                                                    key={agent.name}
                                                    onClick={() => handleSelectAgent(agent)}
                                                    className={`p-3 cursor-pointer transition-all hover:bg-white dark:hover:bg-gray-800 flex justify-between items-center group
                                                        ${selectedAgent?.name === agent.name ? 'bg-white dark:bg-gray-800 border-l-4 border-l-[#FF9900]' : 'border-l-4 border-transparent'}`}
                                                >
                                                    <div className="overflow-hidden">
                                                        <div className={`font-black truncate ${selectedAgent?.name === agent.name ? 'text-[#FF9900]' : 'text-[#232F3E] dark:text-gray-200'}`}>
                                                            {agent.name}
                                                        </div>
                                                        <div className="flex gap-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-1">
                                                            <span className="flex items-center gap-1"><i className="fa-solid fa-box text-gray-400"></i> {agent.totalOrders} {t('shipment')}</span>
                                                            <span className="flex items-center gap-1"><i className="fa-regular fa-calendar text-gray-400"></i> {agent.daysWorked} {t('days')}</span>
                                                        </div>
                                                    </div>
                                                    <i className={`fa-solid fa-chevron-${dir==='rtl'?'left':'right'} text-gray-300 group-hover:text-[#FF9900] transition-colors ${selectedAgent?.name === agent.name ? 'text-[#FF9900]' : ''}`}></i>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* RIGHT PANEL: DETAILS & ACTIONS */}
                            <div className="flex-1 flex flex-col bg-white dark:bg-[#191E26]">
                                {selectedAgent ? (
                                    <>
                                        {/* Action Header */}
                                        <div className="p-6 border-b border-[#D5D9D9] dark:border-gray-700 bg-gray-50 dark:bg-[#111315]">
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <h2 className="text-2xl font-black text-[#232F3E] dark:text-white mb-1">{selectedAgent.name}</h2>
                                                    <div className="flex gap-4 text-xs font-bold text-gray-500">
                                                        <span>{t('totalVolume')}: <span className="text-[#232F3E] dark:text-gray-300">{selectedAgent.totalOrders}</span></span>
                                                        <span>{t('daysLog')}: <span className="text-[#232F3E] dark:text-gray-300">{selectedAgent.daysWorked}</span></span>
                                                        <span>{t('lastSeen')}: <span className="text-[#232F3E] dark:text-gray-300">{selectedAgent.lastSeen}</span></span>
                                                    </div>
                                                </div>
                                                
                                                <button 
                                                    onClick={handleDeleteGlobally}
                                                    className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 border border-red-200"
                                                    title={t('eraseAgent')}
                                                >
                                                    <i className="fa-solid fa-trash-can"></i>
                                                    <span className="hidden sm:inline">{t('eraseAgent')}</span>
                                                </button>
                                            </div>

                                            <div className="bg-white dark:bg-[#191E26] p-4 rounded-xl border border-[#D5D9D9] dark:border-gray-700 shadow-sm">
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                                    <i className="fa-solid fa-wand-magic-sparkles text-[#FF9900] mr-1"></i> {t('renameAgent')}
                                                </label>
                                                
                                                <div className="flex gap-3">
                                                    <input 
                                                        type="text"
                                                        value={targetName}
                                                        onChange={e => setTargetName(e.target.value)}
                                                        className="flex-1 bg-gray-50 dark:bg-gray-800 text-[#232F3E] dark:text-white border border-[#D5D9D9] dark:border-gray-600 rounded-lg px-4 py-2 font-bold outline-none focus:border-[#FF9900] transition-colors"
                                                        placeholder="Enter new name..."
                                                    />
                                                    <button 
                                                        onClick={handleExecuteChange}
                                                        disabled={selectedDocIds.size === 0 || isProcessing}
                                                        className="bg-[#232F3E] dark:bg-white text-white dark:text-[#232F3E] px-6 py-2 rounded-lg font-bold hover:bg-[#131921] dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                    >
                                                        {isProcessing ? (
                                                            <><i className="fa-solid fa-circle-notch fa-spin"></i> {t('processing')}</>
                                                        ) : (
                                                            <>
                                                                <i className="fa-solid fa-bolt text-[#FF9900]"></i>
                                                                <span>Update {selectedDocIds.size} {t('days')} & Save</span>
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
                                            <div className="p-3 border-b border-[#D5D9D9] dark:border-gray-700 flex justify-between items-center bg-white dark:bg-[#191E26] sticky top-0 z-10">
                                                <h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm flex items-center gap-2">
                                                    <i className="fa-regular fa-calendar-check text-[#FF9900]"></i>
                                                    {t('actionLog')}
                                                </h4>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setSelectedDocIds(new Set(getAgentHistoryDetails(selectedAgent.name).map(r => r.id)))} className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded">{t('selectAll')}</button>
                                                    <button onClick={() => setSelectedDocIds(new Set())} className="text-xs text-gray-500 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded">{t('deselectAll')}</button>
                                                </div>
                                            </div>
                                            
                                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {getAgentHistoryDetails(selectedAgent.name).map((record, idx) => (
                                                        <div 
                                                            key={record.id || idx}
                                                            onClick={() => toggleDocId(record.id)}
                                                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between group select-none
                                                                ${selectedDocIds.has(record.id) 
                                                                    ? 'bg-white dark:bg-[#232F3E] border-[#FF9900] shadow-sm ring-1 ring-[#FF9900]/20' 
                                                                    : 'bg-white dark:bg-[#191E26] border-[#D5D9D9] dark:border-gray-700 hover:border-[#D5D9D9] dark:hover:border-gray-600 opacity-60 hover:opacity-100'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors
                                                                    ${selectedDocIds.has(record.id) ? 'bg-[#FF9900] border-[#FF9900]' : 'border-[#D5D9D9] dark:border-gray-600 bg-gray-50 dark:bg-gray-700'}`}>
                                                                    {selectedDocIds.has(record.id) && <i className="fa-solid fa-check text-white text-xs"></i>}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-[#232F3E] dark:text-gray-200 font-mono text-sm">{record.date}</div>
                                                                    <div className="text-[10px] text-gray-400">
                                                                        {record.total ? `${record.total} ${t('shipment')}` : 'Incomplete data'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className={`text-xs font-black ${selectedDocIds.has(record.id) ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
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
                            </div>
                        </>
                    )}

                    {activeTab === 'rules' && (
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-[#111315]">
                            <h2 className="text-xl font-bold mb-4 text-[#232F3E] dark:text-white">قواعد تعديل الأسماء (Aliases)</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                هذه هي القواعد المحفوظة التي تقوم تلقائياً بتغيير أسماء المناديب عند رفع الملفات. يمكنك تعديل الاسم الجديد أو حذف القاعدة تماماً.
                            </p>
                            
                            {Object.keys(aliases).length === 0 ? (
                                <div className="text-center py-10 text-gray-500">لا توجد قواعد تعديل محفوظة حالياً.</div>
                            ) : (
                                <div className="bg-white dark:bg-[#191E26] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                                    <table className="w-full text-sm text-left rtl:text-right">
                                        <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                            <tr>
                                                <th className="px-6 py-4 font-black">الاسم الأصلي (في الشيت)</th>
                                                <th className="px-6 py-4 font-black">الاسم المعدل (الجديد)</th>
                                                <th className="px-6 py-4 font-black text-center">إجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {Object.entries(aliases).map(([original, target]) => (
                                                <tr key={original} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                    <td className="px-6 py-3 font-bold text-gray-700 dark:text-gray-300">
                                                        <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 px-3 py-1.5 rounded-lg inline-block border border-rose-200 dark:border-rose-800/50">
                                                            {original}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 font-bold">
                                                        <input 
                                                            type="text" 
                                                            defaultValue={target}
                                                            onBlur={(e) => handleUpdateRule(original, e.target.value)}
                                                            className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-[#232F3E] dark:text-white outline-none focus:border-[#FF9900] w-full max-w-xs transition-colors"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        <button 
                                                            onClick={() => handleDeleteRule(original)}
                                                            className="text-rose-600 hover:text-white hover:bg-rose-600 px-3 py-1.5 rounded-lg transition-colors font-bold flex items-center justify-center gap-2 mx-auto"
                                                        >
                                                            <i className="fa-solid fa-trash"></i>
                                                            <span className="hidden sm:inline">حذف القاعدة</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
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
    );
};

export default AliasManagement;
