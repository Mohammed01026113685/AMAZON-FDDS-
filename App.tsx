
// import React, { useState, useTransition, useMemo, useEffect, useCallback, Suspense } from 'react';
// import { motion, AnimatePresence } from 'motion/react';
// import { LayoutDashboard, Users, Clock, Package, Archive, Settings, LogOut, FileImage, FileText, FileSpreadsheet, AlertTriangle, Copy, Search, Moon, Sun, ArrowRight, User as UserIcon, Monitor, Calculator, Lock, RefreshCw, X, FileBox, FileArchive, Percent, Trash2, Calendar, UploadCloud, Image, Sheet, Minus, Plus, Loader2, UserCheck, HelpCircle, PackageOpen, Mail } from 'lucide-react';
// import DropZone from './components/DropZone';
// import SummaryTable from './components/SummaryTable';
// import GlobalStationsSummary from './components/GlobalStationsSummary';
// import { SmartInsights } from './components/SmartInsights';
// import { AnimatedNumber } from './components/AnimatedNumber';
// import CustomDialog from './components/CustomDialog';
// import { ToastContainer, ToastMessage } from './components/Toast';
// import { ErrorBoundary } from './components/ErrorBoundary';
// import { processShipments, cleanName } from './services/excelProcessor';
// import { exportToExcel, exportAsImage, exportToPDF, exportCurrentFailedRtoReport } from './services/exportService';
// import { saveDailyRecord, fetchHistory, loginUser, logoutUser, subscribeToAuth, deleteDailyRecord, isUserAdmin, fetchAliases, updateDailyRecord, ADMIN_EMAIL, saveAliases, getCurrentUserRole, getUserStationAccess } from './services/firebase';
// import { ProcessedResult, DASummary, HistoryRecord, TrackingDetail, STATIONS, Station } from './types';
// import { User } from 'firebase/auth';
// import confetti from 'canvas-confetti';
// import { useSettings } from './contexts/SettingsContext';

// // Lazy Load Heavy Components
// import HistoryDashboard from './components/HistoryDashboard';

// import UserManagement from './components/UserManagement';
// import AliasManagement from './components/AliasManagement';
// import GoalCalculator from './components/GoalCalculator';
// import ExportCenterModal from './components/ExportCenterModal';


// // --- WELCOME BANNER COMPONENT ---
// const WelcomeBanner: React.FC<{ user: User | null, data: ProcessedResult | null, dir: string }> = ({ user, data, dir }) => {
//     const [greeting, setGreeting] = useState('');
//     const [time, setTime] = useState('');

//     useEffect(() => {
//         const updateTime = () => {
//             const now = new Date();
//             const hour = now.getHours();
//             if (hour < 12) setGreeting('صباح الخير');
//             else if (hour < 18) setGreeting('طاب مساؤك');
//             else setGreeting('مساء الخير');
            
//             setTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
//         };
//         updateTime();
//         const interval = setInterval(updateTime, 60000);
//         return () => clearInterval(interval);
//     }, []);

//     if (!user && !data) return null;

//     return (
//         <div className="w-full max-w-[1400px] mx-auto px-4 mb-8 animate-slide-up">
//             <div className="relative overflow-hidden rounded-xl bg-[#141414] shadow-2xl border border-gray-800">
//                 {/* Decorative Elements */}
//                 <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FF9900] rounded-full blur-[120px] opacity-10 pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
//                 <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500 rounded-full blur-[100px] opacity-10 pointer-events-none -translate-x-1/3 translate-y-1/3"></div>
                
//                 <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-8 md:p-10 text-white gap-6">
//                     <div className="flex items-center gap-6 w-full md:w-auto">
//                         <div className="w-20 h-20 rounded-lg bg-white/5 backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-inner shrink-0">
//                             <UserIcon size={36} className="text-[#FF9900]" strokeWidth={2} />
//                         </div>
//                         <div className="flex-1">
//                             <div className="flex flex-wrap items-center gap-3 mb-2">
//                                 <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">{greeting}, {user ? (user.email === ADMIN_EMAIL ? 'Admin' : 'Captain') : 'Guest'}</h2>
//                                 <span className="bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/30 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{time}</span>
//                             </div>
//                             <p className="text-gray-400 text-sm md:text-base font-medium max-w-lg">
//                                 {data ? 'البيانات جاهزة للتحليل. استعرض الأداء أدناه.' : 'مرحباً بك في مركز الأداء اللوجستي.'}
//                             </p>
//                         </div>
//                     </div>

//                     {data && (
//                         <div className="flex gap-4 w-full md:w-auto justify-start md:justify-end">
//                             <div className="bg-white/5 px-6 py-4 rounded-lg border border-white/10 text-center flex-1 md:flex-none">
//                                 <div className="text-[11px] text-gray-400 uppercase tracking-widest mb-1 font-bold">نسبة النجاح</div>
//                                 <div className={`text-3xl font-black tabular-nums ${data.grandTotal.successRate >= 90 ? 'text-emerald-400' : 'text-[#FF9900]'}`}>
//                                     {data.grandTotal.successRate.toFixed(1)}%
//                                 </div>
//                             </div>
//                             <div className="bg-white/5 px-6 py-4 rounded-lg border border-white/10 text-center flex-1 md:flex-none">
//                                 <div className="text-[11px] text-gray-400 uppercase tracking-widest mb-1 font-bold">الحجم الكلي</div>
//                                 <div className="text-3xl font-black tabular-nums text-white">{data.grandTotal.total}</div>
//                             </div>
//                         </div>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// };

// const App: React.FC = () => {
//   const { t, theme, toggleTheme, dir, appTitle, autoSortByFailed } = useSettings();

//   // Auth State
//   const [user, setUser] = useState<User | null>(null);
//   const [userRole, setUserRole] = useState<string>('user');
//   const [userStationAccess, setUserStationAccess] = useState<string>('All');
//   const [isAdmin, setIsAdmin] = useState(false);
//   const [isSuperAdmin, setIsSuperAdmin] = useState(false);
//   const [isAuthLoading, setIsAuthLoading] = useState(true);
  
//   // Notification & Dialog State
//   const [toasts, setToasts] = useState<ToastMessage[]>([]);
//   const [dialogConfig, setDialogConfig] = useState<{
//       isOpen: boolean;
//       type: 'alert' | 'confirm' | 'info';
//       title: string;
//       message: string;
//       onConfirm: () => void;
//       onCancel?: () => void;
//   }>({
//       isOpen: false,
//       type: 'info',
//       title: '',
//       message: '',
//       onConfirm: () => {},
//   });

//   // Login Modal State
//   const [showLoginModal, setShowLoginModal] = useState(false);
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [isLoggingIn, setIsLoggingIn] = useState(false);

//   // Management Modals (Admin Only)
//   const [showUserManagement, setShowUserManagement] = useState(false);
//   const [showAliasManagement, setShowAliasManagement] = useState(false);

//   // Feature Modals
//   const [showCalculator, setShowCalculator] = useState(false);
//   const [showExportCenter, setShowExportCenter] = useState(false);

//   // Track Shipment Modal
//   const [showTrackModal, setShowTrackModal] = useState(false);
//   const [trackInput, setTrackInput] = useState('');
//   const [trackResults, setTrackResults] = useState<{date: string, agent: string, tracking: string, status?: string}[] | null>(null);

//   // Tabs State
//   const [activeTab, setActiveTab] = useState<'daily' | 'history'>('daily');
//   const [isFullscreen, setIsFullscreen] = useState(false);

//   useEffect(() => {
//     const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
//     document.addEventListener('fullscreenchange', handleFullscreenChange);
//     return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
//   }, []);

//   const toggleFullscreen = () => {
//     if (!document.fullscreenElement) {
//       document.documentElement.requestFullscreen().catch(e => console.error(e));
//     } else {
//       if (document.exitFullscreen) document.exitFullscreen();
//     }
//   };

//   // Data State
//   const [data, setData] = useState<ProcessedResult | null>(null);
//   const [rawData, setRawData] = useState<any[] | null>(null);
//   const [aliases, setAliases] = useState<Record<string, string>>({}); 
//   const [activeStation, setActiveStation] = useState<Station>('ALL');
//   const [isChangingStation, setIsChangingStation] = useState(false);
//   const [isPending, startTransition] = useTransition();

//   useEffect(() => {
//       if (rawData && rawData.length > 0) {
//           setIsChangingStation(true);
//           setTimeout(() => {
//               startTransition(() => {
//                   try {
//                       const processed = processShipments(rawData, aliases, activeStation, knownNames);
//                       setData(processed);
//                       if (autoSortByFailed) setSortConfig({ key: 'failed', direction: 'desc' });
//                       setTimeout(() => setIsChangingStation(false), 10);
//                   } catch(e) {
//                       console.error(e);
//                       setIsChangingStation(false);
//                   }
//               });
//           }, 50);
//       }
//   }, [activeStation, rawData, aliases]);
//   const [isLoadingManual, setIsLoadingManual] = useState(false);
//   const [exporting, setExporting] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [tableScale, setTableScale] = useState(1);
//   const [sortConfig, setSortConfig] = useState<{key: keyof DASummary, direction: 'asc' | 'desc'} | null>({key: 'successRate', direction: 'desc'});
  
//   // New Shipment Detail Modal State
//   const [selectedAgentDetails, setSelectedAgentDetails] = useState<{name: string, trackings: TrackingDetail[]} | null>(null);
//   const [detailModalTab, setDetailModalTab] = useState<'Delivered' | 'Failed' | 'OFD' | 'RTO'>('Failed');
//   const [isModalOpen, setIsModalOpen] = useState(false);
  
//   // Date State
//   const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);

//   // History State
//   const [history, setHistory] = useState<HistoryRecord[]>([]);
//   const [isLoadingHistory, setIsLoadingHistory] = useState(false);

//   // Extract all unique known agent names from history for fuzzy matching
//   const knownNames = useMemo(() => {
//       const names = new Set<string>();
//       history.forEach(record => {
//           if (record.agents && Array.isArray(record.agents)) {
//               record.agents.forEach(agent => {
//                   if (agent.daName && !agent.daName.includes("⚠️")) {
//                       names.add(agent.daName);
//                   }
//               });
//           }
//       });
//       return Array.from(names);
//   }, [history]);

//   // --- Notification Helpers ---
//   const addToast = useCallback((type: 'success' | 'error' | 'info' | 'warning', text: string) => {
//       const id = Date.now();
//       setToasts(prev => [...prev, { id, type, text }]);
//   }, []);

//   const removeToast = (id: number) => {
//       setToasts(prev => prev.filter(t => t.id !== id));
//   };

//   const showMessage = useCallback((type: 'alert' | 'confirm' | 'info', title: string, message: string, onConfirm: () => void) => {
//       setDialogConfig({
//           isOpen: true,
//           type,
//           title,
//           message,
//           onConfirm: () => {
//               onConfirm();
//               setDialogConfig(prev => ({ ...prev, isOpen: false }));
//           },
//           onCancel: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
//       });
//   }, []);

//   // Check Auth Status on Mount
//   useEffect(() => {
//     const unsubscribe = subscribeToAuth(async (currentUser) => {
//       setUser(currentUser);
//       setIsSuperAdmin(currentUser?.email === ADMIN_EMAIL);
//       if (currentUser) {
//         if (currentUser.email === ADMIN_EMAIL) {
//           setUserRole('admin');
//           setIsAdmin(true);
//           setUserStationAccess('All');
//           setActiveStation('ALL');
//         } else {
//           const role = await getCurrentUserRole(currentUser.email);
//           setUserRole(role);
//           setIsAdmin(role === 'manager' || role === 'admin');
          
//           const access = await getUserStationAccess(currentUser.email || '');
//           setUserStationAccess(access || 'All');
//           if (access && access !== 'All') {
//               setActiveStation(access as Station);
//           } else {
//               setActiveStation('ALL');
//           }
//         }
//       } else {
//         setUserRole('user');
//         setUserStationAccess('All');
//         setActiveStation('ALL');
//       }
//       setIsAuthLoading(false);
//     });
//     return () => unsubscribe();
//   }, []);

//   const loadHistoryData = async () => {
//     setIsLoadingHistory(true);
//     const records = await fetchHistory();
//     setHistory(records);
//     setIsLoadingHistory(false);
//   };

//   const loadAliases = async () => {
//       const map = await fetchAliases();
//       setAliases(map);
//   };


//   useEffect(() => {
//     if (user) {
//       loadHistoryData();
//       loadAliases();
//     }
//   }, [user]);

//   const handleDeleteHistory = async (date: string) => {
//       try {
//           await deleteDailyRecord(date);
//           await loadHistoryData();
//           addToast('success', t('deleteSuccess'));
//       } catch (e: any) {
//           addToast('error', t('failedError') + e.message);
//       }
//   };

//   const handleUpdateRecord = async (date: string, agents: any[], stationTotal: any) => {
//       try {
//           await updateDailyRecord(date, agents, stationTotal);
//           await loadHistoryData();
//           addToast('success', t('updateSuccess'));
//       } catch (e: any) {
//           addToast('error', t('failedError') + e.message);
//       }
//   };

//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsLoggingIn(true);
//     try {
//       await loginUser(email, password);
//       setShowLoginModal(false);
//       setEmail('');
//       setPassword('');
//       addToast('success', t('loginSuccess'));
//     } catch (err: any) {
//       addToast('error', err.message);
//     } finally {
//       setIsLoggingIn(false);
//     }
//   };

//   const handleLogout = async () => {
//     showMessage('confirm', t('logout'), t('logoutConfirm'), async () => {
//         try {
//             await logoutUser();
//             window.location.reload();
//         } catch (error) {
//             console.error("Logout failed", error instanceof Error ? error.message : error);
//         }
//     });
//   };

//   const handleUpdateAgentName = async (oldName: string, newName: string) => {
//       if (!data) return;
      
//       const newSummaries = data.summaries.map(s => {
//           if(s.daName === oldName) {
//               return { ...s, daName: newName };
//           }
//           return s;
//       });
      
//       setData({ ...data, summaries: newSummaries });
      
//       // Update Alias in DB
//       try {
//           const cleanedOld = cleanName(oldName);
//           const cleanedNew = cleanName(newName);
//           const newAliasMap = { ...aliases, [cleanedOld]: cleanedNew };
//           await saveAliases(newAliasMap);
//           setAliases(newAliasMap);
//           addToast('success', `تم تغيير الاسم وتحديث قاعدة البيانات`);
//       } catch (e) {
//           console.error(e instanceof Error ? e.message : e);
//           addToast('error', 'حدث خطأ أثناء حفظ الاسم في قاعدة البيانات');
//       }
//   };

//   const handleArchiveToday = async () => {
//     if (!data || !user) return;
    
//     const saveAction = async () => {
//         try {
//             if ((data.station || activeStation) === 'ALL' && rawData) {
//                 // Bulk save for ALL stations
//                 for (const station of STATIONS) {
//                     const processedForStation = processShipments(rawData, aliases, station, knownNames);
                    
//                     // Skip saving if the station has no data to avoid cluttering with empty records
//                     if (processedForStation.grandTotal.total === 0) continue;
                    
//                     const record: HistoryRecord = {
//                         date: reportDate,
//                         station: station,
//                         timestamp: new Date(reportDate).getTime(),
//                         stationTotal: {
//                             delivered: processedForStation.grandTotal.delivered,
//                             total: processedForStation.grandTotal.total,
//                             successRate: processedForStation.grandTotal.successRate
//                         },
//                         agents: processedForStation.summaries.map(s => ({
//                             daName: s.daName,
//                             delivered: s.delivered,
//                             total: s.total,
//                             successRate: s.successRate,
//                             shipmentDetails: s.allTrackings || [], 
//                             trackings: s.pendingTrackings 
//                         }))
//                     };
//                     await saveDailyRecord(record);
//                 }
//             } else {
//                 // Save for a single selected station
//                 const record: HistoryRecord = {
//                     date: reportDate,
//                     station: data.station || activeStation,
//                     timestamp: new Date(reportDate).getTime(),
//                     stationTotal: {
//                       delivered: data.grandTotal.delivered,
//                       total: data.grandTotal.total,
//                       successRate: data.grandTotal.successRate
//                     },
//                     agents: data.summaries.map(s => ({
//                       daName: s.daName,
//                       delivered: s.delivered,
//                       total: s.total,
//                       successRate: s.successRate,
//                       shipmentDetails: s.allTrackings || [], 
//                       trackings: s.pendingTrackings 
//                     }))
//                 };
//                 await saveDailyRecord(record);
//             }
            
//             const updatedHistory = await fetchHistory();
//             setHistory(updatedHistory);
//             addToast('success', t('archiveSuccess'));
//             setActiveTab('history');
//         } catch (e: any) {
//             addToast('error', t('failedError') + e.message);
//         }
//     };

//     let needsConfirm = false;
//     if ((data.station || activeStation) === 'ALL') {
//         needsConfirm = history.some(h => h.date === reportDate && STATIONS.includes(h.station as any));
//     } else {
//         needsConfirm = history.some(h => h.date === reportDate && (h.station || 'DQN3') === (data.station || activeStation));
//     }

//     if (needsConfirm) {
//       showMessage('confirm', t('warning'), `Records exist for ${reportDate}. Overwrite?`, saveAction);
//     } else {
//         saveAction();
//     }
//   };

//   const handleFileSelect = (file: File) => {
//     setIsLoadingManual(true);
//     setTimeout(() => {
//         const reader = new FileReader();
//         reader.onload = async (e) => {
//           try {
//             const bstr = e.target?.result;
//             if (typeof bstr !== 'string') throw new Error("Failed to read file");
            
//             await new Promise(resolve => setTimeout(resolve, 50));
//             const XLSX = await import('xlsx');
//             const workbook = XLSX.read(bstr, { type: 'binary' });
            
//             if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
//                 throw new Error("Excel file is empty");
//             }
    
//             const rawDataJSON = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
//             setRawData(rawDataJSON);
//             const processed = processShipments(rawDataJSON, aliases, activeStation, knownNames);
//             startTransition(() => {
//               setData(processed);
//               if (autoSortByFailed) setSortConfig({ key: 'failed', direction: 'desc' });
//               setIsLoadingManual(false);
//               addToast('success', t('analysisSuccess'));
              
//               if (processed.grandTotal.successRate > 90) {
//                   confetti({
//                       particleCount: 100,
//                       spread: 70,
//                       origin: { y: 0.6 }
//                   });
//               }
//             });
//           } catch (err: any) {
//             setIsLoadingManual(false);
//             addToast('error', err.message);
//             setData(null);
//           }
//         };
//         reader.readAsBinaryString(file);
//     }, 50);
//   };

//   const handleUpdateValue = (agentName: string, field: keyof DASummary, value: number) => {
//     if (!data) return;
//     const newSummaries = data.summaries.map(s => {
//       if (s.daName === agentName) {
//         const updatedAgent = { ...s, [field]: value };
//         updatedAgent.total = (updatedAgent.delivered || 0) + (updatedAgent.failed || 0) + (updatedAgent.ofd || 0) + (updatedAgent.rto || 0);
//         updatedAgent.successRate = updatedAgent.total > 0 ? (updatedAgent.delivered / updatedAgent.total) * 100 : 0;
//         return updatedAgent;
//       }
//       return s;
//     });
//     const newGrandTotal = newSummaries.reduce((acc, curr) => ({
//       delivered: acc.delivered + (curr.delivered || 0),
//       failed: acc.failed + (curr.failed || 0),
//       ofd: acc.ofd + (curr.ofd || 0),
//       rto: acc.rto + (curr.rto || 0),
//       total: acc.total + curr.total,
//       successRate: 0
//     }), { delivered: 0, failed: 0, ofd: 0, rto: 0, total: 0, successRate: 0 });
//     newGrandTotal.successRate = newGrandTotal.total > 0 ? (newGrandTotal.delivered / newGrandTotal.total) * 100 : 0;
//     setData({ summaries: newSummaries, grandTotal: newGrandTotal });
//   };

//     const handleStationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//       const newStation = e.target.value as Station;
//       setIsChangingStation(true);
//       setTimeout(() => {
//           setActiveStation(newStation);
//           // For ALL stations, data processing happens in GlobalStationsSummary component synchronously during its render.
//           // To ensure the loading overlay goes away after render, we can use a microtask or just let the data effect handle it if not ALL.
//           if (newStation === 'ALL') {
//               setTimeout(() => setIsChangingStation(false), 50);
//           }
//       }, 50);
//   };

// const handleSort = (key: keyof DASummary) => {
//     let direction: 'asc' | 'desc' = 'desc';
//     if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
//     setSortConfig({ key, direction });
//   };

//   const sortedAndFilteredData = useMemo(() => {
//     if (!data) return null;
//     const query = searchQuery.toLowerCase().trim();
    
//     let list = [...data.summaries].filter(s => {
//       // 1. Check Name
//       if ((s.daName || "").toLowerCase().includes(query)) return true;
      
//       // 2. Check Trackings (Partial Match)
//       // Check allTrackings first (contains status and id)
//       if (s.allTrackings && s.allTrackings.some(t => (t.id || "").toLowerCase().includes(query))) {
//           return true;
//       }
      
//       // Fallback/Legacy check on pendingTrackings string array
//       if (s.pendingTrackings && s.pendingTrackings.some(t => (t || "").toLowerCase().includes(query))) {
//           return true;
//       }

//       return false;
//     });

//     if (sortConfig) {
//       list.sort((a, b) => {
//         const aVal = a[sortConfig.key];
//         const bVal = b[sortConfig.key];
//         if (typeof aVal === 'string') return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
//         return sortConfig.direction === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
//       });
//     }
//     return { ...data, summaries: list };
//   }, [data, searchQuery, sortConfig]);

//   const copyAllOFD = () => {
//     if (!data) return;
//     const all = data.summaries.flatMap(s => s.allTrackings.filter(t => t.status === 'ofd').map(t => t.id));
//     if (all.length === 0) {
//         addToast('warning', 'No OFD trackings found');
//         return;
//     }
//     navigator.clipboard.writeText(all.join('\n'));
//     addToast('info', `${t('copied')} ${all.length} OFD tracking numbers!`);
//   };

//   const handleImageExport = async () => {
//     setExporting(true);
//     await exportAsImage('table-container');
//     setExporting(false);
//   };
  
//   const handlePDFExport = () => {
//     if (!data) return;
//     setExporting(true);
//     exportToPDF(data, reportDate);
//     setExporting(false);
//     addToast('success', t('pdfGenerated'));
//   };

//   // --- Track Shipment Handler (Global + Detailed) ---
//   const handleTrackShipment = (e: React.FormEvent) => {
//       e.preventDefault();
//       if (!trackInput || trackInput.length < 3) {
//           addToast('warning', 'Please enter at least 3 characters');
//           return;
//       }
      
//       const tId = trackInput.trim().toUpperCase();
//       const results: {date: string, agent: string, tracking: string, status?: string}[] = [];

//       // 1. Search in current loaded file
//       if (data) {
//           for (const agent of data.summaries) {
//               const match = agent.allTrackings?.find(t => t.id.includes(tId));
//               if (match) {
//                   results.push({ date: 'Today (Live)', agent: agent.daName, tracking: match.id, status: match.status });
//               } else {
//                   const simpleMatch = agent.pendingTrackings.find(t => t.includes(tId));
//                   if(simpleMatch) {
//                       results.push({ date: 'Today (Live)', agent: agent.daName, tracking: simpleMatch, status: 'unknown' });
//                   }
//               }
//           }
//       }

//       // 2. Search in History
//       history.forEach(day => {
//           if (day.agents) {
//               day.agents.forEach(agent => {
//                   if (agent.shipmentDetails) {
//                       const match = agent.shipmentDetails.find(t => t.id.includes(tId));
//                       if (match) {
//                           results.push({ date: day.date, agent: agent.daName, tracking: match.id, status: match.status });
//                           return;
//                       }
//                   }
                  
//                   if (agent.trackings) {
//                       const match = agent.trackings.find(t => t.includes(tId));
//                       if (match) {
//                           results.push({ date: day.date, agent: agent.daName, tracking: match, status: 'failed/ofd' });
//                       }
//                   }
//               });
//           }
//       });
      
//       setTrackResults(results);
//   };

//   const reset = () => { setData(null); };

//   const isLoading = isLoadingManual || isPending;

//   const MetricCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; subtext?: string; color?: string }> = ({ title, value, icon, subtext, color = "text-[#232F3E] dark:text-gray-100" }) => (
//     <motion.div 
//         whileHover={{ y: -2 }}
//         className="modern-card p-6 flex items-center justify-between relative overflow-hidden group"
//     >
//       <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-gray-50 to-transparent dark:from-white/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
//       <div className={`flex-1 relative z-10 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
//         <p className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider mb-2">{title}</p>
//         <h3 className={`text-4xl font-black tabular-nums font-mono leading-none ${color}`}>{value}</h3>
//         {subtext && <p className="text-[11px] text-gray-400 mt-2 font-medium">{subtext}</p>}
//       </div>
//       <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-2xl shadow-sm bg-gray-50 dark:bg-[#1A1A1A] border border-gray-100 dark:border-gray-800 ${color}`}>
//         {icon}
//       </div>
//     </motion.div>
//   );

//   // Helper for Details Modal
//   const getCurrentTabList = () => {
//       if (!selectedAgentDetails) return [];
//       // Normalize tab to match status
//       const statusMap: Record<string, string> = {
//           'Delivered': 'delivered',
//           'Failed': 'failed',
//           'OFD': 'ofd',
//           'RTO': 'rto'
//       };
//       return selectedAgentDetails.trackings.filter(t => t.status === statusMap[detailModalTab]);
//   };

//   // --- Initial Loading Screen ---
//   if (isAuthLoading) {
//     return (
//         <div className="min-h-screen bg-[#232F3E] flex flex-col gap-4 items-center justify-center text-white">
//             <Package size={64} className="animate-bounce text-[#FF9900]" />
//             <div className="mt-4 font-bold tracking-widest animate-pulse flex gap-0.5 items-center justify-center"><span className="text-white text-2xl font-extrabold tracking-tighter">amazon</span><span className="text-[#FF9900] text-2xl font-black tracking-tight">FDDS</span></div>
//         </div>
//     );
//   }

//   // --- Main App ---
//   return (
//     <div className="min-h-screen font-sans text-[#0F1111] dark:text-gray-100 dark:bg-[#0F1111]" dir={dir}>
//       <ToastContainer toasts={toasts} removeToast={removeToast} />
//       <CustomDialog 
//           isOpen={dialogConfig.isOpen}
//           type={dialogConfig.type}
//           title={dialogConfig.title}
//           message={dialogConfig.message}
//           onConfirm={dialogConfig.onConfirm}
//           onCancel={dialogConfig.onCancel}
//       />
      
      
//       {/* Export Center Modal */}
//       {showExportCenter && <Suspense fallback={<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">Loading...</div>}><ExportCenterModal isOpen={showExportCenter} onClose={() => setShowExportCenter(false)} history={history} /></Suspense>}
//             {/* Sticky Glass Header */}
//       <header className="bg-[#131921] sticky top-0 z-50 shadow-md text-white">
//          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex justify-between items-center text-white">
//             <div className="flex items-center gap-3 md:gap-4">
//                 <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF9900] to-[#FFB340] shadow-md text-white shadow-[#FF9900]/20">
//                   <Package size={20} strokeWidth={2.5} />
//                 </div>
//                 <div className={`leading-none border-[#D5D9D9] dark:border-gray-800 ${dir === 'rtl' ? 'border-l pl-3 ml-2' : 'border-r pr-3 mr-2'}`}>
//                     <h1 className="text-sm md:text-lg tracking-wide flex items-center gap-0.5"><span className="font-extrabold text-[#232F3E] dark:text-white tracking-tighter text-xl">amazon</span><span className="font-black text-[#FF9900] tracking-tight text-xl">FDDS</span></h1>
//                     <span className="text-[10px] md:text-xs text-gray-400 block mt-0.5">{t('performanceCenter')}</span>
//                 </div>
//             </div>
            
//             <div className="flex items-center gap-4">
//                 {/* Desktop Tabs */}
//                 {user ? (
//                     <div className="hidden md:flex gap-1 p-1">
//                       <button 
//                         onClick={() => setActiveTab('daily')} 
//                         className={`relative text-xs font-bold px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 ${activeTab === 'daily' ? 'text-white shadow-md' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
//                       >
//                         {activeTab === 'daily' && (
//                           <motion.div layoutId="navIndicator" className="absolute inset-0 bg-[#FF9900] rounded-lg -z-10" />
//                         )}
//                         <LayoutDashboard size={14} />
//                         {t('dailyReport')}
//                       </button>
//                       <button 
//                         onClick={() => setActiveTab('history')} 
//                         className={`relative text-xs font-bold px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 ${activeTab === 'history' ? 'text-white shadow-md' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
//                       >
//                         {activeTab === 'history' && (
//                           <motion.div layoutId="navIndicator" className="absolute inset-0 bg-[#FF9900] rounded-lg -z-10" />
//                         )}
//                         <Archive size={14} />
//                         {t('archive')}
//                       </button>
//                     </div>
//                 ) : (
//                     <div className="hidden md:block text-xs font-bold text-gray-300 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">{t('guestMode')}</div>
//                 )}
                
//                 <div className="flex items-center gap-3">
//                    {/* Track Package Button */}
//                    {user && (
//                        <button onClick={() => setShowTrackModal(true)} className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#FF9900] flex items-center justify-center transition-colors text-gray-300 hover:text-white" title="Track Package">
//                            <Search size={16} />
//                        </button>
//                    )}
//                    {/* Theme Toggle Only */}
//                    <button onClick={toggleTheme} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-gray-300 hover:text-white">
//                        {theme === 'dark' ? <Sun size={16} className="text-yellow-500" /> : <Moon size={16} />}
//                    </button>
//                    {user ? (
//                        <>
//                          <div className="flex gap-2 border-l border-[#D5D9D9] dark:border-gray-800 pl-3">
//                                  <button onClick={() => setShowAliasManagement(true)} className="bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white w-9 h-9 rounded-full flex items-center justify-center transition-all group relative" title={t('aliases')}>
//                                      <RefreshCw size={14} />
//                                  </button>
//                              {isSuperAdmin && (
//                                 <button onClick={() => setShowUserManagement(true)} className="bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white w-9 h-9 rounded-full flex items-center justify-center transition-all group relative" title={t('users')}>
//                                     <Users size={14} />
//                                     <span className="absolute top-0 right-0 bg-[#FF9900] w-2.5 h-2.5 rounded-full border-2 border-[#131921]"></span>
//                                 </button>
//                              )}
                             
//                              <button onClick={handleLogout} className="bg-white/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 w-9 h-9 rounded-full flex items-center justify-center transition-all" title={t('logout')}>
//                                <LogOut size={14} />
//                              </button>
//                          </div>
//                        </>
//                    ) : (
//                        <button 
//                          onClick={() => setShowLoginModal(true)}
//                          className="bg-[#FF9900] hover:bg-[#FFB340] text-white px-5 py-2 rounded-full text-xs font-bold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
//                        >
//                          <Lock size={14} />
//                          {t('loginAdmin')}
//                        </button>
//                    )}
//                 </div>
//             </div>
//          </div>
         
//          {/* Mobile Navigation Bar */}
//          {user && (
//             <div className="md:hidden border-t border-[#D5D9D9] dark:border-gray-800 bg-white dark:bg-[#141414]">
//                 <div className="flex">
//                     <button onClick={() => setActiveTab('daily')} className={`flex-1 py-3 text-center text-xs font-bold flex flex-col items-center justify-center gap-1 ${activeTab === 'daily' ? 'text-[#FF9900] bg-orange-50/50 dark:bg-orange-900/10' : 'text-gray-500'}`}>
//                         <LayoutDashboard size={18} /> <span>{t('dailyReport')}</span>
//                     </button>
//                     <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 text-center text-xs font-bold flex flex-col items-center justify-center gap-1 ${activeTab === 'history' ? 'text-[#FF9900] bg-orange-50/50 dark:bg-orange-900/10' : 'text-gray-500'}`}>
//                         <Archive size={18} /> <span>{t('archive')}</span>
//                     </button>
//                 </div>
//             </div>
//          )}
//       </header>

//       <motion.main 
//         initial={{ opacity: 0, y: 10 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.4 }}
//         className="max-w-[1400px] mx-auto px-4 py-6 md:py-8 pb-20"
//       >
//         <WelcomeBanner user={user} data={data} dir={dir} />

//         {user && activeTab === 'history' ? (
//           <ErrorBoundary>
//             <Suspense fallback={
//               <div className="flex flex-col items-center justify-center h-96 animate-fade-in gap-4">
//                   <Loader2 size={40} className="animate-spin text-[#FF9900]" />
//                   <div className="text-gray-400 font-bold">Loading module...</div>
//               </div>
//             }>
//               {isLoadingHistory ? (
//                   <div className="flex flex-col items-center justify-center h-96 animate-fade-in gap-4">
//                       <div className="relative">
//                           <Package size={64} className="text-gray-200 dark:text-gray-700" />
//                           <Package size={64} className="text-[#FF9900] absolute top-0 left-0 animate-ping opacity-20" />
//                       </div>
//                       <div className="text-gray-400 font-bold animate-pulse">Loading history...</div>
//                   </div>
//               ) : (
//                   <HistoryDashboard 
//                       history={history} 
//                       onDeleteRecord={handleDeleteHistory}
//                       onUpdateRecord={handleUpdateRecord}
//                       isAdmin={isAdmin} 
//                       isSuperAdmin={isSuperAdmin}
//                       onOpenUserManagement={() => setShowUserManagement(true)}
//                       userStationAccess={userStationAccess}
//                       onOpenAliasManagement={() => setShowAliasManagement(true)}
//                       showMessage={showMessage}
//                       onRefresh={loadHistoryData}
//                   />
//               )}
//             </Suspense>
//           </ErrorBoundary>
//         ) : (
//           /* Daily Dashboard View */
//           <>
//              {/* Toolbar */}
//              <div className="mb-6 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center no-print animate-slide-up">
//               <div className="w-full xl:w-auto flex flex-col sm:flex-row gap-3 bg-white dark:bg-[#191E26] p-2 rounded-lg shadow-sm border border-[#D5D9D9] dark:border-gray-700">
//                 <button onClick={reset} className="p-3 w-full sm:w-12 h-12 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center" title={t('clear')}>
//                   <Trash2 size={16} />
//                 </button>

//                 <div className="flex items-center gap-2 bg-[#F3F3F3] dark:bg-[#191E26] px-3 rounded-md border border-[#D5D9D9] dark:border-gray-700 flex-1 sm:flex-none h-10 shadow-sm hover:bg-gray-50 transition-colors">
//                    {userStationAccess === 'All' ? (
//                        <select
//                           value={activeStation}
//                           onChange={handleStationChange}
//                           className="bg-transparent text-sm font-bold text-[#0F1111] dark:text-gray-200 outline-none w-full sm:w-auto cursor-pointer"
//                        >
//                           {(userRole === "admin" || userRole === "manager") && <option value="ALL">جميع المحطات (All Stations)</option>}
//                           {STATIONS.map(s => <option key={s} value={s}>المحطة: {s}</option>)}
//                        </select>
//                    ) : (
//                        <div className="bg-transparent text-sm font-bold text-[#0F1111] dark:text-gray-200">
//                            المحطة: {activeStation}
//                        </div>
//                    )}
//                 </div>
                
//                 {data && (
//                   <>
//                      <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 rounded-xl border border-[#D5D9D9] dark:border-gray-700 flex-1 sm:flex-none h-12">
//                         <Calendar size={16} className="text-gray-400" />
//                         <input 
//                             type="date" 
//                             value={reportDate}
//                             onChange={(e) => setReportDate(e.target.value)}
//                             className="bg-transparent text-sm font-bold text-[#232F3E] dark:text-gray-200 outline-none w-full sm:w-auto"
//                         />
//                      </div>
                    
//                     <div className="flex gap-2 flex-1 sm:flex-none overflow-x-auto pb-1 sm:pb-0">


//                         <button 
//                             onClick={() => setShowCalculator(true)} 
//                             className="whitespace-nowrap bg-purple-600 text-white px-4 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition-all shadow-md min-w-[100px]"
//                         >
//                           <Calculator size={16} /> {t('calculator')}
//                         </button>

//                         {/* --- SUPER ADMIN ONLY SAVE BUTTON --- */}
//                         {user && (user.email === ADMIN_EMAIL || userRole === 'admin') && (
//                             <button onClick={handleArchiveToday} className="whitespace-nowrap btn-amz-primary px-4 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 min-w-[100px]">
//                               <UploadCloud size={16} /> {t('save')}
//                             </button>
//                         )}
                        
//                         <div className="flex bg-white dark:bg-gray-800 rounded-xl border border-[#D5D9D9] dark:border-gray-600">
//                             <button onClick={handleImageExport} disabled={exporting} className={`px-3 h-12 text-gray-600 dark:text-gray-300 hover:text-[#232F3E] hover:bg-gray-50 dark:hover:bg-gray-700 rounded-${dir==='rtl'?'r':'l'}-xl transition-colors`} title="Image">
//                               <Image size={16} />
//                             </button>
//                             <button onClick={handlePDFExport} className={`px-3 h-12 text-gray-600 dark:text-gray-300 hover:text-[#232F3E] hover:bg-gray-50 dark:hover:bg-gray-700 border-${dir==='rtl'?'l':'r'} border-gray-100 dark:border-gray-600 transition-colors`} title="PDF">
//                               <FileText size={16} className="text-red-600" />
//                             </button>
//                             <button onClick={() => exportToExcel(data)} className={`px-3 h-12 text-gray-600 dark:text-gray-300 hover:text-[#232F3E] hover:bg-gray-50 dark:hover:bg-gray-700 rounded-${dir==='rtl'?'l':'r'}-xl border-${dir==='rtl'?'l':'r'} border-gray-100 dark:border-gray-600 transition-colors`} title="Excel">
//                               <Sheet size={16} className="text-emerald-600" />
//                             </button>
//                         </div>
                        
//                         <button onClick={() => exportCurrentFailedRtoReport(data, reportDate, `Failed_RTO_${reportDate}`)} className="whitespace-nowrap bg-rose-600 text-white hover:bg-rose-700 px-4 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 min-w-[120px] transition-colors shadow-sm">
//                           <AlertTriangle size={16} /> Failed & RTO
//                         </button>
//                         <button onClick={copyAllOFD} className="whitespace-nowrap btn-amz-dark px-4 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 min-w-[120px]">
//                           <Copy size={16} /> نسخ OFD
//                         </button>
//                     </div>
//                   </>
//                 )}
//               </div>
              
//               {data && (
//                 <div className="w-full xl:w-80 relative group">
//                   <div className={`absolute inset-y-0 ${dir==='rtl'?'right-0 pr-4':'left-0 pl-4'} flex items-center pointer-events-none`}>
//                      <Search size={16} className="text-gray-400 group-focus-within:text-[#FF9900] transition-colors" />
//                   </div>
//                   <input 
//                     type="text" placeholder={t('searchAgent')}
//                     value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
//                     className={`w-full bg-white dark:bg-[#191E26] h-12 ${dir==='rtl'?'pr-11 pl-4':'pl-11 pr-4'} rounded-lg border-none shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 focus:ring-2 focus:ring-[#FF9900] text-sm font-bold text-[#232F3E] dark:text-white transition-all`}
//                   />
//                 </div>
//               )}
//             </div>

//             {!data ? (
//               <div className="max-w-2xl mx-auto mt-10 md:mt-20 animate-scale-in no-print px-4">
//                  <div className="bg-white dark:bg-[#191E26] p-1 rounded-xl shadow-2xl shadow-gray-200/50 dark:shadow-none">
//                      <div className="border border-dashed border-[#D5D9D9] dark:border-gray-700 rounded-[20px] overflow-hidden relative">
//                         <DropZone onFileSelect={handleFileSelect} isLoading={isLoading} />
//                      </div>
//                  </div>
                 
//                  {!user && (
//                     <div className="mt-8 text-center">
//                         <p className="text-gray-400 text-sm font-medium mb-2">{t('areYouAdmin')}</p>
//                         <button onClick={() => setShowLoginModal(true)} className="text-[#007185] dark:text-[#4DB6AC] font-bold text-sm hover:underline">
//                             {t('loginPrompt')}
//                         </button>
//                     </div>
//                  )}
//               </div>
//             ) : (
//               <div className="space-y-6 md:space-y-8 animate-fade-in">
//                 {/* Cards Grid */}
//                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
//                   <MetricCard title={t('totalVolume')} value={data.grandTotal.total} icon={<Package size={24} />} subtext="Total Shipments Volume" color="text-[#232F3E] dark:text-gray-100" />
//                   <MetricCard title={t('successRate')} value={`${data.grandTotal.successRate.toFixed(1)}%`} icon={<Percent size={24} />} subtext="Overall Success Rate" color={data.grandTotal.successRate >= 90 ? "text-emerald-600 dark:text-emerald-400" : "text-[#FF9900]"} />
//                   <MetricCard title={t('pending')} value={data.grandTotal.ofd + data.grandTotal.failed} icon={<Clock size={24} />} subtext="Pending Actions" color="text-amber-600 dark:text-amber-400" />
//                   <MetricCard title={t('workforce')} value={data.summaries.length} icon={<Users size={24} />} subtext="Active Workforce" color="text-blue-600 dark:text-blue-400" />
//                 </div>

//                 {/* Pending Shipments Warning */}
//                 {data.grandTotal.ofd > 0 && (
//                   <div className={`bg-rose-50 dark:bg-rose-900/20 border-${dir==='rtl'?'r':'l'}-4 border-rose-500 p-4 rounded-${dir==='rtl'?'l':'r'}-xl shadow-sm flex items-start gap-3 animate-fade-in`}>
//                     <AlertTriangle size={20} className="text-rose-500 mt-1" />
//                     <div>
//                         <h4 className="font-bold text-rose-800 dark:text-rose-400">تنبيه: شحنات غير منتهية (Pending / OFD)</h4>
//                         <p className="text-sm text-rose-700 dark:text-rose-500 mt-1">
//                             يوجد عدد <span className="font-bold">{data.grandTotal.ofd}</span> شحنة معلقة مع المناديب لم يتم إغلاقها. يرجى متابعتها لضمان التقفيل السليم. (تم تضمينها في شيت التصدير Failed & RTO لتسهيل المتابعة).
//                         </p>
//                     </div>
//                   </div>
//                 )}

//                 <div className="relative min-h-[400px] w-full">
//                     {isPending && (
//                         <div className="absolute inset-0 bg-white/70 dark:bg-[#0F1111]/70 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center rounded-2xl animate-fade-in border border-[#D5D9D9] dark:border-gray-700">
//                             <div className="relative flex items-center justify-center">
//                                 <Loader2 size={48} className="animate-spin text-[#FF9900]" />
//                             </div>
//                             <h3 className="text-xl font-bold text-[#232F3E] dark:text-white mt-4">جاري التحميل...</h3>
//                             <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">برجاء الانتظار قليلاً</p>
//                         </div>
//                     )}
                    
//                 {/* Global Stations Summary */}
//                 {rawData && activeStation === 'ALL' && (
//                     <div className="relative">
//                         {isChangingStation && (
//                             <div className="absolute inset-0 bg-white/70 dark:bg-[#141414]/70 z-50 flex flex-col items-center justify-center backdrop-blur-sm rounded-lg">
//                                 <Loader2 size={48} className="animate-spin text-[#FF9900]" />
//                                 <h3 className="text-xl font-bold text-[#232F3E] dark:text-white mt-4">جاري تحميل المحطات...</h3>
//                             </div>
//                         )}
//                         <GlobalStationsSummary rawData={rawData} aliases={aliases} knownNames={knownNames} />
//                     </div>
//                 )}

//                 {/* Main Table Container */}
//                 {activeStation !== 'ALL' && (
//                 <div className="flex flex-col items-center">
//                     <div id="table-container" className="w-full bg-white dark:bg-[#191E26] md:rounded-lg shadow-sm border border-[#D5D9D9] dark:border-gray-700 overflow-hidden transition-all duration-300 relative group">
//                         {isChangingStation && (
//                             <div className="absolute inset-0 bg-white/70 dark:bg-[#191E26]/70 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
//                                 <Loader2 size={48} className="animate-spin text-[#FF9900]" />
//                                 <h3 className="text-xl font-bold text-[#232F3E] dark:text-white mt-4">جاري تحميل المحطة...</h3>
//                             </div>
//                         )}
                        
//                         {/* Print/Export Header */}
//                         <div className="bg-[#232F3E] text-white p-6 flex justify-between items-center show-on-export hidden">
//                             <div>
//                                 <h2 className="text-3xl font-bold mb-1 flex items-center gap-0.5"><span className="font-extrabold text-[#232F3E] dark:text-white tracking-tighter">amazon</span><span className="font-black text-[#FF9900] tracking-tight">FDDS</span></h2>
//                                 <p className="text-gray-300 text-sm">Final Delivery Daily Summary</p>
//                             </div>
//                             <div className="text-right">
//                                 <span className="font-mono text-xl font-bold text-[#FF9900]">{reportDate}</span>
//                             </div>
//                         </div>

//                         {/* Responsive Component */}
//                                                 <div className="scrollable-table-wrapper max-h-[75vh] overflow-y-auto custom-scrollbar w-full">
//                             <SummaryTable 
//                                 data={sortedAndFilteredData!} 
//                             sortConfig={sortConfig} 
//                             onSort={handleSort} 
//                             onUpdateValue={handleUpdateValue}
//                             onViewDetails={(da) => {
//                                 setSelectedAgentDetails({ name: da.daName, trackings: da.allTrackings });
//                                 setIsModalOpen(true);
//                             }}
//                             isSuperAdmin={isSuperAdmin}
//                             onUpdateName={handleUpdateAgentName}
//                         />
//                         </div>
//                     </div>

//                     {/* Zoom Controls */}
//                     <div className="flex justify-center gap-3 mt-6 no-print bg-white dark:bg-[#191E26] p-2 rounded-full shadow-sm border border-[#D5D9D9] dark:border-gray-700">
//                        <button onClick={() => setTableScale(prev => Math.max(0.6, prev - 0.1))} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 hover:bg-[#FF9900] hover:text-white text-gray-500 transition-colors flex items-center justify-center"><Minus size={12} /></button>
//                        <span className="flex items-center font-bold text-gray-500 dark:text-gray-400 text-xs w-16 justify-center">{Math.round(tableScale*100)}%</span>
//                        <button onClick={() => setTableScale(prev => Math.min(1.2, prev + 0.1))} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 hover:bg-[#FF9900] hover:text-white text-gray-500 transition-colors flex items-center justify-center"><Plus size={12} /></button>
//                     </div>
//                 </div>
//               )}
//                 </div> {/* End Relative wrapper */}
//               </div>
//             )}
//           </>
//         )}
//       </motion.main>

//       {/* Login Modal */}
//       {showLoginModal && (
//           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay animate-fade-in" onClick={() => setShowLoginModal(false)}>
//             <div className="glass-panel w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
//                 <div className="bg-[#232F3E] p-8 text-center relative overflow-hidden">
//                     <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF9900] rounded-full blur-[60px] opacity-20"></div>
//                     <Package size={48} className="text-white mb-2 relative z-10" />
//                     <h2 className="text-white font-bold text-lg relative z-10">{t('accessControl')}</h2>
//                 </div>
//                 <div className="p-8 bg-white dark:bg-[#191E26]">
//                     <form onSubmit={handleLogin} className="space-y-5" dir={dir}>
//                     <div>
//                         <label className="block text-xs font-bold text-gray-500 dark:text-gray-300 uppercase mb-1">{t('email')}</label>
//                         <input 
//                             type="email" 
//                             value={email}
//                             onChange={(e) => setEmail(e.target.value)}
//                             className="w-full bg-gray-50 dark:bg-gray-700 border border-[#D5D9D9] dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF9900] focus:bg-white dark:focus:bg-gray-600 outline-none transition-all font-bold text-[#232F3E] dark:text-white"
//                             placeholder="admin@amazon.com"
//                             required
//                         />
//                     </div>
//                     <div>
//                         <label className="block text-xs font-bold text-gray-500 dark:text-gray-300 uppercase mb-1">{t('password')}</label>
//                         <input 
//                             type="password" 
//                             value={password}
//                             onChange={(e) => setPassword(e.target.value)}
//                             className="w-full bg-gray-50 dark:bg-gray-700 border border-[#D5D9D9] dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF9900] focus:bg-white dark:focus:bg-gray-600 outline-none transition-all font-bold text-[#232F3E] dark:text-white"
//                             placeholder="••••••••"
//                             required
//                         />
//                     </div>
//                     <button 
//                         type="submit" 
//                         disabled={isLoggingIn}
//                         className="w-full bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] py-2 rounded-lg shadow-sm font-bold text-sm transition-colors flex justify-center items-center gap-2"
//                     >
//                         {isLoggingIn ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
//                         {isLoggingIn ? t('verifying') : t('loginBtn')}
//                     </button>
//                     </form>
//                 </div>
//             </div>
//           </div>
//       )}

//       {/* User Management Modal */}
//       {showUserManagement && <Suspense fallback={<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><Loader2 className="animate-spin text-white" size={40} /></div>}><UserManagement onClose={() => setShowUserManagement(false)} /></Suspense>}
      
//       {/* Alias Management Modal */}
//       {showAliasManagement && (
//           <Suspense fallback={<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><Loader2 className="animate-spin text-white" size={40} /></div>}>
//           <AliasManagement 
//             onClose={() => setShowAliasManagement(false)} 
//             onAliasesUpdated={(newAliases) => setAliases(newAliases)} 
//             userStationAccess={userStationAccess}
//           />
//           </Suspense>
//       )}

//       {/* Track Shipment Modal */}
//       {showTrackModal && (
//           <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 modal-overlay animate-fade-in" onClick={() => { setShowTrackModal(false); setTrackResults(null); setTrackInput(''); }}>
//               <div className="bg-white dark:bg-[#191E26] w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
//                   <div className="bg-[#232F3E] p-5 text-white flex justify-between items-center">
//                       <h3 className="font-bold"><Search size={16} /> Track Shipment</h3>
//                       <button onClick={() => { setShowTrackModal(false); setTrackResults(null); setTrackInput(''); }}><X size={16} /></button>
//                   </div>
//                   <div className="p-6">
//                       <form onSubmit={handleTrackShipment}>
//                           <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Tracking ID / TBA (Partial Match)</label>
//                           <div className="flex gap-2">
//                             <input 
//                                 type="text" 
//                                 value={trackInput}
//                                 onChange={e => setTrackInput(e.target.value)}
//                                 className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 font-bold dark:bg-gray-700 dark:text-white"
//                                 placeholder="Enter last 4 digits..."
//                                 autoFocus
//                             />
//                             <button type="submit" className="bg-[#FF9900] text-[#232F3E] px-4 py-2 rounded-lg font-bold">Search</button>
//                           </div>
//                       </form>

//                       {trackResults !== null && (
//                           <div className="mt-6 animate-fade-in max-h-[300px] overflow-y-auto custom-scrollbar">
//                               {trackResults.length > 0 ? (
//                                   <div className="space-y-2">
//                                       <p className="text-xs text-gray-400 mb-2 text-left">Found {trackResults.length} matches:</p>
//                                       {trackResults.map((res, i) => (
//                                           <div key={i} className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 text-left">
//                                               <div className="flex justify-between items-start">
//                                                   <div>
//                                                       <h4 className="font-black text-[#232F3E] dark:text-white text-sm">{res.tracking}</h4>
//                                                       <div className="flex items-center gap-2 mt-1">
//                                                           {/* STATUS BADGE */}
//                                                           {res.status === 'delivered' && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Delivered</span>}
//                                                           {(res.status === 'failed' || res.status === 'failed/ofd') && <span className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Failed/OFD</span>}
//                                                           {res.status === 'rto' && <span className="bg-gray-200 text-gray-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">RTO</span>}
//                                                           {res.status === 'ofd' && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">OFD</span>}
//                                                           {!res.status && <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Unknown</span>}
//                                                       </div>
//                                                   </div>
//                                                   <span className="text-[10px] bg-white dark:bg-black/20 px-2 py-0.5 rounded text-gray-500">{res.date}</span>
//                                               </div>
//                                               <div className="flex items-center gap-2 mt-2">
//                                                   <UserCheck size={12} className="text-emerald-500" />
//                                                   <p className="text-xs font-bold text-gray-600 dark:text-gray-300">{res.agent}</p>
//                                               </div>
//                                           </div>
//                                       ))}
//                                   </div>
//                               ) : (
//                                   <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
//                                       <HelpCircle size={32} className="text-gray-400 mb-2" />
//                                       <p className="font-bold text-gray-500">Not found in database.</p>
//                                   </div>
//                               )}
//                           </div>
//                       )}
//                   </div>
//               </div>
//           </div>
//       )}

//       {/* Shipment Details Modal */}
//       {isModalOpen && selectedAgentDetails && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay animate-fade-in" onClick={() => setIsModalOpen(false)}>
//           <div className="bg-white dark:bg-[#191E26] w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden animate-scale-in border border-[#D5D9D9] dark:border-gray-700" onClick={e => e.stopPropagation()}>
//             <div className="p-5 border-b border-[#D5D9D9] dark:border-gray-700 flex justify-between items-center bg-[#232F3E] text-white">
//                <div>
//                  <h4 className="text-lg font-black leading-none mb-1">{selectedAgentDetails.name}</h4>
//                  <p className="text-xs text-gray-300 font-bold uppercase tracking-wider">Shipment Details</p>
//                </div>
//                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"><X size={16} /></button>
//             </div>
            
//             {/* Tabs */}
//             <div className="flex border-b border-[#D5D9D9] dark:border-gray-700">
//                 {['Failed', 'OFD', 'RTO', 'Delivered'].map(tab => (
//                     <button 
//                         key={tab} 
//                         onClick={() => setDetailModalTab(tab as any)}
//                         className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 
//                             ${detailModalTab === tab 
//                                 ? 'border-[#FF9900] text-[#FF9900] bg-gray-50 dark:bg-white/5' 
//                                 : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
//                     >
//                         {tab}
//                         <span className="ml-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-[10px]">
//                             {getCurrentTabList().length}
//                         </span>
//                     </button>
//                 ))}
//             </div>

//             <div className="p-6 max-h-[400px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-[#191E26] custom-scrollbar">
//                {getCurrentTabList().length > 0 ? (
//                  getCurrentTabList().map((item, i) => (
//                    <div key={i} className="group flex items-center justify-between p-3 bg-gray-50 dark:bg-[#232F3E] rounded-xl border border-[#D5D9D9] dark:border-gray-700 hover:border-[#FF9900] transition-all hover:shadow-sm">
//                       <span className="text-sm font-mono font-bold text-[#232F3E] dark:text-gray-200 tracking-tight">{item.id}</span>
//                       <button onClick={() => { navigator.clipboard.writeText(item.id); addToast('success', t('copied')); }} className="text-gray-300 group-hover:text-[#FF9900] transition-colors"><Copy size={16} /></button>
//                    </div>
//                  ))
//                ) : (
//                  <div className="col-span-2 py-10 text-center font-bold text-gray-300 flex flex-col items-center">
//                     <PackageOpen size={40} className="mb-3 text-gray-200 dark:text-gray-700" />
//                     No {detailModalTab} shipments found.
//                  </div>
//                )}
//             </div>
            
//             <div className="p-4 bg-gray-50 dark:bg-[#111315] border-t border-[#D5D9D9] dark:border-gray-700 flex justify-end">
//                <button onClick={() => { 
//                    const list = getCurrentTabList().map(t => t.id).join('\n');
//                    if(list) {
//                        navigator.clipboard.writeText(list); 
//                        addToast('success', t('copiedAll'));
//                    } else {
//                        addToast('warning', 'Nothing to copy');
//                    }
//                }} className="px-6 py-2.5 btn-amz-dark font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-xs">
//                   <Copy size={16} /> Copy {detailModalTab} List
//                </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default App;
import React from 'react';
import { LockKeyhole, Package, Info } from 'lucide-react';

/**
 * FDDS — End of service page
 * Replace your current src/App.tsx with this file to show the notice.
 * This changes only the website's frontend. It does NOT delete Firebase data,
 * change database security rules, or revoke backend access.
 */

// Edit these lines to customize the message without touching the design.
const notice = {
  badge: ' تم إيقاف النظام  ',

  title: '    💻',

  message:"",

  thanks:
    '🤝',

  footnote:
    '✨  سامحني يا جرحني  '
};
const App: React.FC = () => {
  return (
    <main className="shutdown-page" dir="rtl">
      <style>{`
        .shutdown-page,
        .shutdown-page * { box-sizing: border-box; }
        .shutdown-page {
          --amber: #ff9900;
          --light: #f6f8fc;
          --muted: #a6b1c4;
          position: relative;
          isolation: isolate;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          min-height: 100dvh;
          overflow: hidden;
          color: var(--light);
          font-family: 'Cairo', 'Tajawal', 'Segoe UI', Tahoma, sans-serif;
          background: #0b111e;
        }
        .shutdown-page::before {
          content: '';
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: -2;
          background:
            radial-gradient(ellipse 56% 48% at 85% 23%, rgba(255,153,0,.095), transparent 72%),
            radial-gradient(ellipse 48% 58% at 0% 100%, rgba(45,91,141,.21), transparent 75%),
            linear-gradient(135deg, #0e1727 0%, #0b111e 55%, #101b2c 100%);
        }
        .shutdown-page::after {
          content: '';
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: -1;
          opacity: .45;
          background-image: linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: linear-gradient(to bottom, black, transparent 88%);
        }
        .shutdown-wrap { width: min(1120px, calc(100% - 40px)); margin: 0 auto; }
        .shutdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding: 29px 0;
          border-bottom: 1px solid rgba(255,255,255,.09);
        }
        .shutdown-brand { display: flex; align-items: center; gap: 12px; direction: ltr; }
        .shutdown-brand-icon {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          background: rgba(255,153,0,.11);
          color: var(--amber);
          border: 1px solid rgba(255,153,0,.25);
          border-radius: 13px;
        }
        .shutdown-brand-name { font-size: 21px; font-weight: 850; letter-spacing: .5px; line-height: 1.15; }
        .shutdown-brand-name span { color: var(--amber); }
        .shutdown-brand-desc { font-size: 10px; letter-spacing: 1.6px; color: #8c99af; margin-top: 3px; }
        .shutdown-header-tag {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #b3bdd0;
          font-size: 12px;
          letter-spacing: 1.8px;
          direction: ltr;
        }
        .shutdown-header-tag i {
          display: block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--amber);
          box-shadow: 0 0 0 5px rgba(255,153,0,.10);
        }
        .shutdown-content { flex: 1; display: flex; align-items: center; padding: 64px 0 76px; }
        .shutdown-panel {
          position: relative;
          overflow: hidden;
          width: 100%;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(260px, .73fr);
          align-items: center;
          gap: 55px;
          padding: clamp(30px, 6.5vw, 82px);
          border: 1px solid rgba(255,255,255,.105);
          border-radius: 29px;
          background: linear-gradient(136deg, rgba(30,43,61,.90), rgba(16,25,41,.92) 72%);
          box-shadow: 0 35px 90px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.035);
          animation: shutdown-reveal .7s ease-out both;
        }
        .shutdown-panel::before {
          content: '';
          position: absolute;
          top: 0; right: 0;
          width: 175px;
          height: 3px;
          background: linear-gradient(270deg, var(--amber), transparent);
        }
        .shutdown-copy { position: relative; z-index: 1; }
        .shutdown-badge {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 8px 14px;
          background: rgba(255,153,0,.09);
          border: 1px solid rgba(255,153,0,.20);
          border-radius: 999px;
          color: #ffc069;
          font-size: 12px;
          font-weight: 750;
          margin-bottom: 24px;
        }
        .shutdown-badge-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--amber); }
        .shutdown-title {
          color: #fff;
          margin: 0;
          font-size: clamp(32px, 4.4vw, 57px);
          line-height: 1.4;
          letter-spacing: -.8px;
          font-weight: 850;
        }
        .shutdown-title-bar { height: 4px; width: 54px; border-radius: 9px; background: var(--amber); margin: 24px 0; }
        .shutdown-text { max-width: 590px; color: #c1cada; font-size: clamp(15px, 1.48vw, 18px); line-height: 2.1; margin: 0; }
        .shutdown-thanks { max-width: 590px; margin: 19px 0 0; color: #ecf0f7; font-size: 15px; line-height: 2; }
        .shutdown-note {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          margin-top: 30px;
          padding-top: 22px;
          border-top: 1px solid rgba(255,255,255,.09);
          color: var(--muted);
          font-size: 12px;
          line-height: 1.85;
        }
        .shutdown-note svg { flex: 0 0 auto; color: #ffb043; margin-top: 3px; }
        .shutdown-art { min-height: 335px; display: grid; place-items: center; position: relative; }
        .shutdown-art::before {
          content: '';
          position: absolute;
          width: min(98%, 385px);
          aspect-ratio: 1;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 50%;
          box-shadow: 0 0 0 43px rgba(255,255,255,.018), 0 0 0 90px rgba(255,255,255,.014);
        }
        .shutdown-art::after {
          content: '';
          position: absolute;
          width: 230px;
          height: 230px;
          background: rgba(255,153,0,.10);
          border-radius: 50%;
          filter: blur(65px);
        }
        .shutdown-lock-card {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          width: 186px;
          height: 205px;
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 27px;
          background: linear-gradient(140deg, #2f3e50, #172337 85%);
          box-shadow: 0 28px 45px rgba(0,0,0,.28), inset 0 1px 1px rgba(255,255,255,.07);
          transform: rotate(-6deg);
        }
        .shutdown-lock-icon {
          display: grid;
          place-items: center;
          width: 100px;
          height: 100px;
          border-radius: 27px;
          color: #ffb13d;
          border: 1px solid rgba(255,153,0,.19);
          background: rgba(255,153,0,.085);
        }
        .shutdown-lock-label { color: #9aa9bc; font-size: 11px; letter-spacing: 2.2px; margin-top: 23px; font-weight: 700; direction: ltr; }
        .shutdown-art-bubble {
          position: absolute;
          z-index: 2;
          bottom: 35px;
          right: 0;
          color: #ffbd5d;
          background: #28374a;
          border: 1px solid rgba(255,153,0,.20);
          box-shadow: 0 12px 24px rgba(0,0,0,.16);
          border-radius: 13px;
          padding: 12px 16px;
          direction: ltr;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.3px;
        }
        .shutdown-footer {
          padding: 23px 0 29px;
          border-top: 1px solid rgba(255,255,255,.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          color: #8491a5;
          font-size: 12px;
        }
        .shutdown-footer-en { direction: ltr; letter-spacing: .2px; }
        @keyframes shutdown-reveal {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) { .shutdown-panel { animation: none; } }
        @media (max-width: 850px) {
          .shutdown-panel { grid-template-columns: 1fr; gap: 32px; }
          .shutdown-art { min-height: 250px; order: -1; }
          .shutdown-art::before { width: 245px; box-shadow: 0 0 0 28px rgba(255,255,255,.018); }
          .shutdown-lock-card { width: 135px; height: 155px; border-radius: 21px; }
          .shutdown-lock-icon { width: 76px; height: 76px; border-radius: 20px; }
          .shutdown-lock-label { margin-top: 14px; font-size: 9px; }
          .shutdown-art-bubble { right: calc(50% - 130px); bottom: 6px; }
        }
        @media (max-width: 530px) {
          .shutdown-wrap { width: min(calc(100% - 28px), 1120px); }
          .shutdown-header { padding: 22px 0; }
          .shutdown-brand-name { font-size: 18px; }
          .shutdown-header-tag { font-size: 9px; letter-spacing: .8px; }
          .shutdown-content { padding: 26px 0 32px; }
          .shutdown-panel { padding: 26px 22px 32px; border-radius: 22px; gap: 16px; }
          .shutdown-art { min-height: 215px; }
          .shutdown-title { font-size: 33px; }
          .shutdown-text { font-size: 15px; }
          .shutdown-footer { justify-content: center; text-align: center; }
        }
      `}</style>

      <header className="shutdown-header shutdown-wrap">
        <div className="shutdown-brand" aria-label="FDDS Performance Center">
          <div className="shutdown-brand-icon"><Package size={22} strokeWidth={2.25} /></div>
          <div>
            <div className="shutdown-brand-name">FDDS<span>.</span></div>
            <div className="shutdown-brand-desc">PERFORMANCE CENTER</div>
          </div>
        </div>
        <div className="shutdown-header-tag"><i aria-hidden="true" /> SERVICE NOTICE</div>
      </header>

      <section className="shutdown-content shutdown-wrap" aria-labelledby="shutdown-heading">
        <div className="shutdown-panel">
          <div className="shutdown-copy">
            <div className="shutdown-badge">
              <span className="shutdown-badge-dot" aria-hidden="true" />
              {notice.badge}
            </div>
            <h1 className="shutdown-title" id="shutdown-heading">{notice.title}</h1>
            <div className="shutdown-title-bar" aria-hidden="true" />
            <p className="shutdown-text">{notice.message}</p>
            <p className="shutdown-thanks">{notice.thanks}</p>
            <div className="shutdown-note">
              <Info size={17} aria-hidden="true" />
              <span>{notice.footnote}</span>
            </div>
          </div>

          <div className="shutdown-art" aria-hidden="true">
            <div className="shutdown-lock-card">
              <div className="shutdown-lock-icon"><LockKeyhole size={49} strokeWidth={1.5} /></div>
              <div className="shutdown-lock-label">التعليم مش ببلاش  </div>
            </div>
            <div className="shutdown-art-bubble">SYSTEM OFFLINE</div>
          </div>
        </div>
      </section>

      <footer className="shutdown-footer shutdown-wrap">
        <span>شكرًا لكل من كان جزءًا من هذه التجربة.</span>
        <span className="shutdown-footer-en">FDDS · End of service</span>
      </footer>
    </main>
  );
};

export default App;
