const fs = require('fs');
let code = fs.readFileSync('services/excelProcessor.ts', 'utf8');

code = code.replace(
  'if (!daKey || !statusKey) throw new Error("لم يتم العثور على عمود اسم المندوب (DA Name) أو الحالة (Status).");',
  'if (!daKey || !statusKey) throw new Error("لم يتم العثور على عمود اسم المندوب أو الحالة. الأعمدة المتاحة: " + keys.join(", "));'
);

fs.writeFileSync('services/excelProcessor.ts', code);
console.log("Patched error message!");
