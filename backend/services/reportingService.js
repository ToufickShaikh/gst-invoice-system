// backend/services/reportingService.js
// Enterprise Advanced Reporting & Analytics Service
const { cacheManager } = require('../utils/cacheManager');
const { getOptimizedAggregation } = require('../utils/databaseOptimization');
const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

class ReportingService {
    constructor() {
        this.reportTypes = {
            'sales': {
                name: 'Sales Report',
                description: 'Comprehensive sales analysis',
                icon: '📊',
                cacheTTL: 3600,
                formats: ['pdf', 'excel', 'csv', 'json']
            },
            'financial': {
                name: 'Financial Report',
                description: 'Revenue, profit & loss analysis',
                icon: '💰',
                cacheTTL: 7200,
                formats: ['pdf', 'excel', 'json']
            },
            'gst': {
                name: 'GST Report',
                description: 'Tax compliance reports',
                icon: '🧾',
                cacheTTL: 1800,
                formats: ['pdf', 'excel', 'csv']
            },
            'customer': {
                name: 'Customer Analysis',
                description: 'Customer behavior & insights',
                icon: '👥',
                cacheTTL: 3600,
                formats: ['pdf', 'excel', 'json']
            },
            'inventory': {
                name: 'Inventory Report',
                description: 'Stock levels & movement analysis',
                icon: '📦',
                cacheTTL: 1800,
                formats: ['pdf', 'excel', 'csv']
            },
            'performance': {
                name: 'Performance Dashboard',
                description: 'Key business metrics & KPIs',
                icon: '📈',
                cacheTTL: 900,
                formats: ['json', 'pdf']
            }
        };

        this.reportQueue = [];
        this.generatingReports = new Map();
        this.templates = new Map();
        
        this.initializeTemplates();
        this.startReportProcessor();
        
        console.log('✅ Advanced Reporting Service initialized');
    }

    // Initialize report templates
    async initializeTemplates() {
        const templatesPath = path.join(__dirname, '../templates/reports');
        
        try {
            const templateFiles = await fs.readdir(templatesPath);
            for (const file of templateFiles) {
                if (file.endsWith('.json')) {
                    const templateName = file.replace('.json', '');
                    const templatePath = path.join(templatesPath, file);
                    const template = JSON.parse(await fs.readFile(templatePath, 'utf8'));
                    this.templates.set(templateName, template);
                }
            }
            console.log(`✅ Loaded ${this.templates.size} report templates`);
        } catch (error) {
            console.warn('⚠️ Templates directory not found, using default templates');
            this.createDefaultTemplates();
        }
    }

    // Generate comprehensive sales report
    async generateSalesReport(params) {
        const {
            dateFrom,
            dateTo,
            groupBy = 'day',
            includeItems = true,
            includeCustomers = true,
            format = 'json'
        } = params;

        const cacheKey = `report:sales:${dateFrom}:${dateTo}:${groupBy}:${format}`;
        
        // Check cache first
        const cached = await cacheManager.get(cacheKey);
        if (cached) {
            console.log('📊 Returning cached sales report');
            return cached;
        }

        try {
            // Get sales data using optimized aggregation
            const salesData = await this.getSalesData(dateFrom, dateTo, groupBy);
            
            // Get top performing items
            const topItems = includeItems ? await this.getTopPerformingItems(dateFrom, dateTo) : [];
            
            // Get customer analytics
            const customerAnalytics = includeCustomers ? await this.getCustomerAnalytics(dateFrom, dateTo) : {};

            const report = {
                reportType: 'sales',
                generatedAt: new Date(),
                period: { from: dateFrom, to: dateTo },
                summary: {
                    totalSales: salesData.summary.totalAmount,
                    totalOrders: salesData.summary.totalOrders,
                    averageOrderValue: salesData.summary.averageOrderValue,
                    salesGrowth: salesData.summary.growth,
                    topSellingDay: salesData.summary.topDay
                },
                trends: salesData.trends,
                topItems: topItems.slice(0, 20),
                customerInsights: customerAnalytics,
                chartData: {
                    salesTrend: salesData.chartData.daily,
                    categoryBreakdown: salesData.chartData.categories,
                    paymentMethods: salesData.chartData.paymentMethods
                },
                detailedData: format === 'detailed' ? salesData.detailed : null
            };

            // Cache the report
            await cacheManager.set(cacheKey, report, this.reportTypes.sales.cacheTTL);

            console.log(`📊 Sales report generated for ${dateFrom} to ${dateTo}`);
            return report;

        } catch (error) {
            console.error('❌ Sales report generation failed:', error);
            throw new Error(`Failed to generate sales report: ${error.message}`);
        }
    }

    // Generate GST compliance reports
    async generateGSTReport(params) {
        const {
            dateFrom,
            dateTo,
            gstNumber,
            reportType = 'GSTR1', // GSTR1, GSTR3B, GSTR9
            format = 'json'
        } = params;

        const cacheKey = `report:gst:${reportType}:${dateFrom}:${dateTo}:${format}`;
        const cached = await cacheManager.get(cacheKey);
        if (cached) return cached;

        try {
            let reportData;

            switch (reportType) {
                case 'GSTR1':
                    reportData = await this.generateGSTR1Report(dateFrom, dateTo, gstNumber);
                    break;
                case 'GSTR3B':
                    reportData = await this.generateGSTR3BReport(dateFrom, dateTo, gstNumber);
                    break;
                case 'GSTR9':
                    reportData = await this.generateGSTR9Report(dateFrom, dateTo, gstNumber);
                    break;
                default:
                    throw new Error(`Unsupported GST report type: ${reportType}`);
            }

            const report = {
                reportType: 'gst',
                gstReportType: reportType,
                generatedAt: new Date(),
                period: { from: dateFrom, to: dateTo },
                gstNumber: gstNumber,
                summary: reportData.summary,
                sections: reportData.sections,
                compliance: reportData.compliance,
                warnings: reportData.warnings || []
            };

            await cacheManager.set(cacheKey, report, this.reportTypes.gst.cacheTTL);
            return report;

        } catch (error) {
            console.error('❌ GST report generation failed:', error);
            throw error;
        }
    }

    // Generate financial performance report
    async generateFinancialReport(params) {
        const {
            dateFrom,
            dateTo,
            includeComparisons = true,
            includeProfitLoss = true,
            format = 'json'
        } = params;

        const cacheKey = `report:financial:${dateFrom}:${dateTo}:${format}`;
        const cached = await cacheManager.get(cacheKey);
        if (cached) return cached;

        try {
            const financialData = await this.getFinancialData(dateFrom, dateTo);
            const profitLossData = includeProfitLoss ? await this.getProfitLossData(dateFrom, dateTo) : null;
            const comparisonData = includeComparisons ? await this.getComparisonData(dateFrom, dateTo) : null;

            const report = {
                reportType: 'financial',
                generatedAt: new Date(),
                period: { from: dateFrom, to: dateTo },
                summary: {
                    totalRevenue: financialData.revenue,
                    totalExpenses: financialData.expenses,
                    netProfit: financialData.netProfit,
                    profitMargin: financialData.profitMargin,
                    cashFlow: financialData.cashFlow
                },
                revenueBreakdown: financialData.revenueBreakdown,
                expenseBreakdown: financialData.expenseBreakdown,
                profitLoss: profitLossData,
                comparisons: comparisonData,
                recommendations: this.generateFinancialRecommendations(financialData)
            };

            await cacheManager.set(cacheKey, report, this.reportTypes.financial.cacheTTL);
            return report;

        } catch (error) {
            console.error('❌ Financial report generation failed:', error);
            throw error;
        }
    }

    // Generate customer analysis report
    async generateCustomerReport(params) {
        const {
            dateFrom,
            dateTo,
            segmentBy = 'value',
            includeRetention = true,
            format = 'json'
        } = params;

        try {
            const customerData = await this.getCustomerAnalyticsData(dateFrom, dateTo, segmentBy);
            const retentionData = includeRetention ? await this.getCustomerRetentionData(dateFrom, dateTo) : null;

            const report = {
                reportType: 'customer',
                generatedAt: new Date(),
                period: { from: dateFrom, to: dateTo },
                summary: {
                    totalCustomers: customerData.totalCustomers,
                    activeCustomers: customerData.activeCustomers,
                    newCustomers: customerData.newCustomers,
                    customerLifetimeValue: customerData.averageLifetimeValue,
                    churnRate: customerData.churnRate
                },
                segments: customerData.segments,
                topCustomers: customerData.topCustomers.slice(0, 50),
                retention: retentionData,
                insights: this.generateCustomerInsights(customerData)
            };

            return report;

        } catch (error) {
            console.error('❌ Customer report generation failed:', error);
            throw error;
        }
    }

    // Generate performance dashboard data
    async generatePerformanceDashboard(params) {
        const { period = '30d', realTime = true } = params;
        
        const cacheKey = `dashboard:performance:${period}`;
        const cacheTTL = realTime ? 300 : 900; // 5 min for real-time, 15 min otherwise

        const cached = await cacheManager.get(cacheKey);
        if (cached && !realTime) return cached;

        try {
            const [
                salesMetrics,
                financialMetrics,
                customerMetrics,
                inventoryMetrics,
                systemMetrics
            ] = await Promise.all([
                this.getSalesMetrics(period),
                this.getFinancialMetrics(period),
                this.getCustomerMetrics(period),
                this.getInventoryMetrics(period),
                this.getSystemMetrics(period)
            ]);

            const dashboard = {
                reportType: 'performance',
                generatedAt: new Date(),
                period: period,
                realTime: realTime,
                kpis: {
                    revenue: {
                        current: salesMetrics.totalRevenue,
                        previous: salesMetrics.previousRevenue,
                        growth: salesMetrics.revenueGrowth,
                        trend: salesMetrics.revenueTrend
                    },
                    orders: {
                        current: salesMetrics.totalOrders,
                        previous: salesMetrics.previousOrders,
                        growth: salesMetrics.orderGrowth,
                        trend: salesMetrics.orderTrend
                    },
                    customers: {
                        active: customerMetrics.activeCustomers,
                        new: customerMetrics.newCustomers,
                        retention: customerMetrics.retentionRate,
                        satisfaction: customerMetrics.satisfactionScore
                    },
                    inventory: {
                        totalValue: inventoryMetrics.totalValue,
                        lowStockItems: inventoryMetrics.lowStockItems,
                        turnoverRate: inventoryMetrics.turnoverRate
                    }
                },
                charts: {
                    salesTrend: salesMetrics.chartData,
                    customerGrowth: customerMetrics.chartData,
                    profitMargins: financialMetrics.chartData,
                    topProducts: inventoryMetrics.topProducts
                },
                alerts: [
                    ...this.generatePerformanceAlerts(salesMetrics, financialMetrics),
                    ...this.generateInventoryAlerts(inventoryMetrics),
                    ...this.generateSystemAlerts(systemMetrics)
                ],
                recommendations: this.generatePerformanceRecommendations({
                    sales: salesMetrics,
                    financial: financialMetrics,
                    customer: customerMetrics,
                    inventory: inventoryMetrics
                })
            };

            await cacheManager.set(cacheKey, dashboard, cacheTTL);
            return dashboard;

        } catch (error) {
            console.error('❌ Performance dashboard generation failed:', error);
            throw error;
        }
    }

    // Export report to different formats
    async exportReport(reportData, format, filename) {
        const exportPath = path.join(__dirname, '../exports');
        await fs.mkdir(exportPath, { recursive: true });

        const fullPath = path.join(exportPath, `${filename}.${format}`);

        try {
            switch (format.toLowerCase()) {
                case 'pdf':
                    await this.exportToPDF(reportData, fullPath);
                    break;
                case 'excel':
                case 'xlsx':
                    await this.exportToExcel(reportData, fullPath);
                    break;
                case 'csv':
                    await this.exportToCSV(reportData, fullPath);
                    break;
                case 'json':
                    await fs.writeFile(fullPath, JSON.stringify(reportData, null, 2));
                    break;
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }

            console.log(`📁 Report exported to ${fullPath}`);
            return {
                success: true,
                filePath: fullPath,
                downloadUrl: `/api/reports/download/${path.basename(fullPath)}`,
                fileSize: (await fs.stat(fullPath)).size
            };

        } catch (error) {
            console.error('❌ Report export failed:', error);
            throw error;
        }
    }

    // Export to Excel format
    async exportToExcel(reportData, filePath) {
        const workbook = new ExcelJS.Workbook();
        
        // Add metadata
        workbook.creator = 'GST Invoice System';
        workbook.created = new Date();
        workbook.modified = new Date();

        // Summary sheet
        const summarySheet = workbook.addWorksheet('Summary', {
            headerFooter: { firstHeader: `${reportData.reportType.toUpperCase()} Report - Generated on ${new Date().toLocaleDateString()}` }
        });

        // Add company header
        summarySheet.mergeCells('A1:D1');
        summarySheet.getCell('A1').value = process.env.COMPANY_NAME || 'GST Invoice System';
        summarySheet.getCell('A1').font = { size: 16, bold: true };
        summarySheet.getCell('A1').alignment = { horizontal: 'center' };

        // Add report title
        summarySheet.mergeCells('A2:D2');
        summarySheet.getCell('A2').value = `${this.reportTypes[reportData.reportType]?.name || 'Report'}`;
        summarySheet.getCell('A2').font = { size: 14, bold: true };
        summarySheet.getCell('A2').alignment = { horizontal: 'center' };

        // Add summary data
        let row = 4;
        if (reportData.summary) {
            summarySheet.getCell(`A${row}`).value = 'Summary';
            summarySheet.getCell(`A${row}`).font = { bold: true };
            row++;

            for (const [key, value] of Object.entries(reportData.summary)) {
                summarySheet.getCell(`A${row}`).value = this.formatKeyName(key);
                summarySheet.getCell(`B${row}`).value = this.formatValue(value);
                row++;
            }
        }

        // Add detailed data sheets based on report type
        if (reportData.reportType === 'sales' && reportData.topItems) {
            const itemsSheet = workbook.addWorksheet('Top Items');
            itemsSheet.addRow(['Item Name', 'Quantity Sold', 'Revenue', 'Profit Margin']);
            
            reportData.topItems.forEach(item => {
                itemsSheet.addRow([
                    item.name,
                    item.quantitySold,
                    item.revenue,
                    item.profitMargin + '%'
                ]);
            });

            // Style headers
            itemsSheet.getRow(1).font = { bold: true };
            itemsSheet.columns.forEach(column => {
                column.width = 15;
            });
        }

        await workbook.xlsx.writeFile(filePath);
    }

    // Export to PDF format
    async exportToPDF(reportData, filePath) {
        const doc = new PDFDocument({
            margin: 50,
            size: 'A4'
        });

        const stream = require('fs').createWriteStream(filePath);
        doc.pipe(stream);

        // Add header
        doc.fontSize(20)
           .text(process.env.COMPANY_NAME || 'GST Invoice System', { align: 'center' });
        
        doc.fontSize(16)
           .text(`${this.reportTypes[reportData.reportType]?.name || 'Report'}`, { align: 'center' });

        doc.moveDown();
        doc.fontSize(12)
           .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });

        if (reportData.period) {
            doc.text(`Period: ${reportData.period.from} to ${reportData.period.to}`, { align: 'right' });
        }

        doc.moveDown(2);

        // Add summary section
        if (reportData.summary) {
            doc.fontSize(14).text('Summary', { underline: true });
            doc.moveDown();

            for (const [key, value] of Object.entries(reportData.summary)) {
                doc.fontSize(12)
                   .text(`${this.formatKeyName(key)}: `, { continued: true })
                   .text(`${this.formatValue(value)}`, { align: 'left' });
            }
            doc.moveDown();
        }

        // Add charts section (placeholder for actual chart implementation)
        if (reportData.chartData) {
            doc.addPage();
            doc.fontSize(14).text('Charts & Visualizations', { underline: true });
            doc.moveDown();
            doc.fontSize(12).text('Chart data available in digital format.');
        }

        doc.end();

        return new Promise((resolve, reject) => {
            stream.on('finish', resolve);
            stream.on('error', reject);
        });
    }

    // Utility methods for data aggregation
    async getSalesData(dateFrom, dateTo, groupBy) {
        // This would typically use the database optimization utilities
        // For now, returning mock data structure
        return {
            summary: {
                totalAmount: 150000,
                totalOrders: 45,
                averageOrderValue: 3333,
                growth: 12.5,
                topDay: '2024-01-15'
            },
            trends: [
                { date: '2024-01-01', amount: 5000, orders: 3 },
                { date: '2024-01-02', amount: 7500, orders: 5 }
                // ... more data points
            ],
            chartData: {
                daily: [],
                categories: [],
                paymentMethods: []
            }
        };
    }

    // Format utilities
    formatKeyName(key) {
        return key.replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase())
                  .trim();
    }

    formatValue(value) {
        if (typeof value === 'number') {
            if (value > 1000) {
                return `₹${value.toLocaleString('en-IN')}`;
            }
            return value;
        }
        return value;
    }

    generateFinancialRecommendations(financialData) {
        const recommendations = [];
        
        if (financialData.profitMargin < 0.15) {
            recommendations.push({
                type: 'warning',
                title: 'Low Profit Margin',
                message: 'Consider reviewing pricing strategy or reducing costs',
                impact: 'high'
            });
        }

        if (financialData.cashFlow < 0) {
            recommendations.push({
                type: 'critical',
                title: 'Negative Cash Flow',
                message: 'Immediate action required to improve cash position',
                impact: 'critical'
            });
        }

        return recommendations;
    }

    createDefaultTemplates() {
        // Create default templates if template files don't exist
        this.templates.set('sales', {
            title: 'Sales Report',
            sections: ['summary', 'trends', 'topItems', 'customers']
        });

        this.templates.set('financial', {
            title: 'Financial Report',
            sections: ['summary', 'profitLoss', 'cashFlow', 'recommendations']
        });
    }

    startReportProcessor() {
        // Background processor for queued reports
        setInterval(async () => {
            if (this.reportQueue.length === 0) return;

            const reportJob = this.reportQueue.shift();
            try {
                await this.processQueuedReport(reportJob);
            } catch (error) {
                console.error('Report processing failed:', error);
            }
        }, 5000); // Process every 5 seconds
    }

    async processQueuedReport(reportJob) {
        console.log(`🔄 Processing queued report: ${reportJob.id}`);
        // Implementation would process the report and send notification when ready
    }
}

// Export singleton instance
module.exports = new ReportingService();
