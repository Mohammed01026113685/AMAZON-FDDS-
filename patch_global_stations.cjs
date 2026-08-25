const fs = require('fs');
let code = fs.readFileSync('components/GlobalStationsSummary.tsx', 'utf8');

// Add import for AnimatedNumber
code = code.replace(
    "import { Bar, Doughnut } from 'react-chartjs-2';",
    "import { Bar, Doughnut } from 'react-chartjs-2';\nimport { AnimatedNumber } from './AnimatedNumber';"
);

// Replace static numbers with AnimatedNumber
code = code.replace(
    /<span className="text-2xl font-black text-\[#0F1111\] dark:text-white">\{fddsGlobal\.toFixed\(1\)\}%<\/span>/g,
    '<span className="text-2xl font-black text-[#0F1111] dark:text-white"><AnimatedNumber value={fddsGlobal} formatter={(v) => v.toFixed(1)} />%</span>'
);

code = code.replace(
    /<div className="text-3xl font-black text-amber-600 dark:text-amber-500">\{topStation\?\.fdds\?\.toFixed\(1\) \?\? "0\.0"\}%<\/div>/g,
    '<div className="text-3xl font-black text-amber-600 dark:text-amber-500">{topStation ? <><AnimatedNumber value={topStation.fdds} formatter={(v) => v.toFixed(1)} />%</> : "0.0%"}</div>'
);

code = code.replace(
    /\{topStation\?\.total\?\.toLocaleString\(\) \?\? "0"\} Shipments/g,
    '{topStation ? <AnimatedNumber value={topStation.total} formatter={(v) => Math.round(v).toLocaleString()} /> : "0"} Shipments'
);

code = code.replace(
    /<div className="text-3xl font-black text-rose-600 dark:text-rose-500">\{bottomStation\?\.fdds\?\.toFixed\(1\) \?\? "0\.0"\}%<\/div>/g,
    '<div className="text-3xl font-black text-rose-600 dark:text-rose-500">{bottomStation ? <><AnimatedNumber value={bottomStation.fdds} formatter={(v) => v.toFixed(1)} />%</> : "0.0%"}</div>'
);

code = code.replace(
    /Gap: \{\(TARGET - \(bottomStation\?\.fdds \|\| 0\)\)\.toFixed\(1\)\}%/g,
    'Gap: {bottomStation ? <><AnimatedNumber value={TARGET - bottomStation.fdds} formatter={(v) => v.toFixed(1)} />%</> : "0.0%"}'
);

code = code.replace(
    /<h2 className="text-3xl font-black text-\[#0F1111\] dark:text-white mb-1">\{stationData\.grandTotal\.total\.toLocaleString\(\)\}<\/h2>/g,
    '<h2 className="text-3xl font-black text-[#0F1111] dark:text-white mb-1"><AnimatedNumber value={stationData.grandTotal.total} formatter={(v) => Math.round(v).toLocaleString()} /></h2>'
);

code = code.replace(
    /Delivered: \{stationData\.grandTotal\.delivered\.toLocaleString\(\)\}/g,
    'Delivered: <AnimatedNumber value={stationData.grandTotal.delivered} formatter={(v) => Math.round(v).toLocaleString()} />'
);

code = code.replace(
    /Failed: \{stationData\.grandTotal\.failed\.toLocaleString\(\)\}/g,
    'Failed: <AnimatedNumber value={stationData.grandTotal.failed} formatter={(v) => Math.round(v).toLocaleString()} />'
);

fs.writeFileSync('components/GlobalStationsSummary.tsx', code);
console.log("Patched GlobalStationsSummary with AnimatedNumber!");
