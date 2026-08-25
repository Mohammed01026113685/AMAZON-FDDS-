const fs = require('fs');
let code = fs.readFileSync('services/excelProcessor.ts', 'utf8');

const newStationKey = `  const stationKey = keys.find(k => {
    const nk = normalize(k);
    return nk.includes('station') || 
      nk.includes('hub') || 
      nk.includes('location') ||
      nk.includes('service area') ||
      nk.includes('محطة') ||
      nk.includes('المحطة') ||
      nk.includes('فرع') ||
      nk.includes('الفرع') ||
      nk.includes('موقع') ||
      nk.includes('site') ||
      nk.includes('zone') ||
      nk.includes('area') ||
      nk.includes('منطقة') ||
      nk.includes('facility');
  });`;

code = code.replace(/  const stationKey = keys\.find\(k => \n    normalize\(k\)\.includes\('station'\) \|\| \n    normalize\(k\)\.includes\('hub'\) \|\| \n    normalize\(k\)\.includes\('location'\) \|\|\n    normalize\(k\)\.includes\('service area'\) \|\|\n    normalize\(k\)\.includes\('محطة'\) \|\|\n    normalize\(k\)\.includes\('فرع'\) \|\|\n    normalize\(k\)\.includes\('موقع'\)\n  \);/g, newStationKey);

fs.writeFileSync('services/excelProcessor.ts', code);
console.log("Patched stationKey!");
