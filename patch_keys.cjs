const fs = require('fs');
let code = fs.readFileSync('services/excelProcessor.ts', 'utf8');

const newDaKeyLogic = `    const daKey = keys.find(k => {
      const nk = normalize(k);
      return nk.includes('da name') || nk.includes('driver') || nk.includes('associate') || nk.includes('agent') || nk.includes('courier') || nk.includes('مندوب') || nk.includes('اسم') || nk.includes('name') || nk.includes('da');
    });`;

const newStatusKeyLogic = `    const statusKey = keys.find(k => {
      const nk = normalize(k);
      return nk.includes('status') || nk.includes('state') || nk.includes('حالة') || nk.includes('الحالة');
    });`;

code = code.replace(/    const daKey = keys\.find\(k => normalize\(k\)\.includes\('da name'\) \|\| normalize\(k\)\.includes\('driver'\) \|\| normalize\(k\)\.includes\('associate'\)\);/g, newDaKeyLogic);
code = code.replace(/    const statusKey = keys\.find\(k => normalize\(k\)\.includes\('status'\)\);/g, newStatusKeyLogic);

fs.writeFileSync('services/excelProcessor.ts', code);
console.log("Patched keys!");
