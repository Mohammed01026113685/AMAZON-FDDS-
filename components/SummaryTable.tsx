import { Edit2, ListChecks, ArrowUpDown, ChevronUp, ChevronDown, Copy } from "lucide-react";

import React, { useState, useEffect } from 'react';
import { ProcessedResult, DASummary } from '../types';
import { useSettings } from '../contexts/SettingsContext';

interface SummaryTableProps {
  data: ProcessedResult;
  sortConfig: {key: keyof DASummary, direction: 'asc' | 'desc'} | null;
  onSort: (key: keyof DASummary) => void;
  onUpdateValue: (agentName: string, field: keyof DASummary, value: number) => void;
  onViewDetails: (da: DASummary) => void;
  isSuperAdmin: boolean;
  onUpdateName: (oldName: string, newName: string) => void;
}

const EditableCell = React.memo(({ value, agentName, field, onUpdate, allTrackings = [], status }: { value: number, agentName: string, field: keyof DASummary, onUpdate: any, allTrackings?: any[], status?: string }) => {
  const trackings = React.useMemo(() => status ? allTrackings.filter(t => t.status === status).map(t => t.id) : [], [allTrackings, status]);
  const [localValue, setLocalValue] = useState(value.toString());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  const handleCopy = () => {
      if (trackings.length > 0) {
          navigator.clipboard.writeText(trackings.join('\n'));
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  };

  return (
    <div className="w-full h-full flex items-center justify-center relative group/cell">
      <input 
        type="number" 
        value={localValue} 
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => onUpdate(agentName, field, parseInt(localValue) || 0)}
        className="editable-input focus:bg-[#FFF8E6] dark:focus:bg-gray-700 text-[#0F1111] dark:text-white py-1"
      />
      <span className="hidden">{value}</span>
      {trackings.length > 0 && (
          <button 
              onClick={handleCopy}
              className={`absolute left-1 opacity-0 group-hover/cell:opacity-100 transition-opacity p-1 rounded shadow-sm border ${copied ? 'text-green-500 border-green-500 bg-green-50 dark:bg-green-900/30' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:text-[#FF9900]'}`}
              title="Copy Trackings"
          >
              <Copy size={12} />
          </button>
      )}
    </div>
  );
});

const EditableNameCell = React.memo(({ name, isSuperAdmin, onUpdate }: { name: string, isSuperAdmin: boolean, onUpdate: (old: string, newName: string) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(name);

    const handleBlur = () => {
        setIsEditing(false);
        if (tempName !== name && tempName.trim() !== "") {
            if(window.confirm(`تغيير اسم المندوب من "${name}" إلى "${tempName}"؟\nسيتم حفظ هذا التغيير في قاعدة البيانات للمستقبل.`)) {
                onUpdate(name, tempName);
            } else {
                setTempName(name);
            }
        }
    };

    if (isEditing && isSuperAdmin) {
        return (
            <input 
                autoFocus
                type="text" 
                value={tempName} 
                onChange={e => setTempName(e.target.value)} 
                onBlur={handleBlur}
                className="w-full bg-white dark:bg-gray-700 border border-[#FF9900] rounded px-2 py-1 text-sm font-bold text-[#232F3E] dark:text-white"
            />
        );
    }

    return (
        <div className="flex items-center justify-end gap-2 group/edit">
            {isSuperAdmin && (
                <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover/edit:opacity-100 text-gray-400 hover:text-[#FF9900] transition-opacity">
                    <Edit2 size={10} />
                </button>
            )}
            <span onClick={() => isSuperAdmin && setIsEditing(true)} className={isSuperAdmin ? "cursor-pointer hover:text-[#FF9900] transition-colors" : ""}>
                {name}
            </span>
        </div>
    );
});

const getSuccessColor = (rate: number) => {
  if (rate >= 95) return 'text-[#007185] dark:text-[#4DB6AC]';
  if (rate >= 85) return 'text-emerald-600 dark:text-emerald-400';
  if (rate >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
};

const getBadgeColor = (rate: number) => {
  if (rate >= 95) return 'bg-cyan-50 dark:bg-cyan-900/30 text-[#007185] dark:text-cyan-300 border-cyan-100 dark:border-cyan-800';
  if (rate >= 85) return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800';
  if (rate >= 70) return 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800';
  return 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800';
};

const getProgressColor = (rate: number) => {
  if (rate >= 95) return 'bg-[#007185] dark:bg-[#4DB6AC]';
  if (rate >= 85) return 'bg-emerald-500';
  if (rate >= 70) return 'bg-[#FF9900]';
  return 'bg-[#CC0C39]';
};

interface MobileCardProps {
  s: DASummary;
  onViewDetails: (da: DASummary) => void;
  t: (key: any, params?: any) => string;
}

const MobileCard: React.FC<MobileCardProps> = ({ s, onViewDetails, t }) => (
    <div className="bg-white dark:bg-[#191E26] p-4 rounded-lg border border-[#D5D9D9] dark:border-gray-700 shadow-sm mb-3 relative overflow-hidden">
        {/* Rate Indicator Stripe */}
        <div className={`absolute top-0 bottom-0 right-0 w-1.5 ${getProgressColor(s.successRate)}`}></div>
        
        <div className="flex justify-between items-start mb-3 pl-2 pr-3">
            <div>
                <h3 className="font-black text-[#232F3E] dark:text-white text-sm mb-0.5">{s.daName}</h3>
                <div className="text-[10px] text-gray-400 font-mono">Total: {s.total}</div>
            </div>
            <div className={`px-2 py-1 rounded-lg border text-xs font-black ${getBadgeColor(s.successRate)}`}>
                {Math.round(s.successRate)}%
            </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3 pl-2 pr-3">
             <div className="text-center bg-gray-50 dark:bg-[#232F3E] rounded p-1.5">
                 <span className="block text-[10px] text-gray-400 uppercase">Del</span>
                 <span className="font-bold text-emerald-600 dark:text-emerald-400">{s.delivered}</span>
             </div>
             <div className="text-center bg-gray-50 dark:bg-[#232F3E] rounded p-1.5">
                 <span className="block text-[10px] text-gray-400 uppercase">Fail</span>
                 <span className="font-bold text-rose-600 dark:text-rose-400">{s.failed}</span>
             </div>
             <div className="text-center bg-gray-50 dark:bg-[#232F3E] rounded p-1.5">
                 <span className="block text-[10px] text-gray-400 uppercase">OFD</span>
                 <span className="font-bold text-amber-600 dark:text-amber-400">{s.ofd}</span>
             </div>
             <div className="text-center bg-gray-50 dark:bg-[#232F3E] rounded p-1.5">
                 <span className="block text-[10px] text-gray-400 uppercase">RTO</span>
                 <span className="font-bold text-gray-600 dark:text-gray-400">{s.rto}</span>
             </div>
        </div>
        
        <button 
            onClick={() => onViewDetails(s)}
            className="w-full py-2 bg-gray-50 dark:bg-gray-800 text-[#0F1111] dark:text-white border-t-2 border-gray-200 dark:border-gray-700 text-xs font-bold rounded-lg hover:bg-[#37475A] transition-colors flex items-center justify-center gap-2"
        >
            <ListChecks size={16} />
            {t('details')}
        </button>
    </div>
);

const SummaryTable: React.FC<SummaryTableProps> = ({ data, sortConfig, onSort, onUpdateValue, onViewDetails, isSuperAdmin, onUpdateName }) => {
  const [visibleRows, setVisibleRows] = useState(100);
  
  useEffect(() => {
    setVisibleRows(100);
  }, [data]);

  const { t, dailyGoal } = useSettings();
  
  const getSortIcon = (key: keyof DASummary) => {
    if (sortConfig?.key !== key) return <ArrowUpDown size={10} className="mr-1 opacity-20" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={12} className="mr-1 text-[#FF9900]" /> : <ChevronDown size={12} className="mr-1 text-[#FF9900]" />;
  };

  return (
    <div className="w-full">
      {/* --- Desktop View (Table) --- */}
      <div className="hidden md:block table-view">
          <table className="w-full text-center border-collapse custom-table">
            <thead className="sticky top-0 z-30 bg-gray-50/95 dark:bg-[#151A22]/95 backdrop-blur-md shadow-sm before:content-[''] before:absolute before:left-0 before:right-0 before:bottom-0 before:border-b-2 before:border-[#D5D9D9] dark:before:border-gray-600">
              <tr className="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                <th className="no-print w-10 py-4"></th>
                <th onClick={() => onSort('daName')} className="w-1/4 text-right pr-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group">
                    {t('agentName')} {getSortIcon('daName')}
                </th>
                <th onClick={() => onSort('delivered')} className="py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">{t('delivered')} {getSortIcon('delivered')}</th>
                <th onClick={() => onSort('failed')} className="py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">{t('failed')} {getSortIcon('failed')}</th>
                <th onClick={() => onSort('ofd')} className="py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">{t('ofd')} {getSortIcon('ofd')}</th>
                <th onClick={() => onSort('rto')} className="py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">{t('rto')} {getSortIcon('rto')}</th>
                <th onClick={() => onSort('total')} className="py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors bg-gray-50/50 dark:bg-[#1A202C]/50 text-center">{t('total')} {getSortIcon('total')}</th>
                <th onClick={() => onSort('successRate')} className="w-1/4 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors pl-4">{t('performance')} {getSortIcon('successRate')}</th>
              </tr>
            </thead>
            <tbody>
              {data.summaries.slice(0, visibleRows).map((s, idx) => (
                <tr key={idx} className="group border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors" title={s.successRate < 94 ? `متبقي ${(94 - s.successRate).toFixed(1)}% لتحقيق التارجت (94%)` : 'حقق التارجت (94%) 🏆'}>
                  <td className="no-print">
                    <button 
                      onClick={() => onViewDetails(s)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all mx-auto text-[#232F3E] hover:bg-gray-100 dark:text-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white`}
                      title={t('details')}
                    >
                      <ListChecks size={14} />
                    </button>
                  </td>
                  <td className="text-[#0F1111] dark:text-white font-bold text-sm text-right pr-6 relative whitespace-nowrap">
                    <EditableNameCell name={s.daName} isSuperAdmin={isSuperAdmin} onUpdate={onUpdateName} />
                    
                  </td>
                  <td className="text-[#007185] dark:text-[#4DB6AC] font-bold">
                    <EditableCell value={s.delivered} agentName={s.daName} field="delivered" onUpdate={onUpdateValue} allTrackings={s.allTrackings} status="delivered" />
                  </td>
                  <td className="text-[#CC0C39] dark:text-[#E57373] font-bold">
                    <EditableCell value={s.failed} agentName={s.daName} field="failed" onUpdate={onUpdateValue} allTrackings={s.allTrackings} status="failed" />
                  </td>
                  <td className="text-[#C45500] dark:text-[#FFB74D] font-bold">
                    <EditableCell value={s.ofd} agentName={s.daName} field="ofd" onUpdate={onUpdateValue} allTrackings={s.allTrackings} status="ofd" />
                  </td>
                  <td className="text-[#565959] dark:text-[#B0BEC5] font-bold">
                    <EditableCell value={s.rto} agentName={s.daName} field="rto" onUpdate={onUpdateValue} allTrackings={s.allTrackings} status="rto" />
                  </td>
                  <td className="font-black text-[#0F1111] dark:text-white bg-gray-50/50 dark:bg-[#1A202C]/50 group-hover:bg-transparent transition-colors text-center">
                    {s.total}
                  </td>
                  <td className={`p-3 transition-colors ${s.successRate < 85 ? 'bg-red-50 dark:bg-red-900/20' : s.successRate > 95 ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className={`font-black w-10 text-right tabular-nums text-sm ${getSuccessColor(s.successRate)}`}>
                        {Math.round(s.successRate)}%
                      </span>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner" dir="ltr">
                        <div 
                          className={`h-full rounded-full transition-all duration-700 ease-out ${getProgressColor(s.successRate)}`} 
                          style={{ width: `${Math.min(s.successRate, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-800 text-[#0F1111] dark:text-white border-t-2 border-gray-200 dark:border-gray-700">
              <tr>
                <td colSpan={2} className="p-4 text-right pr-6 font-black tracking-wider text-sm">{t('stationTotal')}</td>
                <td className="font-mono font-bold">{data.grandTotal.delivered}</td>
                <td className="font-mono font-bold text-rose-600 dark:text-rose-400">{data.grandTotal.failed}</td>
                <td className="font-mono font-bold text-amber-600 dark:text-amber-400">{data.grandTotal.ofd}</td>
                <td className="font-mono font-bold text-gray-600 dark:text-gray-400">{data.grandTotal.rto}</td>
                <td className="font-black text-lg bg-gray-200/50 dark:bg-gray-700/50 text-center">{data.grandTotal.total}</td>
                <td className="font-black text-lg text-[#FF9900] px-4">
                    {data.grandTotal.successRate.toFixed(1)}%
                </td>
              </tr>
            </tfoot>
          </table>
      </div>

      {/* --- Mobile View (Cards) --- */}
      <div className="md:hidden card-view bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <div className="flex justify-between items-center mb-4 px-1">
              <h3 className="font-bold text-[#232F3E] dark:text-white">{t('agentList')}</h3>
              <div className="flex items-center gap-2 text-xs bg-white dark:bg-[#191E26] px-2 py-1 rounded border dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">{t('sortBy')}</span>
                  <select 
                    className="bg-transparent font-bold outline-none text-[#FF9900]"
                    onChange={(e) => onSort(e.target.value as any)}
                  >
                      <option value="successRate">{t('performance')}</option>
                      <option value="total">{t('volume')}</option>
                      <option value="failed">{t('failed')}</option>
                  </select>
              </div>
          </div>
          
          <div className="space-y-3">
            {data.summaries.map((s, idx) => <MobileCard key={idx} s={s} onViewDetails={onViewDetails} t={t} />)}
          </div>

          <div className="mt-6 bg-gray-50 dark:bg-gray-800 text-[#0F1111] dark:text-white border-t-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-lg">
              <h3 className="text-center font-bold text-[#FF9900] uppercase tracking-widest mb-4 text-xs">{t('stationSummary')}</h3>
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                  <div>
                      <div className="text-2xl font-black">{data.grandTotal.total}</div>
                      <div className="text-[10px] text-gray-400 uppercase">{t('total')}</div>
                  </div>
                  <div>
                      <div className="text-2xl font-black text-emerald-400">{data.grandTotal.delivered}</div>
                      <div className="text-[10px] text-gray-400 uppercase">{t('delivered')}</div>
                  </div>
                  <div>
                      <div className="text-2xl font-black text-rose-400">{data.grandTotal.failed}</div>
                      <div className="text-[10px] text-gray-400 uppercase">{t('failed')}</div>
                  </div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                  <span className="block text-[10px] text-gray-600 dark:text-gray-400 uppercase mb-1">{t('successRate')}</span>
                  <span className="text-3xl font-black text-[#FF9900]">{data.grandTotal.successRate.toFixed(1)}%</span>
              </div>
          </div>
      </div>
    </div>
  );
};

export default SummaryTable;
