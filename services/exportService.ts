import { ProcessedResult, HistoryRecord } from '../types';
import type ExcelJS from 'exceljs';

// --- COLORS PALETTE ---
const COLORS = {
    // Primary Colors
    headerBg: 'FF232F3E',           // Amazon Dark Blue
    headerText: 'FFFFFFFF',
    subHeaderBg: 'FFF2F4F8',        // Very Light Gray/Blue
    subHeaderText: 'FF0F1111',
    
    // Data Colors
    blockSummaryBg: 'FFFFF3CD',     // Soft Yellow for summaries
    quarter1Bg: 'FFE3F2FD',         // Light Blue for Q1
    quarter2Bg: 'FFF3E5F5',         // Light Purple for Q2
    quarter3Bg: 'FFF1F8E9',         // Light Green for Q3
    quarter4Bg: 'FFFFF3E0',         // Light Orange for Q4
    
    // Status Colors
    successText: 'FF007600',        // Green
    warningText: 'FFE99309',        // Orange
    dangerText: 'FFCC0C39',         // Red
    infoText: 'FF007185',           // Blue
    
    // UI Colors
    white: 'FFFFFFFF',
    border: 'FFD5D9D9',
    zebra: 'FFFAFAFA',             // Almost White
    totalRowBg: 'FF37475A',        // Lighter Dark Blue for totals
    totalRowText: 'FFFFFFFF',
    highlighter: 'FFFFF9C4',       // Yellow highlight for important cells
    
    // Period Colors
    period1: 'FFE8F5E8',           // Light Green
    period2: 'FFE3F2FD',           // Light Blue
    period3: 'FFFCE4EC',           // Light Pink
    period4: 'FFF3E5F5',           // Light Purple
};

// --- HELPER FUNCTIONS ---
const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
};

const getRateColor = (rate: number) => {
    if (rate >= 95) return COLORS.infoText;     // Blue for 95%+
    if (rate >= 90) return COLORS.successText;  // Green for 90-94%
    if (rate >= 85) return COLORS.warningText;  // Orange for 85-89%
    return COLORS.dangerText;                   // Red for <85%
};

const getRateStyle = (rate: number, isBold = true) => {
    return {
        bold: isBold,
        color: { argb: getRateColor(rate) }
    };
};

const getPeriodBgColor = (periodIndex: number) => {
    const colors = [COLORS.period1, COLORS.period2, COLORS.period3, COLORS.period4];
    return colors[periodIndex % colors.length];
};

// --- EXCEL STYLES ---
const getExcelStyles = (Excel: typeof ExcelJS) => ({
    // Fonts
    titleFont: { 
        name: 'Arial', 
        size: 20, 
        bold: true, 
        color: { argb: COLORS.headerText } 
    },
    subtitleFont: { 
        name: 'Arial', 
        size: 12, 
        color: { argb: COLORS.headerBg } 
    },
    headerFont: { 
        name: 'Calibri', 
        size: 12, 
        bold: true, 
        color: { argb: COLORS.headerText } 
    },
    subHeaderFont: { 
        name: 'Calibri', 
        size: 10, 
        bold: true, 
        color: { argb: COLORS.subHeaderText } 
    },
    dataFont: { 
        name: 'Calibri', 
        size: 11, 
        color: { argb: 'FF0F1111' } 
    },
    agentFont: { 
        name: 'Calibri', 
        size: 11, 
        bold: true, 
        color: { argb: 'FF0F1111' } 
    },
    totalFont: {
        name: 'Calibri',
        size: 12,
        bold: true,
        color: { argb: COLORS.totalRowText }
    },
    
    // Alignments
    center: { 
        vertical: 'middle', 
        horizontal: 'center' 
    } as Partial<ExcelJS.Alignment>,
    left: { 
        vertical: 'middle', 
        horizontal: 'left', 
        indent: 1 
    } as Partial<ExcelJS.Alignment>,
    right: { 
        vertical: 'middle', 
        horizontal: 'right' 
    } as Partial<ExcelJS.Alignment>,
    
    // Borders
    thinBorder: {
        top: { style: 'thin', color: { argb: COLORS.border } },
        left: { style: 'thin', color: { argb: COLORS.border } },
        bottom: { style: 'thin', color: { argb: COLORS.border } },
        right: { style: 'thin', color: { argb: COLORS.border } }
    } as Partial<ExcelJS.Borders>,
    
    mediumBorder: {
        top: { style: 'medium', color: { argb: COLORS.headerBg } },
        left: { style: 'medium', color: { argb: COLORS.headerBg } },
        bottom: { style: 'medium', color: { argb: COLORS.headerBg } },
        right: { style: 'medium', color: { argb: COLORS.headerBg } }
    } as Partial<ExcelJS.Borders>,
    
    // Fills
    headerFill: { 
        type: 'pattern' as const, 
        pattern: 'solid' as const, 
        fgColor: { argb: COLORS.headerBg } 
    },
    subHeaderFill: { 
        type: 'pattern' as const, 
        pattern: 'solid' as const, 
        fgColor: { argb: COLORS.subHeaderBg } 
    },
    zebraFill: { 
        type: 'pattern' as const, 
        pattern: 'solid' as const, 
        fgColor: { argb: COLORS.zebra } 
    },
    totalFill: { 
        type: 'pattern' as const, 
        pattern: 'solid' as const, 
        fgColor: { argb: COLORS.totalRowBg } 
    },
});

// --- HEADER UTILITIES ---
const applyHeaderStyle = (worksheet: ExcelJS.Worksheet, title: string, subtitle: string) => {
    // Title Row
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { name: 'Arial', size: 20, bold: true, color: { argb: COLORS.white } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 40;

    // Subtitle Row
    worksheet.mergeCells('A2:G2');
    const subCell = worksheet.getCell('A2');
    subCell.value = subtitle;
    subCell.font = { name: 'Arial', size: 12, color: { argb: COLORS.headerBg } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 25;

    // Add Logo/Info if needed
    worksheet.mergeCells('A3:G3');
    const infoCell = worksheet.getCell('A3');
    infoCell.value = 'Powered by LogiTrack Analytics System';
    infoCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF666666' } };
    infoCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(3).height = 20;
};

const addSummaryCard = (worksheet: ExcelJS.Worksheet, startRow: number, total: number, rate: number, delivered?: number, failed?: number) => {
    // Volume Card
    worksheet.mergeCells(`A${startRow}:C${startRow + 2}`);
    const volumeCard = worksheet.getCell(`A${startRow}`);
    volumeCard.value = `TOTAL VOLUME\n${formatNumber(total)}\n${total.toLocaleString()}`;
    volumeCard.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    volumeCard.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0F1111' } };
    volumeCard.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
    volumeCard.border = {
        top: { style: 'medium', color: { argb: 'FF232F3E' } },
        left: { style: 'medium', color: { argb: 'FF232F3E' } },
        bottom: { style: 'medium', color: { argb: 'FF232F3E' } },
        right: { style: 'medium', color: { argb: 'FF232F3E' } }
    };

    // Rate Card
    worksheet.mergeCells(`E${startRow}:G${startRow + 2}`);
    const rateCard = worksheet.getCell(`E${startRow}`);
    rateCard.value = `SUCCESS RATE\n${rate.toFixed(1)}%\n${rate >= 90 ? 'EXCELLENT' : rate >= 80 ? 'GOOD' : 'NEEDS IMPROVEMENT'}`;
    rateCard.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    rateCard.font = { 
        name: 'Arial', 
        size: 16, 
        bold: true, 
        color: { argb: rate >= 90 ? COLORS.successText : rate >= 80 ? COLORS.warningText : COLORS.dangerText } 
    };
    rateCard.fill = { 
        type: 'pattern', 
        pattern: 'solid', 
        fgColor: { argb: rate >= 90 ? 'FFECFDF5' : rate >= 80 ? 'FFFFFBEB' : 'FFFEF2F2' } 
    };
    rateCard.border = {
        top: { style: 'medium', color: { argb: 'FF232F3E' } },
        left: { style: 'medium', color: { argb: 'FF232F3E' } },
        bottom: { style: 'medium', color: { argb: 'FF232F3E' } },
        right: { style: 'medium', color: { argb: 'FF232F3E' } }
    };

    // Optional: Add Delivered/Failed card
    if (delivered !== undefined && failed !== undefined) {
        worksheet.mergeCells(`C${startRow}:D${startRow + 2}`);
        const statsCard = worksheet.getCell(`C${startRow}`);
        statsCard.value = `DELIVERED: ${formatNumber(delivered)}\nFAILED: ${formatNumber(failed)}\nRATIO: ${((delivered / total) * 100).toFixed(1)}%`;
        statsCard.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        statsCard.font = { name: 'Arial', size: 11, bold: true };
        statsCard.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } };
        statsCard.border = {
            top: { style: 'medium', color: { argb: 'FF232F3E' } },
            left: { style: 'medium', color: { argb: 'FF232F3E' } },
            bottom: { style: 'medium', color: { argb: 'FF232F3E' } },
            right: { style: 'medium', color: { argb: 'FF232F3E' } }
        };
    }
};

// --- ADVANCED PERFORMANCE REPORT ---
export const exportAdvancedReport = async (report: any[], title: string, filename: string) => {
    const ExcelJS = (await import('exceljs')).default;
    const styles = getExcelStyles(ExcelJS);
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LogiTrack Analytics';
    workbook.lastModifiedBy = 'LogiTrack System';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Performance Report', {
        views: [{ state: 'frozen', xSplit: 2, ySplit: 9 }]
    });

    // Header
    applyHeaderStyle(worksheet, '📊 ADVANCED PERFORMANCE ANALYSIS', title);

    // Calculate Totals
    const totalVolume = report.reduce((acc: number, curr: any) => acc + curr.total, 0);
    const totalDelivered = report.reduce((acc: number, curr: any) => acc + curr.delivered, 0);
    const totalFailed = report.reduce((acc: number, curr: any) => acc + curr.failed, 0);
    const overallRate = totalVolume > 0 ? (totalDelivered / totalVolume) * 100 : 0;

    // Summary Cards
    addSummaryCard(worksheet, 5, totalVolume, overallRate, totalDelivered, totalFailed);

    // Table Headers
    const tableStartRow = 9;
    const headers = [
        '🏆 Rank',
        '👤 Agent Name',
        '📅 Days Worked',
        '📦 Total Shipments',
        '✅ Delivered',
        '❌ Failed/RTO',
        '📈 Success Rate %'
    ];
    
    const headerRow = worksheet.getRow(tableStartRow);
    headerRow.values = headers;
    headerRow.height = 35;
    
    // Style Headers
    headerRow.eachCell((cell, colNumber) => {
        cell.style = {
            font: styles.headerFont,
            fill: styles.headerFill,
            alignment: styles.center,
            border: styles.thinBorder
        };
        
        // Add icons to header cells
        if (colNumber === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF9900' } }; // Orange for Rank
        if (colNumber === 7) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF007185' } }; // Blue for Rate
    });

    // Data Rows
    report.forEach((agent, index) => {
        const rowIndex = tableStartRow + 1 + index;
        const row = worksheet.getRow(rowIndex);
        
        row.values = [
            index + 1,
            agent.name,
            agent.daysWorked,
            agent.total,
            agent.delivered,
            agent.failed,
            agent.successRate / 100  // Store as decimal for Excel percentage
        ];
        
        row.height = 28;

        // Style Cells
        row.eachCell((cell, colNumber) => {
            // Basic styling
            cell.style = {
                font: colNumber === 2 ? styles.agentFont : styles.dataFont,
                alignment: colNumber === 2 ? styles.left : styles.center,
                border: styles.thinBorder,
                fill: index % 2 !== 0 ? styles.zebraFill : undefined
            };
            
            // Rank styling
            if (colNumber === 1) {
                if (index === 0) {
                    cell.font = { ...styles.headerFont, color: { argb: 'FFFFD814' } }; // Gold for 1st
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF232F3E' } };
                } else if (index === 1) {
                    cell.font = { ...styles.headerFont, color: { argb: 'FFC0C0C0' } }; // Silver for 2nd
                } else if (index === 2) {
                    cell.font = { ...styles.headerFont, color: { argb: 'FFCD7F32' } }; // Bronze for 3rd
                }
            }
            
            // Rate percentage formatting
            if (colNumber === 7) {
                cell.numFmt = '0.0%';
                cell.font = getRateStyle(agent.successRate, true);
                
                // Add data bars visualization
                if (agent.successRate > 0) {
                    const ratePercent = Math.min(agent.successRate / 100, 1);
                    cell.fill = {
                        type: 'gradient',
                        gradient: 'angle',
                        degree: 0,
                        stops: [
                            { position: 0, color: { argb: getRateColor(agent.successRate) + '80' } },
                            { position: ratePercent, color: { argb: getRateColor(agent.successRate) + '80' } },
                            { position: ratePercent, color: { argb: 'FFFFFFFF' } },
                            { position: 1, color: { argb: 'FFFFFFFF' } }
                        ]
                    };
                }
            }
            
            // Highlight high performers
            if (agent.successRate >= 95 && colNumber <= 6) {
                cell.font = { ...cell.font, bold: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.highlighter } };
            }
        });
    });

    // Column Widths
    worksheet.columns = [
        { width: 10 },  // Rank
        { width: 35 },  // Agent Name
        { width: 15 },  // Days Worked
        { width: 20 },  // Total Shipments
        { width: 15 },  // Delivered
        { width: 15 },  // Failed/RTO
        { width: 18 },  // Success Rate
    ];

    // Add Footer with Statistics
    const lastRow = tableStartRow + report.length + 2;
    worksheet.mergeCells(`A${lastRow}:G${lastRow}`);
    const footerCell = worksheet.getCell(`A${lastRow}`);
    footerCell.value = `📋 Report Generated: ${new Date().toLocaleString()} | Total Agents: ${report.length} | Average Rate: ${(report.reduce((a, b) => a + b.successRate, 0) / report.length).toFixed(1)}%`;
    footerCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF666666' } };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    footerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };

    // Auto Filter
    worksheet.autoFilter = {
        from: { row: tableStartRow, column: 1 },
        to: { row: tableStartRow + report.length, column: 7 }
    };

    // Export
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${filename.replace(/\s+/g, '_')}.xlsx`;
    anchor.click();
};

// --- DAILY REPORT ---
export const exportToExcel = async (data: ProcessedResult) => {
    const ExcelJS = (await import('exceljs')).default;
    const styles = getExcelStyles(ExcelJS);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Daily Report', {
        views: [{ state: 'frozen', xSplit: 0, ySplit: 8 }]
    });

    const dateStr = new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Header
    applyHeaderStyle(worksheet, '📋 DAILY OPERATIONS REPORT', `Date: ${dateStr}`);
    addSummaryCard(worksheet, 5, data.grandTotal.total, data.grandTotal.successRate, 
                  data.grandTotal.delivered, data.grandTotal.failed);

    // Table Headers
    const tableStartRow = 9;
    const headers = [
        '👤 Agent Name',
        '✅ Delivered',
        '❌ Failed',
        '🚚 OFD',
        '↩️ RTO',
        '📦 Total',
        '📈 Success Rate %'
    ];
    
    const headerRow = worksheet.getRow(tableStartRow);
    headerRow.values = headers;
    headerRow.height = 35;
    
    headerRow.eachCell((cell) => {
        cell.style = {
            font: styles.headerFont,
            fill: styles.headerFill,
            alignment: styles.center,
            border: styles.thinBorder
        };
    });

    // Data Rows
    data.summaries.forEach((agent, index) => {
        const row = worksheet.addRow([
            agent.daName,
            agent.delivered,
            agent.failed,
            agent.ofd,
            agent.rto,
            agent.total,
            agent.successRate / 100
        ]);
        
        row.height = 26;

        // Style each cell
        row.eachCell((cell, colNumber) => {
            // Basic styling
            cell.style = {
                font: colNumber === 1 ? styles.agentFont : styles.dataFont,
                alignment: colNumber === 1 ? styles.left : styles.center,
                border: styles.thinBorder,
                fill: index % 2 !== 0 ? styles.zebraFill : undefined
            };

            // Special formatting
            if (colNumber === 7) { // Success Rate
                cell.numFmt = '0.0%';
                cell.font = getRateStyle(agent.successRate, true);
                
                // Add color scale visualization
                if (agent.successRate > 0) {
                    const ratePercent = Math.min(agent.successRate / 100, 1);
                    cell.fill = {
                        type: 'gradient',
                        gradient: 'angle',
                        degree: 0,
                        stops: [
                            { position: 0, color: { argb: getRateColor(agent.successRate) } },
                            { position: ratePercent, color: { argb: getRateColor(agent.successRate) } },
                            { position: ratePercent, color: { argb: 'FFFFFFFF' } },
                            { position: 1, color: { argb: 'FFFFFFFF' } }
                        ]
                    };
                }
            }

            // Highlight issues
            if (agent.failed > 0 && colNumber === 3) {
                cell.font = { bold: true, color: { argb: COLORS.dangerText } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF5F5' } };
            }
            
            if (agent.ofd > 0 && colNumber === 4) {
                cell.font = { bold: true, color: { argb: 'FF1E40AF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } };
            }

            // Top performers highlight
            if (agent.successRate >= 95 && colNumber === 1) {
                cell.font = { ...cell.font, color: { argb: COLORS.infoText } };
                cell.value = `⭐ ${cell.value}`;
            }
        });
    });

    // Grand Total Row
    const totalRow = worksheet.addRow([
        '🏆 GRAND TOTAL',
        data.grandTotal.delivered,
        data.grandTotal.failed,
        data.grandTotal.ofd,
        data.grandTotal.rto,
        data.grandTotal.total,
        data.grandTotal.successRate / 100
    ]);

    totalRow.height = 32;
    totalRow.eachCell((cell, colNumber) => {
        cell.style = {
            font: styles.totalFont,
            fill: styles.totalFill,
            alignment: colNumber === 1 ? styles.left : styles.center,
            border: styles.thinBorder
        };
        if (colNumber === 7) {
            cell.numFmt = '0.0%';
            cell.font = getRateStyle(data.grandTotal.successRate, true);
        }
    });

    // Column Widths
    worksheet.columns = [
        { width: 35 }, // Name
        { width: 15 }, // Delivered
        { width: 15 }, // Failed
        { width: 15 }, // OFD
        { width: 15 }, // RTO
        { width: 15 }, // Total
        { width: 18 }  // Rate
    ];

    // Auto Filter
    worksheet.autoFilter = {
        from: { row: tableStartRow, column: 1 },
        to: { row: tableStartRow + data.summaries.length + 1, column: 7 }
    };

    // Export
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `LogiTrack_Daily_${new Date().toISOString().split('T')[0]}.xlsx`;
    anchor.click();
};

// --- AGENT PASSPORT (Detailed History) ---
export const exportAgentHistory = async (agentName: string, history: any[]) => {
    const ExcelJS = (await import('exceljs')).default;
    const styles = getExcelStyles(ExcelJS);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Agent Passport', {
        views: [{ state: 'frozen', xSplit: 0, ySplit: 7 }]
    });

    // Header
    worksheet.mergeCells('A1:F1');
    const headerCell = worksheet.getCell('A1');
    headerCell.value = `📘 AGENT PASSPORT: ${agentName.toUpperCase()}`;
    headerCell.style = {
        font: { ...styles.titleFont, size: 18 },
        fill: styles.headerFill,
        alignment: styles.center
    };
    worksheet.getRow(1).height = 45;

    // Summary Block
    const totalVol = history.reduce((a, b) => a + b.total, 0);
    const totalDel = history.reduce((a, b) => a + b.delivered, 0);
    const totalFailed = history.reduce((a, b) => a + (b.total - b.delivered), 0);
    const avgRate = totalVol > 0 ? (totalDel / totalVol) * 100 : 0;
    const daysWorked = history.length;

    // Volume Box
    worksheet.mergeCells('A3:C4');
    const volBox = worksheet.getCell('A3');
    volBox.value = `TOTAL VOLUME\n${formatNumber(totalVol)}\n${totalVol.toLocaleString()}`;
    volBox.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    volBox.font = { bold: true, size: 14 };
    volBox.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8FF' } };
    volBox.border = styles.mediumBorder;

    // Rate Box
    worksheet.mergeCells('D3:F4');
    const rateBox = worksheet.getCell('D3');
    rateBox.value = `OVERALL PERFORMANCE\n${avgRate.toFixed(1)}%\n${daysWorked} days tracked`;
    rateBox.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    rateBox.font = { bold: true, size: 16, color: { argb: getRateColor(avgRate) } };
    rateBox.fill = { 
        type: 'pattern', 
        pattern: 'solid', 
        fgColor: { argb: avgRate >= 90 ? 'FFECFDF5' : avgRate >= 80 ? 'FFFFFBEB' : 'FFFEF2F2' } 
    };
    rateBox.border = styles.mediumBorder;

    // Stats Row
    worksheet.mergeCells('A5:F5');
    const statsCell = worksheet.getCell('A5');
    statsCell.value = `📊 Statistics: ${totalDel.toLocaleString()} Delivered • ${totalFailed.toLocaleString()} Failed • ${((totalDel/totalVol)*100).toFixed(1)}% Success Ratio`;
    statsCell.font = { name: 'Calibri', size: 11, bold: true };
    statsCell.alignment = { horizontal: 'center', vertical: 'middle' };
    statsCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
    worksheet.getRow(5).height = 25;

    // Table Header
    const tableStart = 7;
    const headers = ['📅 Date', '📦 Total Orders', '✅ Delivered', '❌ Failed/RTO', '📈 Performance %', '🎯 Trend'];
    
    const row = worksheet.getRow(tableStart);
    row.values = headers;
    row.height = 30;
    
    row.eachCell((cell) => {
        cell.style = {
            font: styles.headerFont,
            fill: styles.headerFill,
            alignment: styles.center,
            border: styles.thinBorder
        };
    });

    // Data Rows (Sorted by date descending)
    const sortedHistory = [...history].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    let prevRate = 0;
    
    sortedHistory.forEach((day, index) => {
        const row = worksheet.addRow([
            day.date,
            day.total,
            day.delivered,
            (day.total - day.delivered),
            day.successRate / 100,
            '' // Trend column
        ]);
        
        row.height = 24;

        const rate = day.successRate;
        const trend = rate > prevRate ? '↗️' : rate < prevRate ? '↘️' : '➡️';
        prevRate = rate;

        row.eachCell((cell, colNumber) => {
            // Basic styling
            cell.style = {
                font: styles.dataFont,
                alignment: styles.center,
                border: styles.thinBorder,
                fill: index % 2 !== 0 ? styles.zebraFill : undefined
            };

            // Special formatting
            if (colNumber === 1) { // Date
                cell.alignment = styles.left;
                if (new Date(day.date).getDay() === 5) { // Friday
                    cell.font = { ...cell.font, bold: true, color: { argb: 'FF1E40AF' } };
                }
            }
            
            if (colNumber === 5) { // Performance %
                cell.numFmt = '0.0%';
                cell.font = getRateStyle(rate, true);
                
                // Add conditional formatting visualization
                if (rate >= 95) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
                } else if (rate < 80) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
                }
            }
            
            if (colNumber === 6) { // Trend
                cell.value = trend;
                cell.font = { size: 14 };
                if (trend === '↗️') {
                    cell.font = { ...cell.font, color: { argb: COLORS.successText } };
                } else if (trend === '↘️') {
                    cell.font = { ...cell.font, color: { argb: COLORS.dangerText } };
                }
            }

            // Highlight exceptional days
            if (rate >= 95 && day.total > 50) {
                row.eachCell((c) => {
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
                });
                row.getCell(1).value = `🏆 ${day.date}`;
            }
        });
    });

    // Add Performance Summary
    const summaryRow = tableStart + sortedHistory.length + 2;
    worksheet.mergeCells(`A${summaryRow}:F${summaryRow}`);
    const summaryCell = worksheet.getCell(`A${summaryRow}`);
    
    const bestDay = sortedHistory.reduce((best, curr) => 
        curr.successRate > best.successRate ? curr : best
    );
    const worstDay = sortedHistory.reduce((worst, curr) => 
        curr.successRate < worst.successRate ? curr : worst
    );
    
    summaryCell.value = `📊 Performance Summary: Best Day ${bestDay.date} (${bestDay.successRate.toFixed(1)}%) • Worst Day ${worstDay.date} (${worstDay.successRate.toFixed(1)}%) • Average: ${avgRate.toFixed(1)}%`;
    summaryCell.font = { name: 'Calibri', size: 11, italic: true };
    summaryCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summaryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };

    // Column Widths
    worksheet.columns = [
        { width: 20 }, // Date
        { width: 15 }, // Total
        { width: 15 }, // Delivered
        { width: 15 }, // Failed
        { width: 18 }, // Rate
        { width: 12 }  // Trend
    ];

    // Export
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${agentName.replace(/\s+/g, '_')}_Passport_${new Date().toISOString().split('T')[0]}.xlsx`;
    anchor.click();
};

// --- SMART COMPLEX MONTHLY REPORT (Main Function) ---
export const exportComplexMonthlyReport = async (rawRecords: HistoryRecord[], title: string, filename: string) => {
    const ExcelJS = (await import('exceljs')).default;
    const styles = getExcelStyles(ExcelJS);
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LogiTrack Analytics';
    workbook.lastModifiedBy = 'LogiTrack System';
    
    const worksheet = workbook.addWorksheet('Detailed Analysis', {
        views: [{ state: 'frozen', xSplit: 1, ySplit: 3 }]
    });

    // --- 1. DETERMINE MODE ---
    let minTs = Infinity, maxTs = -Infinity;
    rawRecords.forEach(r => {
        const t = new Date(r.date).getTime();
        if (t < minTs) minTs = t;
        if (t > maxTs) maxTs = t;
    });
    
    const daySpan = (maxTs - minTs) / (1000 * 60 * 60 * 24);
    const isYearlyMode = daySpan > 35;
    const SLOT_COUNT = isYearlyMode ? 12 : 31;

    // Title
    worksheet.mergeCells('A1:Z1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = isYearlyMode 
        ? `📅 YEARLY PERFORMANCE MATRIX - ${title}`
        : `📊 MONTHLY PERFORMANCE DASHBOARD - ${title}`;
    titleCell.style = {
        font: styles.titleFont,
        fill: styles.headerFill,
        alignment: styles.center
    };
    worksheet.getRow(1).height = 45;

    // Subtitle
    worksheet.mergeCells('A2:Z2');
    const subtitleCell = worksheet.getCell('A2');
    const startDate = new Date(minTs).toLocaleDateString();
    const endDate = new Date(maxTs).toLocaleDateString();
    subtitleCell.value = isYearlyMode
        ? `📆 Period: ${startDate} to ${endDate} • ${rawRecords.length} days analyzed • ${daySpan.toFixed(0)}-day span`
        : `📆 Month Analysis • ${rawRecords.length} days tracked • ${new Date(minTs).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    subtitleCell.style = {
        font: { ...styles.subtitleFont, size: 11 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } },
        alignment: styles.center
    };
    worksheet.getRow(2).height = 28;

    // --- 2. PREPARE DATA ---
    const agentMap: Record<string, { total: number, delivered: number }[]> = {};
    const agentNames = new Set<string>();
    const slotTotals = new Array(SLOT_COUNT).fill(null).map(() => ({ total: 0, delivered: 0 }));

    // Collect agent names
    rawRecords.forEach(rec => {
        if (!rec.agents) return;
        rec.agents.forEach(a => agentNames.add(a.daName));
    });

    const sortedAgents = Array.from(agentNames).sort();

    // Initialize data structures
    sortedAgents.forEach(name => {
        agentMap[name] = new Array(SLOT_COUNT).fill(null).map(() => ({ total: 0, delivered: 0 }));
    });

    // Fill data
    rawRecords.forEach(rec => {
        const date = new Date(rec.date);
        let slotIndex = isYearlyMode ? date.getMonth() : date.getDate() - 1;
        
        if (slotIndex < 0 || slotIndex >= SLOT_COUNT) return;

        if (rec.agents) {
            rec.agents.forEach(a => {
                if (agentMap[a.daName]) {
                    agentMap[a.daName][slotIndex].total += a.total;
                    agentMap[a.daName][slotIndex].delivered += a.delivered;
                    
                    slotTotals[slotIndex].total += a.total;
                    slotTotals[slotIndex].delivered += a.delivered;
                }
            });
        }
    });

    // --- 3. BUILD HEADER MATRIX ---
    worksheet.getColumn(1).width = 35; // Name column
    
    let colIndex = 2;
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

    const createHeaderBlock = (startSlot: number, endSlot: number, blockLabel: string, periodIndex: number) => {
        const blockCols = (endSlot - startSlot + 1) * 2; // 2 columns per slot (Vol, %)
        const blockStartCol = colIndex;
        const blockEndCol = colIndex + blockCols - 1;

        // Block Header
        worksheet.mergeCells(3, blockStartCol, 3, blockEndCol);
        const blockHeader = worksheet.getCell(3, blockStartCol);
        blockHeader.value = blockLabel;
        blockHeader.style = {
            font: { ...styles.headerFont, size: 11 },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: getPeriodBgColor(periodIndex) } },
            alignment: styles.center,
            border: styles.thinBorder
        };

        // Slot Headers
        for (let slot = startSlot; slot <= endSlot; slot++) {
            const slotStartCol = colIndex;
            
            // Slot Header (Month/Day)
            worksheet.mergeCells(4, slotStartCol, 4, slotStartCol + 1);
            const slotHeader = worksheet.getCell(4, slotStartCol);
            slotHeader.value = isYearlyMode ? months[slot] : (slot + 1).toString();
            slotHeader.style = {
                font: styles.subHeaderFont,
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subHeaderBg } },
                alignment: styles.center,
                border: styles.thinBorder
            };

            // Metric Labels
            const volLabel = worksheet.getCell(5, slotStartCol);
            volLabel.value = '📦';
            volLabel.style = {
                font: { size: 10, bold: true },
                alignment: styles.center,
                border: styles.thinBorder
            };
            worksheet.getColumn(slotStartCol).width = 8;

            const rateLabel = worksheet.getCell(5, slotStartCol + 1);
            rateLabel.value = '%';
            rateLabel.style = {
                font: { size: 10, bold: true, color: { argb: 'FF007185' } },
                alignment: styles.center,
                border: styles.thinBorder
            };
            worksheet.getColumn(slotStartCol + 1).width = 8;

            colIndex += 2;
        }

        // Block Summary Section
        const summaryStartCol = colIndex;
        const summaryEndCol = colIndex + 2;
        
        // Summary Header
        worksheet.mergeCells(3, summaryStartCol, 3, summaryEndCol);
        const summaryHeader = worksheet.getCell(3, summaryStartCol);
        summaryHeader.value = `${blockLabel} TOTAL`;
        summaryHeader.style = {
            font: { ...styles.headerFont, color: { argb: 'FF000000' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD814' } },
            alignment: styles.center,
            border: styles.thinBorder
        };

        // Summary Labels
        const summaryLabels = ['TOTAL', 'DEL', 'RATE'];
        summaryLabels.forEach((label, i) => {
            worksheet.mergeCells(4, colIndex + i, 5, colIndex + i);
            const labelCell = worksheet.getCell(4, colIndex + i);
            labelCell.value = label;
            labelCell.style = {
                font: styles.subHeaderFont,
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.blockSummaryBg } },
                alignment: styles.center,
                border: styles.thinBorder
            };
            worksheet.getColumn(colIndex + i).width = 10;
        });

        colIndex += 3;
    };

    // Create header blocks based on mode
    if (isYearlyMode) {
        // Quarterly blocks for yearly view
        createHeaderBlock(0, 2, 'Q1 (JAN-MAR)', 0);
        createHeaderBlock(3, 5, 'Q2 (APR-JUN)', 1);
        createHeaderBlock(6, 8, 'Q3 (JUL-SEP)', 2);
        createHeaderBlock(9, 11, 'Q4 (OCT-DEC)', 3);
    } else {
        // 10-day blocks for monthly view
        createHeaderBlock(0, 9, 'PERIOD 1 (1-10)', 0);
        createHeaderBlock(10, 19, 'PERIOD 2 (11-20)', 1);
        createHeaderBlock(20, 30, 'PERIOD 3 (21-31)', 2);
    }

    // Grand Total Column
    const grandTotalCol = colIndex;
    worksheet.mergeCells(3, grandTotalCol, 3, grandTotalCol + 2);
    const grandHeader = worksheet.getCell(3, grandTotalCol);
    grandHeader.value = '🎯 GRAND TOTAL';
    grandHeader.style = {
        font: { ...styles.headerFont, size: 12 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } },
        alignment: styles.center,
        border: styles.thinBorder
    };

    const grandLabels = ['TOTAL', 'DELIVERED', 'RATE %'];
    grandLabels.forEach((label, i) => {
        worksheet.mergeCells(4, grandTotalCol + i, 5, grandTotalCol + i);
        const labelCell = worksheet.getCell(4, grandTotalCol + i);
        labelCell.value = label;
        labelCell.style = {
            font: { ...styles.subHeaderFont, color: { argb: COLORS.white } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF37475A' } },
            alignment: styles.center,
            border: styles.thinBorder
        };
        worksheet.getColumn(grandTotalCol + i).width = 14;
    });

    // --- 4. FILL DATA ROWS ---
    let currentRow = 6;

    const fillAgentRow = (agentName: string, isGrandTotal = false) => {
        const row = worksheet.getRow(currentRow);
        row.height = 24;
        
        // Agent Name Cell
        const nameCell = row.getCell(1);
        nameCell.value = isGrandTotal ? '🏆 GRAND TOTAL' : agentName;
        nameCell.style = {
            font: isGrandTotal 
                ? { ...styles.totalFont, size: 13 } 
                : styles.agentFont,
            alignment: styles.left,
            border: styles.thinBorder,
            fill: isGrandTotal 
                ? styles.totalFill 
                : currentRow % 2 !== 0 
                    ? undefined 
                    : styles.zebraFill
        };

        let dataColIndex = 2;
        let grandBlockStartCol = 0;

        const processBlock = (startSlot: number, endSlot: number, blockBgColor: string) => {
            let blockTotal = 0;
            let blockDelivered = 0;
            let blockColIndex = dataColIndex;

            // Process each slot in the block
            for (let slot = startSlot; slot <= endSlot; slot++) {
                let slotTotal = 0, slotDelivered = 0;
                
                if (isGrandTotal) {
                    slotTotal = slotTotals[slot]?.total || 0;
                    slotDelivered = slotTotals[slot]?.delivered || 0;
                } else {
                    const data = agentMap[agentName][slot];
                    if (data) {
                        slotTotal = data.total;
                        slotDelivered = data.delivered;
                    }
                }

                // Volume cell
                const volCell = row.getCell(blockColIndex);
                volCell.value = slotTotal > 0 ? slotTotal : '';
                volCell.style = {
                    font: styles.dataFont,
                    alignment: styles.center,
                    border: styles.thinBorder,
                    fill: slotTotal === 0 
                        ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } }
                        : undefined
                };

                // Rate cell
                const rateCell = row.getCell(blockColIndex + 1);
                const slotRate = slotTotal > 0 ? (slotDelivered / slotTotal) : 0;
                rateCell.value = slotTotal > 0 ? slotRate : '';
                rateCell.numFmt = '0%';
                
                const rateStyle: any = {
                    font: slotTotal > 0 ? getRateStyle(slotRate * 100, true) : styles.dataFont,
                    alignment: styles.center,
                    border: styles.thinBorder,
                    fill: slotTotal === 0 
                        ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } }
                        : undefined
                };
                
                // Add color to rate cell
                if (slotTotal > 0) {
                    if (slotRate >= 0.95) {
                        rateStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
                    } else if (slotRate < 0.80) {
                        rateStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
                    }
                }
                
                rateCell.style = rateStyle;

                blockTotal += slotTotal;
                blockDelivered += slotDelivered;
                blockColIndex += 2;
            }

            // Block Summary Cells
            const blockRate = blockTotal > 0 ? blockDelivered / blockTotal : 0;
            
            const totalCell = row.getCell(blockColIndex);
            totalCell.value = blockTotal;
            totalCell.style = {
                font: { ...styles.dataFont, bold: true },
                alignment: styles.center,
                border: styles.thinBorder,
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: blockBgColor } }
            };

            const delCell = row.getCell(blockColIndex + 1);
            delCell.value = blockDelivered;
            delCell.style = {
                font: { ...styles.dataFont, bold: true },
                alignment: styles.center,
                border: styles.thinBorder,
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: blockBgColor } }
            };

            const rateCell = row.getCell(blockColIndex + 2);
            rateCell.value = blockRate;
            rateCell.numFmt = '0.0%';
            rateCell.style = {
                font: { ...styles.dataFont, bold: true, color: { argb: getRateColor(blockRate * 100) } },
                alignment: styles.center,
                border: styles.thinBorder,
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: blockBgColor } }
            };

            dataColIndex = blockColIndex + 3;
            return { total: blockTotal, delivered: blockDelivered };
        };

        // Process blocks based on mode
        let totalTotal = 0;
        let totalDelivered = 0;

        if (isYearlyMode) {
            const q1 = processBlock(0, 2, COLORS.quarter1Bg);
            const q2 = processBlock(3, 5, COLORS.quarter2Bg);
            const q3 = processBlock(6, 8, COLORS.quarter3Bg);
            const q4 = processBlock(9, 11, COLORS.quarter4Bg);
            
            totalTotal = q1.total + q2.total + q3.total + q4.total;
            totalDelivered = q1.delivered + q2.delivered + q3.delivered + q4.delivered;
        } else {
            const p1 = processBlock(0, 9, COLORS.period1);
            const p2 = processBlock(10, 19, COLORS.period2);
            const p3 = processBlock(20, 30, COLORS.period3);
            
            totalTotal = p1.total + p2.total + p3.total;
            totalDelivered = p1.delivered + p2.delivered + p3.delivered;
        }

        // Grand Total Cells
        const grandRate = totalTotal > 0 ? totalDelivered / totalTotal : 0;
        
        const grandTotalCell = row.getCell(dataColIndex);
        grandTotalCell.value = totalTotal;
        grandTotalCell.style = {
            font: { ...styles.dataFont, bold: true, size: 12 },
            alignment: styles.center,
            border: { ...styles.thinBorder, left: { style: 'medium', color: { argb: COLORS.headerBg } } },
            fill: isGrandTotal 
                ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
                : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAEDED' } }
        };

        const grandDeliveredCell = row.getCell(dataColIndex + 1);
        grandDeliveredCell.value = totalDelivered;
        grandDeliveredCell.style = {
            font: { ...styles.dataFont, bold: true, size: 12 },
            alignment: styles.center,
            border: styles.thinBorder,
            fill: isGrandTotal 
                ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
                : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAEDED' } }
        };

        const grandRateCell = row.getCell(dataColIndex + 2);
        grandRateCell.value = grandRate;
        grandRateCell.numFmt = '0.0%';
        grandRateCell.style = {
            font: { 
                ...styles.dataFont, 
                bold: true, 
                size: 12, 
                color: { argb: isGrandTotal ? COLORS.white : getRateColor(grandRate * 100) } 
            },
            alignment: styles.center,
            border: styles.thinBorder,
            fill: isGrandTotal 
                ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
                : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAEDED' } }
        };

        currentRow++;
    };

    // Fill agent rows
    sortedAgents.forEach(agent => fillAgentRow(agent));
    
    // Add separator row
    const separatorRow = worksheet.getRow(currentRow);
    separatorRow.height = 5;
    for (let i = 1; i <= grandTotalCol + 2; i++) {
        separatorRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    }
    currentRow++;

    // Fill grand total row
    fillAgentRow('', true);

    // --- 5. ADD SUMMARY STATISTICS ---
    const summaryRow = currentRow + 2;
    worksheet.mergeCells(`A${summaryRow}:Z${summaryRow}`);
    const summaryCell = worksheet.getCell(`A${summaryRow}`);
    
    const allVolumes = sortedAgents.map(name => 
        agentMap[name].reduce((sum, slot) => sum + slot.total, 0)
    );
    const avgVolume = allVolumes.reduce((a, b) => a + b, 0) / allVolumes.length;
    const maxVolume = Math.max(...allVolumes);
    const topAgent = sortedAgents.find(name => 
        agentMap[name].reduce((sum, slot) => sum + slot.total, 0) === maxVolume
    );
    
    summaryCell.value = `📊 Summary: ${sortedAgents.length} Agents • Average Volume: ${formatNumber(avgVolume)} • Top Performer: ${topAgent} (${formatNumber(maxVolume)}) • Period: ${startDate} to ${endDate}`;
    summaryCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF666666' } };
    summaryCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summaryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };

    // --- 6. EXPORT ---
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${filename.replace(/\s+/g, '_')}_${isYearlyMode ? 'Yearly' : 'Monthly'}_Matrix.xlsx`;
    anchor.click();
};

// --- HELPER EXPORT FUNCTIONS ---
export const exportMonthlyReport = async (report: any[], month: string) => {
    return exportAdvancedReport(report, `📅 Monthly Report - ${month}`, `Monthly_${month}`);
};

export const exportYearlyReport = async (report: any[], year: string) => {
    return exportAdvancedReport(report, `📊 Annual Report - ${year}`, `Yearly_Report_${year}`);
};

// --- IMAGE EXPORT ---
export const exportAsImage = async (elementId: string) => {
    const html2canvas = (await import('html2canvas')).default;
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
    });
    
    const image = canvas.toDataURL("image/png", 1.0);
    const link = document.createElement('a');
    link.href = image;
    link.download = `LogiTrack_Capture_${new Date().toISOString().split('T')[0]}.png`;
    link.click();
};

// --- PDF EXPORT ---
export const exportToPDF = async (data: ProcessedResult, date: string) => {
    const { jsPDF } = await import('jspdf');    
    const doc = new jsPDF('landscape');
    
    // Title
    doc.setFontSize(24);
    doc.setTextColor(35, 47, 62); // Amazon Dark Blue
    doc.text('LogiTrack Analytics Report', 14, 22);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Date: ${date}`, 14, 32);
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, 38);
    
    // Summary
    doc.setFontSize(14);
    doc.setTextColor(0, 118, 0); // Green
    doc.text(`Total Volume: ${data.grandTotal.total.toLocaleString()}`, 14, 50);
    doc.text(`Success Rate: ${data.grandTotal.successRate.toFixed(1)}%`, 14, 58);
    
    // Table
    const tableColumn = ["Agent", "Delivered", "Failed", "OFD", "RTO", "Total", "Rate %"];
    const tableRows: any[] = [];

    data.summaries.forEach(agent => {
        const rateColor = getRateColor(agent.successRate);
        const rowStyle = {
            fillColor: agent.successRate >= 95 ? [236, 253, 245] : // Light Green
                       agent.successRate < 80 ? [254, 242, 242] : // Light Red
                       [255, 251, 235] // Light Yellow
        };
        
        tableRows.push([
            { content: agent.daName, styles: { fontStyle: 'bold' } },
            agent.delivered,
            { content: agent.failed, styles: { textColor: agent.failed > 0 ? [204, 12, 57] : [0, 0, 0] } },
            agent.ofd,
            agent.rto,
            agent.total,
            { content: `${agent.successRate.toFixed(1)}%`, styles: { textColor: rateColor, fontStyle: 'bold' } }
        ]);
    });
    
    // Grand Total Row
    tableRows.push([
        { content: "GRAND TOTAL", styles: { fontStyle: 'bold', textColor: [255, 255, 255] } },
        { content: data.grandTotal.delivered, styles: { fontStyle: 'bold', textColor: [255, 255, 255] } },
        { content: data.grandTotal.failed, styles: { fontStyle: 'bold', textColor: [255, 255, 255] } },
        { content: data.grandTotal.ofd, styles: { fontStyle: 'bold', textColor: [255, 255, 255] } },
        { content: data.grandTotal.rto, styles: { fontStyle: 'bold', textColor: [255, 255, 255] } },
        { content: data.grandTotal.total, styles: { fontStyle: 'bold', textColor: [255, 255, 255] } },
        { content: `${data.grandTotal.successRate.toFixed(1)}%`, styles: { fontStyle: 'bold', textColor: [255, 255, 255] } }
    ]);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 65,
        theme: 'grid',
        headStyles: { 
            fillColor: [35, 47, 62], // Amazon Dark Blue
            textColor: [255, 255, 255],
            fontSize: 11,
            fontStyle: 'bold'
        },
        bodyStyles: { fontSize: 10 },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: {
            0: { cellWidth: 40 },
            6: { halign: 'center' }
        },
        willDrawCell: (data: any) => {
            if (data.section === 'body' && data.row.index === tableRows.length - 1) {
                data.cell.styles.fillColor = [55, 71, 90]; // Lighter Dark Blue for total row
            }
        }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
        doc.text('LogiTrack Analytics System', 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`LogiTrack_Report_${date.replace(/\//g, '-')}.pdf`);
};