
import { ProcessedResult, HistoryRecord } from '../types';
import type ExcelJS from 'exceljs';

// --- COLORS PALETTE ---
const COLORS = {
    headerBg: 'FF232F3E', // Amazon Dark Blue
    headerText: 'FFFFFFFF',
    subHeaderBg: 'FFEAEDED', // Light Gray
    subHeaderText: 'FF0F1111',
    blockSummaryBg: 'FFFFF8E1', // Light Orange/Yellow Tint for summaries
    white: 'FFFFFFFF',
    border: 'FFD5D9D9',
    successText: 'FF007600', // Green
    dangerText: 'FFCC0C39', // Red
    warningText: 'FFE99309', // Orange
    zebra: 'FFF8F8F8', // Very Light Gray
    totalRowBg: 'FF37475A', // Lighter Dark Blue for totals
    totalRowText: 'FFFFFFFF'
};

// --- HELPER STYLES ---
const getStyles = (Excel: typeof ExcelJS) => ({
    headerFont: { name: 'Calibri', size: 12, bold: true, color: { argb: COLORS.headerText } },
    subHeaderFont: { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.subHeaderText } },
    dataFont: { name: 'Calibri', size: 11, color: { argb: 'FF0F1111' } },
    agentFont: { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F1111' } },
    center: { vertical: 'middle', horizontal: 'center' } as Partial<ExcelJS.Alignment>,
    left: { vertical: 'middle', horizontal: 'left', indent: 1 } as Partial<ExcelJS.Alignment>,
    thinBorder: {
        top: { style: 'thin', color: { argb: COLORS.border } },
        left: { style: 'thin', color: { argb: COLORS.border } },
        bottom: { style: 'thin', color: { argb: COLORS.border } },
        right: { style: 'thin', color: { argb: COLORS.border } }
    } as Partial<ExcelJS.Borders>
});

const applyHeaderStyle = (worksheet: ExcelJS.Worksheet, title: string, subtitle: string) => {
    // Title
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { name: 'Arial', size: 20, bold: true, color: { argb: COLORS.white } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 40;

    // Subtitle / Date
    worksheet.mergeCells('A2:G2');
    const subCell = worksheet.getCell('A2');
    subCell.value = subtitle;
    subCell.font = { name: 'Arial', size: 12, color: { argb: COLORS.headerBg } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 25;
};

const addSummaryCard = (worksheet: ExcelJS.Worksheet, startRow: number, total: number, rate: number) => {
    worksheet.mergeCells(`A${startRow}:C${startRow + 2}`);
    const card = worksheet.getCell(`A${startRow}`);
    card.value = `TOTAL VOLUME\n${total}`;
    card.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    card.font = { name: 'Arial', size: 12, bold: true };
    card.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }; 
    card.border = { top: {style:'medium'}, left: {style:'medium'}, bottom: {style:'medium'}, right: {style:'medium'} };

    worksheet.mergeCells(`E${startRow}:G${startRow + 2}`);
    const rateCard = worksheet.getCell(`E${startRow}`);
    rateCard.value = `SUCCESS RATE\n${rate.toFixed(1)}%`;
    rateCard.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    rateCard.font = { name: 'Arial', size: 14, bold: true, color: { argb: rate >= 90 ? COLORS.successText : COLORS.dangerText } };
    rateCard.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } }; 
    rateCard.border = { top: {style:'medium'}, left: {style:'medium'}, bottom: {style:'medium'}, right: {style:'medium'} };
};

export const exportAdvancedReport = async (report: any[], title: string, filename: string) => {
    // Dynamic Import
    const ExcelJS = (await import('exceljs')).default;
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Performance Report');

    applyHeaderStyle(worksheet, 'LogiTrack | Performance Report', title);

    const totalVolume = report.reduce((acc: any, curr: any) => acc + curr.total, 0);
    const totalDelivered = report.reduce((acc: any, curr: any) => acc + curr.delivered, 0);
    const overallRate = totalVolume > 0 ? (totalDelivered / totalVolume) * 100 : 0;

    addSummaryCard(worksheet, 4, totalVolume, overallRate);

    const tableStartRow = 8;
    const headers = ['Rank', 'Agent Name', 'Days Worked', 'Total Shipments', 'Delivered', 'Failed/RTO', 'Success Rate'];
    
    worksheet.getRow(tableStartRow).values = headers;
    worksheet.getRow(tableStartRow).height = 30;
    
    worksheet.getRow(tableStartRow).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: COLORS.white }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF37475A' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { bottom: {style:'thick', color: {argb: 'FFFF9900'}} };
    });

    report.forEach((r: any, index: number) => {
        const rowIdx = tableStartRow + 1 + index;
        const row = worksheet.getRow(rowIdx);
        
        row.values = [
            index + 1,
            r.name,
            r.daysWorked,
            r.total,
            r.delivered,
            r.failed,
            r.successRate / 100
        ];

        if (index % 2 !== 0) {
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebra } };
            });
        }

        row.getCell(1).font = { bold: true, color: { argb: 'FF94A3B8' } }; 
        row.getCell(2).font = { bold: true }; 
        row.getCell(2).alignment = { horizontal: 'left', indent: 1 };
        row.getCell(7).numFmt = '0.0%';
        row.getCell(7).font = { bold: true };

        if (r.successRate >= 95) row.getCell(7).font = { bold: true, color: { argb: 'FF007185' } };
        else if (r.successRate >= 90) row.getCell(7).font = { bold: true, color: { argb: COLORS.successText } };
        else if (r.successRate < 85) row.getCell(7).font = { bold: true, color: { argb: COLORS.dangerText } };

        row.height = 25;
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = { bottom: {style:'thin', color: {argb: 'FFE2E8F0'}} };
            if (Number(cell.col) !== 2) cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
    });

    worksheet.columns = [
        { width: 8 },  
        { width: 35 }, 
        { width: 15 }, 
        { width: 20 }, 
        { width: 15 }, 
        { width: 15 }, 
        { width: 20 }, 
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${filename}.xlsx`;
    anchor.click();
};

export const exportToExcel = async (data: ProcessedResult) => {
    // Dynamic Import
    const ExcelJS = (await import('exceljs')).default;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Daily Report', {
        views: [
            { state: 'frozen', xSplit: 0, ySplit: 8 } // Freeze headers (Row 8 is header)
        ]
    });
    const dateStr = new Date().toLocaleDateString('en-GB');

    // 1. Header Styling
    applyHeaderStyle(worksheet, 'LogiTrack | Daily Summary', `Date: ${dateStr}`);
    addSummaryCard(worksheet, 4, data.grandTotal.total, data.grandTotal.successRate);

    // 2. Table Headers
    const tableStartRow = 8;
    const headers = ['Agent Name', 'Delivered', 'Failed', 'OFD', 'RTO', 'Total', 'Success Rate'];
    worksheet.getRow(tableStartRow).values = headers;
    worksheet.getRow(tableStartRow).height = 30;
    
    // Enable AutoFilter
    worksheet.autoFilter = {
        from: { row: tableStartRow, column: 1 },
        to: { row: tableStartRow, column: 7 }
    };

    // Header Style
    worksheet.getRow(tableStartRow).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: COLORS.white }, size: 11, name: 'Calibri' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { bottom: {style:'thick', color: {argb: 'FFFF9900'}} };
    });

    // 3. Data Rows
    data.summaries.forEach((s, i) => {
        const row = worksheet.addRow([
            s.daName,
            s.delivered,
            s.failed,
            s.ofd,
            s.rto,
            s.total,
            s.successRate / 100
        ]);
        
        row.height = 22;
        
        // Formats
        row.getCell(7).numFmt = '0.0%';
        row.getCell(1).alignment = { horizontal: 'left', indent: 1 };
        
        // Fonts
        row.font = { name: 'Calibri', size: 11 };
        row.getCell(1).font = { name: 'Calibri', bold: true }; // Name Bold

        // Conditional formatting for Success Rate
        if (s.successRate >= 95) row.getCell(7).font = { color: { argb: 'FF007185' }, bold: true };
        else if (s.successRate >= 90) row.getCell(7).font = { color: { argb: COLORS.successText }, bold: true };
        else if (s.successRate < 80) row.getCell(7).font = { color: { argb: COLORS.dangerText }, bold: true };
        else row.getCell(7).font = { color: { argb: COLORS.warningText }, bold: true };

        // Highlight High Failed
        if (s.failed > 0) row.getCell(3).font = { color: { argb: COLORS.dangerText }, bold: true };

        // Zebra Striping
        if (i % 2 !== 0) {
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebra } };
            });
        }

        // Borders
        row.eachCell((cell) => {
            if (Number(cell.col) !== 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
        });
    });

    // 4. Grand Total Row (Footer)
    const totalRow = worksheet.addRow([
        'GRAND TOTAL',
        data.grandTotal.delivered,
        data.grandTotal.failed,
        data.grandTotal.ofd,
        data.grandTotal.rto,
        data.grandTotal.total,
        data.grandTotal.successRate / 100
    ]);

    totalRow.height = 28;
    totalRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalRowBg } };
        cell.font = { bold: true, color: { argb: COLORS.totalRowText }, size: 12, name: 'Calibri' };
        if (Number(cell.col) !== 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
        else cell.alignment = { horizontal: 'left', indent: 1 };
        cell.border = { top: { style: 'double', color: { argb: 'FFFFFFFF' } } };
    });
    totalRow.getCell(7).numFmt = '0.0%';

    // 5. Column Widths
    worksheet.columns = [
        { width: 35 }, // Name
        { width: 15 }, // Del
        { width: 15 }, // Fail
        { width: 15 }, // OFD
        { width: 15 }, // RTO
        { width: 15 }, // Total
        { width: 20 }  // Rate
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `LogiTrack_Daily_${dateStr.replace(/\//g, '-')}.xlsx`;
    anchor.click();
};

export const exportAgentHistory = async (agentName: string, history: any[]) => {
    // Dynamic Import
    const ExcelJS = (await import('exceljs')).default;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('History');
    applyHeaderStyle(worksheet, `Agent History: ${agentName}`, 'Performance Log');
    
    const headers = ['Date', 'Rate', 'Delivered', 'Total'];
    worksheet.getRow(5).values = headers;
    worksheet.getRow(5).font = { bold: true };
    
    history.forEach((h: any) => {
        const row = worksheet.addRow([h.date, h.successRate/100, h.delivered, h.total]);
        row.getCell(2).numFmt = '0.0%';
    });
    
    worksheet.columns = [{width: 20}, {width: 15}, {width: 15}, {width: 15}];
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${agentName}_history.xlsx`;
    anchor.click();
};

export const exportMonthlyReport = async (report: any[], month: string) => {
    return exportAdvancedReport(report, `Monthly Report - ${month}`, `Monthly_${month}`);
};

export const exportYearlyReport = async (report: any[], year: string) => {
   return exportAdvancedReport(report, `Annual Report - ${year}`, `Yearly_Report_${year}`);
};

// --- NEW: Complex Detailed Monthly Report (The "Manager View") ---
export const exportComplexMonthlyReport = async (rawRecords: HistoryRecord[], title: string, filename: string) => {
    // Dynamic Import
    const ExcelJS = (await import('exceljs')).default;
    const styles = getStyles(ExcelJS);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Detailed View', {
        views: [
            { state: 'frozen', xSplit: 1, ySplit: 3 } // Freeze Name column and Headers
        ]
    });

    // --- 1. PREPARE DATA ---
    const agentMap: Record<string, {total: number, delivered: number}[]> = {};
    const agentNames = new Set<string>();
    
    // Arrays to store column totals for the Grand Total row
    const dayTotals = new Array(32).fill(null).map(() => ({total: 0, delivered: 0}));

    rawRecords.forEach(rec => {
        if(!rec.agents) return;
        rec.agents.forEach(a => agentNames.add(a.daName));
    });

    const sortedAgents = Array.from(agentNames).sort();

    // Initialize agent map
    sortedAgents.forEach(name => {
        agentMap[name] = new Array(32).fill(null).map(() => ({total: 0, delivered: 0}));
    });

    // Fill data
    rawRecords.forEach(rec => {
        const date = new Date(rec.date);
        const day = date.getDate(); 
        if (day > 31) return;

        if (rec.agents) {
            rec.agents.forEach(a => {
                if(agentMap[a.daName]) {
                    agentMap[a.daName][day] = { total: a.total, delivered: a.delivered };
                    // Add to Grand Totals
                    dayTotals[day].total += a.total;
                    dayTotals[day].delivered += a.delivered;
                }
            });
        }
    });

    // --- 2. BUILD HEADER (Rows 1-3) ---
    
    const row1 = worksheet.getRow(1);
    const row2 = worksheet.getRow(2);
    const row3 = worksheet.getRow(3);

    row1.height = 30;
    row2.height = 25;
    row3.height = 20;

    worksheet.getColumn(1).width = 35; // Name Column
    worksheet.mergeCells('A1:A3');
    const nameHeader = worksheet.getCell('A1');
    nameHeader.value = 'Agent Name';
    nameHeader.style = { font: styles.headerFont, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }, alignment: styles.center, border: styles.thinBorder };

    let colIdx = 2; // Start from Column B

    const createHeaderBlock = (startDay: number, endDay: number, label: string) => {
        // Main Block Header (e.g., "1 - 10")
        const startCol = colIdx;
        const endColBlock = colIdx + ((endDay - startDay + 1) * 2) - 1; // 2 cols per day
        
        worksheet.mergeCells(1, startCol, 1, endColBlock);
        const periodHeader = worksheet.getCell(1, startCol);
        periodHeader.value = `Days ${startDay} - ${endDay}`;
        periodHeader.style = { font: styles.headerFont, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }, alignment: styles.center, border: styles.thinBorder };

        // Days Loop
        for(let d=startDay; d<=endDay; d++) {
            worksheet.mergeCells(2, colIdx, 2, colIdx+1);
            const dayCell = worksheet.getCell(2, colIdx);
            dayCell.value = d;
            dayCell.style = { font: styles.subHeaderFont, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subHeaderBg } }, alignment: styles.center, border: styles.thinBorder };

            // Metrics
            const volCell = worksheet.getCell(3, colIdx);
            volCell.value = 'Vol';
            volCell.style = { font: {size: 9}, alignment: styles.center, border: styles.thinBorder };
            worksheet.getColumn(colIdx).width = 6;

            const delCell = worksheet.getCell(3, colIdx+1);
            delCell.value = 'Del';
            delCell.style = { font: {size: 9}, alignment: styles.center, border: styles.thinBorder };
            worksheet.getColumn(colIdx+1).width = 6;

            colIdx += 2;
        }

        // --- Period Summary Block (Week Total) ---
        const summaryStartCol = colIdx;
        const summaryEndCol = colIdx + 2;
        worksheet.mergeCells(1, summaryStartCol, 1, summaryEndCol);
        const summaryHeader = worksheet.getCell(1, summaryStartCol);
        summaryHeader.value = label; // e.g. "Week 1 Summary"
        summaryHeader.style = { font: { ...styles.headerFont, color: { argb: 'FF000000' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD814' } }, alignment: styles.center, border: styles.thinBorder }; // Amazon Yellow

        // Labels
        const labels = ['Total', 'Delivered', 'Rate %'];
        labels.forEach((txt, i) => {
            worksheet.mergeCells(2, colIdx + i, 3, colIdx + i);
            const cell = worksheet.getCell(2, colIdx + i);
            cell.value = txt;
            cell.style = { font: styles.subHeaderFont, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.blockSummaryBg } }, alignment: styles.center, border: styles.thinBorder };
            worksheet.getColumn(colIdx + i).width = 10;
        });
        
        colIdx += 3;
    };

    // Build Blocks
    createHeaderBlock(1, 10, '1st Period Summary');
    createHeaderBlock(11, 20, '2nd Period Summary');
    createHeaderBlock(21, 31, '3rd Period Summary');

    // --- Final Month Summary ---
    const finalStartCol = colIdx;
    worksheet.mergeCells(1, finalStartCol, 1, finalStartCol + 2);
    const finalHeader = worksheet.getCell(1, finalStartCol);
    finalHeader.value = 'MONTHLY TOTAL';
    finalHeader.style = { font: styles.headerFont, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF232F3E' } }, alignment: styles.center, border: styles.thinBorder };

    ['Total', 'Delivered', 'Rate %'].forEach((txt, i) => {
        worksheet.mergeCells(2, colIdx + i, 3, colIdx + i);
        const cell = worksheet.getCell(2, colIdx + i);
        cell.value = txt;
        cell.style = { font: { ...styles.subHeaderFont, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF37475A' } }, alignment: styles.center, border: styles.thinBorder };
        worksheet.getColumn(colIdx + i).width = 12;
    });

    // --- 3. FILL ROWS ---
    let currentRowIdx = 4;

    const fillRowData = (name: string, isGrandTotal: boolean) => {
        const row = worksheet.getRow(currentRowIdx);
        row.height = 22;
        let rColIdx = 2;

        const nameCell = row.getCell(1);
        nameCell.value = name;
        
        // Style Name Cell
        if (isGrandTotal) {
            nameCell.style = { font: { ...styles.agentFont, size: 14, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }, alignment: styles.left, border: styles.thinBorder };
        } else {
            nameCell.style = { font: styles.agentFont, alignment: styles.left, border: styles.thinBorder };
            // Zebra Striping
            if (currentRowIdx % 2 !== 0) {
                nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebra } };
            }
        }

        const processBlockData = (start: number, end: number) => {
            let bTotal = 0;
            let bDel = 0;

            for(let d=start; d<=end; d++) {
                let tVal = 0, dVal = 0;
                
                if (isGrandTotal) {
                    tVal = dayTotals[d].total;
                    dVal = dayTotals[d].delivered;
                } else {
                    const data = agentMap[name][d];
                    if (data) { tVal = data.total; dVal = data.delivered; }
                }

                // Vol Cell
                const c1 = row.getCell(rColIdx);
                c1.value = tVal > 0 ? tVal : (isGrandTotal ? 0 : ''); 
                
                // Del Cell
                const c2 = row.getCell(rColIdx + 1);
                c2.value = tVal > 0 ? dVal : (isGrandTotal ? 0 : '');

                // Styling Data Cells
                const cellStyle: Partial<ExcelJS.Style> = {
                    font: styles.dataFont,
                    alignment: styles.center,
                    border: styles.thinBorder
                };
                
                if (isGrandTotal) {
                    cellStyle.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    cellStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }; // Dark Blue
                } else if (tVal === 0) {
                    cellStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } }; // Very light grey for empty
                } else if (currentRowIdx % 2 !== 0) {
                    cellStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebra } };
                }

                c1.style = cellStyle;
                c2.style = cellStyle;

                bTotal += tVal;
                bDel += dVal;
                rColIdx += 2;
            }

            // --- Block Summary Cells ---
            const bRate = bTotal > 0 ? bDel / bTotal : 0;
            
            // Total
            const stCell = row.getCell(rColIdx);
            stCell.value = bTotal;
            
            // Del
            const sdCell = row.getCell(rColIdx + 1);
            sdCell.value = bDel;
            
            // Rate
            const srCell = row.getCell(rColIdx + 2);
            srCell.value = bRate;
            srCell.numFmt = '0.0%';

            // Styling Summary Cells
            const summaryStyle: Partial<ExcelJS.Style> = {
                font: { ...styles.dataFont, bold: true },
                alignment: styles.center,
                border: styles.thinBorder,
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.blockSummaryBg } } // Light Orange
            };

            if (isGrandTotal) {
                summaryStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF37475A' } }; // Lighter Blue
                summaryStyle.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            }

            // Rate Coloring
            if (!isGrandTotal) {
                if (bRate >= 0.95) srCell.font = { bold: true, color: { argb: 'FF007185' } };
                else if (bRate >= 0.90) srCell.font = { bold: true, color: { argb: COLORS.successText } };
                else if (bRate > 0 && bRate < 0.85) srCell.font = { bold: true, color: { argb: COLORS.dangerText } };
            }

            stCell.style = summaryStyle;
            sdCell.style = summaryStyle;
            srCell.style = { ...summaryStyle }; 

            rColIdx += 3;
            return { t: bTotal, d: bDel };
        };

        const b1 = processBlockData(1, 10);
        const b2 = processBlockData(11, 20);
        const b3 = processBlockData(21, 31);

        // --- Monthly Total ---
        const mTotal = b1.t + b2.t + b3.t;
        const mDel = b1.d + b2.d + b3.d;
        const mRate = mTotal > 0 ? mDel / mTotal : 0;

        const mtCell = row.getCell(rColIdx);
        mtCell.value = mTotal;
        
        const mdCell = row.getCell(rColIdx + 1);
        mdCell.value = mDel;
        
        const mrCell = row.getCell(rColIdx + 2);
        mrCell.value = mRate;
        mrCell.numFmt = '0.0%';

        const finalStyle: Partial<ExcelJS.Style> = {
            font: { ...styles.dataFont, bold: true, size: 12 },
            alignment: styles.center,
            border: { ...styles.thinBorder, left: { style: 'medium' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAEDED' } } // Grey
        };

        if (isGrandTotal) {
            finalStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF232F3E' } }; // Dark Blue
            finalStyle.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        }

        // Conditional Formatting for Final Rate
        if (!isGrandTotal) {
            if (mRate >= 0.90) mrCell.font = { bold: true, color: { argb: COLORS.successText } };
            else if (mRate < 0.80) mrCell.font = { bold: true, color: { argb: COLORS.dangerText } };
        }

        mtCell.style = finalStyle;
        mdCell.style = finalStyle;
        mrCell.style = finalStyle;

        currentRowIdx++;
    };

    // 1. Fill Agent Rows
    sortedAgents.forEach(name => fillRowData(name, false));

    // 2. Fill Grand Total Row
    fillRowData('GRAND TOTAL', true);

    // Export
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${filename}.xlsx`;
    anchor.click();
};

export const exportCurrentFailedRtoReport = async (data: ProcessedResult, date: string, filename: string) => {
    const ExcelJS = (await import('exceljs')).default;
    const styles = getStyles(ExcelJS as any);
    const workbook = new ExcelJS.Workbook();
    
    const issues: { tracking: string, date: string, agent: string, status: string, station: string }[] = [];
    
    data.summaries.forEach(agent => {
        if(agent.allTrackings) {
            agent.allTrackings.forEach(shipment => {
                if (shipment.status === 'failed' || shipment.status === 'rto' || shipment.status === 'ofd') {
                    issues.push({ 
                        tracking: shipment.id, 
                        date: date, 
                        agent: agent.daName, status: shipment.status.toUpperCase(), station: shipment.station || data.station || 'Unknown' });
                }
            });
        }
    });

    const worksheet = workbook.addWorksheet('Follow-Up & Issues');
    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Pending, Failed & RTO Shipments - ${date}`;
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF37475A' } };
    titleCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    worksheet.getRow(2).values = ['Date', 'Station', 'Agent Name', 'Tracking ID', 'Status'];
    worksheet.getRow(2).eachCell(cell => { 
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAEDED' } }; 
        cell.font = { bold: true }; 
        cell.alignment = { horizontal: 'center' }; 
        cell.border = styles.thinBorder as any; 
    });
    worksheet.columns = [{ width: 15 }, { width: 15 }, { width: 30 }, { width: 25 }, { width: 20 }];
    
    // Add AutoFilter
    worksheet.autoFilter = 'A2:E2';

    issues.forEach((row, idx) => {
        const r = worksheet.addRow([row.date, row.station, row.agent, row.tracking, row.status]);
        r.eachCell(cell => { cell.alignment = { horizontal: 'center', vertical: 'middle' }; cell.border = styles.thinBorder as any; });
        
        if (row.status === 'FAILED') r.getCell(5).font = { color: { argb: 'FFCC0C39' }, bold: true };
        if (row.status === 'RTO') r.getCell(5).font = { color: { argb: 'FFE99309' }, bold: true };
        if (row.status === 'OFD') r.getCell(5).font = { color: { argb: 'FF007600' }, bold: true };
        
        if (idx % 2 !== 0) r.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F8F8' } }; });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
};

export const exportFailedRtoReport = async (rawRecords: HistoryRecord[], title: string, filename: string) => {
    const ExcelJS = (await import('exceljs')).default;
    const styles = getStyles(ExcelJS as any);
    const workbook = new ExcelJS.Workbook();
    
    const issues: { tracking: string, date: string, agent: string, status: string, station: string }[] = [];
    
    rawRecords.forEach(rec => {
        if(!rec.agents) return;
        rec.agents.forEach(agent => {
            if(agent.shipmentDetails) {
                agent.shipmentDetails.forEach(shipment => {
                    if (shipment.status === 'failed' || shipment.status === 'rto' || shipment.status === 'ofd') {
                        issues.push({ 
                            tracking: shipment.id, 
                            date: rec.date, 
                            agent: agent.daName, status: shipment.status.toUpperCase(), station: shipment.station || data.station || 'Unknown' });
                    }
                });
            }
        });
    });

    const worksheet = workbook.addWorksheet('Follow-Up & Issues');
    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Pending, Failed & RTO Shipments - ${title}`;
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF37475A' } };
    titleCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    worksheet.getRow(2).values = ['Date', 'Station', 'Agent Name', 'Tracking ID', 'Status'];
    worksheet.getRow(2).eachCell(cell => { 
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAEDED' } }; 
        cell.font = { bold: true }; 
        cell.alignment = { horizontal: 'center' }; 
        cell.border = styles.thinBorder as any; 
    });
    worksheet.columns = [{ width: 15 }, { width: 15 }, { width: 30 }, { width: 25 }, { width: 20 }];
    
    // Add AutoFilter
    worksheet.autoFilter = 'A2:E2';

    issues.forEach((row, idx) => {
        const r = worksheet.addRow([row.date, row.station, row.agent, row.tracking, row.status]);
        r.eachCell(cell => { cell.alignment = { horizontal: 'center', vertical: 'middle' }; cell.border = styles.thinBorder as any; });
        
        if (row.status === 'FAILED') r.getCell(5).font = { color: { argb: 'FFCC0C39' }, bold: true };
        if (row.status === 'RTO') r.getCell(5).font = { color: { argb: 'FFE99309' }, bold: true };
        if (row.status === 'OFD') r.getCell(5).font = { color: { argb: 'FF007600' }, bold: true };
        
        if (idx % 2 !== 0) r.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F8F8' } }; });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
};

export const exportToPDF = async (data: ProcessedResult, date: string) => {
  // Use the native print dialog which leverages our @media print stylesheet
  // for a clean two-column grid layout.
  setTimeout(() => {
    window.print();
  }, 100);
};

export const exportAsImage = async (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Dynamic Import
  const html2canvas = (await import('html2canvas')).default;

  // وضعية التصوير
  element.classList.add('capturing');
  
  // حفظ الحالة الحالية للتمرير
  const currentScroll = window.scrollY;
  // Temporarily force scroll to top to ensure complete capture
  window.scrollTo(0, 0);

  try {
    // انتظار التأكد من تطبيق الأنماط (توسيط النصوص)
    await new Promise(r => setTimeout(r, 500));

    const canvas = await html2canvas(element, {
      scale: 3, // دقة 3x لوضوح فائق
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollY: 0,
      windowWidth: 1000,
      onclone: (clonedDoc: any) => {
          const el = clonedDoc.getElementById(elementId);
          if (el) {
              el.style.transform = 'none';
              el.style.width = '1000px';
              el.style.borderRadius = '0';
              el.style.boxShadow = 'none';
              el.style.margin = '0';
              
              // فرض التوسيط في النسخة المستنسخة للضمان
              const cells = el.querySelectorAll('td, th');
              cells.forEach((c: any) => {
                  const cell = c as HTMLElement;
                  cell.style.display = 'table-cell';
                  cell.style.verticalAlign = 'middle';
                  cell.style.textAlign = 'center';
              });
          }
      }
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = `LogiTrack_IMG_${new Date().toLocaleTimeString().replace(/:/g, '-')}.png`;
    link.href = imgData;
    link.click();
    
  } catch (err) {
    console.error("Image Export Error:", err);
    alert("حدث خطأ أثناء تصدير الصورة.");
  } finally {
    element.classList.remove('capturing');
    window.scrollTo(0, currentScroll);
  }
};
