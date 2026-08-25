const fs = require('fs');
let code = fs.readFileSync('services/excelProcessor.ts', 'utf8');

const oldFilterSummary = `      if (stationKey && selectedStation !== 'ALL') {
        const stationVal = normalize(row[stationKey]);
        if (stationVal && !stationVal.includes(selectedStationLower)) return;
      }`;

const newFilter = `      if (selectedStation !== 'ALL') {
        let matches = false;
        if (stationKey) {
          const stationVal = normalize(row[stationKey]);
          if (stationVal && stationVal.includes(selectedStationLower)) matches = true;
        } else {
          // Fallback: search the entire row for the station code (e.g., "daw1")
          for (const key of keys) {
            const val = (row[key] || '').toString().toLowerCase();
            if (val.includes(selectedStationLower)) {
              matches = true;
              break;
            }
          }
        }
        if (!matches) return;
      }`;

// Replace in summary sheet block
code = code.replace(oldFilterSummary, newFilter);
// Replace in detail sheet block
code = code.replace(oldFilterSummary, newFilter);

fs.writeFileSync('services/excelProcessor.ts', code);
console.log("Patched filters!");
