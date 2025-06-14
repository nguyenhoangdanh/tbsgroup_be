import { Inject, Injectable } from '@nestjs/common';
import { AppError } from 'src/share';
import {
  AttendanceStatus,
  DigitalForm,
  DigitalFormEntry,
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
      let outputByBag: OutputByBagItem[] = [];
      let outputByProcess: OutputByProcessItem[] = [];
      let hourlyBreakdown: HourlyBreakdownItem[] = [];
      let dailyBreakdown: DailyBreakdownItem[] = [];
      let productionIssues: ProductionIssueItem[] = [];
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

      // Calculate average quality
      const totalQualityPoints = entries.reduce(
        (sum, entry) => sum + (entry.qualityScore || 100),
        0,
      );
      const averageQuality =
        totalEntries > 0 ? Math.round(totalQualityPoints / totalEntries) : 0;

      // 7. Calculate attendance stats
      attendanceStats.present = entries.filter(
        (entry) => entry.attendanceStatus === AttendanceStatus.PRESENT,
      ).length;

      attendanceStats.absent = entries.filter(
        (entry) => entry.attendanceStatus === AttendanceStatus.ABSENT,
      ).length;

      attendanceStats.late = entries.filter(
        (entry) => entry.attendanceStatus === AttendanceStatus.LATE,
      ).length;

      attendanceStats.earlyLeave = entries.filter(
        (entry) => entry.attendanceStatus === AttendanceStatus.EARLY_LEAVE,
      ).length;

      attendanceStats.leaveApproved = entries.filter(
        (entry) => entry.attendanceStatus === AttendanceStatus.LEAVE_APPROVED,
      ).length;

      attendanceStats.percentPresent =
        totalEntries > 0
          ? Math.round((attendanceStats.present / totalEntries) * 100)
          : 0;

      // 8. Calculate hourly breakdown
      hourlyBreakdown = this.calculateHourlyBreakdown(entries);

      // 9. Calculate daily breakdown
      dailyBreakdown = this.calculateDailyBreakdown(forms, entries);

      // 10. Calculate output by bag if requested
      if (reportOptions.groupByBag) {
        outputByBag = await this.calculateOutputByBag(
          entries,
          this.digitalFormRepo,
          totalOutput,
        );
      }

      // 11. Calculate output by process if requested
      if (reportOptions.groupByProcess) {
        outputByProcess = await this.calculateOutputByProcess(
          entries,
          this.digitalFormRepo,
        );
      }

      // 12. Calculate production issues
      productionIssues = this.calculateProductionIssues(entries);

      // 13. Process line breakdown if requested
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

      // 14. Construct and return the final report
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
      let outputByBag: OutputByBagItem[] = [];
      let outputByProcess: OutputByProcessItem[] = [];
      let hourlyBreakdown: HourlyBreakdownItem[] = [];
      let dailyBreakdown: DailyBreakdownItem[] = [];
      let productionIssues: ProductionIssueItem[] = [];
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

      // 7. Calculate attendance stats
      attendanceStats.present = entries.filter(
        (entry) => entry.attendanceStatus === AttendanceStatus.PRESENT,
      ).length;

      attendanceStats.absent = entries.filter(
        (entry) => entry.attendanceStatus === AttendanceStatus.ABSENT,
      ).length;

      attendanceStats.late = entries.filter(
        (entry) => entry.attendanceStatus === AttendanceStatus.LATE,
      ).length;

      attendanceStats.earlyLeave = entries.filter(
        (entry) => entry.attendanceStatus === AttendanceStatus.EARLY_LEAVE,
      ).length;

      attendanceStats.leaveApproved = entries.filter(
        (entry) => entry.attendanceStatus === AttendanceStatus.LEAVE_APPROVED,
      ).length;

      attendanceStats.percentPresent =
        totalEntries > 0
          ? Math.round((attendanceStats.present / totalEntries) * 100)
          : 0;

      // 8. Calculate hourly breakdown
      hourlyBreakdown = this.calculateHourlyBreakdown(entries);

      // 9. Calculate daily breakdown
      dailyBreakdown = this.calculateDailyBreakdown(forms, entries);

      // 10. Calculate output by bag if requested
      if (reportOptions.groupByBag) {
        outputByBag = await this.calculateOutputByBag(
          entries,
          this.digitalFormRepo,
          totalOutput,
        );
      }

      // 11. Calculate output by process if requested
      if (reportOptions.groupByProcess) {
        outputByProcess = await this.calculateOutputByProcess(
          entries,
          this.digitalFormRepo,
        );
      }

      // 12. Calculate production issues
      productionIssues = this.calculateProductionIssues(entries);

      // 13. Process team breakdown if requested
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
              totalOutput > 0 ? totalOutput / totalEntries : 0;

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

      // 14. Construct and return the final report
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
      let outputByBag: OutputByBagItem[] = [];
      let outputByProcess: OutputByProcessItem[] = [];
      let hourlyBreakdown: HourlyBreakdownItem[] = [];
      let dailyBreakdown: DailyBreakdownItem[] = [];
      let productionIssues: ProductionIssueItem[] = [];
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
          factoryId: '00000000-0000-0000-0000-000000000000', // This should be fetched if possible
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

      // Calculate average quality
      const totalQualityPoints = entries.reduce(
        (sum, entry) => sum + (entry.qualityScore || 100),
        0,
      );
      const averageQuality =
        totalEntries > 0 ? Math.round(totalQualityPoints / totalEntries) : 0;

      // 6. Calculate attendance stats
      attendanceStats.present = entries.filter(
        (entry) => entry.attendanceStatus === AttendanceStatus.PRESENT,
      ).length;

      attendanceStats.absent = entries.filter(
        (entry) => entry.attendanceStatus === AttendanceStatus.ABSENT,
      ).length;

      attendanceStats.late = entries.filter(
        (entry) => entry.attendanceStatus === AttendanceStatus.LATE,
      ).length;

      attendanceStats.earlyLeave = entries.filter(
        (entry) => entry.attendanceStatus === AttendanceStatus.EARLY_LEAVE,
      ).length;

      attendanceStats.leaveApproved = entries.filter(
        (entry) => entry.attendanceStatus === AttendanceStatus.LEAVE_APPROVED,
      ).length;

      attendanceStats.percentPresent =
        totalEntries > 0
          ? Math.round((attendanceStats.present / totalEntries) * 100)
          : 0;

      // 7. Calculate hourly breakdown
      hourlyBreakdown = this.calculateHourlyBreakdown(entries);

      // 8. Calculate daily breakdown
      dailyBreakdown = this.calculateDailyBreakdown(forms, entries);

      // 9. Calculate output by bag if requested
      if (reportOptions.groupByBag) {
        outputByBag = await this.calculateOutputByBag(
          entries,
          this.digitalFormRepo,
          totalOutput,
        );
      }

      // 10. Calculate output by process if requested
      if (reportOptions.groupByProcess) {
        outputByProcess = await this.calculateOutputByProcess(
          entries,
          this.digitalFormRepo,
        );
      }

      // 11. Calculate production issues
      productionIssues = this.calculateProductionIssues(entries);

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
              totalEntries > 0 ? totalOutput / totalEntries : 0;

            const groupAvgPerWorker =
              groupEntries.length > 0 ? groupOutput / groupEntries.length : 0;

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
              efficiency: 0,
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
        factoryId: '00000000-0000-0000-0000-000000000000', // This should be fetched if possible
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
    options: {
      includeWorkers?: boolean;
      detailedAttendance?: boolean;
      groupByBag?: boolean;
      groupByProcess?: boolean;
    } = {},
  ): Promise<GroupProductionReport> {
    try {
      // Default options
      const reportOptions = {
        includeWorkers: true,
        detailedAttendance: false,
        groupByBag: true,
        groupByProcess: true,
        ...options,
      };

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
      let outputByBag: OutputByBagItem[] = [];
      let outputByProcess: OutputByProcessItem[] = [];
      let hourlyBreakdown: HourlyBreakdownItem[] = [];
      let dailyBreakdown: DailyBreakdownItem[] = [];
      let productionIssues: ProductionIssueItem[] = [];
      let workerBreakdown: WorkerBreakdownItem[] = [];

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
          factoryId: groupInfo.factoryId,
          factoryName: groupInfo.factoryName,
          factoryCode: 'UNKNOWN', // This should be fetched if possible
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

      // 6. Calculate attendance stats
      attendanceStats.present = entries.filter(
        (entry) => entry.attendanceStatus === AttendanceStatus.PRESENT,
      ).length;

      attendanceStats.absent = entries.filter(
        (entry) => entry.attendanceStatus === AttendanceStatus.ABSENT,
      ).length;

      attendanceStats.late = entries.filter(
        (entry) => entry.attendanceStatus === AttendanceStatus.LATE,
      ).length;

      attendanceStats.earlyLeave = entries.filter(
        (entry) => entry.attendanceStatus === AttendanceStatus.EARLY_LEAVE,
      ).length;

      attendanceStats.leaveApproved = entries.filter(
        (entry) => entry.attendanceStatus === AttendanceStatus.LEAVE_APPROVED,
      ).length;

      attendanceStats.percentPresent =
        totalEntries > 0
          ? Math.round((attendanceStats.present / totalEntries) * 100)
          : 0;

      // 7. Calculate hourly breakdown
      hourlyBreakdown = this.calculateHourlyBreakdown(entries);

      // 8. Calculate daily breakdown
      dailyBreakdown = this.calculateDailyBreakdown(forms, entries);

      // 9. Calculate output by bag if requested
      if (reportOptions.groupByBag) {
        outputByBag = await this.calculateOutputByBag(
          entries,
          this.digitalFormRepo,
          totalOutput,
        );
      }

      // 10. Calculate output by process if requested
      if (reportOptions.groupByProcess) {
        outputByProcess = await this.calculateOutputByProcess(
          entries,
          this.digitalFormRepo,
        );
      }

      // 11. Calculate production issues
      productionIssues = this.calculateProductionIssues(entries);

      // 12. Process worker breakdown if requested
      if (reportOptions.includeWorkers) {
        // Get all workers in the group
        const groupWorkers =
          await this.digitalFormRepo.getGroupWorkers(groupId);

        // Collect all form dates for attendance calculation
        const formDates = new Set(
          forms.map((form) => form.date.toISOString().split('T')[0]),
        );

        // Calculate group average output per day for efficiency comparison
        const groupAvgOutputPerDay =
          totalEntries > 0 && groupWorkers.length > 0
            ? totalOutput / (totalEntries / groupWorkers.length)
            : 0;

        workerBreakdown = await Promise.all(
          groupWorkers.map(async (worker) => {
            // Get entries for this worker
            const workerEntries = await this.digitalFormRepo.getWorkerEntries(
              worker.id,
              formIds,
            );

            const workerOutput = workerEntries.reduce(
              (sum, entry) => sum + entry.totalOutput,
              0,
            );

            const workerQualityPoints = workerEntries.reduce(
              (sum, entry) => sum + (entry.qualityScore || 100),
              0,
            );

            const workerQuality =
              workerEntries.length > 0
                ? Math.round(workerQualityPoints / workerEntries.length)
                : 0;

            // Calculate attendance rate for this worker
            const workerDays = new Set(
              workerEntries
                .map((entry) => {
                  const form = forms.find((f) => f.id === entry.formId);
                  return form ? form.date.toISOString().split('T')[0] : null;
                })
                .filter(Boolean),
            ).size;

            const workerPresentDays = workerEntries.filter(
              (entry) => entry.attendanceStatus === AttendanceStatus.PRESENT,
            ).length;

            const attendanceRate =
              formDates.size > 0
                ? Math.round((workerDays / formDates.size) * 100)
                : 0;

            // Calculate efficiency relative to group average
            const workerAvgPerDay =
              workerEntries.length > 0
                ? workerOutput / workerEntries.length
                : 0;

            const efficiency =
              groupAvgOutputPerDay > 0
                ? Math.round((workerAvgPerDay / groupAvgOutputPerDay) * 100)
                : 0;

            return {
              userId: worker.id,
              employeeId: worker.employeeId,
              fullName: worker.fullName,
              totalOutput: workerOutput,
              averageQuality: workerQuality,
              attendanceRate,
              efficiency,
            };
          }),
        );

        // Sort by total output
        workerBreakdown.sort((a, b) => b.totalOutput - a.totalOutput);
      }

      // 13. Construct and return the final report
      return {
        groupId,
        groupName: groupInfo.name,
        groupCode: groupInfo.code,
        teamId: groupInfo.teamId,
        teamName: groupInfo.teamName,
        lineId: groupInfo.lineId,
        lineName: groupInfo.lineName,
        factoryId: groupInfo.factoryId,
        factoryName: groupInfo.factoryName,
        factoryCode: 'UNKNOWN', // This should be improved if possible
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
    options: {
      includeHandBags?: boolean;
      includeProcesses?: boolean;
      includeTimeSeries?: boolean;
    } = {},
  ): Promise<ProductionComparisonReport> {
    try {
      // Default options
      const reportOptions = {
        includeHandBags: true,
        includeProcesses: true,
        includeTimeSeries: true,
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

      // 3. Validate entity IDs
      if (entityIds.length === 0) {
        throw AppError.from(
          new Error(`At least one ${compareBy} ID is required`),
          400,
        );
      }

      // 4. Get all entity information
      let entities: Array<{ id: string; name: string; code: string }> = [];

      if (compareBy === 'team') {
        // Get teams information
        const lineTeams = await this.digitalFormRepo.getLineTeams(lineId);
        entities = entityIds
          .map((id) => lineTeams.find((team) => team.id === id))
          .filter(Boolean) as any[];
      } else if (compareBy === 'group') {
        // Get groups information
        const lineGroups = await this.digitalFormRepo.getLineGroups(lineId);
        entities = entityIds
          .map((id) => lineGroups.find((group) => group.id === id))
          .filter(
            (
              group,
            ): group is {
              id: string;
              name: string;
              code: string;
              teamId: string;
              teamName: string;
            } => group !== undefined,
          )
          .map((group) => ({
            id: group.id,
            name: group.name,
            code: group.code,
          }));
      }

      if (entities.length === 0) {
        throw AppError.from(
          new Error(`No valid ${compareBy}s found for the provided IDs`),
          404,
        );
      }

      // 5. Initialize result arrays
      const comparisonData: ComparisonDataItem[] = [];
      let comparisonByBag: ComparisonByBagItem[] = [];
      let comparisonByProcess: ComparisonByProcessItem[] = [];
      let timeSeriesData: TimeSeriesDataItem[] = [];

      // 6. Fetch data for each entity and calculate metrics
      const entityMetrics = await Promise.all(
        entities.map(async (entity) => {
          let forms: DigitalForm[] = [];

          if (compareBy === 'team') {
            forms = await this.digitalFormRepo.getTeamForms(
              entity.id,
              new Date(dateFrom),
              new Date(dateTo),
            );
          } else {
            forms = await this.digitalFormRepo.getGroupForms(
              entity.id,
              new Date(dateFrom),
              new Date(dateTo),
            );
          }

          const formIds = forms.map((form) => form.id);
          let entries: DigitalFormEntry[] = [];

          if (compareBy === 'team') {
            entries =
              await this.digitalFormRepo.getFormEntriesByFormIds(formIds);
          } else {
            entries = await this.digitalFormRepo.getGroupEntries(
              entity.id,
              formIds,
            );
          }

          // Calculate metrics
          const totalOutput = entries.reduce(
            (sum, entry) => sum + entry.totalOutput,
            0,
          );

          const uniqueWorkers = new Set(entries.map((entry) => entry.userId));
          const workerCount = uniqueWorkers.size;

          const outputPerWorker =
            workerCount > 0 ? totalOutput / workerCount : 0;

          const qualityPoints = entries.reduce(
            (sum, entry) => sum + (entry.qualityScore || 100),
            0,
          );

          const qualityScore =
            entries.length > 0 ? Math.round(qualityPoints / entries.length) : 0;

          const presentCount = entries.filter(
            (entry) => entry.attendanceStatus === AttendanceStatus.PRESENT,
          ).length;

          const attendanceRate =
            entries.length > 0
              ? Math.round((presentCount / entries.length) * 100)
              : 0;

          // Calculate issue rate
          const allIssues = entries.reduce(
            (issues: ProductionIssue[], entry) => {
              if (entry.issues && Array.isArray(entry.issues)) {
                return [...issues, ...entry.issues];
              }
              return issues;
            },
            [],
          );

          const totalImpact = allIssues.reduce(
            (sum, issue) => sum + (issue.impact || 0),
            0,
          );

          const issueRate =
            entries.length > 0 ? Math.round(totalImpact / entries.length) : 0;

          // Store handbag data for later use
          const bagGroups: Record<string, DigitalFormEntry[]> = this._groupBy(
            entries,
            'handBagId',
          );

          // Store process data for later use
          const processGroups: Record<string, DigitalFormEntry[]> =
            this._groupBy(entries, 'processId');

          // Store data by date for time series
          const formsByDate = this._groupBy(
            forms,
            (form) => form.date.toISOString().split('T')[0],
          );

          return {
            entity,
            totalOutput,
            outputPerWorker,
            qualityScore,
            attendanceRate,
            issueRate,
            bagGroups,
            processGroups,
            formsByDate,
            entries,
          };
        }),
      );

      // 7. Sort entities by total output and assign ranks
      entityMetrics.sort((a, b) => b.totalOutput - a.totalOutput);

      // 8. Fill comparison data with ranks assigned
      entityMetrics.forEach((metric, index) => {
        comparisonData.push({
          id: metric.entity.id,
          name: metric.entity.name,
          code: metric.entity.code,
          totalOutput: metric.totalOutput,
          outputPerWorker: Math.round(metric.outputPerWorker * 100) / 100,
          qualityScore: metric.qualityScore,
          attendanceRate: metric.attendanceRate,
          issueRate: metric.issueRate,
          rank: index + 1,
        });
      });

      // 9. Calculate comparison by bag if requested
      if (reportOptions.includeHandBags) {
        comparisonByBag = await this.calculateHandBagComparison(
          entityMetrics,
          this.digitalFormRepo,
        );
      }

      // 10. Calculate comparison by process if requested
      if (reportOptions.includeProcesses) {
        // Calculate in separate function similar to bag comparison
        comparisonByProcess = await this.calculateProcessComparison(
          entityMetrics,
          this.digitalFormRepo,
        );
      }

      // 11. Calculate time series data if requested
      if (reportOptions.includeTimeSeries) {
        timeSeriesData = this.calculateTimeSeriesComparison(entityMetrics);
      }

      // 12. Return the final report
      return {
        dateRange: { from: dateFrom, to: dateTo },
        factoryId: factoryInfo.id,
        factoryName: factoryInfo.name,
        factoryCode: factoryInfo.code,
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

  /**
   * Tính toán thống kê sản lượng theo giờ
   * Hiển thị sản lượng trung bình và tổng theo từng giờ làm việc
   */
  private calculateHourlyBreakdown(
    entries: DigitalFormEntry[],
  ): HourlyBreakdownItem[] {
    // Thu thập tất cả dữ liệu theo giờ
    const hourlyDataMap: Record<string, { total: number; count: number }> = {};

    entries.forEach((entry) => {
      const hourlyData = entry.hourlyData || {};

      Object.entries(hourlyData).forEach(([hour, output]) => {
        if (!hourlyDataMap[hour]) {
          hourlyDataMap[hour] = { total: 0, count: 0 };
        }

        hourlyDataMap[hour].total += output;
        hourlyDataMap[hour].count += 1;
      });
    });

    // Chuyển đổi sang mảng các mục phân tích theo giờ
    const result: HourlyBreakdownItem[] = Object.entries(hourlyDataMap)
      .map(([hour, data]) => ({
        hour,
        totalOutput: data.total,
        averageOutput: data.count > 0 ? Math.round(data.total / data.count) : 0,
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    return result;
  }

  /**
   * Tính toán thống kê sản lượng theo ngày
   * Hiển thị xu hướng sản lượng, chất lượng và điểm danh theo thời gian
   */
  private calculateDailyBreakdown(
    forms: DigitalForm[],
    entries: DigitalFormEntry[],
  ): DailyBreakdownItem[] {
    // Nhóm form theo ngày
    const formsByDate: Record<string, DigitalForm[]> = {};

    forms.forEach((form) => {
      const dateStr = form.date.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!formsByDate[dateStr]) {
        formsByDate[dateStr] = [];
      }
      formsByDate[dateStr].push(form);
    });

    // Tính toán thống kê cho mỗi ngày
    const result: DailyBreakdownItem[] = [];

    for (const dateStr of Object.keys(formsByDate).sort()) {
      const dateForms = formsByDate[dateStr];
      const dateFormIds = dateForms.map((form) => form.id);

      // Tìm các entries cho ngày này
      const dateEntries = entries.filter((entry) =>
        dateFormIds.includes(entry.formId),
      );

      if (dateEntries.length === 0) {
        continue; // Bỏ qua các ngày không có dữ liệu
      }

      // Tính toán sản lượng, chất lượng và tỷ lệ điểm danh
      const dateOutput = dateEntries.reduce(
        (sum, entry) => sum + entry.totalOutput,
        0,
      );

      const qualityPoints = dateEntries.reduce(
        (sum, entry) => sum + (entry.qualityScore || 100),
        0,
      );

      const averageQuality =
        dateEntries.length > 0
          ? Math.round(qualityPoints / dateEntries.length)
          : 0;

      const presentCount = dateEntries.filter(
        (entry) => entry.attendanceStatus === AttendanceStatus.PRESENT,
      ).length;

      const attendanceRate =
        dateEntries.length > 0
          ? Math.round((presentCount / dateEntries.length) * 100)
          : 0;

      result.push({
        date: dateStr,
        totalOutput: dateOutput,
        averageQuality,
        attendanceRate,
      });
    }

    return result;
  }

  /**
   * Tính toán phân bố sản lượng theo loại túi
   * Hiển thị phân bố sản lượng theo sản phẩm, hoàn hảo cho biểu đồ tròn
   */
  private async calculateOutputByBag(
    entries: DigitalFormEntry[],
    repository: IDigitalFormRepository,
    totalOutput: number,
  ): Promise<OutputByBagItem[]> {
    // Nhóm entries theo túi
    const bagGroups: Record<string, DigitalFormEntry[]> = this._groupBy(
      entries,
      'handBagId',
    );

    // Lấy thông tin chi tiết túi từ repository
    const bagIds = Object.keys(bagGroups);
    if (bagIds.length === 0) {
      return [];
    }

    const bagDetails = await repository.getHandBagDetails(bagIds);

    // Tính toán sản lượng cho từng loại túi
    const result: OutputByBagItem[] = [];

    for (const bagId of bagIds) {
      const bagEntries = bagGroups[bagId];
      const bagOutput = bagEntries.reduce(
        (sum, entry) => sum + entry.totalOutput,
        0,
      );

      const bagDetail = bagDetails.find((b) => b.id === bagId) || {
        id: bagId,
        code: 'Unknown',
        name: 'Unknown',
      };

      const percentage =
        totalOutput > 0 ? Math.round((bagOutput / totalOutput) * 100) : 0;

      result.push({
        handBagId: bagId,
        handBagCode: bagDetail.code,
        handBagName: bagDetail.name,
        totalOutput: bagOutput,
        percentage,
      });
    }

    // Sắp xếp theo sản lượng giảm dần
    result.sort((a, b) => b.totalOutput - a.totalOutput);

    return result;
  }

  /**
   * Tính toán phân bố sản lượng theo quy trình sản xuất
   * Hiển thị sản lượng theo công đoạn, hoàn hảo cho biểu đồ cột
   */
  private async calculateOutputByProcess(
    entries: DigitalFormEntry[],
    repository: IDigitalFormRepository,
  ): Promise<OutputByProcessItem[]> {
    // Nhóm entries theo quy trình
    const processGroups: Record<string, DigitalFormEntry[]> = this._groupBy(
      entries,
      'processId',
    );

    // Lấy thông tin chi tiết quy trình từ repository
    const processIds = Object.keys(processGroups);
    if (processIds.length === 0) {
      return [];
    }

    const processDetails = await repository.getBagProcessDetails(processIds);

    // Tính toán sản lượng cho từng quy trình
    const result: OutputByProcessItem[] = [];

    for (const processId of processIds) {
      const processEntries = processGroups[processId];
      const processOutput = processEntries.reduce(
        (sum, entry) => sum + entry.totalOutput,
        0,
      );

      const processDetail = processDetails.find((p) => p.id === processId) || {
        id: processId,
        code: 'Unknown',
        name: 'Unknown',
      };

      result.push({
        processId,
        processCode: processDetail.code,
        processName: processDetail.name,
        totalOutput: processOutput,
      });
    }

    // Sắp xếp theo sản lượng giảm dần
    result.sort((a, b) => b.totalOutput - a.totalOutput);

    return result;
  }

  /**
   * Tính toán thống kê các vấn đề sản xuất
   * Hoàn hảo cho biểu đồ cột/Pareto hiển thị tác động của các vấn đề sản xuất
   */
  private calculateProductionIssues(
    entries: DigitalFormEntry[],
  ): ProductionIssueItem[] {
    // Trích xuất tất cả các vấn đề từ entries
    const allIssues: ProductionIssue[] = [];

    entries.forEach((entry) => {
      if (
        entry.issues &&
        Array.isArray(entry.issues) &&
        entry.issues.length > 0
      ) {
        const validIssues = entry.issues?.filter(issue => issue.type).map(issue => ({
          ...issue,
          type: issue.type!,
        })) || [];
        allIssues.push(...(validIssues as any[]));
      }
    });

    // Nhóm các vấn đề theo loại
    const issueGroups: Record<string, ProductionIssue[]> = this._groupBy(
      allIssues,
      'type',
    );

    // Tính toán thống kê cho từng loại vấn đề
    const result: ProductionIssueItem[] = [];

    for (const issueType of Object.keys(issueGroups)) {
      const issues = issueGroups[issueType];
      const totalImpact = issues.reduce(
        (sum, issue) => sum + (issue.impact || 0),
        0,
      );

      result.push({
        issueType: issueType as unknown as ProductionIssueType,
        occurrences: issues.length,
        totalImpact,
      });
    }

    // Sắp xếp theo số lần xuất hiện giảm dần
    result.sort((a, b) => b.occurrences - a.occurrences);

    return result;
  }

  /**
   * Tính toán dữ liệu chuỗi thời gian cho so sánh các đơn vị
   * Hoàn hảo cho biểu đồ đường nhiều dòng so sánh đội/nhóm theo thời gian
   */
  private calculateTimeSeriesComparison(
    entityMetrics: Array<{
      entity: { id: string; name: string };
      formsByDate: Record<string, DigitalForm[]>;
      entries: DigitalFormEntry[];
    }>,
  ): TimeSeriesDataItem[] {
    // Lấy tất cả các ngày duy nhất trên tất cả các đơn vị
    const allDates = new Set<string>();

    entityMetrics.forEach((metric) => {
      Object.keys(metric.formsByDate).forEach((date) => {
        allDates.add(date);
      });
    });

    // Tạo dữ liệu chuỗi thời gian cho từng ngày
    const result: TimeSeriesDataItem[] = [];

    for (const date of Array.from(allDates).sort()) {
      const dataPoints = entityMetrics.map((metric) => {
        const dateForms = metric.formsByDate[date] || [];
        const dateFormIds = dateForms.map((form) => form.id);

        // Tìm các entries cho ngày này
        const dateEntries = metric.entries.filter((entry) =>
          dateFormIds.includes(entry.formId),
        );

        const output = dateEntries.reduce(
          (sum, entry) => sum + entry.totalOutput,
          0,
        );

        return {
          id: metric.entity.id,
          name: metric.entity.name,
          output,
        };
      });

      result.push({
        date,
        dataPoints,
      });
    }

    return result;
  }

  /**
   * Tính toán dữ liệu so sánh cho túi xách giữa nhiều đơn vị
   * Hoàn hảo cho biểu đồ cột nhóm so sánh sản lượng sản phẩm giữa các đội
   */
  private async calculateHandBagComparison(
    entityMetrics: Array<{
      entity: { id: string; name: string };
      totalOutput: number;
      bagGroups: Record<string, DigitalFormEntry[]>;
    }>,
    repository: IDigitalFormRepository,
  ): Promise<ComparisonByBagItem[]> {
    // Lấy tất cả ID túi duy nhất trên tất cả các đơn vị
    const allBagIds = new Set<string>();

    entityMetrics.forEach((metric) => {
      Object.keys(metric.bagGroups).forEach((bagId) => {
        allBagIds.add(bagId);
      });
    });

    if (allBagIds.size === 0) {
      return [];
    }

    // Lấy thông tin chi tiết túi
    const bagDetails = await repository.getHandBagDetails(
      Array.from(allBagIds),
    );

    // Tạo so sánh cho từng túi
    const result: ComparisonByBagItem[] = [];

    for (const bagId of allBagIds) {
      const bagDetail = bagDetails.find((b) => b.id === bagId) || {
        id: bagId,
        code: 'Unknown',
        name: 'Unknown',
      };

      const dataPoints = entityMetrics.map((metric) => {
        const bagEntries = metric.bagGroups[bagId] || [];
        const output = bagEntries.reduce(
          (sum, entry) => sum + entry.totalOutput,
          0,
        );

        // Tính hiệu suất (phần trăm tổng sản lượng của đơn vị)
        const efficiency =
          metric.totalOutput > 0
            ? Math.round((output / metric.totalOutput) * 100)
            : 0;

        return {
          id: metric.entity.id,
          name: metric.entity.name,
          output,
          efficiency,
        };
      });

      // Chỉ bao gồm các túi có sản lượng trong ít nhất một đơn vị
      if (dataPoints.some((point) => point.output > 0)) {
        result.push({
          handBagId: bagId,
          handBagCode: bagDetail.code,
          handBagName: bagDetail.name,
          dataPoints,
        });
      }
    }

    // Sắp xếp theo tổng sản lượng cao nhất trên tất cả các đơn vị
    result.sort((a, b) => {
      const totalA = a.dataPoints.reduce((sum, p) => sum + p.output, 0);
      const totalB = b.dataPoints.reduce((sum, p) => sum + p.output, 0);
      return totalB - totalA;
    });

    return result;
  }

  /**
   * Tính toán dữ liệu so sánh cho quy trình sản xuất giữa nhiều đơn vị
   * Hoàn hảo cho biểu đồ cột nhóm so sánh hiệu suất quy trình giữa các đội/nhóm
   */
  private async calculateProcessComparison(
    entityMetrics: Array<{
      entity: { id: string; name: string };
      totalOutput: number;
      processGroups: Record<string, DigitalFormEntry[]>;
    }>,
    repository: IDigitalFormRepository,
  ): Promise<ComparisonByProcessItem[]> {
    // Lấy tất cả ID quy trình duy nhất trên tất cả các đơn vị
    const allProcessIds = new Set<string>();

    entityMetrics.forEach((metric) => {
      Object.keys(metric.processGroups).forEach((processId) => {
        allProcessIds.add(processId);
      });
    });

    if (allProcessIds.size === 0) {
      return [];
    }

    // Lấy thông tin chi tiết quy trình
    const processDetails = await repository.getBagProcessDetails(
      Array.from(allProcessIds),
    );

    // Tạo so sánh cho từng quy trình
    const result: ComparisonByProcessItem[] = [];

    for (const processId of allProcessIds) {
      const processDetail = processDetails.find((p) => p.id === processId) || {
        id: processId,
        code: 'Unknown',
        name: 'Unknown',
      };

      const dataPoints = entityMetrics.map((metric) => {
        const processEntries = metric.processGroups[processId] || [];
        const output = processEntries.reduce(
          (sum, entry) => sum + entry.totalOutput,
          0,
        );

        // Tính hiệu suất (phần trăm tổng sản lượng của đơn vị)
        const efficiency =
          metric.totalOutput > 0
            ? Math.round((output / metric.totalOutput) * 100)
            : 0;

        return {
          id: metric.entity.id,
          name: metric.entity.name,
          output,
          efficiency,
        };
      });

      // Chỉ bao gồm các quy trình có sản lượng trong ít nhất một đơn vị
      if (dataPoints.some((point) => point.output > 0)) {
        result.push({
          processId,
          processCode: processDetail.code,
          processName: processDetail.name,
          dataPoints,
        });
      }
    }

    // Sắp xếp theo tổng sản lượng cao nhất trên tất cả các đơn vị
    result.sort((a, b) => {
      const totalA = a.dataPoints.reduce((sum, p) => sum + p.output, 0);
      const totalB = b.dataPoints.reduce((sum, p) => sum + p.output, 0);
      return totalB - totalA;
    });

    return result;
  }
}
