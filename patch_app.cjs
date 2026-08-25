const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// 1. Add imports
code = code.replace(
    "import GlobalStationsSummary from './components/GlobalStationsSummary';",
    "import GlobalStationsSummary from './components/GlobalStationsSummary';\nimport { SmartInsights } from './components/SmartInsights';\nimport { AnimatedNumber } from './components/AnimatedNumber';"
);
code = code.replace(
    "import { Download, UploadCloud, Search, CheckCircle, AlertTriangle, Clock, XCircle, TrendingUp, Sun, Moon, LogOut, Loader2, Database, Eye, Trash2, Calendar, Archive, LayoutDashboard, Copy, Upload, Users, Save, Check, Goal, Presentation } from 'lucide-react';",
    "import { Download, UploadCloud, Search, CheckCircle, AlertTriangle, Clock, XCircle, TrendingUp, Sun, Moon, LogOut, Loader2, Database, Eye, Trash2, Calendar, Archive, LayoutDashboard, Copy, Upload, Users, Save, Check, Goal, Presentation, Maximize } from 'lucide-react';"
);

// 2. Add isFullscreen state
code = code.replace(
    "const [activeTab, setActiveTab] = useState<'daily' | 'history'>('daily');",
    "const [activeTab, setActiveTab] = useState<'daily' | 'history'>('daily');\n  const [isFullscreen, setIsFullscreen] = useState(false);\n\n  useEffect(() => {\n    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);\n    document.addEventListener('fullscreenchange', handleFullscreenChange);\n    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);\n  }, []);\n\n  const toggleFullscreen = () => {\n    if (!document.fullscreenElement) {\n      document.documentElement.requestFullscreen().catch(e => console.error(e));\n    } else {\n      if (document.exitFullscreen) document.exitFullscreen();\n    }\n  };"
);

// 3. Add Presentation button to header
code = code.replace(
    '<button onClick={toggleDarkMode}',
    '<button onClick={toggleFullscreen} className="p-2 sm:px-4 sm:py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-2 font-bold no-print" title={t(\'presentationMode\') || \'Presentation Mode\'}><Maximize size={18} /><span className="hidden sm:inline">العرض</span></button>\n          <button onClick={toggleDarkMode}'
);

// 4. Inject SmartInsights after GlobalStationsSummary or Table
code = code.replace(
    '{/* Top Insight Cards */}',
    '{data && activeStation !== \'ALL\' && <SmartInsights data={data} />}\n                        {/* Top Insight Cards */}'
);

// 5. Add AnimatedNumber to the main cards in App.tsx
code = code.replace(
    /<div className="text-3xl font-black text-\[#0F1111\] dark:text-white mt-1">\{data\.grandTotal\.total\.toLocaleString\(\)\}<\/div>/g,
    '<div className="text-3xl font-black text-[#0F1111] dark:text-white mt-1"><AnimatedNumber value={data.grandTotal.total} formatter={(v) => Math.round(v).toLocaleString()} /></div>'
);

code = code.replace(
    /<div className="text-3xl font-black text-emerald-600 dark:text-emerald-500 mt-1">\{data\.grandTotal\.delivered\.toLocaleString\(\)\}<\/div>/g,
    '<div className="text-3xl font-black text-emerald-600 dark:text-emerald-500 mt-1"><AnimatedNumber value={data.grandTotal.delivered} formatter={(v) => Math.round(v).toLocaleString()} /></div>'
);

code = code.replace(
    /<div className="text-3xl font-black text-rose-600 dark:text-rose-500 mt-1">\{data\.grandTotal\.failed\.toLocaleString\(\)\}<\/div>/g,
    '<div className="text-3xl font-black text-rose-600 dark:text-rose-500 mt-1"><AnimatedNumber value={data.grandTotal.failed} formatter={(v) => Math.round(v).toLocaleString()} /></div>'
);

code = code.replace(
    /<div className="text-3xl font-black text-amber-600 dark:text-amber-500 mt-1">\{data\.grandTotal\.ofd\.toLocaleString\(\)\}<\/div>/g,
    '<div className="text-3xl font-black text-amber-600 dark:text-amber-500 mt-1"><AnimatedNumber value={data.grandTotal.ofd} formatter={(v) => Math.round(v).toLocaleString()} /></div>'
);

code = code.replace(
    /<div className="text-3xl font-black text-\[#0F1111\] dark:text-white mt-1">\{data\.grandTotal\.successRate\.toFixed\(1\)\}%<\/div>/g,
    '<div className="text-3xl font-black text-[#0F1111] dark:text-white mt-1"><AnimatedNumber value={data.grandTotal.successRate} formatter={(v) => v.toFixed(1)} />%</div>'
);

// 6. Support Presentation mode styling overrides
code = code.replace(
    'className={`min-h-screen transition-colors duration-300 font-sans ${dir === \'rtl\' ? \'rtl\' : \'ltr\'}`}',
    'className={`min-h-screen transition-colors duration-300 font-sans ${dir === \'rtl\' ? \'rtl\' : \'ltr\'} ${isFullscreen ? \'presentation-mode\' : \'\'}`}'
);

fs.writeFileSync('App.tsx', code);
console.log("Patched App.tsx!");
