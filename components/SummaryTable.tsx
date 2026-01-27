import React, { useState, useEffect } from 'react';
import { ProcessedResult, DASummary } from '../types';
import { useSettings } from '../contexts/SettingsContext';

interface SummaryTableProps {
  data: ProcessedResult;
  sortConfig: { key: keyof DASummary; direction: 'asc' | 'desc' } | null;
  onSort: (key: keyof DASummary) => void;
  onUpdateValue: (agentName: string, field: keyof DASummary, value: number) => void;
  onViewDetails: (da: DASummary) => void;
  isSuperAdmin: boolean;
  onUpdateName: (oldName: string, newName: string) => void;
  searchQuery?: string;
}

// --- HELPER COMPONENTS ---

const BadgeIcon: React.FC<{ type: string }> = ({ type }) => {
  const config: any = {
    sniper: {
      icon: 'fa-crosshairs',
      color: 'text-rose-500',
      bg: 'bg-rose-100',
      title: 'Sniper',
    },
    turbo: {
      icon: 'fa-jet-fighter',
      color: 'text-blue-500',
      bg: 'bg-blue-100',
      title: 'Turbo',
    },
    guardian: {
      icon: 'fa-shield-halved',
      color: 'text-emerald-500',
      bg: 'bg-emerald-100',
      title: 'Guardian',
    },
    fire: {
      icon: 'fa-fire',
      color: 'text-amber-500',
      bg: 'bg-amber-100',
      title: 'On Fire',
    },
    beast: {
      icon: 'fa-dumbbell',
      color: 'text-purple-500',
      bg: 'bg-purple-100',
      title: 'Beast',
    },
  };
  const s = config[type] || { icon: 'fa-star', color: 'text-gray-500', bg: 'bg-gray-100' };

  return (
    <span
      className={`w-5 h-5 rounded-full ${s.bg} ${s.color} flex items-center justify-center text-[10px] shadow-sm animate-pulse-soft`}
      title={s.title}
    >
      <i className={`fa-solid ${s.icon}`}></i>
    </span>
  );
};

const EditableCell = ({
  value,
  agentName,
  field,
  onUpdate,
}: {
  value: number;
  agentName: string;
  field: keyof DASummary;
  onUpdate: any;
}) => {
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <input
        type="number"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => onUpdate(agentName, field, parseInt(localValue) || 0)}
        className="editable-input focus:bg-[#FFF8E6] dark:focus:bg-gray-700 text-[#0F1111] dark:text-white py-1"
      />
      {/* Hidden span for export/copy ease */}
      <span className="hidden">{value}</span>
    </div>
  );
};

const EditableNameCell = ({
  name,
  isSuperAdmin,
  onUpdate,
}: {
  name: string;
  isSuperAdmin: boolean;
  onUpdate: (old: string, newName: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(name);

  const handleBlur = () => {
    setIsEditing(false);
    if (tempName !== name && tempName.trim() !== '') {
      if (
        window.confirm(
          `تغيير اسم المندوب من "${name}" إلى "${tempName}"؟\nسيتم حفظ هذا التغيير في قاعدة البيانات للمستقبل.`
        )
      ) {
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
        onChange={(e) => setTempName(e.target.value)}
        onBlur={handleBlur}
        className="w-full bg-white dark:bg-gray-700 border border-[#FF9900] rounded px-2 py-1 text-sm font-bold text-[#232F3E] dark:text-white"
      />
    );
  }

  return (
    <div className="flex items-center gap-2 group/edit">
      <span
        onClick={() => isSuperAdmin && setIsEditing(true)}
        className={`font-black text-[15px] tracking-tight text-gray-900 dark:text-white ${
          isSuperAdmin ? 'cursor-pointer hover:text-[#FF9900] transition-colors' : ''
        }`}
      >
        {name}
      </span>
      {isSuperAdmin && (
        <button
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover/edit:opacity-100 text-gray-400 hover:text-[#FF9900] transition-opacity"
        >
          <i className="fa-solid fa-pen text-[10px]"></i>
        </button>
      )}
    </div>
  );
};

const getSuccessColor = (rate: number) => {
  if (rate >= 95) return 'text-[#007185] dark:text-[#4DB6AC]';
  if (rate >= 85) return 'text-emerald-600 dark:text-emerald-400';
  if (rate >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
};

const getBadgeColor = (rate: number) => {
  if (rate >= 95)
    return 'bg-cyan-50 dark:bg-cyan-900/30 text-[#007185] dark:text-cyan-300 border-cyan-100 dark:border-cyan-800';
  if (rate >= 85)
    return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800';
  if (rate >= 70)
    return 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800';
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
  matchedTracking?: { id: string; status: string } | null;
}

const MobileCard: React.FC<MobileCardProps> = ({ s, onViewDetails, t, matchedTracking }) => (
  <div className="bg-white dark:bg-[#191E26] p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm mb-3 relative overflow-hidden group">
    {/* Rate Indicator Stripe */}
    <div
      className={`absolute top-0 bottom-0 right-0 w-1.5 ${getProgressColor(s.successRate)}`}
    ></div>

    <div className="flex justify-between items-start mb-3 pl-2 pr-3">
      <div>
        <h3 className="font-black text-[#232F3E] dark:text-white text-base mb-1 flex items-center gap-2">
          {s.daName}
        </h3>
        <div className="flex gap-1 mb-1">
          {s.badges && s.badges.map((b) => <BadgeIcon key={b} type={b} />)}
        </div>
        <div className="text-[10px] text-gray-400 font-mono">Total: {s.total}</div>
        {matchedTracking && (
          <div className="mt-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded inline-flex items-center gap-1">
            <i className="fa-solid fa-magnifying-glass"></i>
            {matchedTracking.id} ({matchedTracking.status})
          </div>
        )}
      </div>
      <div
        className={`px-2 py-1 rounded-lg border text-xs font-black ${getBadgeColor(
          s.successRate
        )}`}
      >
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

    <div className="flex gap-2 pl-2 pr-3">
      <button
        onClick={() => onViewDetails(s)}
        className="flex-1 py-2 bg-[#232F3E] text-white text-xs font-bold rounded-lg hover:bg-[#37475A] transition-colors flex items-center justify-center gap-2"
      >
        <i className="fa-solid fa-list-check"></i>
        {t('details')}
      </button>
    </div>
  </div>
);

const SummaryTable: React.FC<SummaryTableProps> = ({
  data,
  sortConfig,
  onSort,
  onUpdateValue,
  onViewDetails,
  isSuperAdmin,
  onUpdateName,
  searchQuery = '',
}) => {
  const { t } = useSettings();

  const getSortIcon = (key: keyof DASummary) => {
    if (sortConfig?.key !== key)
      return <i className="fa-solid fa-sort mr-1 opacity-20 text-[10px]"></i>;
    return sortConfig.direction === 'asc' ? (
      <i className="fa-solid fa-caret-up mr-1 text-[#FF9900]"></i>
    ) : (
      <i className="fa-solid fa-caret-down mr-1 text-[#FF9900]"></i>
    );
  };

  return (
    <div className="w-full">
      {/* --- Desktop View (Table) --- */}
      <div className="hidden md:block overflow-x-auto table-view">
        {/* Added a wrapper div with fixed height and sticky header */}
        <div className="relative overflow-auto max-h-[70vh]">
          <table className="w-full text-center border-collapse custom-table">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#232F3E] text-white">
                <th className="no-print w-10 !bg-[#232F3E] !border-b-[#37475A] sticky left-0 z-20"></th>
                <th
                  onClick={() => onSort('daName')}
                  className="!bg-[#232F3E] !text-white w-1/3 text-right pr-6 cursor-pointer hover:bg-[#37475A] transition-colors group !border-b-[#37475A] sticky left-10 z-20"
                >
                  {t('agentName')} {getSortIcon('daName')}
                </th>
                <th
                  onClick={() => onSort('delivered')}
                  className="!bg-[#232F3E] !text-white cursor-pointer hover:bg-[#37475A] transition-colors !border-b-[#37475A]"
                >
                  {t('delivered')} {getSortIcon('delivered')}
                </th>
                <th
                  onClick={() => onSort('failed')}
                  className="!bg-[#232F3E] !text-white cursor-pointer hover:bg-[#37475A] transition-colors !border-b-[#37475A]"
                >
                  {t('failed')} {getSortIcon('failed')}
                </th>
                <th
                  onClick={() => onSort('ofd')}
                  className="!bg-[#232F3E] !text-white cursor-pointer hover:bg-[#37475A] transition-colors !border-b-[#37475A]"
                >
                  {t('ofd')} {getSortIcon('ofd')}
                </th>
                <th
                  onClick={() => onSort('rto')}
                  className="!bg-[#232F3E] !text-white cursor-pointer hover:bg-[#37475A] transition-colors !border-b-[#37475A]"
                >
                  {t('rto')} {getSortIcon('rto')}
                </th>
                <th
                  onClick={() => onSort('total')}
                  className="!bg-[#232F3E] !text-white cursor-pointer hover:bg-[#37475A] transition-colors !border-b-[#37475A]"
                >
                  {t('total')} {getSortIcon('total')}
                </th>
                <th
                  onClick={() => onSort('successRate')}
                  className="!bg-[#232F3E] !text-white w-1/4 cursor-pointer hover:bg-[#37475A] transition-colors !border-b-[#37475A]"
                >
                  {t('performance')} {getSortIcon('successRate')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-[#191E26]">
              {data.summaries.map((s, idx) => {
                const match =
                  searchQuery && searchQuery.length > 2
                    ? s.allTrackings?.find((t) =>
                        t.id.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                    : null;

                return (
                  <tr
                    key={idx}
                    className={`group border-b border-gray-100 dark:border-gray-800 hover:bg-[#f2f8fa] dark:hover:bg-[#232F3E] transition-colors ${
                      match ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''
                    }`}
                  >
                    <td className="no-print py-4 sticky left-0 z-10 bg-white dark:bg-[#191E26] group-hover:bg-[#f2f8fa] dark:group-hover:bg-[#232F3E]">
                      <button
                        onClick={() => onViewDetails(s)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all mx-auto text-gray-400 hover:text-[#232F3E] hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:text-white`}
                        title={t('details')}
                      >
                        <i className="fa-solid fa-list-check text-xs"></i>
                      </button>
                    </td>
                    <td className="text-right pr-6 py-4 relative sticky left-10 z-10 bg-white dark:bg-[#191E26] group-hover:bg-[#f2f8fa] dark:group-hover:bg-[#232F3E]">
                      <div className="flex flex-col justify-center h-full">
                        <EditableNameCell
                          name={s.daName}
                          isSuperAdmin={isSuperAdmin}
                          onUpdate={onUpdateName}
                        />
                        {s.badges && s.badges.length > 0 && (
                          <div className="flex gap-1 mt-1.5">
                            {s.badges.map((b) => (
                              <BadgeIcon key={b} type={b} />
                            ))}
                          </div>
                        )}
                      </div>
                      {match && (
                        <div className="mt-2 flex items-center gap-1 animate-pulse">
                          <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 px-1.5 py-0.5 rounded border border-yellow-300 dark:border-yellow-700 font-mono font-bold flex items-center gap-1">
                            <i className="fa-solid fa-magnifying-glass text-[9px]"></i>
                            {match.id}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="text-[#007185] dark:text-[#4DB6AC] font-bold text-lg py-4">
                      <EditableCell
                        value={s.delivered}
                        agentName={s.daName}
                        field="delivered"
                        onUpdate={onUpdateValue}
                      />
                    </td>
                    <td className="text-[#CC0C39] dark:text-[#E57373] font-bold text-lg py-4">
                      <EditableCell
                        value={s.failed}
                        agentName={s.daName}
                        field="failed"
                        onUpdate={onUpdateValue}
                      />
                    </td>
                    <td className="text-[#C45500] dark:text-[#FFB74D] font-bold text-lg py-4">
                      <EditableCell
                        value={s.ofd}
                        agentName={s.daName}
                        field="ofd"
                        onUpdate={onUpdateValue}
                      />
                    </td>
                    <td className="text-[#565959] dark:text-[#B0BEC5] font-bold text-lg py-4">
                      <EditableCell
                        value={s.rto}
                        agentName={s.daName}
                        field="rto"
                        onUpdate={onUpdateValue}
                      />
                    </td>
                    <td className="font-black text-[#0F1111] dark:text-white bg-gray-50/50 dark:bg-gray-800/50 text-lg py-4">
                      {s.total}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-black w-12 text-right tabular-nums text-lg ${getSuccessColor(
                            s.successRate
                          )}`}
                        >
                          {Math.round(s.successRate)}%
                        </span>
                        <div
                          className="flex-1 h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner"
                          dir="ltr"
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${getProgressColor(
                              s.successRate
                            )}`}
                            style={{ width: `${Math.min(s.successRate, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-[#232F3E] text-white sticky bottom-0 z-10">
              <tr>
                <td
                  colSpan={2}
                  className="p-4 text-right pr-6 font-bold uppercase tracking-wider text-sm sticky left-0 z-20"
                >
                  {t('stationTotal')}
                </td>
                <td className="font-mono font-bold text-lg">{data.grandTotal.delivered}</td>
                <td className="font-mono font-bold text-lg text-rose-300">
                  {data.grandTotal.failed}
                </td>
                <td className="font-mono font-bold text-lg text-amber-300">
                  {data.grandTotal.ofd}
                </td>
                <td className="font-mono font-bold text-lg text-gray-300">
                  {data.grandTotal.rto}
                </td>
                <td className="font-black text-xl bg-white/10">{data.grandTotal.total}</td>
                <td className="font-black text-xl text-[#FF9900] px-4">
                  {data.grandTotal.successRate.toFixed(1)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
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
          {data.summaries.map((s, idx) => {
            const match =
              searchQuery && searchQuery.length > 2
                ? s.allTrackings?.find((t) =>
                    t.id.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                : null;
            return (
              <MobileCard
                key={idx}
                s={s}
                onViewDetails={onViewDetails}
                t={t}
                matchedTracking={match}
              />
            );
          })}
        </div>

        <div className="mt-6 bg-[#232F3E] text-white rounded-xl p-4 shadow-lg">
          <h3 className="text-center font-bold text-[#FF9900] uppercase tracking-widest mb-4 text-xs">
            {t('stationSummary')}
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div>
              <div className="text-2xl font-black">{data.grandTotal.total}</div>
              <div className="text-[10px] text-gray-400 uppercase">{t('total')}</div>
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-400">
                {data.grandTotal.delivered}
              </div>
              <div className="text-[10px] text-gray-400 uppercase">{t('delivered')}</div>
            </div>
            <div>
              <div className="text-2xl font-black text-rose-400">{data.grandTotal.failed}</div>
              <div className="text-[10px] text-gray-400 uppercase">{t('failed')}</div>
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <span className="block text-[10px] text-gray-300 uppercase mb-1">
              {t('successRate')}
            </span>
            <span className="text-3xl font-black text-[#FF9900]">
              {data.grandTotal.successRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryTable;