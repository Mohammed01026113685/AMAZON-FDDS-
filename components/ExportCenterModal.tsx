import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Calendar, Clock, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { HistoryRecord } from '../types';
import { exportCurrentFailedRtoReport } from '../services/exportService';

interface ExportCenterModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: HistoryRecord[];
}

const ExportCenterModal: React.FC<ExportCenterModalProps> = ({ isOpen, onClose, history }) => {
    const { t, dir } = useSettings();
    const [period, setPeriod] = useState<number>(1); // days
    const [isExporting, setIsExporting] = useState(false);

    if (!isOpen) return null;

    const handleExport = async () => {
        setIsExporting(true);
        try {
            // Sort history by date descending
            const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            // Get records within the period
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - period);
            
            const recordsToExport = sortedHistory.filter(record => new Date(record.date) >= cutoffDate);
            
            if (recordsToExport.length === 0) {
                alert("لا توجد بيانات في هذه الفترة");
                setIsExporting(false);
                return;
            }

            // Aggregate data
            let allSummaries: any[] = [];
            recordsToExport.forEach(record => {
                if (record.data && record.data.summaries) {
                    // Add date to each summary for tracking
                    const summariesWithDate = record.data.summaries.map(s => ({
                        ...s,
                        reportDate: record.date
                    }));
                    allSummaries = [...allSummaries, ...summariesWithDate];
                }
            });

            // Create a fake ProcessedResult for the exporter
            const aggregatedData = {
                summaries: allSummaries,
                grandTotal: { delivered: 0, failed: 0, ofd: 0, rto: 0, total: 0, successRate: 0 } // dummy
            };

            await exportCurrentFailedRtoReport(aggregatedData, `${period}_Days`, `Failed_RTO_${period}_Days`);
        } catch (error) {
            console.error("Export error:", error);
            alert("حدث خطأ أثناء التصدير");
        } finally {
            setIsExporting(false);
            onClose();
        }
    };

    return (
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
                className="bg-white dark:bg-[#1A1A1A] w-full max-w-md rounded-lg shadow-2xl overflow-hidden relative z-10 border border-[#D5D9D9] dark:border-gray-800" 
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-gray-50 dark:bg-white/5 border-b border-[#D5D9D9] dark:border-white/10 p-5 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500">
                            <Download size={18} />
                        </div>
                        تصدير شحنات Failed / RTO
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors bg-white dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center shadow-sm">
                        <X size={16} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6" dir={dir}>
                    <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-lg flex gap-3 text-sm font-medium">
                        <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                        <p>
                            سيتم سحب جميع الشحنات الغير منتهية (Failed & RTO) في شيت إكسيل مفلتر ومقسم ليسهل متابعتها يوم بيوم.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                            <Calendar size={16} className="text-[#FF9900]" />
                            اختر فترة السحب (تاريخ السجلات)
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { value: 1, label: 'يوم (اليوم)' },
                                { value: 7, label: 'أسبوع' },
                                { value: 15, label: '15 يوم' },
                                { value: 30, label: 'شهر' }
                            ].map(opt => (
                                <button 
                                    key={opt.value}
                                    onClick={() => setPeriod(opt.value)}
                                    className={`py-3 px-4 rounded-lg font-bold text-sm transition-all duration-300 border flex items-center justify-center gap-2
                                    ${period === opt.value 
                                        ? 'bg-[#FF9900] text-white border-[#FF9900] shadow-md' 
                                        : 'bg-white dark:bg-[#1A1A1A] text-gray-600 dark:text-gray-400 border-[#D5D9D9] dark:border-gray-700 hover:border-[#FF9900] hover:text-[#FF9900]'}`}
                                >
                                    <Clock size={16} className={period === opt.value ? 'opacity-100' : 'opacity-50'} />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={handleExport}
                        disabled={isExporting}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-70 disabled:cursor-not-allowed font-bold py-4 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all"
                    >
                        {isExporting ? (
                            <>جاري التصدير...</>
                        ) : (
                            <>
                                <FileSpreadsheet size={20} />
                                تحميل شيت التتبع والمتابعة
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ExportCenterModal;
