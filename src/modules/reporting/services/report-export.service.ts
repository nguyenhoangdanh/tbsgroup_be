import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import {
  ComparisonStats,
  FactoryStats,
  GroupStats,
  LineStats,
  TeamStats,
} from './production-report.service';

@Injectable()
export class ReportExportService {
  private readonly logger = new Logger(ReportExportService.name);
  private readonly EXPORT_DIR = 'public/exports';

  constructor() {
    try {
      // Ensure public directory exists first
      const publicDir = path.join(process.cwd(), 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      
      // Then create exports directory
      const exportsDir = path.join(publicDir, 'exports');
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }
    } catch (error) {
      console.warn('Could not create directories:', error);
      // Continue without throwing error for serverless environments
    }
  }

  /**
   * Export a standard production report
   * @param reportType Type of report (factory, line, team, group)
   * @param reportData Report data to export
   * @param metadata Report metadata (entity name, dates, etc.)
   * @param format Export format (excel, pdf, csv)
   * @returns URL path to the exported file
   */
  async exportReport(
    reportType: 'factory' | 'line' | 'team' | 'group',
    reportData: FactoryStats | LineStats | TeamStats | GroupStats,
    metadata: {
      entityName: string;
      entityCode: string;
      startDate: Date;
      endDate: Date;
    },
    format: 'excel' | 'pdf' | 'csv',
  ): Promise<string> {
    const { entityName, entityCode, startDate, endDate } = metadata;

    try {
      // Generate a unique filename
      const timestamp = new Date().getTime();
      const filename = `${reportType}_${entityCode}_${timestamp}.${this.getFileExtension(format)}`;
      const filePath = path.join(this.EXPORT_DIR, filename);

      switch (format) {
        case 'excel':
          await this.exportToExcel(reportType, reportData, metadata, filePath);
          break;
        case 'pdf':
          await this.exportToPdf(reportType, reportData, metadata, filePath);
          break;
        case 'csv':
          await this.exportToCsv(reportType, reportData, metadata, filePath);
          break;
      }

      // Return the URL path to the file
      return `/exports/${filename}`;
    } catch (error) {
      this.logger.error(
        `Failed to export ${reportType} report: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to export report: ${error.message}`);
    }
  }

  /**
   * Export a comparison report
   * @param reportData Comparison data to export
   * @param metadata Report metadata
   * @param format Export format
   * @returns URL path to the exported file
   */
  async exportComparisonReport(
    reportData: ComparisonStats,
    metadata: {
      startDate: Date;
      endDate: Date;
    },
    format: 'excel' | 'pdf' | 'csv',
  ): Promise<string> {
    try {
      // Generate a unique filename
      const timestamp = new Date().getTime();
      const filename = `comparison_${reportData.entityType}_${timestamp}.${this.getFileExtension(format)}`;
      const filePath = path.join(this.EXPORT_DIR, filename);

      switch (format) {
        case 'excel':
          await this.exportComparisonToExcel(reportData, metadata, filePath);
          break;
        case 'pdf':
          await this.exportComparisonToPdf(reportData, metadata, filePath);
          break;
        case 'csv':
          await this.exportComparisonToCsv(reportData, metadata, filePath);
          break;
      }

      // Return the URL path to the file
      return `/exports/${filename}`;
    } catch (error) {
      this.logger.error(
        `Failed to export comparison report: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to export comparison report: ${error.message}`);
    }
  }

  /**
   * Get the appropriate file extension for the export format
   */
  private getFileExtension(format: 'excel' | 'pdf' | 'csv'): string {
    switch (format) {
      case 'excel':
        return 'xlsx';
      case 'pdf':
        return 'pdf';
      case 'csv':
        return 'csv';
    }
  }

  /**
   * Export report to Excel format
   */
  private async exportToExcel(
    reportType: 'factory' | 'line' | 'team' | 'group',
    reportData: FactoryStats | LineStats | TeamStats | GroupStats,
    metadata: {
      entityName: string;
      entityCode: string;
      startDate: Date;
      endDate: Date;
    },
    filePath: string,
  ): Promise<void> {
    const { entityName, startDate, endDate } = metadata;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Production Reporting System';
    workbook.created = new Date();

    // Create summary worksheet
    const summarySheet = workbook.addWorksheet('Summary');

    // Add report title
    summarySheet.mergeCells('A1:E1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = `${this.capitalizeFirst(reportType)} Production Report: ${entityName}`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Add date range
    summarySheet.mergeCells('A2:E2');
    const dateCell = summarySheet.getCell('A2');
    dateCell.value = `Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
    dateCell.font = { size: 12 };
    dateCell.alignment = { horizontal: 'center' };

    // Add empty row
    summarySheet.addRow([]);

    // Add summary data
    summarySheet.addRow(['Summary Statistics']);
    summarySheet.getRow(4).font = { bold: true };

    summarySheet.addRow(['Total Forms', reportData.summary.totalForms]);
    summarySheet.addRow(['Total Entries', reportData.summary.totalEntries]);
    summarySheet.addRow(['Total Output', reportData.summary.totalOutput]);
    summarySheet.addRow(['Total Planned', reportData.summary.totalPlanned]);
    summarySheet.addRow(['Efficiency', `${reportData.summary.efficiency}%`]);

    // Add breakdown data based on report type
    if (reportType === 'factory') {
      const factoryData = reportData as FactoryStats;
      if (factoryData.byLine && factoryData.byLine.length > 0) {
        this.addBreakdownSheet(workbook, 'Lines', factoryData.byLine);
      }
    } else if (reportType === 'line') {
      const lineData = reportData as LineStats;
      if (lineData.byTeam && lineData.byTeam.length > 0) {
        this.addBreakdownSheet(workbook, 'Teams', lineData.byTeam);
      }
    } else if (reportType === 'team') {
      const teamData = reportData as TeamStats;
      if (teamData.byGroup && teamData.byGroup.length > 0) {
        this.addBreakdownSheet(workbook, 'Groups', teamData.byGroup);
      }
    } else if (reportType === 'group') {
      const groupData = reportData as GroupStats;
      if (groupData.workers && groupData.workers.length > 0) {
        // Add workers sheet
        const workersSheet = workbook.addWorksheet('Workers');

        // Add headers
        workersSheet.addRow([
          'Name',
          'Employee ID',
          'Output',
          'Planned',
          'Efficiency',
        ]);
        workersSheet.getRow(1).font = { bold: true };

        // Add worker data
        groupData.workers.forEach((worker) => {
          workersSheet.addRow([
            worker.name,
            worker.employeeId,
            worker.output,
            worker.planned,
            `${worker.efficiency}%`,
          ]);
        });

        // Format columns
        workersSheet.columns.forEach((column) => {
          column.width = 20;
        });
      }
    }

    // Add handbag breakdown if available
    if (
      'byHandBag' in reportData &&
      reportData.byHandBag &&
      reportData.byHandBag.length > 0
    ) {
      const handBagSheet = workbook.addWorksheet('HandBags');

      // Add headers
      handBagSheet.addRow(['Code', 'Name', 'Output', 'Planned', 'Efficiency']);
      handBagSheet.getRow(1).font = { bold: true };

      // Add handbag data
      reportData.byHandBag.forEach((handbag) => {
        handBagSheet.addRow([
          handbag.code,
          handbag.name,
          handbag.output,
          handbag.planned,
          handbag.planned > 0
            ? `${Math.round((handbag.output / handbag.planned) * 100)}%`
            : 'N/A',
        ]);
      });

      // Format columns
      handBagSheet.columns.forEach((column) => {
        column.width = 20;
      });
    }

    // Add daily breakdown if available
    if (
      'dailyBreakdown' in reportData &&
      reportData.dailyBreakdown &&
      reportData.dailyBreakdown.length > 0
    ) {
      const dailySheet = workbook.addWorksheet('Daily Breakdown');

      // Add headers
      dailySheet.addRow(['Date', 'Output', 'Planned', 'Efficiency']);
      dailySheet.getRow(1).font = { bold: true };

      // Add daily data
      reportData.dailyBreakdown.forEach((day) => {
        dailySheet.addRow([
          day.date,
          day.totalOutput,
          day.plannedOutput || 'N/A',
          day.efficiency ? `${day.efficiency}%` : 'N/A',
        ]);
      });

      // Format columns
      dailySheet.columns.forEach((column) => {
        column.width = 15;
      });
    }

    // Save the workbook
    await workbook.xlsx.writeFile(filePath);
  }

  /**
   * Helper method to add a breakdown sheet to the Excel workbook
   */
  private addBreakdownSheet(
    workbook: ExcelJS.Workbook,
    title: string,
    data: any[],
  ): void {
    const sheet = workbook.addWorksheet(title);

    // Add headers
    sheet.addRow(['Code', 'Name', 'Output', 'Planned', 'Efficiency']);
    sheet.getRow(1).font = { bold: true };

    // Add data
    data.forEach((item) => {
      sheet.addRow([
        item.code,
        item.name,
        item.output,
        item.planned,
        `${item.efficiency}%`,
      ]);
    });

    // Format columns
    sheet.columns.forEach((column) => {
      column.width = 20;
    });
  }

  /**
   * Export report to PDF format
   */
  private async exportToPdf(
    reportType: 'factory' | 'line' | 'team' | 'group',
    reportData: FactoryStats | LineStats | TeamStats | GroupStats,
    metadata: {
      entityName: string;
      entityCode: string;
      startDate: Date;
      endDate: Date;
    },
    filePath: string,
  ): Promise<void> {
    const { entityName, startDate, endDate } = metadata;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);

        stream.on('finish', () => {
          resolve();
        });

        doc.pipe(stream);

        // Add title
        doc
          .fontSize(20)
          .text(
            `${this.capitalizeFirst(reportType)} Production Report: ${entityName}`,
            {
              align: 'center',
            },
          );

        // Add date range
        doc
          .moveDown()
          .fontSize(12)
          .text(
            `Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
            {
              align: 'center',
            },
          );

        doc.moveDown().moveDown();

        // Add summary data
        doc.fontSize(16).text('Summary Statistics').moveDown();

        doc.fontSize(12);
        doc.text(`Total Forms: ${reportData.summary.totalForms}`);
        doc.text(`Total Entries: ${reportData.summary.totalEntries}`);
        doc.text(`Total Output: ${reportData.summary.totalOutput}`);
        doc.text(`Total Planned: ${reportData.summary.totalPlanned}`);
        doc.text(`Efficiency: ${reportData.summary.efficiency}%`);

        doc.moveDown().moveDown();

        // Add breakdown based on report type
        if (reportType === 'factory') {
          const factoryData = reportData as FactoryStats;
          if (factoryData.byLine && factoryData.byLine.length > 0) {
            doc.fontSize(16).text('Line Breakdown').moveDown();

            doc.fontSize(12);
            this.addTableToPdf(
              doc,
              ['Code', 'Name', 'Output', 'Planned', 'Efficiency'],
              factoryData.byLine.map((line) => [
                line.code,
                line.name,
                line.output.toString(),
                line.planned.toString(),
                `${line.efficiency}%`,
              ]),
            );
          }
        } else if (reportType === 'line') {
          const lineData = reportData as LineStats;
          if (lineData.byTeam && lineData.byTeam.length > 0) {
            doc.fontSize(16).text('Team Breakdown').moveDown();

            doc.fontSize(12);
            this.addTableToPdf(
              doc,
              ['Code', 'Name', 'Output', 'Planned', 'Efficiency'],
              lineData.byTeam.map((team) => [
                team.code,
                team.name,
                team.output.toString(),
                team.planned.toString(),
                `${team.efficiency}%`,
              ]),
            );
          }
        }

        // Finalize the PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Helper method to add a simple table to PDF
   */
  private addTableToPdf(
    doc: PDFKit.PDFDocument,
    headers: string[],
    data: string[][],
  ): void {
    const tableTop = doc.y;
    const colWidth = 100;
    // rowHeight is unused, removing it

    // Draw headers
    doc.font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(header, tableTop + i * colWidth, doc.y, {
        width: colWidth,
        align: 'left',
      });
    });

    doc.moveDown();
    doc.font('Helvetica');

    // Draw rows
    data.forEach((row) => {
      // rowTop is unused, removing it
      row.forEach((cell, i) => {
        doc.text(cell, tableTop + i * colWidth, doc.y, {
          width: colWidth,
          align: 'left',
        });
      });

      doc.moveDown();
    });
  }

  /**
   * Export report to CSV format
   */
  private async exportToCsv(
    reportType: 'factory' | 'line' | 'team' | 'group',
    reportData: FactoryStats | LineStats | TeamStats | GroupStats,
    metadata: {
      entityName: string;
      entityCode: string;
      startDate: Date;
      endDate: Date;
    },
    filePath: string,
  ): Promise<void> {
    const { entityName, startDate, endDate } = metadata;

    // Prepare data for CSV export
    const csvData = [];

    // Add header information
    csvData.push({
      Info: `${this.capitalizeFirst(reportType)} Production Report`,
      Value: entityName,
    });

    csvData.push({
      Info: 'Period',
      Value: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
    });

    csvData.push({ Info: '', Value: '' }); // Empty row

    // Add summary data
    csvData.push({ Info: 'Summary Statistics', Value: '' });
    csvData.push({ Info: 'Total Forms', Value: reportData.summary.totalForms });
    csvData.push({
      Info: 'Total Entries',
      Value: reportData.summary.totalEntries,
    });
    csvData.push({
      Info: 'Total Output',
      Value: reportData.summary.totalOutput,
    });
    csvData.push({
      Info: 'Total Planned',
      Value: reportData.summary.totalPlanned,
    });
    csvData.push({
      Info: 'Efficiency',
      Value: `${reportData.summary.efficiency}%`,
    });

    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'Info', title: 'Info' },
        { id: 'Value', title: 'Value' },
      ],
    });

    await csvWriter.writeRecords(csvData);

    // Add second section with breakdown data based on report type
    let breakdownData = [];
    let breakdownHeaders = [];

    if (reportType === 'factory') {
      const factoryData = reportData as FactoryStats;
      if (factoryData.byLine && factoryData.byLine.length > 0) {
        breakdownHeaders = [
          { id: 'code', title: 'Code' },
          { id: 'name', title: 'Name' },
          { id: 'output', title: 'Output' },
          { id: 'planned', title: 'Planned' },
          { id: 'efficiency', title: 'Efficiency' },
        ];

        breakdownData = factoryData.byLine.map((line) => ({
          code: line.code,
          name: line.name,
          output: line.output,
          planned: line.planned,
          efficiency: `${line.efficiency}%`,
        }));

        // Write breakdown data to a separate CSV file
        const breakdownFilePath = filePath.replace('.csv', '_lines.csv');
        const breakdownCsvWriter = createObjectCsvWriter({
          path: breakdownFilePath,
          header: breakdownHeaders,
        });

        await breakdownCsvWriter.writeRecords(breakdownData);
      }
    } else if (reportType === 'line') {
      // Similar implementation for line reports
    }
  }

  /**
   * Export comparison report to Excel
   */
  private async exportComparisonToExcel(
    reportData: ComparisonStats,
    metadata: {
      startDate: Date;
      endDate: Date;
    },
    filePath: string,
  ): Promise<void> {
    const { startDate, endDate } = metadata;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Production Reporting System';
    workbook.created = new Date();

    // Create summary worksheet
    const summarySheet = workbook.addWorksheet('Summary');

    // Add report title
    summarySheet.mergeCells('A1:E1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = `${this.capitalizeFirst(reportData.entityType)} Comparison Report`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Add date range
    summarySheet.mergeCells('A2:E2');
    const dateCell = summarySheet.getCell('A2');
    dateCell.value = `Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
    dateCell.font = { size: 12 };
    dateCell.alignment = { horizontal: 'center' };

    // Add empty row
    summarySheet.addRow([]);

    // Add summary data
    summarySheet.addRow(['Summary Comparison']);
    summarySheet.getRow(4).font = { bold: true };

    // Add headers for summary table
    summarySheet.addRow([
      'Name',
      'Code',
      'Output',
      'Planned',
      'Efficiency',
      'Workers',
      'Forms',
    ]);

    // Add data rows
    reportData.summary.forEach((entity) => {
      summarySheet.addRow([
        entity.name,
        entity.code,
        entity.totalOutput,
        entity.totalPlanned,
        `${entity.efficiency}%`,
        entity.workers,
        entity.forms,
      ]);
    });

    // Format the table
    const headerRow = summarySheet.getRow(5);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center' };

    summarySheet.columns.forEach((column) => {
      column.width = 15;
    });

    // Add daily comparison sheet if data exists
    if (reportData.dailyComparison && reportData.dailyComparison.length > 0) {
      const dailySheet = workbook.addWorksheet('Daily Comparison');

      // Create headers array with Date and then each entity
      const dailyHeaders = ['Date'];
      reportData.entities.forEach((entity) => {
        dailyHeaders.push(`${entity.name} Output`);
        dailyHeaders.push(`${entity.name} Efficiency`);
      });

      dailySheet.addRow(dailyHeaders);
      dailySheet.getRow(1).font = { bold: true };

      // Add data rows
      reportData.dailyComparison.forEach((day) => {
        const rowData = [day.date];

        reportData.entities.forEach((entity) => {
          const entityData = day.entities[entity.id] || {
            output: 0,
            efficiency: 0,
          };
          // Convert number to string to fix the type error
          rowData.push(entityData.output.toString());
          rowData.push(`${Math.round(entityData.efficiency)}%`);
        });

        dailySheet.addRow(rowData);
      });

      // Format columns
      dailySheet.columns.forEach((column) => {
        column.width = 15;
      });
    }

    // Save the workbook
    await workbook.xlsx.writeFile(filePath);
  }

  /**
   * Export comparison report to PDF
   */
  private async exportComparisonToPdf(
    reportData: ComparisonStats,
    metadata: {
      startDate: Date;
      endDate: Date;
    },
    filePath: string,
  ): Promise<void> {
    const { startDate, endDate } = metadata;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);

        stream.on('finish', () => {
          resolve();
        });

        doc.pipe(stream);

        // Add title
        doc
          .fontSize(20)
          .text(
            `${this.capitalizeFirst(reportData.entityType)} Comparison Report`,
            {
              align: 'center',
            },
          );

        // Add date range
        doc
          .moveDown()
          .fontSize(12)
          .text(
            `Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
            {
              align: 'center',
            },
          );

        doc.moveDown().moveDown();

        // Add summary table
        doc.fontSize(16).text('Summary Comparison').moveDown();

        // Add summary table
        const headers = ['Name', 'Output', 'Efficiency'];
        const data = reportData.summary.map((entity) => [
          entity.name,
          entity.totalOutput.toString(),
          `${entity.efficiency}%`,
        ]);

        this.addTableToPdf(doc, headers, data);

        // Finalize the PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Export comparison report to CSV
   */
  private async exportComparisonToCsv(
    reportData: ComparisonStats,
    metadata: {
      startDate: Date;
      endDate: Date;
    },
    filePath: string,
  ): Promise<void> {
    // Not using startDate and endDate, removing them

    // Create CSV writer for summary
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'name', title: 'Name' },
        { id: 'code', title: 'Code' },
        { id: 'output', title: 'Output' },
        { id: 'planned', title: 'Planned' },
        { id: 'efficiency', title: 'Efficiency' },
        { id: 'workers', title: 'Workers' },
        { id: 'forms', title: 'Forms' },
      ],
    });

    // Map data for CSV
    const csvData = reportData.summary.map((entity) => ({
      name: entity.name,
      code: entity.code,
      output: entity.totalOutput,
      planned: entity.totalPlanned,
      efficiency: `${entity.efficiency}%`,
      workers: entity.workers,
      forms: entity.forms,
    }));

    await csvWriter.writeRecords(csvData);
  }

  /**
   * Helper function to capitalize the first letter of a string
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
