import { ProcessedResult, HistoryRecord, TrackingDetail } from '../types';
import type ExcelJS from 'exceljs';

// --- ENUMs and CONSTANTS ---
enum ReportType {
    DAILY = 'daily',
    MONTHLY = 'monthly',
    YEARLY = 'yearly',
    ADVANCED = 'advanced',
    CUSTOM = 'custom',
    AGENT_HISTORY = 'agent_history'
}

enum PerformanceRating {
    EXCELLENT = 'EXCELLENT',  // >= 95%
    GOOD = 'GOOD',           // >= 90%
    AVERAGE = 'AVERAGE',     // >= 80%
    POOR = 'POOR',           // < 80%
    NO_DATA = 'NO_DATA'      // No shipments
}

const COLOR_PALETTE = {
    // Amazon Theme Colors
    AMAZON_DARK_BLUE: 'FF232F3E',
    AMAZON_ORANGE: 'FFFF9900',
    AMAZON_YELLOW: 'FFFFD814',
    AMAZON_BLUE: 'FF007185',
    AMAZON_LIGHT_BLUE: 'FF37475A',
    
    // Status Colors
    SUCCESS: 'FF10B981',      // Emerald Green
    WARNING: 'FFF59E0B',      // Amber
    ERROR: 'FFEF4444',        // Red
    DANGER: 'FFCC0C39',       // Dark Red
    
    // UI Colors
    WHITE: 'FFFFFFFF',
    BLACK: 'FF0F1111',
    LIGHT_GRAY: 'FFEAEDED',
    VERY_LIGHT_GRAY: 'FFF8F8F8',
    MEDIUM_GRAY: 'FFD5D9D9',
    DARK_GRAY: 'FF6B7280',
    
    // Backgrounds
    HEADER_BG: 'FF232F3E',
    SUBHEADER_BG: 'FFEAEDED',
    SUMMARY_BG: 'FFFFF8E1',     // Light Orange/Yellow
    ALTERNATE_ROW: 'FFF8F8F8',
    TOTAL_ROW_BG: 'FF37475A',
    HIGHLIGHT_BG: 'FFEFF6FF',   // Light Blue
    
    // Text Colors
    TEXT_PRIMARY: 'FF0F1111',
    TEXT_SECONDARY: 'FF6B7280',
    TEXT_LIGHT: 'FF9CA3AF',
    TEXT_WHITE: 'FFFFFFFF'
};

const BORDER_STYLES = {
    THIN: {
        top: { style: 'thin', color: { argb: COLOR_PALETTE.MEDIUM_GRAY } },
        left: { style: 'thin', color: { argb: COLOR_PALETTE.MEDIUM_GRAY } },
        bottom: { style: 'thin', color: { argb: COLOR_PALETTE.MEDIUM_GRAY } },
        right: { style: 'thin', color: { argb: COLOR_PALETTE.MEDIUM_GRAY } }
    },
    MEDIUM: {
        top: { style: 'medium', color: { argb: COLOR_PALETTE.AMAZON_DARK_BLUE } },
        left: { style: 'medium', color: { argb: COLOR_PALETTE.AMAZON_DARK_BLUE } },
        bottom: { style: 'medium', color: { argb: COLOR_PALETTE.AMAZON_DARK_BLUE } },
        right: { style: 'medium', color: { argb: COLOR_PALETTE.AMAZON_DARK_BLUE } }
    },
    THICK_ORANGE: {
        bottom: { style: 'thick', color: { argb: COLOR_PALETTE.AMAZON_ORANGE } }
    },
    DOUBLE_WHITE: {
        top: { style: 'double', color: { argb: COLOR_PALETTE.WHITE } }
    }
};

// --- Helper Functions ---
const getPerformanceRating = (rate: number): PerformanceRating => {
    if (rate >= 95) return PerformanceRating.EXCELLENT;
    if (rate >= 90) return PerformanceRating.GOOD;
    if (rate >= 80) return PerformanceRating.AVERAGE;
    if (rate > 0) return PerformanceRating.POOR;
    return PerformanceRating.NO_DATA;
};

const getPerformanceColor = (rate: number): string => {
    switch (getPerformanceRating(rate)) {
        case PerformanceRating.EXCELLENT: return COLOR_PALETTE.AMAZON_BLUE;
        case PerformanceRating.GOOD: return COLOR_PALETTE.SUCCESS;
        case PerformanceRating.AVERAGE: return COLOR_PALETTE.WARNING;
        case PerformanceRating.POOR: return COLOR_PALETTE.ERROR;
        default: return COLOR_PALETTE.TEXT_SECONDARY;
    }
};

const getPerformanceIcon = (rate: number): string => {
    switch (getPerformanceRating(rate)) {
        case PerformanceRating.EXCELLENT: return '★';
        case PerformanceRating.GOOD: return '✓';
        case PerformanceRating.AVERAGE: return '⚠';
        case PerformanceRating.POOR: return '✗';
        default: return '–';
    }
};

const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
};

const formatNumber = (value: number): string => {
    return value.toLocaleString('en-US');
};

// --- Excel Styling Functions ---
const createBaseStyles = (Excel: typeof ExcelJS) => {
    return {
        // Font Styles
        headerFont: { 
            name: 'Calibri', 
            size: 14, 
            bold: true, 
            color: { argb: COLOR_PALETTE.TEXT_WHITE } 
        },
        subHeaderFont: { 
            name: 'Calibri', 
            size: 11, 
            bold: true, 
            color: { argb: COLOR_PALETTE.TEXT_PRIMARY } 
        },
        dataFont: { 
            name: 'Calibri', 
            size: 10, 
            color: { argb: COLOR_PALETTE.TEXT_PRIMARY } 
        },
        boldFont: { 
            name: 'Calibri', 
            size: 11, 
            bold: true, 
            color: { argb: COLOR_PALETTE.TEXT_PRIMARY } 
        },
        
        // Alignment Styles
        centerAlign: { 
            vertical: 'middle' as const, 
            horizontal: 'center' as const 
        },
        leftAlign: { 
            vertical: 'middle' as const, 
            horizontal: 'left' as const,
            indent: 1 
        },
        rightAlign: { 
            vertical: 'middle' as const, 
            horizontal: 'right' as const 
        }
    };
};

const applyWorksheetHeader = (
    worksheet: ExcelJS.Worksheet, 
    title: string, 
    subtitle: string
): void => {
    // Main Title Row
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { 
        name: 'Arial', 
        size: 20, 
        bold: true, 
        color: { argb: COLOR_PALETTE.WHITE } 
    };
    titleCell.fill = { 
        type: 'pattern', 
        pattern: 'solid', 
        fgColor: { argb: COLOR_PALETTE.HEADER_BG } 
    };
    titleCell.alignment = { 
        horizontal: 'center', 
        vertical: 'middle' 
    };
    worksheet.getRow(1).height = 40;

    // Subtitle Row
    worksheet.mergeCells('A2:G2');
    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = subtitle;
    subtitleCell.font = { 
        name: 'Arial', 
        size: 12, 
        color: { argb: COLOR_PALETTE.AMAZON_DARK_BLUE } 
    };
    subtitleCell.fill = { 
        type: 'pattern', 
        pattern: 'solid', 
        fgColor: { argb: 'FFF3F4F6' } 
    };
    subtitleCell.alignment = { 
        horizontal: 'center', 
        vertical: 'middle' 
    };
    worksheet.getRow(2).height = 25;
};

const applyAutoFilter = (
    worksheet: ExcelJS.Worksheet, 
    startRow: number, 
    columnCount: number
): void => {
    worksheet.autoFilter = {
        from: { row: startRow, column: 1 },
        to: { row: startRow, column: columnCount }
    };
};

const createSummaryCard = (
    worksheet: ExcelJS.Worksheet,
    startRow: number,
    title: string,
    value: string | number,
    icon?: string
): void => {
    const cardCell = worksheet.getCell(`A${startRow}`);
    
    if (icon) {
        cardCell.value = `${icon} ${title}\n${value}`;
    } else {
        cardCell.value = `${title}\n${value}`;
    }
    
    cardCell.alignment = { 
        horizontal: 'center', 
        vertical: 'middle', 
        wrapText: true 
    };
    cardCell.font = { 
        name: 'Arial', 
        size: 12, 
        bold: true 
    };
    cardCell.fill = { 
        type: 'pattern', 
        pattern: 'solid', 
        fgColor: { argb: COLOR_PALETTE.HIGHLIGHT_BG } 
    };
    cardCell.border = BORDER_STYLES.MEDIUM;
};

// --- Export Functions ---

/**
 * Export Daily Report to Excel
 */
export const exportToExcel = async (data: ProcessedResult): Promise<void> => {
    try {
        const ExcelJS = (await import('exceljs')).default;
        const styles = createBaseStyles(ExcelJS);
        
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'LogiTrack System';
        workbook.created = new Date();
        
        const worksheet = workbook.addWorksheet('Daily Report', {
            views: [{ state: 'frozen', xSplit: 0, ySplit: 8 }]
        });

        const dateStr = new Date().toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // 1. Header Section
        applyWorksheetHeader(
            worksheet, 
            'LogiTrack | Daily Performance Report', 
            `Date: ${dateStr}`
        );

        // 2. Summary Cards
        worksheet.mergeCells('A4:C6');
        createSummaryCard(
            worksheet,
            4,
            'TOTAL VOLUME',
            formatNumber(data.grandTotal.total),
            '📦'
        );

        worksheet.mergeCells('E4:G6');
        const successRateCell = worksheet.getCell('E4');
        successRateCell.value = `🎯 SUCCESS RATE\n${formatPercentage(data.grandTotal.successRate)}`;
        successRateCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        successRateCell.font = { 
            name: 'Arial', 
            size: 14, 
            bold: true, 
            color: { argb: getPerformanceColor(data.grandTotal.successRate) } 
        };
        successRateCell.fill = { 
            type: 'pattern', 
            pattern: 'solid', 
            fgColor: { argb: 'FFECFDF5' } 
        };
        successRateCell.border = BORDER_STYLES.MEDIUM;

        // 3. Table Headers
        const tableStartRow = 8;
        const headers = [
            'Agent Name', 
            'Delivered', 
            'Failed', 
            'OFD', 
            'RTO', 
            'Total', 
            'Success Rate'
        ];
        
        const headerRow = worksheet.getRow(tableStartRow);
        headerRow.values = headers;
        headerRow.height = 30;
        
        // Apply header styling
        headerRow.eachCell((cell) => {
            cell.font = { 
                bold: true, 
                color: { argb: COLOR_PALETTE.TEXT_WHITE }, 
                size: 11,
                name: 'Calibri'
            };
            cell.fill = { 
                type: 'pattern', 
                pattern: 'solid', 
                fgColor: { argb: COLOR_PALETTE.HEADER_BG } 
            };
            cell.alignment = styles.centerAlign;
            cell.border = BORDER_STYLES.THICK_ORANGE;
        });

        // Enable AutoFilter
        applyAutoFilter(worksheet, tableStartRow, headers.length);

        // 4. Data Rows
        data.summaries.forEach((summary, index) => {
            const rowIndex = tableStartRow + 1 + index;
            const row = worksheet.getRow(rowIndex);
            
            row.values = [
                summary.daName,
                summary.delivered,
                summary.failed,
                summary.ofd,
                summary.rto,
                summary.total,
                summary.successRate / 100  // Convert to decimal for Excel percentage
            ];
            
            row.height = 22;

            // Format cells
            row.getCell(7).numFmt = '0.0%'; // Percentage format
            
            // Name cell styling
            row.getCell(1).alignment = styles.leftAlign;
            row.getCell(1).font = styles.boldFont;

            // Conditional formatting for performance
            const rateCell = row.getCell(7);
            rateCell.font = { 
                bold: true, 
                color: { argb: getPerformanceColor(summary.successRate) }
            };

            // Highlight high failure rates
            if (summary.failed > summary.total * 0.2) { // More than 20% failure
                row.getCell(3).font = { 
                    bold: true, 
                    color: { argb: COLOR_PALETTE.ERROR }
                };
            }

            // Zebra striping
            if (index % 2 !== 0) {
                row.eachCell({ includeEmpty: true }, (cell) => {
                    cell.fill = { 
                        type: 'pattern', 
                        pattern: 'solid', 
                        fgColor: { argb: COLOR_PALETTE.ALTERNATE_ROW } 
                    };
                });
            }

            // Apply borders
            row.eachCell((cell) => {
                if (cell.col !== 1) {
                    cell.alignment = styles.centerAlign;
                }
                cell.border = { 
                    bottom: { 
                        style: 'thin', 
                        color: { argb: 'FFE2E8F0' } 
                    } 
                };
            });
        });

        // 5. Grand Total Row
        const totalRowIndex = tableStartRow + data.summaries.length + 1;
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
            cell.fill = { 
                type: 'pattern', 
                pattern: 'solid', 
                fgColor: { argb: COLOR_PALETTE.TOTAL_ROW_BG } 
            };
            cell.font = { 
                bold: true, 
                color: { argb: COLOR_PALETTE.TEXT_WHITE }, 
                size: 12,
                name: 'Calibri'
            };
            
            if (cell.col !== 1) {
                cell.alignment = styles.centerAlign;
            } else {
                cell.alignment = styles.leftAlign;
            }
            
            cell.border = BORDER_STYLES.DOUBLE_WHITE;
        });
        
        totalRow.getCell(7).numFmt = '0.0%';

        // 6. Column Widths
        worksheet.columns = [
            { width: 35 }, // Agent Name
            { width: 15 }, // Delivered
            { width: 15 }, // Failed
            { width: 15 }, // OFD
            { width: 15 }, // RTO
            { width: 15 }, // Total
            { width: 20 }  // Success Rate
        ];

        // 7. Add some metadata
        worksheet.getCell('A1').note = `Generated on ${new Date().toLocaleString()}`;

        // 8. Export
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `LogiTrack_Daily_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Export to Excel failed:', error);
        throw new Error('Failed to export report to Excel');
    }
};

/**
 * Export Advanced Performance Report
 */
export const exportAdvancedReport = async (
    report: any[], 
    title: string, 
    filename: string
): Promise<void> => {
    try {
        const ExcelJS = (await import('exceljs')).default;
        
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'LogiTrack System';
        
        const worksheet = workbook.addWorksheet('Performance Report');

        // Calculate totals
        const totalVolume = report.reduce((acc, curr) => acc + curr.total, 0);
        const totalDelivered = report.reduce((acc, curr) => acc + curr.delivered, 0);
        const overallRate = totalVolume > 0 ? (totalDelivered / totalVolume) * 100 : 0;

        // Apply header
        applyWorksheetHeader(worksheet, 'LogiTrack | Performance Report', title);

        // Add summary cards
        worksheet.mergeCells('A4:C6');
        createSummaryCard(worksheet, 4, 'TOTAL VOLUME', formatNumber(totalVolume), '📊');

        worksheet.mergeCells('E4:G6');
        const rateCard = worksheet.getCell('E4');
        rateCard.value = `🎯 OVERALL SUCCESS RATE\n${formatPercentage(overallRate)}`;
        rateCard.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        rateCard.font = { 
            name: 'Arial', 
            size: 14, 
            bold: true, 
            color: { argb: getPerformanceColor(overallRate) } 
        };
        rateCard.fill = { 
            type: 'pattern', 
            pattern: 'solid', 
            fgColor: { argb: 'FFECFDF5' } 
        };
        rateCard.border = BORDER_STYLES.MEDIUM;

        // Table setup
        const tableStartRow = 8;
        const headers = [
            'Rank', 
            'Agent Name', 
            'Days Worked', 
            'Total Shipments', 
            'Delivered', 
            'Failed/RTO', 
            'Success Rate'
        ];
        
        const headerRow = worksheet.getRow(tableStartRow);
        headerRow.values = headers;
        headerRow.height = 30;
        
        // Style headers
        headerRow.eachCell((cell) => {
            cell.font = { 
                bold: true, 
                color: { argb: COLOR_PALETTE.TEXT_WHITE }, 
                size: 11 
            };
            cell.fill = { 
                type: 'pattern', 
                pattern: 'solid', 
                fgColor: { argb: COLOR_PALETTE.AMAZON_LIGHT_BLUE } 
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = BORDER_STYLES.THICK_ORANGE;
        });

        // Data rows
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
                agent.successRate / 100
            ];

            // Rank styling
            row.getCell(1).font = { 
                bold: true, 
                color: { argb: COLOR_PALETTE.TEXT_SECONDARY } 
            };
            
            // Agent name styling
            row.getCell(2).font = { bold: true };
            row.getCell(2).alignment = { horizontal: 'left', indent: 1 };
            
            // Format percentage
            row.getCell(7).numFmt = '0.0%';
            row.getCell(7).font = { bold: true };
            
            // Color code success rate
            const rateColor = getPerformanceColor(agent.successRate);
            row.getCell(7).font.color = { argb: rateColor };

            // Zebra striping
            if (index % 2 !== 0) {
                row.eachCell({ includeEmpty: true }, (cell) => {
                    cell.fill = { 
                        type: 'pattern', 
                        pattern: 'solid', 
                        fgColor: { argb: COLOR_PALETTE.ALTERNATE_ROW } 
                    };
                });
            }

            row.height = 25;
            
            // Apply borders
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.border = { 
                    bottom: { 
                        style: 'thin', 
                        color: { argb: 'FFE2E8F0' } 
                    } 
                };
                if (cell.col !== 2) {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                }
            });
        });

        // Column widths
        worksheet.columns = [
            { width: 8 },   // Rank
            { width: 35 },  // Agent Name
            { width: 15 },  // Days Worked
            { width: 20 },  // Total Shipments
            { width: 15 },  // Delivered
            { width: 15 },  // Failed/RTO
            { width: 20 }   // Success Rate
        ];

        // Export
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${filename}.xlsx`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Export Advanced Report failed:', error);
        throw new Error('Failed to export advanced report');
    }
};

/**
 * Export Agent History Report
 */
export const exportAgentHistory = async (
    agentName: string, 
    history: any[]
): Promise<void> => {
    try {
        const ExcelJS = (await import('exceljs')).default;
        
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'LogiTrack System';
        
        const worksheet = workbook.addWorksheet('Agent History');

        // Apply header
        applyWorksheetHeader(
            worksheet, 
            `Agent Performance History: ${agentName}`, 
            'Daily Performance Log'
        );

        // Add agent summary
        const totalDelivered = history.reduce((sum, day) => sum + day.delivered, 0);
        const totalShipments = history.reduce((sum, day) => sum + day.total, 0);
        const overallRate = totalShipments > 0 ? (totalDelivered / totalShipments) * 100 : 0;

        worksheet.mergeCells('A4:C6');
        createSummaryCard(
            worksheet, 
            4, 
            'TOTAL SHIPMENTS', 
            formatNumber(totalShipments), 
            '📦'
        );

        worksheet.mergeCells('E4:G6');
        const summaryCell = worksheet.getCell('E4');
        summaryCell.value = `📊 OVERALL PERFORMANCE\n${formatPercentage(overallRate)}`;
        summaryCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        summaryCell.font = { 
            name: 'Arial', 
            size: 14, 
            bold: true, 
            color: { argb: getPerformanceColor(overallRate) } 
        };
        summaryCell.fill = { 
            type: 'pattern', 
            pattern: 'solid', 
            fgColor: { argb: 'FFECFDF5' } 
        };
        summaryCell.border = BORDER_STYLES.MEDIUM;

        // Table headers
        const tableStartRow = 8;
        const headers = ['Date', 'Day', 'Success Rate', 'Delivered', 'Total', 'Failed'];
        
        const headerRow = worksheet.getRow(tableStartRow);
        headerRow.values = headers;
        headerRow.height = 30;
        
        headerRow.eachCell((cell) => {
            cell.font = { 
                bold: true, 
                color: { argb: COLOR_PALETTE.TEXT_WHITE }, 
                size: 11 
            };
            cell.fill = { 
                type: 'pattern', 
                pattern: 'solid', 
                fgColor: { argb: COLOR_PALETTE.HEADER_BG } 
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = BORDER_STYLES.THICK_ORANGE;
        });

        // Data rows
        history.forEach((day, index) => {
            const rowIndex = tableStartRow + 1 + index;
            const row = worksheet.getRow(rowIndex);
            
            const date = new Date(day.date);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const failed = day.total - day.delivered;
            
            row.values = [
                day.date,
                dayName,
                day.successRate / 100,
                day.delivered,
                day.total,
                failed
            ];

            // Format date
            row.getCell(1).numFmt = 'yyyy-mm-dd';
            
            // Format percentage
            row.getCell(3).numFmt = '0.0%';
            
            // Color code performance
            const rateColor = getPerformanceColor(day.successRate);
            row.getCell(3).font = { 
                bold: true, 
                color: { argb: rateColor } 
            };

            // Highlight high failure days
            if (failed > 0 && (failed / day.total) > 0.2) {
                row.getCell(6).font = { 
                    bold: true, 
                    color: { argb: COLOR_PALETTE.ERROR } 
                };
            }

            // Zebra striping
            if (index % 2 !== 0) {
                row.eachCell({ includeEmpty: true }, (cell) => {
                    cell.fill = { 
                        type: 'pattern', 
                        pattern: 'solid', 
                        fgColor: { argb: COLOR_PALETTE.ALTERNATE_ROW } 
                    };
                });
            }

            row.height = 22;
            
            // Apply borders
            row.eachCell((cell) => {
                cell.border = { 
                    bottom: { 
                        style: 'thin', 
                        color: { argb: 'FFE2E8F0' } 
                    } 
                };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });
        });

        // Add trend analysis
        const analysisRow = tableStartRow + history.length + 2;
        worksheet.getCell(`A${analysisRow}`).value = 'Performance Trend Analysis:';
        worksheet.getCell(`A${analysisRow}`).font = { bold: true, size: 12 };
        
        const bestDay = history.reduce((best, current) => 
            current.successRate > best.successRate ? current : best
        );
        
        const worstDay = history.reduce((worst, current) => 
            current.successRate < worst.successRate ? current : worst
        );

        worksheet.getCell(`A${analysisRow + 1}`).value = `Best Day: ${bestDay.date} (${formatPercentage(bestDay.successRate)})`;
        worksheet.getCell(`A${analysisRow + 2}`).value = `Worst Day: ${worstDay.date} (${formatPercentage(worstDay.successRate)})`;
        worksheet.getCell(`A${analysisRow + 3}`).value = `Average Daily Rate: ${formatPercentage(overallRate)}`;

        // Column widths
        worksheet.columns = [
            { width: 15 }, // Date
            { width: 10 }, // Day
            { width: 15 }, // Success Rate
            { width: 12 }, // Delivered
            { width: 12 }, // Total
            { width: 12 }  // Failed
        ];

        // Export
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${agentName.replace(/[^a-z0-9]/gi, '_')}_Performance_History.xlsx`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Export Agent History failed:', error);
        throw new Error('Failed to export agent history');
    }
};

/**
 * Export Complex Monthly Report (Manager View)
 */
export const exportComplexMonthlyReport = async (
    rawRecords: HistoryRecord[], 
    title: string, 
    filename: string
): Promise<void> => {
    try {
        const ExcelJS = (await import('exceljs')).default;
        const styles = createBaseStyles(ExcelJS);
        
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'LogiTrack System';
        
        const worksheet = workbook.addWorksheet('Detailed Monthly View', {
            views: [{ state: 'frozen', xSplit: 1, ySplit: 3 }]
        });

        // Prepare data
        const agentMap: Record<string, Array<{ total: number, delivered: number }>> = {};
        const agentNames = new Set<string>();
        const dayTotals = new Array(32).fill(null).map(() => ({ total: 0, delivered: 0 }));

        // Collect agent names and initialize data structure
        rawRecords.forEach(record => {
            if (!record.agents) return;
            
            record.agents.forEach(agent => {
                agentNames.add(agent.daName);
            });
        });

        const sortedAgents = Array.from(agentNames).sort();

        // Initialize agent map
        sortedAgents.forEach(name => {
            agentMap[name] = new Array(32).fill(null).map(() => ({ total: 0, delivered: 0 }));
        });

        // Fill data
        rawRecords.forEach(record => {
            const date = new Date(record.date);
            const day = date.getDate();
            if (day > 31) return;

            record.agents?.forEach(agent => {
                if (agentMap[agent.daName]) {
                    agentMap[agent.daName][day] = {
                        total: agent.total,
                        delivered: agent.delivered
                    };
                    
                    // Update day totals
                    dayTotals[day].total += agent.total;
                    dayTotals[day].delivered += agent.delivered;
                }
            });
        });

        // Build Header (Rows 1-3)
        const headerRow1 = worksheet.getRow(1);
        const headerRow2 = worksheet.getRow(2);
        const headerRow3 = worksheet.getRow(3);

        headerRow1.height = 30;
        headerRow2.height = 25;
        headerRow3.height = 20;

        // Agent Name header (merged across 3 rows)
        worksheet.mergeCells('A1:A3');
        const nameHeader = worksheet.getCell('A1');
        nameHeader.value = 'Agent Name';
        nameHeader.style = {
            font: styles.headerFont,
            fill: { 
                type: 'pattern', 
                pattern: 'solid', 
                fgColor: { argb: COLOR_PALETTE.HEADER_BG } 
            },
            alignment: styles.centerAlign,
            border: BORDER_STYLES.THIN
        };
        worksheet.getColumn(1).width = 35;

        // Helper function to create day blocks
        const createDayBlock = (
            startDay: number, 
            endDay: number, 
            blockLabel: string
        ): number => {
            let currentCol = worksheet.columnCount + 1;
            const startCol = currentCol;
            const endCol = currentCol + ((endDay - startDay + 1) * 2) - 1;

            // Block header
            worksheet.mergeCells(1, startCol, 1, endCol);
            const blockHeader = worksheet.getCell(1, startCol);
            blockHeader.value = `Days ${startDay} - ${endDay}`;
            blockHeader.style = {
                font: styles.headerFont,
                fill: { 
                    type: 'pattern', 
                    pattern: 'solid', 
                    fgColor: { argb: COLOR_PALETTE.HEADER_BG } 
                },
                alignment: styles.centerAlign,
                border: BORDER_STYLES.THIN
            };

            // Individual day headers
            for (let day = startDay; day <= endDay; day++) {
                // Day number header
                worksheet.mergeCells(2, currentCol, 2, currentCol + 1);
                const dayHeader = worksheet.getCell(2, currentCol);
                dayHeader.value = day;
                dayHeader.style = {
                    font: styles.subHeaderFont,
                    fill: { 
                        type: 'pattern', 
                        pattern: 'solid', 
                        fgColor: { argb: COLOR_PALETTE.SUBHEADER_BG } 
                    },
                    alignment: styles.centerAlign,
                    border: BORDER_STYLES.THIN
                };

                // Metric headers
                const volHeader = worksheet.getCell(3, currentCol);
                volHeader.value = 'Total';
                volHeader.style = {
                    font: { size: 9 },
                    alignment: styles.centerAlign,
                    border: BORDER_STYLES.THIN
                };

                const delHeader = worksheet.getCell(3, currentCol + 1);
                delHeader.value = 'Del';
                delHeader.style = {
                    font: { size: 9 },
                    alignment: styles.centerAlign,
                    border: BORDER_STYLES.THIN
                };

                worksheet.getColumn(currentCol).width = 6;
                worksheet.getColumn(currentCol + 1).width = 6;

                currentCol += 2;
            }

            // Block summary section
            const summaryStartCol = currentCol;
            const summaryEndCol = currentCol + 2;
            
            worksheet.mergeCells(1, summaryStartCol, 1, summaryEndCol);
            const summaryHeader = worksheet.getCell(1, summaryStartCol);
            summaryHeader.value = blockLabel;
            summaryHeader.style = {
                font: { ...styles.headerFont, color: { argb: COLOR_PALETTE.BLACK } },
                fill: { 
                    type: 'pattern', 
                    pattern: 'solid', 
                    fgColor: { argb: COLOR_PALETTE.AMAZON_YELLOW } 
                },
                alignment: styles.centerAlign,
                border: BORDER_STYLES.THIN
            };

            // Summary headers
            const summaryLabels = ['Total', 'Delivered', 'Rate %'];
            summaryLabels.forEach((label, index) => {
                worksheet.mergeCells(2, currentCol + index, 3, currentCol + index);
                const labelCell = worksheet.getCell(2, currentCol + index);
                labelCell.value = label;
                labelCell.style = {
                    font: styles.subHeaderFont,
                    fill: { 
                        type: 'pattern', 
                        pattern: 'solid', 
                        fgColor: { argb: COLOR_PALETTE.SUMMARY_BG } 
                    },
                    alignment: styles.centerAlign,
                    border: BORDER_STYLES.THIN
                };
                worksheet.getColumn(currentCol + index).width = 10;
            });

            return currentCol + 3;
        };

        // Create day blocks
        let currentColumn = 2; // Start from column B
        currentColumn = createDayBlock(1, 10, '1st Period Summary');
        currentColumn = createDayBlock(11, 20, '2nd Period Summary');
        currentColumn = createDayBlock(21, 31, '3rd Period Summary');

        // Monthly Total Section
        const monthlyStartCol = currentColumn;
        worksheet.mergeCells(1, monthlyStartCol, 1, monthlyStartCol + 2);
        const monthlyHeader = worksheet.getCell(1, monthlyStartCol);
        monthlyHeader.value = 'MONTHLY TOTAL';
        monthlyHeader.style = {
            font: styles.headerFont,
            fill: { 
                type: 'pattern', 
                pattern: 'solid', 
                fgColor: { argb: COLOR_PALETTE.HEADER_BG } 
            },
            alignment: styles.centerAlign,
            border: BORDER_STYLES.THIN
        };

        const monthlyLabels = ['Total', 'Delivered', 'Rate %'];
        monthlyLabels.forEach((label, index) => {
            worksheet.mergeCells(2, currentColumn + index, 3, currentColumn + index);
            const labelCell = worksheet.getCell(2, currentColumn + index);
            labelCell.value = label;
            labelCell.style = {
                font: { ...styles.subHeaderFont, color: { argb: COLOR_PALETTE.TEXT_WHITE } },
                fill: { 
                    type: 'pattern', 
                    pattern: 'solid', 
                    fgColor: { argb: COLOR_PALETTE.AMAZON_LIGHT_BLUE } 
                },
                alignment: styles.centerAlign,
                border: BORDER_STYLES.THIN
            };
            worksheet.getColumn(currentColumn + index).width = 12;
        });

        // Fill Data Rows
        let currentRow = 4;

        const fillRowData = (agentName: string, isGrandTotal: boolean = false): void => {
            const row = worksheet.getRow(currentRow);
            row.height = 22;
            
            // Agent name cell
            const nameCell = row.getCell(1);
            nameCell.value = agentName;
            
            if (isGrandTotal) {
                nameCell.style = {
                    font: { ...styles.agentFont, size: 14, color: { argb: COLOR_PALETTE.TEXT_WHITE } },
                    fill: { 
                        type: 'pattern', 
                        pattern: 'solid', 
                        fgColor: { argb: COLOR_PALETTE.HEADER_BG } 
                    },
                    alignment: styles.leftAlign,
                    border: BORDER_STYLES.THIN
                };
            } else {
                nameCell.style = {
                    font: styles.agentFont,
                    alignment: styles.leftAlign,
                    border: BORDER_STYLES.THIN
                };
                
                // Zebra striping for agent names
                if (currentRow % 2 !== 0) {
                    nameCell.fill = { 
                        type: 'pattern', 
                        pattern: 'solid', 
                        fgColor: { argb: COLOR_PALETTE.ALTERNATE_ROW } 
                    };
                }
            }

            let column = 2;
            
            // Helper to process each 10-day block
            const processBlock = (startDay: number, endDay: number): { total: number, delivered: number } => {
                let blockTotal = 0;
                let blockDelivered = 0;

                for (let day = startDay; day <= endDay; day++) {
                    let dayTotal = 0;
                    let dayDelivered = 0;

                    if (isGrandTotal) {
                        dayTotal = dayTotals[day].total;
                        dayDelivered = dayTotals[day].delivered;
                    } else {
                        const agentData = agentMap[agentName][day];
                        if (agentData) {
                            dayTotal = agentData.total;
                            dayDelivered = agentData.delivered;
                        }
                    }

                    // Total cell
                    const totalCell = row.getCell(column);
                    totalCell.value = dayTotal > 0 ? dayTotal : (isGrandTotal ? 0 : '');
                    
                    // Delivered cell
                    const deliveredCell = row.getCell(column + 1);
                    deliveredCell.value = dayTotal > 0 ? dayDelivered : (isGrandTotal ? 0 : '');

                    // Cell styling
                    const cellStyle: Partial<ExcelJS.Style> = {
                        font: styles.dataFont,
                        alignment: styles.centerAlign,
                        border: BORDER_STYLES.THIN
                    };

                    if (isGrandTotal) {
                        cellStyle.font = { 
                            bold: true, 
                            color: { argb: COLOR_PALETTE.TEXT_WHITE } 
                        };
                        cellStyle.fill = { 
                            type: 'pattern', 
                            pattern: 'solid', 
                            fgColor: { argb: COLOR_PALETTE.HEADER_BG } 
                        };
                    } else if (dayTotal === 0) {
                        cellStyle.fill = { 
                            type: 'pattern', 
                            pattern: 'solid', 
                            fgColor: { argb: 'FFFAFAFA' } 
                        };
                    } else if (currentRow % 2 !== 0) {
                        cellStyle.fill = { 
                            type: 'pattern', 
                            pattern: 'solid', 
                            fgColor: { argb: COLOR_PALETTE.ALTERNATE_ROW } 
                        };
                    }

                    totalCell.style = cellStyle;
                    deliveredCell.style = cellStyle;

                    blockTotal += dayTotal;
                    blockDelivered += dayDelivered;
                    column += 2;
                }

                // Block summary cells
                const blockRate = blockTotal > 0 ? blockDelivered / blockTotal : 0;
                
                const summaryTotalCell = row.getCell(column);
                summaryTotalCell.value = blockTotal;
                summaryTotalCell.style = {
                    font: { ...styles.dataFont, bold: true },
                    alignment: styles.centerAlign,
                    border: BORDER_STYLES.THIN,
                    fill: { 
                        type: 'pattern', 
                        pattern: 'solid', 
                        fgColor: { argb: COLOR_PALETTE.SUMMARY_BG } 
                    }
                };

                const summaryDeliveredCell = row.getCell(column + 1);
                summaryDeliveredCell.value = blockDelivered;
                summaryDeliveredCell.style = summaryTotalCell.style;

                const summaryRateCell = row.getCell(column + 2);
                summaryRateCell.value = blockRate;
                summaryRateCell.numFmt = '0.0%';
                summaryRateCell.style = {
                    ...summaryTotalCell.style,
                    font: { 
                        bold: true, 
                        color: { argb: getPerformanceColor(blockRate * 100) } 
                    }
                };

                if (isGrandTotal) {
                    summaryTotalCell.fill.fgColor = { argb: COLOR_PALETTE.AMAZON_LIGHT_BLUE };
                    summaryDeliveredCell.fill.fgColor = { argb: COLOR_PALETTE.AMAZON_LIGHT_BLUE };
                    summaryRateCell.fill.fgColor = { argb: COLOR_PALETTE.AMAZON_LIGHT_BLUE };
                    summaryRateCell.font.color = { argb: COLOR_PALETTE.TEXT_WHITE };
                }

                column += 3;
                return { total: blockTotal, delivered: blockDelivered };
            };

            // Process each 10-day block
            const block1 = processBlock(1, 10);
            const block2 = processBlock(11, 20);
            const block3 = processBlock(21, 31);

            // Monthly totals
            const monthlyTotal = block1.total + block2.total + block3.total;
            const monthlyDelivered = block1.delivered + block2.delivered + block3.delivered;
            const monthlyRate = monthlyTotal > 0 ? monthlyDelivered / monthlyTotal : 0;

            const monthlyTotalCell = row.getCell(column);
            monthlyTotalCell.value = monthlyTotal;
            
            const monthlyDeliveredCell = row.getCell(column + 1);
            monthlyDeliveredCell.value = monthlyDelivered;
            
            const monthlyRateCell = row.getCell(column + 2);
            monthlyRateCell.value = monthlyRate;
            monthlyRateCell.numFmt = '0.0%';

            const monthlyStyle: Partial<ExcelJS.Style> = {
                font: { ...styles.dataFont, bold: true, size: 12 },
                alignment: styles.centerAlign,
                border: { 
                    ...BORDER_STYLES.THIN,
                    left: { style: 'medium', color: { argb: COLOR_PALETTE.AMAZON_DARK_BLUE } } 
                },
                fill: { 
                    type: 'pattern', 
                    pattern: 'solid', 
                    fgColor: { argb: COLOR_PALETTE.SUBHEADER_BG } 
                }
            };

            if (isGrandTotal) {
                monthlyStyle.fill = { 
                    type: 'pattern', 
                    pattern: 'solid', 
                    fgColor: { argb: COLOR_PALETTE.HEADER_BG } 
                };
                monthlyStyle.font = { 
                    bold: true, 
                    size: 12, 
                    color: { argb: COLOR_PALETTE.TEXT_WHITE } 
                };
            } else {
                monthlyRateCell.font = { 
                    bold: true, 
                    color: { argb: getPerformanceColor(monthlyRate * 100) } 
                };
            }

            monthlyTotalCell.style = monthlyStyle;
            monthlyDeliveredCell.style = monthlyStyle;
            monthlyRateCell.style = monthlyStyle;

            currentRow++;
        };

        // Fill agent rows
        sortedAgents.forEach(agentName => fillRowData(agentName));

        // Add separator row
        const separatorRow = worksheet.getRow(currentRow);
        separatorRow.height = 5;
        for (let i = 1; i <= worksheet.columnCount; i++) {
            const cell = separatorRow.getCell(i);
            cell.fill = { 
                type: 'pattern', 
                pattern: 'solid', 
                fgColor: { argb: COLOR_PALETTE.AMAZON_ORANGE } 
            };
            cell.border = { 
                bottom: { 
                    style: 'thick', 
                    color: { argb: COLOR_PALETTE.AMAZON_ORANGE } 
                } 
            };
        }
        currentRow++;

        // Fill grand total row
        fillRowData('GRAND TOTAL', true);

        // Add summary statistics
        const summaryRow = currentRow + 2;
        worksheet.getCell(`A${summaryRow}`).value = 'Report Summary:';
        worksheet.getCell(`A${summaryRow}`).font = { bold: true, size: 12 };
        
        worksheet.getCell(`A${summaryRow + 1}`).value = `• Total Agents: ${sortedAgents.length}`;
        worksheet.getCell(`A${summaryRow + 2}`).value = `• Total Days: ${rawRecords.length}`;
        worksheet.getCell(`A${summaryRow + 3}`).value = `• Report Generated: ${new Date().toLocaleString()}`;

        // Export
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${filename}.xlsx`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Export Complex Monthly Report failed:', error);
        throw new Error('Failed to export complex monthly report');
    }
};

/**
 * Export Monthly Report (Alias for Advanced Report)
 */
export const exportMonthlyReport = async (
    report: any[], 
    month: string
): Promise<void> => {
    return exportAdvancedReport(report, `Monthly Report - ${month}`, `Monthly_Report_${month}`);
};

/**
 * Export Yearly Report
 */
export const exportYearlyReport = async (
    report: any[], 
    year: string
): Promise<void> => {
    return exportAdvancedReport(report, `Annual Report - ${year}`, `Yearly_Report_${year}`);
};

/**
 * Export to PDF (Basic Implementation)
 */
export const exportToPDF = async (data: ProcessedResult, date: string): Promise<void> => {
    try {
        const { jsPDF } = await import('jspdf');
        
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        // Header
        doc.setFillColor(35, 47, 62); // Amazon Dark Blue
        doc.rect(0, 0, 297, 25, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('LogiTrack Station Report', 20, 15);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Final Delivery Daily Summary', 20, 22);

        doc.setTextColor(255, 153, 0); // Amazon Orange
        doc.setFontSize(14);
        doc.text(date, 270, 15, { align: 'right' });

        // Station Summary
        const summaryY = 35;
        doc.setFillColor(243, 244, 246);
        doc.roundedRect(15, summaryY, 267, 20, 3, 3, 'F');
        
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(10);
        doc.text('TOTAL VOLUME', 40, summaryY + 8, { align: 'center' });
        doc.text('DELIVERED', 95, summaryY + 8, { align: 'center' });
        doc.text('FAILED/RTO', 150, summaryY + 8, { align: 'center' });
        doc.text('OFD', 205, summaryY + 8, { align: 'center' });
        doc.text('SUCCESS RATE', 260, summaryY + 8, { align: 'center' });

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(data.grandTotal.total.toString(), 40, summaryY + 15, { align: 'center' });
        
        doc.setTextColor(16, 185, 129); // Emerald
        doc.text(data.grandTotal.delivered.toString(), 95, summaryY + 15, { align: 'center' });
        
        doc.setTextColor(225, 29, 72); // Rose
        doc.text((data.grandTotal.failed + data.grandTotal.rto).toString(), 150, summaryY + 15, { align: 'center' });
        
        doc.setTextColor(59, 130, 246); // Blue
        doc.text(data.grandTotal.ofd.toString(), 205, summaryY + 15, { align: 'center' });
        
        doc.setTextColor(255, 153, 0); // Orange
        doc.text(data.grandTotal.successRate.toFixed(1) + '%', 260, summaryY + 15, { align: 'center' });

        // Table Header
        let tableY = summaryY + 30;
        doc.setFillColor(230, 230, 230);
        doc.rect(15, tableY, 267, 10, 'F');
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.text('Agent Name', 20, tableY + 6);
        doc.text('Delivered', 120, tableY + 6, { align: 'center' });
        doc.text('Failed', 150, tableY + 6, { align: 'center' });
        doc.text('OFD', 180, tableY + 6, { align: 'center' });
        doc.text('RTO', 210, tableY + 6, { align: 'center' });
        doc.text('Total', 240, tableY + 6, { align: 'center' });
        doc.text('Rate', 275, tableY + 6, { align: 'center' });

        tableY += 10;

        // Table Body
        doc.setFont('helvetica', 'normal');
        data.summaries.forEach((summary, index) => {
            if (tableY > 180) {
                doc.addPage();
                tableY = 20;
            }
            
            // Striped background
            if (index % 2 === 0) {
                doc.setFillColor(250, 250, 250);
                doc.rect(15, tableY - 6, 267, 8, 'F');
            }

            // Agent Name
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(9);
            doc.text(summary.daName, 20, tableY);
            
            // Numbers
            doc.text(summary.delivered.toString(), 120, tableY, { align: 'center' });
            doc.text(summary.failed.toString(), 150, tableY, { align: 'center' });
            doc.text(summary.ofd.toString(), 180, tableY, { align: 'center' });
            doc.text(summary.rto.toString(), 210, tableY, { align: 'center' });
            doc.text(summary.total.toString(), 240, tableY, { align: 'center' });
            
            // Success Rate with color coding
            if (summary.successRate >= 90) {
                doc.setTextColor(16, 185, 129);
            } else if (summary.successRate < 80) {
                doc.setTextColor(225, 29, 72);
            } else {
                doc.setTextColor(255, 153, 0);
            }
            
            doc.text(summary.successRate.toFixed(1) + '%', 275, tableY, { align: 'center' });
            
            tableY += 8;
        });

        // Footer
        const footerY = 190;
        doc.setDrawColor(200, 200, 200);
        doc.line(15, footerY, 282, footerY);
        
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.text('Generated by LogiTrack System', 20, footerY + 5);
        doc.text(new Date().toLocaleString(), 270, footerY + 5, { align: 'right' });

        // Save PDF
        doc.save(`LogiTrack_Report_${date.replace(/\//g, '-')}.pdf`);

    } catch (error) {
        console.error('Export to PDF failed:', error);
        throw new Error('Failed to export report to PDF');
    }
};

/**
 * Export as Image (Screenshot)
 */
export const exportAsImage = async (elementId: string, filename?: string): Promise<void> => {
    try {
        const element = document.getElementById(elementId);
        if (!element) {
            throw new Error(`Element with id "${elementId}" not found`);
        }

        const html2canvas = (await import('html2canvas')).default;

        // Prepare element for capture
        const originalStyles = {
            overflow: element.style.overflow,
            transform: element.style.transform,
            width: element.style.width,
            borderRadius: element.style.borderRadius,
            boxShadow: element.style.boxShadow,
            margin: element.style.margin
        };

        element.classList.add('capturing');
        
        // Store current scroll position
        const currentScrollY = window.scrollY;
        const currentScrollX = window.scrollX;
        
        // Scroll to top for complete capture
        window.scrollTo(0, 0);

        // Wait for DOM updates
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const canvas = await html2canvas(element, {
                scale: 2, // High resolution
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                scrollY: 0,
                windowWidth: document.documentElement.scrollWidth,
                onclone: (clonedDoc, clonedElement) => {
                    // Ensure proper rendering in cloned document
                    clonedElement.style.transform = 'none';
                    clonedElement.style.width = 'auto';
                    clonedElement.style.borderRadius = '0';
                    clonedElement.style.boxShadow = 'none';
                    clonedElement.style.margin = '0';
                    
                    // Force center alignment for all table cells
                    const cells = clonedElement.querySelectorAll('td, th');
                    cells.forEach((cell: any) => {
                        cell.style.display = 'table-cell';
                        cell.style.verticalAlign = 'middle';
                        cell.style.textAlign = 'center';
                    });
                }
            });

            // Convert to image
            const imageData = canvas.toDataURL('image/png', 1.0);
            
            // Create download link
            const link = document.createElement('a');
            link.download = filename || `LogiTrack_Screenshot_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
            link.href = imageData;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } finally {
            // Restore original state
            element.classList.remove('capturing');
            Object.assign(element.style, originalStyles);
            window.scrollTo(currentScrollX, currentScrollY);
        }

    } catch (error) {
        console.error('Export as Image failed:', error);
        throw new Error('Failed to export as image');
    }
};

/**
 * Batch Export Function (All formats at once)
 */
export const exportBatchReport = async (
    data: ProcessedResult,
    options: {
        includeExcel?: boolean;
        includePDF?: boolean;
        includeImage?: boolean;
        elementId?: string;
    } = {}
): Promise<void> => {
    const {
        includeExcel = true,
        includePDF = false,
        includeImage = false,
        elementId = 'exportable-content'
    } = options;

    const date = new Date().toLocaleDateString('en-GB');
    
    try {
        const exports = [];
        
        if (includeExcel) {
            exports.push(exportToExcel(data));
        }
        
        if (includePDF) {
            exports.push(exportToPDF(data, date));
        }
        
        if (includeImage && elementId) {
            exports.push(exportAsImage(elementId));
        }
        
        await Promise.allSettled(exports);
        
    } catch (error) {
        console.error('Batch export failed:', error);
        throw new Error('Batch export failed');
    }
};

/**
 * Export Tracking Details (Shipment List)
 */
export const exportTrackingDetails = async (
    trackings: TrackingDetail[],
    agentName?: string
): Promise<void> => {
    try {
        const ExcelJS = (await import('exceljs')).default;
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Tracking Details');
        
        const title = agentName 
            ? `Tracking Details - ${agentName}`
            : 'Tracking Details Report';
        
        applyWorksheetHeader(worksheet, title, new Date().toLocaleDateString());
        
        // Headers
        const headers = ['Tracking ID', 'Status', 'Agent', 'Date', 'Notes'];
        const headerRow = worksheet.getRow(5);
        headerRow.values = headers;
        headerRow.height = 30;
        
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: COLOR_PALETTE.TEXT_WHITE } };
            cell.fill = { 
                type: 'pattern', 
                pattern: 'solid', 
                fgColor: { argb: COLOR_PALETTE.HEADER_BG } 
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = BORDER_STYLES.THICK_ORANGE;
        });
        
        // Data rows
        trackings.forEach((tracking, index) => {
            const row = worksheet.addRow([
                tracking.id,
                tracking.status.toUpperCase(),
                tracking.agent || 'N/A',
                tracking.date || new Date().toISOString().split('T')[0],
                tracking.notes || ''
            ]);
            
            // Status color coding
            const statusCell = row.getCell(2);
            switch (tracking.status.toLowerCase()) {
                case 'delivered':
                    statusCell.font = { color: { argb: COLOR_PALETTE.SUCCESS }, bold: true };
                    break;
                case 'failed':
                case 'rto':
                    statusCell.font = { color: { argb: COLOR_PALETTE.ERROR }, bold: true };
                    break;
                case 'ofd':
                    statusCell.font = { color: { argb: COLOR_PALETTE.WARNING }, bold: true };
                    break;
            }
            
            // Zebra striping
            if (index % 2 !== 0) {
                row.eachCell({ includeEmpty: true }, (cell) => {
                    cell.fill = { 
                        type: 'pattern', 
                        pattern: 'solid', 
                        fgColor: { argb: COLOR_PALETTE.ALTERNATE_ROW } 
                    };
                });
            }
            
            row.height = 22;
        });
        
        // Column widths
        worksheet.columns = [
            { width: 25 }, // Tracking ID
            { width: 15 }, // Status
            { width: 20 }, // Agent
            { width: 15 }, // Date
            { width: 40 }  // Notes
        ];
        
        // Auto filter
        applyAutoFilter(worksheet, 5, headers.length);
        
        // Export
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `Tracking_Details_${new Date().toISOString().split('T')[0]}.xlsx`;
        anchor.click();
        
    } catch (error) {
        console.error('Export Tracking Details failed:', error);
        throw new Error('Failed to export tracking details');
    }
};

export default {
    exportToExcel,
    exportAdvancedReport,
    exportAgentHistory,
    exportMonthlyReport,
    exportYearlyReport,
    exportComplexMonthlyReport,
    exportToPDF,
    exportAsImage,
    exportBatchReport,
    exportTrackingDetails,
    ReportType,
    PerformanceRating
};