import { Inject, Injectable } from '@nestjs/common';
import { AppError } from 'src/share';
import {
  AttendanceStatus,
  FactoryProductionReport,
  GroupProductionReport,
  LineProductionReport,
  ProductionComparisonReport,
  ProductionIssue,
  ProductionIssueType,
  TeamProductionReport,
} from '../digital-form.model';
import { DIGITAL_FORM_REPOSITORY } from '../digital-form.di-token';
import {
  IDigitalFormRepository,
  IDigitalFormReportService,
} from '../digital-form.port';
import { BaseDigitalFormService } from './digital-form-base.service';

// Define type interfaces for common structures
interface OutputByBagItem {
  handBagId: string;
  handBagCode: string;
  handBagName: string;
  totalOutput: number;
  percentage: number;
}

interface OutputByProcessItem {
  processId: string;
  processCode: string;
  processName: string;
  totalOutput: number;
}

interface HourlyBreakdownItem {
  hour: string;
  totalOutput: number;
  averageOutput: number;
}

interface DailyBreakdownItem {
  date: string;
  totalOutput: number;
  averageQuality: number;
  attendanceRate: number;
}

interface ProductionIssueItem {
  issueType: ProductionIssueType;
  occurrences: number;
  totalImpact: number;
}

interface AttendanceStatsItem {
  present: number;
  absent: number;
  late: number;
  earlyLeave: number;
  leaveApproved: number;
  percentPresent: number;
}

interface LineBreakdownItem {
  lineId: string;
  lineName: string;
  lineCode: string;
  totalOutput: number;
  averageQuality: number;
  teamCount: number;
  workerCount: number;
  efficiency: number;
}

interface TeamBreakdownItem {
  teamId: string;
  teamName: string;
  teamCode: string;
  totalOutput: number;
  averageQuality: number;
  groupCount: number;
  workerCount: number;
  efficiency: number;
}

interface GroupBreakdownItem {
  groupId: string;
  groupName: string;
  groupCode: string;
  totalOutput: number;
  averageQuality: number;
  workerCount: number;
  efficiency: number;
}

interface WorkerBreakdownItem {
  userId: string;
  employeeId: string;
  fullName: string;
  totalOutput: number;
  averageQuality: number;
  attendanceRate: number;
  efficiency: number;
}

interface ComparisonDataItem {
  id: string;
  name: string;
  code: string;
  totalOutput: number;
  outputPerWorker: number;
  qualityScore: number;
  attendanceRate: number;
  issueRate: number;
  rank: number;
}

interface ComparisonByBagItem {
  handBagId: string;
  handBagCode: string;
  handBagName: string;
  dataPoints: {
    id: string;
    name: string;
    output: number;
    efficiency: number;
  }[];
}

interface ComparisonByProcessItem {
  processId: string;
  processCode: string;
  processName: string;
  dataPoints: {
    id: string;
    name: string;
    output: number;
    efficiency: number;
  }[];
}

interface TimeSeriesDataItem {
  date: string;
  dataPoints: {
    id: string;
    name: string;
    output: number;
  }[];
}

@Injectable()
export class DigitalFormReportService
  extends BaseDigitalFormService
  implements IDigitalFormReportService
{
  constructor(
    @Inject(DIGITAL_FORM_REPOSITORY)
    protected readonly digitalFormRepo: IDigitalFormRepository,
  ) {
    super(digitalFormRepo, DigitalFormReportService.name);
  }

  async getProductionReportByFactory(
    factoryId: string,
    dateFrom: string,
    dateTo: string,
    options: {
      includeLines?: boolean;
      includeTeams?: boolean;
      includeGroups?: boolean;
      groupByBag?: boolean;
      groupByProcess?: boolean;
    } = {},
  ): Promise<FactoryProductionReport> {
    try {
      // Default options
      const reportOptions = {
        includeLines: true,
        includeTeams: false,
        includeGroups: false,
        groupByBag: true,
        groupByProcess: true,
        ...options,
      };

      // 1. Get factory information
      const factoryInfo = await this.digitalFormRepo.getFactoryInfo(factoryId);
      if (!factoryInfo) {
        throw AppError.from(new Error(`Factory not found: ${factoryId}`), 404);
      }

      // 2. Get all lines in this factory
      const factoryLines =
        await this.digitalFormRepo.getFactoryLines(factoryId);

      // 3. Get all digital forms for this factory in the date range
      const forms = await this.digitalFormRepo.getFactoryForms(
        factoryId,
        new Date(dateFrom),
        new Date(dateTo),
      );

      // Initialize arrays with proper types
      const outputByBag: OutputByBagItem[] = [];
      const outputByProcess: OutputByProcessItem[] = [];
      const hourlyBreakdown: HourlyBreakdownItem[] = [];
      const dailyBreakdown: DailyBreakdownItem[] = [];
      const productionIssues: ProductionIssueItem[] = [];
      let lineBreakdown: LineBreakdownItem[] = [];

      // Initialize attendance stats
      const attendanceStats: AttendanceStatsItem = {
        present: 0,
        absent: 0,
        late: 0,
        earlyLeave: 0,
        leaveApproved: 0,
        percentPresent: 0,
      };

      if (forms.length === 0) {
        // Return empty report structure
        return {
          factoryId,
          factoryName: factoryInfo.name,
          factoryCode: factoryInfo.code,
          dateRange: { from: dateFrom, to: dateTo },
          totalForms: 0,
          totalEntries: 0,
          totalOutput: 0,
          averageQuality: 0,
          outputByBag,
          outputByProcess,
          attendanceStats,
          hourlyBreakdown,
          dailyBreakdown,
          productionIssues,
          lineBreakdown,
        };
      }

      // 4. Extract all form IDs
      const formIds = forms.map((form) => form.id);

      // 5. Get all entries for these forms
      const entries =
        await this.digitalFormRepo.getFormEntriesByFormIds(formIds);

      // 6. Calculate base statistics
      const totalEntries = entries.length;
      const totalOutput = entries.reduce(
        (sum, entry) => sum + entry.totalOutput,
        0,
      );

      // Add missing calculations
      const totalQualityPoints = entries.reduce(
        (sum, entry) => sum + (entry.qualityScore || 100),
        0,
      );
      const averageQuality =
        totalEntries > 0 ? Math.round(totalQualityPoints / totalEntries) : 0;

      // Calculate attendance stats
      entries.forEach((entry) => {
        switch (entry.attendanceStatus) {
          case AttendanceStatus.PRESENT:
            attendanceStats.present++;
            break;
          case AttendanceStatus.ABSENT:
            attendanceStats.absent++;
            break;
          case AttendanceStatus.LATE:
            attendanceStats.late++;
            break;
          case AttendanceStatus.EARLY_LEAVE:
            attendanceStats.earlyLeave++;
            break;
          case AttendanceStatus.LEAVE_APPROVED:
            attendanceStats.leaveApproved++;
            break;
        }
      });

      attendanceStats.percentPresent =
        totalEntries > 0
          ? Math.round((attendanceStats.present / totalEntries) * 100)
          : 0;

      // 7. Process line breakdown if requested
      if (reportOptions.includeLines) {
        lineBreakdown = await Promise.all(
          factoryLines.map(async (line) => {
            // Get forms for this line
            const lineForms = forms.filter((form) => form.lineId === line.id);
            const lineFormIds = lineForms.map((form) => form.id);

            // Get entries for this line
            const lineEntries = entries.filter((entry) =>
              lineFormIds.includes(entry.formId),
            );

            // Calculate line metrics
            const lineOutput = lineEntries.reduce(
              (sum, entry) => sum + entry.totalOutput,
              0,
            );

            const lineQualityPoints = lineEntries.reduce(
              (sum, entry) => sum + (entry.qualityScore || 100),
              0,
            );

            const lineQuality =
              lineEntries.length > 0
                ? Math.round(lineQualityPoints / lineEntries.length)
                : 0;

            // Get teams for this line
            const lineTeams = await this.digitalFormRepo.getLineTeams(line.id);

            // Get unique workers
            const uniqueWorkers = new Set(
              lineEntries.map((entry) => entry.userId),
            );

            // Calculate efficiency relative to factory average
            const factoryAvgPerWorker =
              totalEntries > 0 ? totalOutput / totalEntries : 0;

            const lineAvgPerWorker =
              lineEntries.length > 0 ? lineOutput / lineEntries.length : 0;

            const efficiency =
              factoryAvgPerWorker > 0
                ? Math.round((lineAvgPerWorker / factoryAvgPerWorker) * 100)
                : 0;

            return {
              lineId: line.id,
              lineName: line.name,
              lineCode: line.code,
              totalOutput: lineOutput,
              averageQuality: lineQuality,
              teamCount: lineTeams.length,
              workerCount: uniqueWorkers.size,
              efficiency,
            };
          }),
        );

        // Sort by total output
        lineBreakdown.sort((a, b) => b.totalOutput - a.totalOutput);
      }

      // 8. Construct and return the final report
      return {
        factoryId,
        factoryName: factoryInfo.name,
        factoryCode: factoryInfo.code,
        dateRange: { from: dateFrom, to: dateTo },
        totalForms: forms.length,
        totalEntries,
        totalOutput,
        averageQuality,
        outputByBag,
        outputByProcess,
        attendanceStats,
        hourlyBreakdown,
        dailyBreakdown,
        productionIssues,
        lineBreakdown,
      };
    } catch (error) {
      this.logger.error(
        `Error generating factory production report: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error generating production report: ${error.message}`),
        500,
      );
    }
  }

  async getProductionReportByLine(
    lineId: string,
    dateFrom: string,
    dateTo: string,
    options: {
      includeTeams?: boolean;
      includeGroups?: boolean;
      groupByBag?: boolean;
      groupByProcess?: boolean;
    } = {},
  ): Promise<LineProductionReport> {
    try {
      // Default options
      const reportOptions = {
        includeTeams: true,
        includeGroups: false,
        groupByBag: true,
        groupByProcess: true,
        ...options,
      };

      // 1. Get line information
      const lineInfo = await this.digitalFormRepo.getLineInfo(lineId);
      if (!lineInfo) {
        throw AppError.from(new Error(`Line not found: ${lineId}`), 404);
      }

      // 2. Get factory information
      const factoryInfo = await this.digitalFormRepo.getLineFactory(lineId);
      if (!factoryInfo) {
        throw AppError.from(
          new Error(`Factory not found for line: ${lineId}`),
          404,
        );
      }

      // 3. Get all digital forms for this line in the date range
      const forms = await this.digitalFormRepo.getLineForms(
        lineId,
        new Date(dateFrom),
        new Date(dateTo),
      );

      // Initialize arrays with proper types
      const outputByBag: OutputByBagItem[] = [];
      const outputByProcess: OutputByProcessItem[] = [];
      const hourlyBreakdown: HourlyBreakdownItem[] = [];
      const dailyBreakdown: DailyBreakdownItem[] = [];
      const productionIssues: ProductionIssueItem[] = [];
      let teamBreakdown: TeamBreakdownItem[] = [];

      // Initialize attendance stats
      const attendanceStats: AttendanceStatsItem = {
        present: 0,
        absent: 0,
        late: 0,
        earlyLeave: 0,
        leaveApproved: 0,
        percentPresent: 0,
      };

      if (forms.length === 0) {
        // Return empty report structure
        return {
          lineId,
          lineName: lineInfo.name,
          lineCode: lineInfo.code,
          factoryId: factoryInfo.id,
          factoryName: factoryInfo.name,
          factoryCode: factoryInfo.code,
          dateRange: { from: dateFrom, to: dateTo },
          totalForms: 0,
          totalEntries: 0,
          totalOutput: 0,
          averageQuality: 0,
          outputByBag,
          outputByProcess,
          attendanceStats,
          hourlyBreakdown,
          dailyBreakdown,
          productionIssues,
          teamBreakdown,
        };
      }

      // 4. Extract all form IDs
      const formIds = forms.map((form) => form.id);

      // 5. Get all entries for these forms
      const entries =
        await this.digitalFormRepo.getFormEntriesByFormIds(formIds);

      // 6. Calculate base statistics
      const totalEntries = entries.length;
      const totalOutput = entries.reduce(
        (sum, entry) => sum + entry.totalOutput,
        0,
      );

      // Calculate average quality
      const totalQualityPoints = entries.reduce(
        (sum, entry) => sum + (entry.qualityScore || 100),
        0,
      );
      const averageQuality =
        totalEntries > 0 ? Math.round(totalQualityPoints / totalEntries) : 0;

      // Calculate attendance stats
      entries.forEach((entry) => {
        switch (entry.attendanceStatus) {
          case AttendanceStatus.PRESENT:
            attendanceStats.present++;
            break;
          case AttendanceStatus.ABSENT:
            attendanceStats.absent++;
            break;
          case AttendanceStatus.LATE:
            attendanceStats.late++;
            break;
          case AttendanceStatus.EARLY_LEAVE:
            attendanceStats.earlyLeave++;
            break;
          case AttendanceStatus.LEAVE_APPROVED:
            attendanceStats.leaveApproved++;
            break;
        }
      });

      attendanceStats.percentPresent =
        totalEntries > 0
          ? Math.round((attendanceStats.present / totalEntries) * 100)
          : 0;

      // 7. Process team breakdown if requested
      if (reportOptions.includeTeams) {
        // Get all teams in the line
        const lineTeams = await this.digitalFormRepo.getLineTeams(lineId);

        teamBreakdown = await Promise.all(
          lineTeams.map(async (team) => {
            // Get team forms
            const teamForms = forms.filter((form) => form.teamId === team.id);
            const teamFormIds = teamForms.map((form) => form.id);

            // Get team entries
            const teamEntries = entries.filter((entry) =>
              teamFormIds.includes(entry.formId),
            );

            // Calculate team metrics
            const teamOutput = teamEntries.reduce(
              (sum, entry) => sum + entry.totalOutput,
              0,
            );

            const teamQualityPoints = teamEntries.reduce(
              (sum, entry) => sum + (entry.qualityScore || 100),
              0,
            );

            const teamQuality =
              teamEntries.length > 0
                ? Math.round(teamQualityPoints / teamEntries.length)
                : 0;

            // Get team groups
            const teamGroups = await this.digitalFormRepo.getTeamGroups(
              team.id,
            );

            // Get unique workers
            const uniqueWorkers = new Set(
              teamEntries.map((entry) => entry.userId),
            );

            // Calculate efficiency relative to line average
            const lineAvgPerWorker =
              totalEntries > 0 ? totalOutput / totalEntries : 0;

            const teamAvgPerWorker =
              teamEntries.length > 0 ? teamOutput / teamEntries.length : 0;

            const efficiency =
              lineAvgPerWorker > 0
                ? Math.round((teamAvgPerWorker / lineAvgPerWorker) * 100)
                : 0;

            return {
              teamId: team.id,
              teamName: team.name,
              teamCode: team.code,
              totalOutput: teamOutput,
              averageQuality: teamQuality,
              groupCount: teamGroups.length,
              workerCount: uniqueWorkers.size,
              efficiency,
            };
          }),
        );

        // Sort by total output
        teamBreakdown.sort((a, b) => b.totalOutput - a.totalOutput);
      }

      // 8. Construct and return the final report
      return {
        lineId,
        lineName: lineInfo.name,
        lineCode: lineInfo.code,
        factoryId: factoryInfo.id,
        factoryName: factoryInfo.name,
        factoryCode: factoryInfo.code,
        dateRange: { from: dateFrom, to: dateTo },
        totalForms: forms.length,
        totalEntries,
        totalOutput,
        averageQuality,
        outputByBag,
        outputByProcess,
        attendanceStats,
        hourlyBreakdown,
        dailyBreakdown,
        productionIssues,
        teamBreakdown,
      };
    } catch (error) {
      this.logger.error(
        `Error generating line production report: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error generating production report: ${error.message}`),
        500,
      );
    }
  }

  async getProductionReportByTeam(
    teamId: string,
    dateFrom: string,
    dateTo: string,
    options: {
      includeGroups?: boolean;
      includeWorkers?: boolean;
      groupByBag?: boolean;
      groupByProcess?: boolean;
    } = {},
  ): Promise<TeamProductionReport> {
    try {
      // Default options
      const reportOptions = {
        includeGroups: true,
        includeWorkers: false,
        groupByBag: true,
        groupByProcess: true,
        ...options,
      };

      // 1. Get team information
      const teamInfo = await this.digitalFormRepo.getTeamInfo(teamId);
      if (!teamInfo) {
        throw AppError.from(new Error(`Team not found: ${teamId}`), 404);
      }

      // 2. Get all digital forms for this team in the date range
      const forms = await this.digitalFormRepo.getTeamForms(
        teamId,
        new Date(dateFrom),
        new Date(dateTo),
      );

      // Initialize arrays with proper types
      const outputByBag: OutputByBagItem[] = [];
      const outputByProcess: OutputByProcessItem[] = [];
      const hourlyBreakdown: HourlyBreakdownItem[] = [];
      const dailyBreakdown: DailyBreakdownItem[] = [];
      const productionIssues: ProductionIssueItem[] = [];
      let groupBreakdown: GroupBreakdownItem[] = [];

      // Initialize attendance stats
      const attendanceStats: AttendanceStatsItem = {
        present: 0,
        absent: 0,
        late: 0,
        earlyLeave: 0,
        leaveApproved: 0,
        percentPresent: 0,
      };

      if (forms.length === 0) {
        // Return empty report structure
        return {
          teamId,
          teamName: teamInfo.name,
          teamCode: teamInfo.code,
          lineId: teamInfo.lineId,
          lineName: teamInfo.lineName,
          factoryId: '00000000-0000-0000-0000-000000000000',
          factoryName: 'Unknown Factory',
          factoryCode: 'UNKNOWN',
          dateRange: { from: dateFrom, to: dateTo },
          totalForms: 0,
          totalEntries: 0,
          totalOutput: 0,
          averageQuality: 0,
          outputByBag,
          outputByProcess,
          attendanceStats,
          hourlyBreakdown,
          dailyBreakdown,
          productionIssues,
          groupBreakdown,
        };
      }

      // 3. Extract all form IDs
      const formIds = forms.map((form) => form.id);

      // 4. Get all entries for these forms
      const entries =
        await this.digitalFormRepo.getFormEntriesByFormIds(formIds);

      // 5. Calculate base statistics
      const totalEntries = entries.length;
      const totalOutput = entries.reduce(
        (sum, entry) => sum + entry.totalOutput,
        0,
      );
      const totalQualityPoints = entries.reduce(
        (sum, entry) => sum + (entry.qualityScore || 100),
        0,
      );
      const averageQuality =
        totalEntries > 0 ? Math.round(totalQualityPoints / totalEntries) : 0;

      // 6. Group data for attendance stats
      entries.forEach((entry) => {
        switch (entry.attendanceStatus) {
          case AttendanceStatus.PRESENT:
            attendanceStats.present++;
            break;
          case AttendanceStatus.ABSENT:
            attendanceStats.absent++;
            break;
          case AttendanceStatus.LATE:
            attendanceStats.late++;
            break;
          case AttendanceStatus.EARLY_LEAVE:
            attendanceStats.earlyLeave++;
            break;
          case AttendanceStatus.LEAVE_APPROVED:
            attendanceStats.leaveApproved++;
            break;
        }
      });

      attendanceStats.percentPresent =
        totalEntries > 0
          ? Math.round((attendanceStats.present / totalEntries) * 100)
          : 0;

      // 7. Process output by bag
      if (reportOptions.groupByBag) {
        // Group entries by bag
        const bagGroups: Record<string, typeof entries> = this._groupBy(
          entries,
          'handBagId',
        );

        // Get bag details
        const bagIds = Object.keys(bagGroups);
        const bagDetails = await this.digitalFormRepo.getHandBagDetails(bagIds);

        for (const bagId of bagIds) {
          const bagEntries = bagGroups[bagId];
          const bagOutput = bagEntries.reduce(
            (sum, entry) => sum + entry.totalOutput,
            0,
          );
          const bagDetail = bagDetails.find((b) => b.id === bagId) || {
            code: 'Unknown',
            name: 'Unknown',
          };

          outputByBag.push({
            handBagId: bagId,
            handBagCode: bagDetail.code,
            handBagName: bagDetail.name,
            totalOutput: bagOutput,
            percentage:
              totalOutput > 0 ? Math.round((bagOutput / totalOutput) * 100) : 0,
          });
        }

        // Sort by total output
        outputByBag.sort((a, b) => b.totalOutput - a.totalOutput);
      }

      // 8. Process output by process
      if (reportOptions.groupByProcess) {
        // Group entries by process
        const processGroups: Record<string, typeof entries> = this._groupBy(
          entries,
          'processId',
        );

        // Get process details
        const processIds = Object.keys(processGroups);
        const processDetails =
          await this.digitalFormRepo.getBagProcessDetails(processIds);

        for (const processId of processIds) {
          const processEntries = processGroups[processId];
          const processOutput = processEntries.reduce(
            (sum, entry) => sum + entry.totalOutput,
            0,
          );
          const processDetail = processDetails.find(
            (p) => p.id === processId,
          ) || { code: 'Unknown', name: 'Unknown' };

          outputByProcess.push({
            processId,
            processCode: processDetail.code,
            processName: processDetail.name,
            totalOutput: processOutput,
          });
        }

        // Sort by total output
        outputByProcess.sort((a, b) => b.totalOutput - a.totalOutput);
      }

      // 9. Process hourly breakdown
      // First, determine all unique time intervals from entries
      const allHourlyData: Record<string, number> = entries.reduce(
        (all: Record<string, number>, entry) => {
          const hourlyData = entry.hourlyData || {};
          return { ...all, ...hourlyData };
        },
        {},
      );

      const timeIntervals = Object.keys(allHourlyData).sort();

      for (const hour of timeIntervals) {
        let totalForHour = 0;
        let workersForHour = 0;

        entries.forEach((entry) => {
          const hourData = (entry.hourlyData || {}) as Record<string, number>;
          if (hourData[hour] !== undefined) {
            totalForHour += hourData[hour];
            workersForHour++;
          }
        });

        hourlyBreakdown.push({
          hour,
          totalOutput: totalForHour,
          averageOutput:
            workersForHour > 0 ? Math.round(totalForHour / workersForHour) : 0,
        });
      }

      // 10. Process daily breakdown
      // Group forms by date
      const formsByDate = this._groupBy(
        forms,
        (form) => form.date.toISOString().split('T')[0],
      );

      for (const dateStr of Object.keys(formsByDate)) {
        const dateForms = formsByDate[dateStr];
        const dateFormIds = dateForms.map((form) => form.id);

        // Find entries for these forms
        const dateEntries = entries.filter((entry) =>
          dateFormIds.includes(entry.formId),
        );

        const dateOutput = dateEntries.reduce(
          (sum, entry) => sum + entry.totalOutput,
          0,
        );

        const dateQualityPoints = dateEntries.reduce(
          (sum, entry) => sum + (entry.qualityScore || 100),
          0,
        );

        const dateQuality =
          dateEntries.length > 0
            ? Math.round(dateQualityPoints / dateEntries.length)
            : 0;

        const presentCount = dateEntries.filter(
          (entry) => entry.attendanceStatus === AttendanceStatus.PRESENT,
        ).length;

        const attendanceRate =
          dateEntries.length > 0
            ? Math.round((presentCount / dateEntries.length) * 100)
            : 0;

        dailyBreakdown.push({
          date: dateStr,
          totalOutput: dateOutput,
          averageQuality: dateQuality,
          attendanceRate,
        });
      }

      // Sort daily breakdown by date
      dailyBreakdown.sort((a, b) => a.date.localeCompare(b.date));

      // 11. Process production issues
      const allIssues = entries.reduce((issues: ProductionIssue[], entry) => {
        const entryIssues = entry.issues || [];
        return [...issues, ...entryIssues];
      }, []);

      const issuesByType = this._groupBy(allIssues, 'type');

      for (const issueType of Object.keys(issuesByType)) {
        const issues = issuesByType[issueType];
        const totalImpact = issues.reduce(
          (sum, issue) => sum + (issue.impact || 0),
          0,
        );

        productionIssues.push({
          issueType: issueType as ProductionIssueType,
          occurrences: issues.length,
          totalImpact,
        });
      }

      // Sort issues by occurrences
      productionIssues.sort((a, b) => b.occurrences - a.occurrences);

      // 12. Process group breakdown if requested
      if (reportOptions.includeGroups) {
        // Get all groups in the team
        const teamGroups = await this.digitalFormRepo.getTeamGroups(teamId);

        groupBreakdown = await Promise.all(
          teamGroups.map(async (group) => {
            // Get entries for this group
            const groupEntries = await this.digitalFormRepo.getGroupEntries(
              group.id,
              formIds,
            );

            const groupOutput = groupEntries.reduce(
              (sum, entry) => sum + entry.totalOutput,
              0,
            );

            const groupQualityPoints = groupEntries.reduce(
              (sum, entry) => sum + (entry.qualityScore || 100),
              0,
            );

            const groupQuality =
              groupEntries.length > 0
                ? Math.round(groupQualityPoints / groupEntries.length)
                : 0;

            // Get worker count
            const uniqueWorkers = new Set(
              groupEntries.map((entry) => entry.userId),
            );

            // Calculate efficiency relative to team average
            const teamAvgPerWorker =
              totalEntries > 0 ? totalOutput / uniqueWorkers.size : 0;

            const groupAvgPerWorker =
              uniqueWorkers.size > 0 ? groupOutput / uniqueWorkers.size : 0;

            const efficiency =
              teamAvgPerWorker > 0
                ? Math.round((groupAvgPerWorker / teamAvgPerWorker) * 100)
                : 0;

            return {
              groupId: group.id,
              groupName: group.name,
              groupCode: group.code,
              totalOutput: groupOutput,
              averageQuality: groupQuality,
              workerCount: uniqueWorkers.size,
              efficiency,
            };
          }),
        );

        // Sort by total output
        groupBreakdown.sort((a, b) => b.totalOutput - a.totalOutput);
      }

      // 13. Construct and return the final report
      return {
        teamId,
        teamName: teamInfo.name,
        teamCode: teamInfo.code,
        lineId: teamInfo.lineId,
        lineName: teamInfo.lineName,
        factoryId: '00000000-0000-0000-0000-000000000000',
        factoryName: 'Unknown Factory',
        factoryCode: 'UNKNOWN',
        dateRange: { from: dateFrom, to: dateTo },
        totalForms: forms.length,
        totalEntries,
        totalOutput,
        averageQuality,
        outputByBag,
        outputByProcess,
        attendanceStats,
        hourlyBreakdown,
        dailyBreakdown,
        productionIssues,
        groupBreakdown,
      };
    } catch (error) {
      this.logger.error(
        `Error generating team production report: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error generating production report: ${error.message}`),
        500,
      );
    }
  }

  async getProductionReportByGroup(
    groupId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<GroupProductionReport> {
    try {
      // 1. Get group information
      const groupInfo = await this.digitalFormRepo.getGroupInfo(groupId);
      if (!groupInfo) {
        throw AppError.from(new Error(`Group not found: ${groupId}`), 404);
      }

      // 2. Get all digital forms for this group in the date range
      const forms = await this.digitalFormRepo.getGroupForms(
        groupId,
        new Date(dateFrom),
        new Date(dateTo),
      );

      // Initialize arrays with proper types
      const outputByBag: OutputByBagItem[] = [];
      const outputByProcess: OutputByProcessItem[] = [];
      const hourlyBreakdown: HourlyBreakdownItem[] = [];
      const dailyBreakdown: DailyBreakdownItem[] = [];
      const productionIssues: ProductionIssueItem[] = [];
      const workerBreakdown: WorkerBreakdownItem[] = [];

      // Initialize attendance stats
      const attendanceStats: AttendanceStatsItem = {
        present: 0,
        absent: 0,
        late: 0,
        earlyLeave: 0,
        leaveApproved: 0,
        percentPresent: 0,
      };

      if (forms.length === 0) {
        // Return empty report structure
        return {
          groupId,
          groupName: groupInfo.name,
          groupCode: groupInfo.code,
          teamId: groupInfo.teamId,
          teamName: groupInfo.teamName,
          lineId: groupInfo.lineId,
          lineName: groupInfo.lineName,
          factoryId: '00000000-0000-0000-0000-000000000000',
          factoryName: 'Unknown Factory',
          factoryCode: 'UNKNOWN',
          dateRange: { from: dateFrom, to: dateTo },
          totalForms: 0,
          totalEntries: 0,
          totalOutput: 0,
          averageQuality: 0,
          outputByBag,
          outputByProcess,
          attendanceStats,
          hourlyBreakdown,
          dailyBreakdown,
          productionIssues,
          workerBreakdown,
        };
      }

      // Implementation details for group report...
      // (Similar structure to team report but focuses on workers instead of groups)

      // Return a simplified response for brevity in this example
      return {
        groupId,
        groupName: groupInfo.name,
        groupCode: groupInfo.code,
        teamId: groupInfo.teamId,
        teamName: groupInfo.teamName,
        lineId: groupInfo.lineId,
        lineName: groupInfo.lineName,
        factoryId: '00000000-0000-0000-0000-000000000000',
        factoryName: 'Unknown Factory',
        factoryCode: 'UNKNOWN',
        dateRange: { from: dateFrom, to: dateTo },
        totalForms: forms.length,
        totalEntries: 0, // Calculate properly in actual implementation
        totalOutput: 0, // Calculate properly in actual implementation
        averageQuality: 0, // Calculate properly in actual implementation
        outputByBag,
        outputByProcess,
        attendanceStats,
        hourlyBreakdown,
        dailyBreakdown,
        productionIssues,
        workerBreakdown,
      };
    } catch (error) {
      this.logger.error(
        `Error generating group production report: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error generating production report: ${error.message}`),
        500,
      );
    }
  }

  async getProductionComparisonReport(
    lineId: string,
    entityIds: string[], // Team or group IDs
    compareBy: 'team' | 'group',
    dateFrom: string,
    dateTo: string,
  ): Promise<ProductionComparisonReport> {
    try {
      // 1. Get line information
      const lineInfo = await this.digitalFormRepo.getLineInfo(lineId);
      if (!lineInfo) {
        throw AppError.from(new Error(`Line not found: ${lineId}`), 404);
      }

      // Initialize arrays with proper types
      const comparisonData: ComparisonDataItem[] = [];
      const comparisonByBag: ComparisonByBagItem[] = [];
      const comparisonByProcess: ComparisonByProcessItem[] = [];
      const timeSeriesData: TimeSeriesDataItem[] = [];

      // Implementation details for comparison report...
      // (This would involve fetching and comparing data from multiple teams or groups)

      // Return a simplified response for brevity in this example
      return {
        dateRange: { from: dateFrom, to: dateTo },
        factoryId: '00000000-0000-0000-0000-000000000000',
        factoryName: 'Unknown Factory',
        factoryCode: 'UNKNOWN',
        lineId,
        lineName: lineInfo.name,
        lineCode: lineInfo.code,
        comparisonType: compareBy,
        comparisonData,
        comparisonByBag,
        comparisonByProcess,
        timeSeriesData,
      };
    } catch (error) {
      this.logger.error(
        `Error generating comparison report: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error generating comparison report: ${error.message}`),
        500,
      );
    }
  }
}
