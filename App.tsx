import React, { useState, useTransition, useMemo, useEffect, useCallback, Suspense } from 'react';
import DropZone from './components/DropZone';
import SummaryTable from './components/SummaryTable';
import UserManagement from './components/UserManagement';
import AliasManagement from './components/AliasManagement';
import StandupView from './components/StandupView';
import GoalCalculator from './components/GoalCalculator';
import CustomDialog from './components/CustomDialog';
import { ToastContainer, ToastMessage } from './components/Toast';
import { processShipments, cleanName } from './services/excelProcessor';
import { exportToExcel, exportAsImage, exportToPDF } from './services/exportService';
import { saveDailyRecord, fetchHistory, loginUser, logoutUser, subscribeToAuth, deleteDailyRecord, isUserAdmin, fetchAliases, updateDailyRecord, saveAliases, isMock } from './services/firebase';
import { ProcessedResult, DASummary, HistoryRecord, TrackingDetail } from './types';
import { User } from 'firebase/auth';
import confetti from 'canvas-confetti';
import { useSettings } from './contexts/SettingsContext';

// Lazy Load Heavy Components
const HistoryDashboard = React.lazy(() => import('./components/HistoryDashboard'));

// --- DEFINE SUPER ADMIN EMAIL ---
const SUPER_ADMIN_EMAIL = 'mohammedhashmed88@gmail.com';

// --- WELCOME BANNER COMPONENT ---
const WelcomeBanner: React.FC<{ user: User | null, data: ProcessedResult | null, dir: string, isSuperAdmin: boolean }> = ({ user, data, dir, isSuperAdmin }) => {
    const [greeting, setGreeting] = useState('');
    const [time, setTime] = useState('');

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const hour = now.getHours();
            if (hour < 12) setGreeting('صباح الخير');
            else if (hour < 18) setGreeting('طاب مساؤك');
            else setGreeting('مساء الخير');
            
            setTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
        };
        updateTime();
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, []);

    if (!user && !data) return null;

    return (
        <div className="w-full max-w-[1400px] mx-auto px-4 mb-6 animate-slide-up">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#232F3E] via-[#2C3A4B] to-[#232F3E] shadow-xl border border-gray-700/50">
                {/* Decorative Circles */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9900] rounded-full blur-[100px] opacity-10 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500 rounded-full blur-[80px] opacity-10 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-6 md:p-8 text-white">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                            <i className="fa-solid fa-user-astronaut text-3xl text-[#FF9900]"></i>
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-2xl md:text-3xl font-black tracking-tight">{greeting}, {user ? (isSuperAdmin ? ' Admin' : isUserAdmin(user) ? 'Admin' : 'Captain') : 'Guest'}</h2>
                                <span className="bg-[#FF9900] text-[#232F3E] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{time}</span>
                            </div>
                            <p className="text-gray-400 text-sm font-medium">
                                {user ? (isSuperAdmin ? ' System Administrator' : isUserAdmin(user) ? 'System Administrator' : 'Delivery Captain') : 'Guest Mode'}
                            </p>
                        </div>
                    </div>

                    {data && (
                        <div className="mt-6 md:mt-0 flex gap-4">
                            <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/10 text-center">
                                <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">نسبة النجاح</div>
                                <div className={`text-2xl font-black ${data.grandTotal.successRate >= 90 ? 'text-emerald-400' : 'text-[#FF9900]'}`}>
                                    {data.grandTotal.successRate.toFixed(1)}%
                                </div>
                            </div>
                            <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/10 text-center">
                                <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">الحجم الكلي</div>
                                <div className="text-2xl font-black text-white">{data.grandTotal.total}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MINI PODIUM COMPONENT ---
const MiniPodium: React.FC<{ summaries: DASummary[] }> = ({ summaries }) => {
    const top3 = [...summaries].sort((a,b) => b.successRate - a.successRate).slice(0, 3);
    if (top3.length < 3) return null;

    return (
        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-8 h-48 md:h-56 items-end no-print px-4 md:px-20 mt-8">
            {/* 2nd Place */}
            <div className="flex flex-col items-center animate-slide-up" style={{animationDelay: '0.1s'}}>
                <div className="mb-2 text-center w-full px-2">
                    <div className="font-bold text-[#232F3E] dark:text-gray-200 text-xs md:text-sm text-center leading-tight break-words">{top3[1].daName}</div>
                    <div className="text-emerald-500 font-black text-sm md:text-xl mt-1">{top3[1].successRate.toFixed(1)}%</div>
                </div>
                <div className="w-full bg-gradient-to-t from-gray-300 to-gray-200 dark:from-gray-700 dark:to-gray-600 h-24 md:h-32 rounded-t-xl flex items-end justify-center pb-2 shadow-lg relative">
                    <span className="text-3xl font-black text-black/10 dark:text-white/10">2</span>
                    {top3[1].badges?.includes('sniper') && <div className="absolute top-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs shadow-lg animate-bounce"><i className="fa-solid fa-crosshairs"></i></div>}
                </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center animate-slide-up z-10">
                <i className="fa-solid fa-crown text-[#FFD814] text-3xl mb-2 animate-float"></i>
                <div className="mb-2 text-center w-full px-2">
                    <div className="font-bold text-[#232F3E] dark:text-gray-200 text-xs md:text-sm text-center leading-tight break-words">{top3[0].daName}</div>
                    <div className="text-[#FF9900] font-black text-lg md:text-2xl mt-1">{top3[0].successRate.toFixed(1)}%</div>
                </div>
                <div className="w-full bg-gradient-to-t from-[#FF9900] to-[#FFD814] h-32 md:h-40 rounded-t-xl flex items-end justify-center pb-2 shadow-xl relative">
                    <span className="text-5xl font-black text-black/10">1</span>
                    {top3[0].badges?.includes('fire') && <div className="absolute top-2 w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center text-sm shadow-lg animate-pulse"><i className="fa-solid fa-fire"></i></div>}
                </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center animate-slide-up" style={{animationDelay: '0.2s'}}>
                <div className="mb-2 text-center w-full px-2">
                    <div className="font-bold text-[#232F3E] dark:text-gray-200 text-xs md:text-sm text-center leading-tight break-words">{top3[2].daName}</div>
                    <div className="text-emerald-500 font-black text-sm md:text-xl mt-1">{top3[2].successRate.toFixed(1)}%</div>
                </div>
                <div className="w-full bg-gradient-to-t from-[#CD7F32] to-[#e6a26b] h-16 md:h-24 rounded-t-xl flex items-end justify-center pb-2 shadow-lg relative">
                    <span className="text-3xl font-black text-black/10">3</span>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const { t, theme, toggleTheme, dir, appTitle } = useSettings();

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  // Notification & Dialog State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [dialogConfig, setDialogConfig] = useState<{
      isOpen: boolean;
      type: 'alert' | 'confirm' | 'info';
      title: string;
      message: string;
      onConfirm: () => void;
      onCancel?: () => void;
  }>({
      isOpen: false,
      type: 'info',
      title: '',
      message: '',
      onConfirm: () => {},
  });

  // Login Modal State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Management Modals (Admin Only)
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showAliasManagement, setShowAliasManagement] = useState(false);

  // Feature Modals
  const [showStandup, setShowStandup] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  // Track Shipment Modal
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackInput, setTrackInput] = useState('');
  const [trackResults, setTrackResults] = useState<{date: string, agent: string, tracking: string, status?: string}[] | null>(null);

  // Tabs State
  const [activeTab, setActiveTab] = useState<'daily' | 'history'>('daily');

  // Data State
  const [data, setData] = useState<ProcessedResult | null>(null);
  const [aliases, setAliases] = useState<Record<string, string>>({}); 
  const [isPending, startTransition] = useTransition();
  const [isLoadingManual, setIsLoadingManual] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableScale, setTableScale] = useState(1);
  const [sortConfig, setSortConfig] = useState<{key: keyof DASummary, direction: 'asc' | 'desc'} | null>({key: 'successRate', direction: 'desc'});
  
  // New Shipment Detail Modal State
  const [selectedAgentDetails, setSelectedAgentDetails] = useState<{name: string, trackings: TrackingDetail[]} | null>(null);
  const [detailModalTab, setDetailModalTab] = useState<'Delivered' | 'Failed' | 'OFD' | 'RTO'>('Failed');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Date State
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // History State
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // --- Notification Helpers ---
  const addToast = useCallback((type: 'success' | 'error' | 'info' | 'warning', text: string) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, type, text }]);
  }, []);

  const removeToast = (id: number) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  };

  const showMessage = useCallback((type: 'alert' | 'confirm' | 'info', title: string, message: string, onConfirm: () => void) => {
      setDialogConfig({
          isOpen: true,
          type,
          title,
          message,
          onConfirm: () => {
              onConfirm();
              setDialogConfig(prev => ({ ...prev, isOpen: false }));
          },
          onCancel: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
      });
  }, []);

  // Check Auth Status on Mount
  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      const adminStatus = isUserAdmin(currentUser);
      setIsAdmin(adminStatus);
      // تحقق إذا كان المشرف الرئيسي
      const superAdminStatus = currentUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
      setIsSuperAdmin(superAdminStatus);
      setIsAuthLoading(false);
      if (currentUser) {
        loadHistoryData();
        loadAliases();
      } else {
        setHistory([]);
        setActiveTab('daily');
        setShowUserManagement(false);
        setShowAliasManagement(false);
        setAliases({});
      }
    });
    return () => unsubscribe();
  }, []);

  const loadHistoryData = async () => {
    setIsLoadingHistory(true);
    const records = await fetchHistory();
    setHistory(records);
    setIsLoadingHistory(false);
  };

  const loadAliases = async () => {
      const map = await fetchAliases();
      setAliases(map);
  };

  const handleDeleteHistory = async (date: string) => {
      try {
          await deleteDailyRecord(date);
          await loadHistoryData();
          addToast('success', t('deleteSuccess'));
      } catch (e: any) {
          addToast('error', t('failedError') + e.message);
      }
  };

  const handleUpdateRecord = async (date: string, agents: any[], stationTotal: any) => {
      try {
          await updateDailyRecord(date, agents, stationTotal);
          await loadHistoryData();
          addToast('success', t('updateSuccess'));
      } catch (e: any) {
          addToast('error', t('failedError') + e.message);
      }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      await loginUser(email, password);
      setShowLoginModal(false);
      setEmail('');
      setPassword('');
      addToast('success', t('loginSuccess'));
    } catch (err: any) {
      addToast('error', err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    showMessage('confirm', t('logout'), t('logoutConfirm'), async () => {
        try {
            await logoutUser();
            window.location.reload();
        } catch (error) {
            console.error("Logout failed", error);
        }
    });
  };

  const handleUpdateAgentName = async (oldName: string, newName: string) => {
      if (!data) return;
      
      const newSummaries = data.summaries.map(s => {
          if(s.daName === oldName) {
              return { ...s, daName: newName };
          }
          return s;
      });
      
      setData({ ...data, summaries: newSummaries });
      
      // Update Alias in DB
      try {
          const cleanedOld = cleanName(oldName);
          const cleanedNew = cleanName(newName);
          const newAliasMap = { ...aliases, [cleanedOld]: cleanedNew };
          await saveAliases(newAliasMap);
          setAliases(newAliasMap);
          addToast('success', `تم تغيير الاسم وتحديث قاعدة البيانات`);
      } catch (e) {
          console.error(e);
          addToast('error', 'حدث خطأ أثناء حفظ الاسم في قاعدة البيانات');
      }
  };

  const handleArchiveToday = async () => {
    if (!data || !user || !isSuperAdmin) return;
    
    const saveAction = async () => {
        const record: HistoryRecord = {
          date: reportDate,
          timestamp: new Date(reportDate).getTime(),
          stationTotal: {
            delivered: data.grandTotal.delivered,
            total: data.grandTotal.total,
            successRate: data.grandTotal.successRate
          },
          agents: data.summaries.map(s => ({
            daName: s.daName,
            delivered: s.delivered,
            total: s.total,
            successRate: s.successRate,
            shipmentDetails: s.allTrackings || [], 
            trackings: s.pendingTrackings 
          }))
        };

        try {
          await saveDailyRecord(record);
          const updatedHistory = await fetchHistory();
          setHistory(updatedHistory);
          // VISIBLE FEEDBACK FOR MOCK MODE
          if (isMock) {
              addToast('success', 'تم حفظ البيانات محلياً (وضع التجربة)');
          } else {
              addToast('success', t('archiveSuccess')); // Saved to Firebase
          }
          setActiveTab('history');
        } catch (e: any) {
          addToast('error', t('failedError') + e.message);
        }
    };

    const existingIndex = history.findIndex(h => h.date === reportDate);
    if (existingIndex >= 0) {
      showMessage('confirm', t('warning'), `Records exist for ${reportDate}. Overwrite?`, saveAction);
    } else {
        saveAction();
    }
  };

  const handleFileSelect = (file: File) => {
    setIsLoadingManual(true);
    
    // --- SMART DATE DETECTION ---
    const fileName = file.name;
    const datePattern1 = /(\d{4})[-._](\d{2})[-._](\d{2})/; // YYYY-MM-DD
    const datePattern2 = /(\d{2})[-._](\d{2})[-._](\d{4})/; // DD-MM-YYYY

    const match1 = fileName.match(datePattern1);
    const match2 = fileName.match(datePattern2);

    if (match1) {
        const detectedDate = `${match1[1]}-${match1[2]}-${match1[3]}`;
        if(!isNaN(new Date(detectedDate).getTime())) {
            setReportDate(detectedDate);
            addToast('info', `تم ضبط التاريخ تلقائياً إلى: ${detectedDate}`);
        }
    } else if (match2) {
        const detectedDate = `${match2[3]}-${match2[2]}-${match2[1]}`;
        if(!isNaN(new Date(detectedDate).getTime())) {
            setReportDate(detectedDate);
            addToast('info', `تم ضبط التاريخ تلقائياً إلى: ${detectedDate}`);
        }
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const bstr = e.target?.result;
        if (typeof bstr !== 'string') throw new Error("Failed to read file");
        
        const XLSX = await import('xlsx');
        
        const workbook = XLSX.read(bstr, { type: 'binary' });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error("Excel file is empty");
        }

        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        const processed = processShipments(rawData, aliases);
        startTransition(() => {
          setData(processed);
          setIsLoadingManual(false);
          addToast('success', t('analysisSuccess'));
          
          if (processed.grandTotal.successRate > 90) {
              confetti({
                  particleCount: 100,
                  spread: 70,
                  origin: { y: 0.6 }
              });
          }
        });
      } catch (err: any) {
        addToast('error', err.message);
        setData(null);
        setIsLoadingManual(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleUpdateValue = (agentName: string, field: keyof DASummary, value: number) => {
    if (!data) return;
    const newSummaries = data.summaries.map(s => {
      if (s.daName === agentName) {
        const updatedAgent = { ...s, [field]: value };
        updatedAgent.total = (updatedAgent.delivered || 0) + (updatedAgent.failed || 0) + (updatedAgent.ofd || 0) + (updatedAgent.rto || 0);
        updatedAgent.successRate = updatedAgent.total > 0 ? (updatedAgent.delivered / updatedAgent.total) * 100 : 0;
        return updatedAgent;
      }
      return s;
    });
    const newGrandTotal = newSummaries.reduce((acc, curr) => ({
      delivered: acc.delivered + (curr.delivered || 0),
      failed: acc.failed + (curr.failed || 0),
      ofd: acc.ofd + (curr.ofd || 0),
      rto: acc.rto + (curr.rto || 0),
      total: acc.total + curr.total,
      successRate: 0
    }), { delivered: 0, failed: 0, ofd: 0, rto: 0, total: 0, successRate: 0 });
    newGrandTotal.successRate = newGrandTotal.total > 0 ? (newGrandTotal.delivered / newGrandTotal.total) * 100 : 0;
    setData({ summaries: newSummaries, grandTotal: newGrandTotal });
  };

  const handleSort = (key: keyof DASummary) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredData = useMemo(() => {
    if (!data) return null;
    const query = searchQuery.toLowerCase().trim();
    
    let list = [...data.summaries].filter(s => {
      if (s.daName.toLowerCase().includes(query)) return true;
      if (s.allTrackings && s.allTrackings.some(t => t.id.toLowerCase().includes(query))) {
          return true;
      }
      if (s.pendingTrackings && s.pendingTrackings.some(t => t.toLowerCase().includes(query))) {
          return true;
      }
      return false;
    });

    if (sortConfig) {
      list.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (typeof aVal === 'string') return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
        return sortConfig.direction === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      });
    }
    return { ...data, summaries: list };
  }, [data, searchQuery, sortConfig]);

  const copyAllFailed = () => {
    if (!data) return;
    // جمع الشحنات OFD فقط من جميع الوكالات
    const allOFDTrackings: string[] = [];
    
    data.summaries.forEach(agent => {
      if (agent.allTrackings) {
        // البحث عن الشحنات بحالة OFD
        const ofdTrackings = agent.allTrackings
          .filter(tracking => tracking.status === 'ofd')
          .map(tracking => tracking.id);
        
        allOFDTrackings.push(...ofdTrackings);
      }
    });
    
    if (allOFDTrackings.length > 0) {
      navigator.clipboard.writeText(allOFDTrackings.join('\n'));
      addToast('info', `${t('copied')} ${allOFDTrackings.length} OFD tracking numbers!`);
    } else {
      addToast('warning', 'No OFD shipments found to copy');
    }
  };

  // --- Export Functions ---
  const handleImageExport = async () => {
    if (!data) return;
    setExporting(true);
    try {
      await exportAsImage('table-container');
      addToast('success', 'تم تصدير الصورة بنجاح');
    } catch (error) {
      addToast('error', 'فشل تصدير الصورة');
    } finally {
      setExporting(false);
    }
  };
  
  const handlePDFExport = () => {
    if (!data) return;
    setExporting(true);
    try {
      exportToPDF(data, reportDate);
      addToast('success', t('pdfGenerated'));
    } catch (error) {
      addToast('error', 'فشل إنشاء ملف PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleExcelExport = () => {
    if (!data) return;
    setExporting(true);
    try {
      exportToExcel(data);
      addToast('success', 'تم تصدير ملف Excel بنجاح');
    } catch (error) {
      addToast('error', 'فشل تصدير ملف Excel');
    } finally {
      setExporting(false);
    }
  };

  const handleTrackShipment = (e: React.FormEvent) => {
      e.preventDefault();
      if (!trackInput || trackInput.length < 3) {
          addToast('warning', 'Please enter at least 3 characters');
          return;
      }
      
      const tId = trackInput.trim().toUpperCase();
      const results: {date: string, agent: string, tracking: string, status?: string}[] = [];

      if (data) {
          for (const agent of data.summaries) {
              const match = agent.allTrackings?.find(t => t.id.includes(tId));
              if (match) {
                  results.push({ date: 'Today (Live)', agent: agent.daName, tracking: match.id, status: match.status });
              } else {
                  const simpleMatch = agent.pendingTrackings.find(t => t.includes(tId));
                  if(simpleMatch) {
                      results.push({ date: 'Today (Live)', agent: agent.daName, tracking: simpleMatch, status: 'unknown' });
                  }
              }
          }
      }

      history.forEach(day => {
          if (day.agents) {
              day.agents.forEach(agent => {
                  if (agent.shipmentDetails) {
                      const match = agent.shipmentDetails.find(t => t.id.includes(tId));
                      if (match) {
                          results.push({ date: day.date, agent: agent.daName, tracking: match.id, status: match.status });
                          return;
                      }
                  }
                  
                  if (agent.trackings) {
                      const match = agent.trackings.find(t => t.includes(tId));
                      if (match) {
                          results.push({ date: day.date, agent: agent.daName, tracking: match, status: 'failed/ofd' });
                      }
                  }
              });
          }
      });
      
      setTrackResults(results);
  };

  const reset = () => { setData(null); };

  const isLoading = isLoadingManual || isPending;

  const MetricCard: React.FC<{ title: string; value: string | number; icon: string; subtext?: string; color?: string }> = ({ title, value, icon, subtext, color = "text-[#232F3E] dark:text-gray-100" }) => (
    <div className="modern-card p-6 flex items-center justify-between relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-gray-50 to-transparent dark:from-white/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
      <div className={`flex-1 relative z-10 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
        <p className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider mb-2">{title}</p>
        <h3 className={`text-4xl font-black tabular-nums font-mono leading-none ${color}`}>{value}</h3>
        {subtext && <p className="text-[11px] text-gray-400 mt-2 font-medium">{subtext}</p>}
      </div>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${color.replace('text', 'bg').replace('600', '50')} ${color}`}>
        <i className={`fa-solid ${icon}`}></i>
      </div>
    </div>
  );

  const getCurrentTabList = () => {
      if (!selectedAgentDetails) return [];
      const statusMap: Record<string, string> = {
          'Delivered': 'delivered',
          'Failed': 'failed',
          'OFD': 'ofd',
          'RTO': 'rto'
      };
      return selectedAgentDetails.trackings.filter(t => t.status === statusMap[detailModalTab]);
  };

  const getTabCount = (tab: string) => {
      if (!selectedAgentDetails) return 0;
      const statusMap: Record<string, string> = {
          'Delivered': 'delivered',
          'Failed': 'failed',
          'OFD': 'ofd',
          'RTO': 'rto'
      };
      return selectedAgentDetails.trackings.filter(t => t.status === statusMap[tab]).length;
  };

  if (isAuthLoading) {
    return (
        <div className="min-h-screen bg-[#232F3E] flex flex-col gap-4 items-center justify-center text-white">
            <i className="fa-brands fa-amazon text-6xl fa-bounce text-[#FF9900]"></i>
            <div className="mt-4 font-bold tracking-widest animate-pulse">{appTitle} FDDS</div>
        </div>
    );
  }

  return (
    <div className="min-h-screen font-sans text-[#0F1111] dark:text-gray-100 dark:bg-[#0F1111]" dir={dir}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <CustomDialog 
          isOpen={dialogConfig.isOpen}
          type={dialogConfig.type}
          title={dialogConfig.title}
          message={dialogConfig.message}
          onConfirm={dialogConfig.onConfirm}
          onCancel={dialogConfig.onCancel}
      />
      
      {showStandup && data && <StandupView data={data} onClose={() => setShowStandup(false)} />}
      
      {showCalculator && data && <GoalCalculator isOpen={showCalculator} onClose={() => setShowCalculator(false)} summaries={data.summaries} />}

      <header className="glass-header sticky top-0 z-50 transition-all duration-300">
         <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex justify-between items-center text-white">
            <div className="flex items-center gap-3 md:gap-4">
                <i className="fa-brands fa-amazon text-3xl md:text-4xl text-white mt-1 hover:text-[#FF9900] transition-colors cursor-pointer"></i>
                <div className={`leading-none border-gray-600 ${dir === 'rtl' ? 'border-l pl-3 ml-2' : 'border-r pr-3 mr-2'}`}>
                    <h1 className="font-bold text-sm md:text-lg tracking-wide">{appTitle}</h1>
                    <span className="text-[10px] md:text-xs text-gray-400 block mt-0.5">{t('performanceCenter')}</span>
                </div>
                {/* MOCK INDICATOR */}
                {isMock && (
                    <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500 text-amber-500 rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        Demo Mode (Local)
                    </div>
                )}
                
            </div>
            
            <div className="flex items-center gap-4">
                {user ? (
                    <div className="hidden md:flex gap-1 bg-[#19222d]/50 p-1 rounded-lg border border-white/10">
                      <button 
                        onClick={() => setActiveTab('daily')} 
                        className={`text-xs font-bold px-4 py-2 rounded-md transition-all duration-300 flex items-center gap-2 ${activeTab === 'daily' ? 'bg-[#FF9900] text-[#232F3E] shadow-lg transform scale-105' : 'text-gray-300 hover:bg-white/5'}`}
                      >
                        <i className="fa-solid fa-clipboard-list"></i>
                        {t('dailyReport')}
                      </button>
                      <button 
                        onClick={() => setActiveTab('history')} 
                        className={`text-xs font-bold px-4 py-2 rounded-md transition-all duration-300 flex items-center gap-2 ${activeTab === 'history' ? 'bg-[#FF9900] text-[#232F3E] shadow-lg transform scale-105' : 'text-gray-300 hover:bg-white/5'}`}
                      >
                        <i className="fa-solid fa-chart-line"></i>
                        {t('archive')}
                      </button>
                    </div>
                ) : (
                    <div></div>
                )}
                
                <div className="flex items-center gap-3">
                   {user && (
                       <button onClick={() => setShowTrackModal(true)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#FF9900] hover:text-[#232F3E] flex items-center justify-center transition-colors" title="Track Package">
                           <i className="fa-solid fa-magnifying-glass"></i>
                       </button>
                   )}

                   <button onClick={() => window.location.reload()} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" title="Reload App">
                       <i className="fa-solid fa-rotate-right"></i>
                   </button>

                   <button onClick={toggleTheme} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                       {theme === 'dark' ? <i className="fa-solid fa-sun text-yellow-300"></i> : <i className="fa-solid fa-moon"></i>}
                   </button>

                   {user ? (
                       <>
                         <div className="flex gap-2">
                             {/* === التغيير: عرض أزرار الإدارة فقط للمشرف الرئيسي === */}
                             {isSuperAdmin && (
                                <>
                                 <button onClick={() => setShowAliasManagement(true)} className="bg-[#37475A] hover:bg-[#485769] w-8 h-8 rounded-full flex items-center justify-center transition-all border border-gray-600 shadow-lg group relative" title={t('aliases')}>
                                     <i className="fa-solid fa-shuffle text-white text-xs"></i>
                                 </button>
                                 <button onClick={() => setShowUserManagement(true)} className="bg-[#37475A] hover:bg-[#485769] w-8 h-8 rounded-full flex items-center justify-center transition-all border border-gray-600 shadow-lg group relative" title={t('users')}>
                                     <i className="fa-solid fa-users-gear text-white text-xs"></i>
                                     <span className="absolute -top-1 -right-1 bg-[#FF9900] w-2.5 h-2.5 rounded-full border border-[#37475A]"></span>
                                 </button>
                                </>
                             )}
                             
                             {/* بادج المشرف الرئيسي */}
                             {isSuperAdmin && (
                                 <div className="relative group">
                                     <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-r from-[#FF9900] to-[#FFD814] rounded-full flex items-center justify-center border-2 border-[#232F3E] shadow-lg animate-pulse z-20">
                                         <i className="fa-solid fa-crown text-[9px] text-[#232F3E]"></i>
                                     </div>
                                 </div>
                             )}
                             
                             <button onClick={handleLogout} className="bg-[#37475A] hover:bg-red-600 w-8 h-8 rounded-full flex items-center justify-center transition-all border border-gray-600 shadow-lg" title={t('logout')}>
                               <i className="fa-solid fa-power-off text-white text-xs"></i>
                             </button>
                         </div>
                       </>
                   ) : (
                       <button 
                         onClick={() => setShowLoginModal(true)}
                         className="bg-[#FF9900] hover:bg-[#F7CA00] text-[#232F3E] px-4 py-2 rounded-full text-xs font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
                       >
                         <i className="fa-solid fa-lock"></i>
                         {t('loginAdmin')}
                       </button>
                   )}
                </div>
            </div>
         </div>
         
         {/* Mobile Navigation Bar */}
         {user && (
            <div className="md:hidden border-t border-white/10 bg-[#232F3E]">
                <div className="flex">
                    <button onClick={() => setActiveTab('daily')} className={`flex-1 py-3 text-center text-xs font-bold ${activeTab === 'daily' ? 'text-[#FF9900] bg-white/5' : 'text-gray-400'}`}>
                        <i className="fa-solid fa-clipboard-list block mb-1 text-sm"></i> {t('dailyReport')}
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 text-center text-xs font-bold ${activeTab === 'history' ? 'text-[#FF9900] bg-white/5' : 'text-gray-400'}`}>
                        <i className="fa-solid fa-chart-line block mb-1 text-sm"></i> {t('archive')}
                    </button>
                </div>
            </div>
         )}
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-6 md:py-8 pb-20">
        <WelcomeBanner user={user} data={data} dir={dir} isSuperAdmin={isSuperAdmin} />

        {user && activeTab === 'history' ? (
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center h-96 animate-fade-in gap-4">
                <i className="fa-solid fa-circle-notch fa-spin text-4xl text-[#FF9900]"></i>
                <div className="text-gray-400 font-bold">Loading module...</div>
            </div>
          }>
            {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center h-96 animate-fade-in gap-4">
                    <div className="relative">
                        <i className="fa-brands fa-amazon text-6xl text-gray-200 dark:text-gray-700"></i>
                        <i className="fa-brands fa-amazon text-6xl text-[#FF9900] absolute top-0 left-0 animate-ping opacity-20"></i>
                    </div>
                    <div className="text-gray-400 font-bold animate-pulse">Loading history...</div>
                </div>
            ) : (
                <HistoryDashboard 
                    history={history} 
                    onDeleteRecord={handleDeleteHistory}
                    onUpdateRecord={handleUpdateRecord}
                    isAdmin={isAdmin}
                    isSuperAdmin={isSuperAdmin}
                    onOpenUserManagement={() => setShowUserManagement(true)}
                    onOpenAliasManagement={() => setShowAliasManagement(true)}
                    showMessage={showMessage}
                    onRefresh={loadHistoryData}
                />
            )}
          </Suspense>
        ) : (
          /* Daily Dashboard View */
          <>
             {/* Toolbar */}
             <div className="mb-6 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center no-print animate-slide-up sticky top-20 xl:static z-40">
              <div className="w-full xl:w-auto flex flex-col sm:flex-row gap-3 bg-white dark:bg-[#191E26] p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <button onClick={reset} className="p-3 w-full sm:w-12 h-12 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center" title={t('clear')}>
                  <i className="fa-solid fa-trash-can"></i>
                </button>
                
                {/* DATE PICKER ALWAYS VISIBLE FOR BATCH UPLOADS */}
                <div className="flex items-center gap-2 bg-[#FF9900]/10 dark:bg-[#FF9900]/20 px-3 rounded-xl border border-[#FF9900]/30 flex-1 sm:flex-none h-12">
                   <i className="fa-regular fa-calendar text-[#FF9900]"></i>
                   <input 
                       type="date" 
                       value={reportDate}
                       onChange={(e) => setReportDate(e.target.value)}
                       className="bg-transparent text-sm font-bold text-[#232F3E] dark:text-white outline-none w-full sm:w-auto cursor-pointer"
                       title="تاريخ التقرير (يحدد تاريخ الحفظ في الأرشيف)"
                   />
                </div>

                {data && (
                  <>
                    <div className="flex gap-2 flex-1 sm:flex-none overflow-x-auto pb-1 sm:pb-0">
                        <button 
                            onClick={() => setShowStandup(true)} 
                            className="whitespace-nowrap bg-[#232F3E] text-white px-4 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#37475A] transition-all shadow-lg min-w-[120px]"
                        >
                          <i className="fa-solid fa-tv"></i> {t('tvView')}
                        </button>

                        <button 
                            onClick={() => setShowCalculator(true)} 
                            className="whitespace-nowrap bg-purple-600 text-white px-4 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition-all shadow-md min-w-[100px]"
                        >
                          <i className="fa-solid fa-calculator"></i> {t('calculator')}
                        </button>

                        {/* === التغيير: عرض زر الحفظ فقط للمشرف الرئيسي === */}
                        {user && isSuperAdmin && (
                            <button onClick={handleArchiveToday} className="whitespace-nowrap btn-amz-primary px-4 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 min-w-[100px]">
                              <i className="fa-solid fa-cloud-arrow-up"></i> {t('save')}
                            </button>
                        )}
                        
                        {/* زر خاص للمشرف الرئيسي */}
                        {user && isSuperAdmin && (
                            <button 
                                onClick={() => {
                                    addToast('info', 'Cief Admin Access - Full System Control');
                                }} 
                                className="whitespace-nowrap bg-gradient-to-r from-[#FF9900] to-[#FFD814] text-[#232F3E] px-4 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 min-w-[120px] shadow-lg hover:shadow-xl"
                                title=" Administrator Privileges"
                            >
                              <i className="fa-solid fa-shield"></i>  Admin
                            </button>
                        )}
                        
                        {/* Export Buttons */}
                        <div className="flex bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600">
                            <button onClick={handleImageExport} disabled={exporting} className={`px-3 h-12 text-gray-600 dark:text-gray-300 hover:text-[#232F3E] hover:bg-gray-50 dark:hover:bg-gray-700 rounded-${dir==='rtl'?'r':'l'}-xl transition-colors`} title="تصدير كصورة">
                              <i className="fa-solid fa-image"></i>
                            </button>
                            <button onClick={handlePDFExport} className={`px-3 h-12 text-gray-600 dark:text-gray-300 hover:text-[#232F3E] hover:bg-gray-50 dark:hover:bg-gray-700 border-${dir==='rtl'?'l':'r'} border-gray-100 dark:border-gray-600 transition-colors`} title="تصدير كملف PDF">
                              <i className="fa-solid fa-file-pdf text-red-600"></i>
                            </button>
                            <button onClick={handleExcelExport} className={`px-3 h-12 text-gray-600 dark:text-gray-300 hover:text-[#232F3E] hover:bg-gray-50 dark:hover:bg-gray-700 rounded-${dir==='rtl'?'l':'r'}-xl border-${dir==='rtl'?'l':'r'} border-gray-100 dark:border-gray-600 transition-colors`} title="تصدير كملف Excel">
                              <i className="fa-solid fa-file-excel text-emerald-600"></i>
                            </button>
                        </div>
                        
                        <button onClick={copyAllFailed} className="whitespace-nowrap btn-amz-dark px-4 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 min-w-[120px]">
                          <i className="fa-solid fa-copy"></i> Copy OFD
                        </button>
                    </div>
                  </>
                )}
              </div>
              
              {data && (
                <div className="w-full xl:w-80 relative group">
                  <div className={`absolute inset-y-0 ${dir==='rtl'?'right-0 pr-4':'left-0 pl-4'} flex items-center pointer-events-none`}>
                     <i className="fa-solid fa-magnifying-glass text-gray-400 group-focus-within:text-[#FF9900] transition-colors"></i>
                  </div>
                  <input 
                    type="text" placeholder={t('searchAgent')}
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full bg-white dark:bg-[#191E26] h-12 ${dir==='rtl'?'pr-11 pl-4':'pl-11 pr-4'} rounded-2xl border-none shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 focus:ring-2 focus:ring-[#FF9900] text-sm font-bold text-[#232F3E] dark:text-white transition-all`}
                  />
                </div>
              )}
            </div>

            {!data ? (
              <div className="max-w-2xl mx-auto mt-10 md:mt-20 animate-scale-in no-print px-4">
                 <div className="bg-white dark:bg-[#191E26] p-1 rounded-3xl shadow-2xl shadow-gray-200/50 dark:shadow-none">
                     <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-[20px] overflow-hidden relative">
                        <DropZone onFileSelect={handleFileSelect} isLoading={isLoading} />
                     </div>
                 </div>
                 
                 {!user && (
                    <div className="mt-8 text-center">
                        <p className="text-gray-400 text-sm font-medium mb-2">{t('areYouAdmin')}</p>
                        <button onClick={() => setShowLoginModal(true)} className="text-[#007185] dark:text-[#4DB6AC] font-bold text-sm hover:underline">
                            {t('loginPrompt')}
                        </button>
                    </div>
                 )}
              </div>
            ) : (
              <div className="space-y-6 md:space-y-8 animate-fade-in">
                {/* Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
                  <MetricCard title={t('totalVolume')} value={data.grandTotal.total} icon="fa-boxes-stacked" subtext="Total Shipments Volume" color="text-[#232F3E] dark:text-gray-100" />
                  <MetricCard title={t('successRate')} value={`${data.grandTotal.successRate.toFixed(1)}%`} icon="fa-percent" subtext="Overall Success Rate" color={data.grandTotal.successRate >= 90 ? "text-emerald-600 dark:text-emerald-400" : "text-[#FF9900]"} />
                  <MetricCard title={t('pending')} value={data.grandTotal.ofd + data.grandTotal.failed} icon="fa-clock" subtext="Pending Actions" color="text-amber-600 dark:text-amber-400" />
                  <MetricCard title={t('workforce')} value={data.summaries.length} icon="fa-users" subtext="Active Workforce" color="text-blue-600 dark:text-blue-400" />
                </div>

                {/* Main Table Container */}
                <div className="flex flex-col items-center">
                    <div id="table-container" className="w-full bg-white dark:bg-[#191E26] md:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 relative group">
                        
                        {/* Print/Export Header */}
                        <div className="bg-[#232F3E] text-white p-6 flex justify-between items-center show-on-export hidden">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">{appTitle}</h2>
                                <p className="text-gray-300 text-sm">Final Delivery Daily Summary</p>
                            </div>
                            <div className="text-right">
                                <span className="font-mono text-xl font-bold text-[#FF9900]">{reportDate}</span>
                            </div>
                        </div>

                        {/* Responsive Component */}
                        <SummaryTable 
                            data={sortedAndFilteredData!} 
                            sortConfig={sortConfig} 
                            onSort={handleSort} 
                            onUpdateValue={handleUpdateValue}
                            onViewDetails={(da) => {
                                setSelectedAgentDetails({ name: da.daName, trackings: da.allTrackings });
                                setIsModalOpen(true);
                            }}
                            isSuperAdmin={isSuperAdmin}
                            onUpdateName={handleUpdateAgentName}
                            searchQuery={searchQuery}
                        />

                         {/* INSTANT MINI PODIUM (Below Table) */}
                        <div className="no-print pb-8 bg-gray-50/50 dark:bg-[#111315]">
                             <MiniPodium summaries={data.summaries} />
                        </div>

                    </div>

                    {/* Zoom Controls */}
                    <div className="flex justify-center gap-3 mt-6 no-print bg-white dark:bg-[#191E26] p-2 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">
                       <button onClick={() => setTableScale(prev => Math.max(0.6, prev - 0.1))} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 hover:bg-[#FF9900] hover:text-white text-gray-500 transition-colors flex items-center justify-center"><i className="fa-solid fa-minus text-xs"></i></button>
                       <span className="flex items-center font-bold text-gray-500 dark:text-gray-400 text-xs w-16 justify-center">{Math.round(tableScale*100)}%</span>
                       <button onClick={() => setTableScale(prev => Math.min(1.2, prev + 0.1))} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 hover:bg-[#FF9900] hover:text-white text-gray-500 transition-colors flex items-center justify-center"><i className="fa-solid fa-plus text-xs"></i></button>
                    </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Login Modal */}
      {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay animate-fade-in" onClick={() => setShowLoginModal(false)}>
            <div className="glass-panel w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="bg-[#232F3E] p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF9900] rounded-full blur-[60px] opacity-20"></div>
                    <i className="fa-brands fa-amazon text-5xl text-white mb-2 relative z-10"></i>
                    <h2 className="text-white font-bold text-lg relative z-10">{t('accessControl')}</h2>
                </div>
                <div className="p-8 bg-white dark:bg-[#191E26]">
                    <form onSubmit={handleLogin} className="space-y-5" dir={dir}>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-300 uppercase mb-1">{t('email')}</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF9900] focus:bg-white dark:focus:bg-gray-600 outline-none transition-all font-bold text-[#232F3E] dark:text-white"
                            placeholder="admin@amazon.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-300 uppercase mb-1">{t('password')}</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF9900] focus:bg-white dark:focus:bg-gray-600 outline-none transition-all font-bold text-[#232F3E] dark:text-white"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isLoggingIn}
                        className="w-full bg-gradient-to-r from-[#FFD814] to-[#F7CA00] hover:from-[#F7CA00] hover:to-[#FFD814] text-[#0F1111] py-3.5 rounded-xl shadow-md font-bold text-sm transition-all transform hover:scale-[1.02] active:scale-95 flex justify-center items-center gap-2"
                    >
                        {isLoggingIn ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-arrow-right"></i>}
                        {isLoggingIn ? t('verifying') : t('loginBtn')}
                    </button>
                    </form>
                </div>
            </div>
          </div>
      )}

      {/* User Management Modal */}
      {showUserManagement && <UserManagement onClose={() => setShowUserManagement(false)} isSuperAdmin={isSuperAdmin} />}

      {/* Alias Management Modal */}
      {showAliasManagement && (
          <AliasManagement 
            onClose={() => setShowAliasManagement(false)} 
            onAliasesUpdated={(newAliases) => setAliases(newAliases)} 
            isSuperAdmin={isSuperAdmin}
          />
      )}

      {/* Track Shipment Modal */}
      {showTrackModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 modal-overlay animate-fade-in" onClick={() => { setShowTrackModal(false); setTrackResults(null); setTrackInput(''); }}>
              <div className="bg-white dark:bg-[#191E26] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                  <div className="bg-[#232F3E] p-5 text-white flex justify-between items-center">
                      <h3 className="font-bold"><i className="fa-solid fa-magnifying-glass"></i> Track Shipment</h3>
                      <button onClick={() => { setShowTrackModal(false); setTrackResults(null); setTrackInput(''); }}><i className="fa-solid fa-xmark"></i></button>
                  </div>
                  <div className="p-6">
                      <form onSubmit={handleTrackShipment}>
                          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Tracking ID / TBA (Partial Match)</label>
                          <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={trackInput}
                                onChange={e => setTrackInput(e.target.value)}
                                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 font-bold dark:bg-gray-700 dark:text-white"
                                placeholder="Enter last 4 digits..."
                                autoFocus
                            />
                            <button type="submit" className="bg-[#FF9900] text-[#232F3E] px-4 py-2 rounded-lg font-bold">Search</button>
                          </div>
                      </form>

                      {trackResults !== null && (
                          <div className="mt-6 animate-fade-in max-h-[300px] overflow-y-auto custom-scrollbar">
                              {trackResults.length > 0 ? (
                                  <div className="space-y-3">
                                      <p className="text-xs text-gray-400 mb-2 text-left">Found {trackResults.length} matches:</p>
                                      {trackResults.map((res, i) => (
                                          <div key={i} className="p-4 bg-white dark:bg-[#232F3E] rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col gap-3">
                                              {/* Top Row: ID and Date */}
                                              <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-2">
                                                  <div>
                                                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Tracking ID</span>
                                                      <h4 className="font-mono font-black text-[#232F3E] dark:text-white text-base">{res.tracking}</h4>
                                                  </div>
                                                  <span className="text-[10px] bg-gray-100 dark:bg-black/30 px-2 py-1 rounded-full text-gray-500 font-bold">{res.date}</span>
                                              </div>
                                              
                                              {/* Bottom Row: Agent and Status */}
                                              <div className="flex justify-between items-center">
                                                  <div>
                                                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-0.5">Agent</span>
                                                      <div className="flex items-center gap-2">
                                                          <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs">
                                                              <i className="fa-solid fa-user text-gray-500"></i>
                                                          </div>
                                                          <p className="text-sm font-bold text-[#232F3E] dark:text-gray-200">{res.agent}</p>
                                                      </div>
                                                  </div>

                                                  <div className="text-right">
                                                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-0.5">Status</span>
                                                      {/* Enhanced Status Badges */}
                                                      {res.status === 'delivered' && (
                                                          <span className="inline-flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs px-3 py-1 rounded-full font-black uppercase">
                                                              <i className="fa-solid fa-check"></i> Delivered
                                                          </span>
                                                      )}
                                                      {(res.status === 'failed' || res.status === 'failed/ofd') && (
                                                          <span className="inline-flex items-center gap-1.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-xs px-3 py-1 rounded-full font-black uppercase">
                                                              <i className="fa-solid fa-triangle-exclamation"></i> Failed / Delayed
                                                          </span>
                                                      )}
                                                      {res.status === 'rto' && (
                                                          <span className="inline-flex items-center gap-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-3 py-1 rounded-full font-black uppercase">
                                                              <i className="fa-solid fa-arrow-rotate-left"></i> RTO
                                                          </span>
                                                      )}
                                                      {res.status === 'ofd' && (
                                                          <span className="inline-flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs px-3 py-1 rounded-full font-black uppercase">
                                                              <i className="fa-solid fa-truck-fast"></i> OFD
                                                          </span>
                                                      )}
                                                      {!res.status && (
                                                          <span className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs px-3 py-1 rounded-full font-black uppercase">
                                                              Unknown
                                                          </span>
                                                      )}
                                                  </div>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                      <i className="fa-solid fa-circle-question text-3xl text-gray-400 mb-2"></i>
                                      <p className="font-bold text-gray-500">Not found in database.</p>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Shipment Details Modal */}
      {isModalOpen && selectedAgentDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay animate-fade-in" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white dark:bg-[#191E26] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-[#232F3E] text-white">
               <div>
                 <h4 className="text-lg font-black leading-none mb-1">{selectedAgentDetails.name}</h4>
                 <p className="text-xs text-gray-300 font-bold uppercase tracking-wider">Shipment Details</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                {['Failed', 'OFD', 'RTO', 'Delivered'].map(tab => (
                    <button 
                        key={tab} 
                        onClick={() => setDetailModalTab(tab as any)}
                        className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 
                            ${detailModalTab === tab 
                                ? 'border-[#FF9900] text-[#FF9900] bg-gray-50 dark:bg-white/5' 
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    >
                        {tab}
                        <span className="ml-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-[10px]">
                            {getTabCount(tab)}
                        </span>
                    </button>
                ))}
            </div>

            <div className="p-6 max-h-[400px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-[#191E26] custom-scrollbar">
               {getCurrentTabList().length > 0 ? (
                 getCurrentTabList().map((item, i) => (
                   <div key={i} className="group flex items-center justify-between p-3 bg-gray-50 dark:bg-[#232F3E] rounded-xl border border-gray-100 dark:border-gray-700 hover:border-[#FF9900] transition-all hover:shadow-sm">
                      <span className="text-sm font-mono font-bold text-[#232F3E] dark:text-gray-200 tracking-tight">{item.id}</span>
                      <button onClick={() => { navigator.clipboard.writeText(item.id); addToast('success', t('copied')); }} className="text-gray-300 group-hover:text-[#FF9900] transition-colors"><i className="fa-regular fa-copy"></i></button>
                   </div>
                 ))
               ) : (
                 <div className="col-span-2 py-10 text-center font-bold text-gray-300 flex flex-col items-center">
                    <i className="fa-solid fa-box-open text-4xl mb-3 text-gray-200 dark:text-gray-700"></i>
                    No {detailModalTab} shipments found.
                 </div>
               )}
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-[#111315] border-t border-gray-100 dark:border-gray-700 flex justify-end">
               <button onClick={() => { 
                   const list = getCurrentTabList().map(t => t.id).join('\n');
                   if(list) {
                       navigator.clipboard.writeText(list); 
                       addToast('success', t('copiedAll'));
                   } else {
                       addToast('warning', 'Nothing to copy');
                   }
               }} className="px-6 py-2.5 btn-amz-dark font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-xs">
                  <i className="fa-solid fa-copy"></i> Copy {detailModalTab} List
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;