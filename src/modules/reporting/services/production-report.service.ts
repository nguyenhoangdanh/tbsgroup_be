import { Injectable } from '@nestjs/common';
import { ShiftType, AttendanceStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/share/prisma.service';
import { ReportExportService } from './report-export.service';
import {
  ProductionForm,
  ProductionEntry,
  HourlyOutput,
} from '../interfaces/production.interface';

// Định nghĩa các interface đã có
export interface HandBagStat {
  id: string;
  name: string;
  code: string;
  output: number;
  planned: number;
  percentage?: number;
  count?: number;
}

export interface ProcessStat {
  id: string;
  name: string;
  code: string;
  output: number;
  planned: number;
  count?: number;
}

export interface ColorStat {
  id: string;
  name: string;
  code: string;
  output: number;
  planned: number; // Adding planned property to resolve TypeScript error
  count?: number;
}

export interface ShiftStat {
  shiftType: ShiftType;
  output: number;
  planned: number;
  count?: number;
}

export interface DailyStat {
  date: string;
  totalOutput: number;
  plannedOutput?: number;
  efficiency?: number;
  attendanceRate?: number;
}

export interface HourlyStat {
  hour: number;
  output: number;
  issues: number;
}

export interface AttendanceStats {
  PRESENT: number;
  ABSENT: number;
  LATE: number;
  EARLY_LEAVE: number;
  LEAVE_APPROVED: number;
}

export interface TeamGroupStat {
  id: string;
  name: string;
  code: string;
  output: number;
  planned: number;
  efficiency: number;
  workers?: number;
  forms?: number;
  entries?: number;
}

export interface WorkerStat {
  id: string;
  name: string;
  employeeId: string;
  output: number;
  planned: number;
  efficiency: number;
  attendance: AttendanceStats;
  entries?: number;
  processes?: Array<{
    id: string;
    name: string;
    output: number;
    planned: number;
  }>;
  handBags?: Array<{
    id: string;
    name: string;
    output: number;
    planned: number;
  }>;
}

// Định nghĩa các interface cho báo cáo
export interface FactoryStats {
  factoryId: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalForms: number;
    totalEntries: number;
    totalOutput: number;
    totalPlanned: number;
    efficiency: number;
  };
  byLine?: TeamGroupStat[];
  byHandBag?: HandBagStat[];
  byProcess?: ProcessStat[];
  byColor?: ColorStat[];
  byShift?: ShiftStat[];
  dailyBreakdown?: DailyStat[];
}

export interface LineStats {
  lineId: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalForms: number;
    totalEntries: number;
    totalOutput: number;
    totalPlanned: number;
    efficiency: number;
  };
  byTeam: TeamGroupStat[];
  byHandBag?: HandBagStat[];
  byProcess?: ProcessStat[];
  byColor?: ColorStat[];
  byShift?: ShiftStat[];
  dailyBreakdown?: DailyStat[];
  hourlyBreakdown?: HourlyStat[]; // Added this property to fix the error
}

export interface TeamStats {
  teamId: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalForms: number;
    totalEntries: number;
    totalOutput: number;
    totalPlanned: number;
    efficiency: number;
  };
  byGroup: TeamGroupStat[];
  byHandBag?: HandBagStat[];
  byProcess?: ProcessStat[];
  dailyBreakdown?: DailyStat[];
  hourlyBreakdown?: HourlyStat[];
}

export interface GroupStats {
  groupId: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalForms: number;
    totalEntries: number;
    totalOutput: number;
    totalPlanned: number;
    efficiency: number;
  };
  workers: WorkerStat[];
  byHandBag?: HandBagStat[];
  byProcess?: ProcessStat[];
  dailyBreakdown?: DailyStat[];
  hourlyBreakdown?: HourlyStat[];
}

export interface ComparisonStats {
  entityType: 'team' | 'group';
  dateRange: {
    start: Date;
    end: Date;
  };
  entities: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  summary: Array<{
    id: string;
    name: string;
    code: string;
    totalOutput: number;
    totalPlanned: number;
    efficiency: number;
    workers: number;
    forms: number;
  }>;
  dailyComparison: Array<{
    date: string;
    entities: Record<
      string,
      {
        output: number;
        planned: number;
        efficiency: number;
      }
    >;
  }>;
  byHandBag: Array<{
    handBagId: string;
    handBagName: string;
    handBagCode: string;
    entities: Record<
      string,
      {
        output: number;
        planned: number;
        efficiency: number;
      }
    >;
  }>;
  byProcess: Array<{
    processId: string;
    processName: string;
    processCode: string;
    entities: Record<
      string,
      {
        output: number;
        planned: number;
        efficiency: number;
      }
    >;
  }>;
}

@Injectable()
export class ProductionReportService {
  constructor(
    private prisma: PrismaService,
    private reportExportService: ReportExportService,
  ) {}

  /**
   * Convert Prisma JSON hourly data to expected format
   */
  private parseHourlyData(
    hourlyData: Prisma.JsonValue | null,
  ): Record<string, { output: number; qualityIssues: number }> {
    if (!hourlyData || hourlyData === null) {
      return {};
    }

    try {
      const data = hourlyData as Record<string, number>;
      // Convert simple number values to objects with output and qualityIssues properties
      const result: Record<string, { output: number; qualityIssues: number }> =
        {};

      for (const [hour, value] of Object.entries(data)) {
        result[hour] = {
          output: typeof value === 'number' ? value : 0,
          qualityIssues: 0, // Default value as we don't have this info in current data structure
        };
      }

      return result;
    } catch (error) {
      return {};
    }
  }

  /**
   * Map Prisma form data to ProductionForm interface
   */
  private mapToProductionForm(prismaForm: any): ProductionForm {
    return {
      id: prismaForm.id,
      shiftType: prismaForm.shiftType,
      factoryId: prismaForm.factoryId,
      lineId: prismaForm.lineId,
      teamId: prismaForm.teamId,
      groupId: prismaForm.groupId,
      team: prismaForm.team,
      group: prismaForm.group,
      entries: prismaForm.entries.map(
        (entry: any): ProductionEntry => ({
          id: entry.id,
          totalOutput: entry.totalOutput,
          plannedOutput: entry.plannedOutput || 0,
          attendanceStatus: entry.attendanceStatus,
          handBagId: entry.handBagId,
          bagColorId: entry.bagColorId,
          processId: entry.processId,
          hourlyData: this.parseHourlyData(entry.hourlyData),
          handBag: entry.handBag,
          bagColor: entry.bagColor,
          process: entry.process,
          user: entry.user,
        }),
      ),
    };
  }

  /**
   * Get production statistics by factory for a specific date range
   */
  async getFactoryStats(factoryId: string, startDate: Date, endDate: Date) {
    // Get all digital forms for this factory in the date range
    const prismaForms = await this.prisma.digitalProductionForm.findMany({
      where: {
        factoryId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['CONFIRMED', 'PENDING'], // Include both confirmed and pending forms
        },
      },
      include: {
        entries: {
          include: {
            handBag: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            bagColor: {
              select: {
                id: true,
                colorCode: true,
                colorName: true,
              },
            },
            process: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Map Prisma data to our interface
    const forms: ProductionForm[] = prismaForms.map((form) =>
      this.mapToProductionForm(form),
    );

    // Initialize counters
    let totalEntries = 0;
    let totalOutput = 0;
    let totalPlanned = 0;
    const byHandBag: Record<string, HandBagStat> = {};
    const byColor: Record<string, ColorStat> = {};
    const byProcess: Record<string, ProcessStat> = {};
    const byShift: Record<string, ShiftStat> = {
      REGULAR: {
        shiftType: ShiftType.REGULAR,
        count: 0,
        output: 0,
        planned: 0,
      },
      EXTENDED: {
        shiftType: ShiftType.EXTENDED,
        count: 0,
        output: 0,
        planned: 0,
      },
      OVERTIME: {
        shiftType: ShiftType.OVERTIME,
        count: 0,
        output: 0,
        planned: 0,
      },
    };
    const attendanceStats: Partial<AttendanceStats> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EARLY_LEAVE: 0,
      LEAVE_APPROVED: 0,
    };
    const hourlyOutputs: Record<string, HourlyOutput> = {};

    // Process all forms and their entries
    forms.forEach((form: ProductionForm) => {
      // Count by shift - Ensure form.shiftType is a valid ShiftType
      if (form.shiftType && form.shiftType in byShift) {
        byShift[form.shiftType].count =
          (byShift[form.shiftType].count || 0) + form.entries.length;
      }

      // Process each form entry
      form.entries.forEach((entry: ProductionEntry) => {
        totalEntries++;
        totalOutput += entry.totalOutput;
        totalPlanned += entry.plannedOutput;

        // Add to shift statistics - Ensure form.shiftType is a valid ShiftType
        if (form.shiftType && form.shiftType in byShift) {
          byShift[form.shiftType].output += entry.totalOutput;
          byShift[form.shiftType].planned += entry.plannedOutput;
        }

        // Count attendance - Check if the status exists in attendanceStats
        const status = entry.attendanceStatus;
        if (status && status in attendanceStats) {
          attendanceStats[status] = (attendanceStats[status] || 0) + 1;
        }

        // Group by handbag
        if (entry.handBag && entry.handBagId && !byHandBag[entry.handBagId]) {
          byHandBag[entry.handBagId] = {
            id: entry.handBagId,
            code: entry.handBag.code,
            name: entry.handBag.name,
            count: 0,
            output: 0,
            planned: 0,
          };
        }

        if (entry.handBag && entry.handBagId && byHandBag[entry.handBagId]) {
          byHandBag[entry.handBagId].count =
            (byHandBag[entry.handBagId].count || 0) + 1;
          byHandBag[entry.handBagId].output += entry.totalOutput;
          byHandBag[entry.handBagId].planned += entry.plannedOutput;
        }

        // Group by color
        if (entry.bagColor && entry.bagColorId && !byColor[entry.bagColorId]) {
          byColor[entry.bagColorId] = {
            id: entry.bagColorId,
            code: entry.bagColor.colorCode,
            name: entry.bagColor.colorName,
            count: 0,
            output: 0,
            planned: 0,
          };
        }

        if (entry.bagColor && entry.bagColorId && byColor[entry.bagColorId]) {
          byColor[entry.bagColorId].count =
            (byColor[entry.bagColorId].count || 0) + 1;
          byColor[entry.bagColorId].output += entry.totalOutput;
          byColor[entry.bagColorId].planned += entry.plannedOutput;
        }

        // Group by process
        if (entry.process && entry.processId && !byProcess[entry.processId]) {
          byProcess[entry.processId] = {
            id: entry.processId,
            code: entry.process.code,
            name: entry.process.name,
            count: 0,
            output: 0,
            planned: 0,
          };
        }

        if (entry.process && entry.processId && byProcess[entry.processId]) {
          byProcess[entry.processId].count =
            (byProcess[entry.processId].count || 0) + 1;
          byProcess[entry.processId].output += entry.totalOutput;
          byProcess[entry.processId].planned += entry.plannedOutput;
        }

        // Collect hourly data
        const hourlyData = entry.hourlyData;
        if (hourlyData) {
          for (const [hour, data] of Object.entries(hourlyData)) {
            if (!hourlyOutputs[hour]) {
              hourlyOutputs[hour] = {
                output: 0,
                issues: 0,
              };
            }
            hourlyOutputs[hour].output += data.output || 0;
            hourlyOutputs[hour].issues += data.qualityIssues || 0;
          }
        }
      });
    });

    // Calculate efficiency
    const efficiency =
      totalPlanned > 0 ? Math.round((totalOutput / totalPlanned) * 100) : 0;

    // Format for response
    return {
      factoryId,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      summary: {
        totalForms: forms.length,
        totalEntries,
        totalOutput,
        totalPlanned,
        efficiency,
      },
      attendance: attendanceStats,
      byShift: Object.values(byShift),
      byHandBag: Object.values(byHandBag),
      byColor: Object.values(byColor),
      byProcess: Object.values(byProcess),
      hourlyBreakdown: Object.entries(hourlyOutputs)
        .map(([hour, data]) => ({
          hour: parseInt(hour, 10),
          output: data.output,
          issues: data.issues,
        }))
        .sort((a, b) => a.hour - b.hour),
    };
  }

  /**
   * Get production statistics by line for a specific date range
   */
  async getLineStats(
    lineId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<LineStats> {
    // Similar implementation to getFactoryStats, but filtered by lineId
    const prismaForms = await this.prisma.digitalProductionForm.findMany({
      where: {
        lineId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['CONFIRMED', 'PENDING'],
        },
      },
      include: {
        entries: {
          include: {
            handBag: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            bagColor: {
              select: {
                id: true,
                colorCode: true,
                colorName: true,
              },
            },
            process: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        team: true,
      },
    });

    // Map Prisma data to our interface
    const forms: ProductionForm[] = prismaForms.map((form) =>
      this.mapToProductionForm(form),
    );

    // Group by team
    const teamStats: Record<
      string,
      {
        id: string;
        code: string;
        name: string;
        forms: number;
        entries: number;
        output: number;
        planned: number;
        efficiency: number; // Changed to non-optional
      }
    > = {};

    let totalEntries = 0;
    let totalOutput = 0;
    let totalPlanned = 0;
    const hourlyOutputs: Record<string, HourlyOutput> = {};

    // Process all forms
    forms.forEach((form: ProductionForm) => {
      // Initialize team data if needed
      if (form.teamId && form.team) {
        if (!teamStats[form.teamId]) {
          teamStats[form.teamId] = {
            id: form.teamId,
            code: form.team.code,
            name: form.team.name,
            forms: 0,
            entries: 0,
            output: 0,
            planned: 0,
            efficiency: 0, // Initialize with 0
          };
        }

        teamStats[form.teamId].forms++;

        // Process each form entry
        form.entries.forEach((entry: ProductionEntry) => {
          totalEntries++;
          totalOutput += entry.totalOutput;
          totalPlanned += entry.plannedOutput;

          if (form.teamId) {
            teamStats[form.teamId].entries++;
            teamStats[form.teamId].output += entry.totalOutput;
            teamStats[form.teamId].planned += entry.plannedOutput;
          }

          // Collect hourly data
          const hourlyData = entry.hourlyData;
          if (hourlyData) {
            for (const [hour, data] of Object.entries(hourlyData)) {
              if (!hourlyOutputs[hour]) {
                hourlyOutputs[hour] = {
                  output: 0,
                  issues: 0,
                };
              }
              hourlyOutputs[hour].output += data.output || 0;
              hourlyOutputs[hour].issues += data.qualityIssues || 0;
            }
          }
        });
      }
    });

    // Calculate efficiency for each team
    Object.values(teamStats).forEach((team) => {
      team.efficiency =
        team.planned > 0 ? Math.round((team.output / team.planned) * 100) : 0;
    });

    // Calculate overall efficiency
    const efficiency =
      totalPlanned > 0 ? Math.round((totalOutput / totalPlanned) * 100) : 0;

    // Convert teamStats to TeamGroupStat[] type
    const byTeam: TeamGroupStat[] = Object.values(teamStats).map((team) => ({
      id: team.id,
      code: team.code,
      name: team.name,
      output: team.output,
      planned: team.planned,
      efficiency: team.efficiency,
      forms: team.forms,
      entries: team.entries,
    }));

    return {
      lineId,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      summary: {
        totalForms: forms.length,
        totalEntries,
        totalOutput,
        totalPlanned,
        efficiency,
      },
      byTeam,
      hourlyBreakdown: Object.entries(hourlyOutputs)
        .map(([hour, data]) => ({
          hour: parseInt(hour, 10),
          output: data.output,
          issues: data.issues,
        }))
        .sort((a, b) => a.hour - b.hour),
    };
  }

  /**
   * Get production statistics by team for a specific date range
   */
  async getTeamStats(
    teamId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TeamStats> {
    // Similar implementation, but filtered by teamId
    const prismaForms = await this.prisma.digitalProductionForm.findMany({
      where: {
        teamId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['CONFIRMED', 'PENDING'],
        },
      },
      include: {
        entries: {
          include: {
            handBag: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            bagColor: {
              select: {
                id: true,
                colorCode: true,
                colorName: true,
              },
            },
            process: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            user: {
              select: {
                id: true,
                fullName: true,
                employeeId: true,
              },
            },
          },
        },
        group: true,
      },
    });

    // Map Prisma data to our interface
    const forms: ProductionForm[] = prismaForms.map((form) =>
      this.mapToProductionForm(form),
    );

    // Group by group
    const groupStats: Record<
      string,
      {
        id: string;
        code: string;
        name: string;
        forms: number;
        entries: number;
        output: number;
        planned: number;
        efficiency: number; // Changed to non-optional
      }
    > = {};

    let totalEntries = 0;
    let totalOutput = 0;
    let totalPlanned = 0;

    // Process all forms
    forms.forEach((form: ProductionForm) => {
      // Initialize group data if needed
      if (form.groupId && form.group) {
        if (!groupStats[form.groupId]) {
          groupStats[form.groupId] = {
            id: form.groupId,
            code: form.group.code,
            name: form.group.name,
            forms: 0,
            entries: 0,
            output: 0,
            planned: 0,
            efficiency: 0, // Initialize with 0
          };
        }

        groupStats[form.groupId].forms++;

        // Process each form entry
        form.entries.forEach((entry: ProductionEntry) => {
          totalEntries++;
          totalOutput += entry.totalOutput;
          totalPlanned += entry.plannedOutput;

          if (form.groupId) {
            groupStats[form.groupId].entries++;
            groupStats[form.groupId].output += entry.totalOutput;
            groupStats[form.groupId].planned += entry.plannedOutput;
          }
        });
      }
    });

    // Calculate efficiency for each group
    Object.values(groupStats).forEach((group) => {
      group.efficiency =
        group.planned > 0
          ? Math.round((group.output / group.planned) * 100)
          : 0;
    });

    // Calculate overall efficiency
    const efficiency =
      totalPlanned > 0 ? Math.round((totalOutput / totalPlanned) * 100) : 0;

    // Convert groupStats to TeamGroupStat[] type
    const byGroup: TeamGroupStat[] = Object.values(groupStats).map((group) => ({
      id: group.id,
      code: group.code,
      name: group.name,
      output: group.output,
      planned: group.planned,
      efficiency: group.efficiency,
      forms: group.forms,
      entries: group.entries,
    }));

    return {
      teamId,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      summary: {
        totalForms: forms.length,
        totalEntries,
        totalOutput,
        totalPlanned,
        efficiency,
      },
      byGroup,
    };
  }

  /**
   * Get production statistics by group for a specific date range
   * This includes detailed worker-level statistics
   */
  async getGroupStats(
    groupId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<GroupStats> {
    // Filter by groupId
    const prismaForms = await this.prisma.digitalProductionForm.findMany({
      where: {
        groupId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['CONFIRMED', 'PENDING'],
        },
      },
      include: {
        entries: {
          include: {
            handBag: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            bagColor: {
              select: {
                id: true,
                colorCode: true,
                colorName: true,
              },
            },
            process: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            user: {
              select: {
                id: true,
                fullName: true,
                employeeId: true,
              },
            },
          },
        },
      },
    });

    // Map Prisma data to our interface
    const forms: ProductionForm[] = prismaForms.map((form) =>
      this.mapToProductionForm(form),
    );

    // Define worker stats interface for internal use
    interface InternalWorkerStat {
      id: string;
      name: string;
      employeeId: string;
      entries: number;
      output: number;
      planned: number;
      processes: Record<
        string,
        {
          id: string;
          name: string;
          output: number;
          planned: number;
        }
      >;
      handBags: Record<
        string,
        {
          id: string;
          name: string;
          output: number;
          planned: number;
        }
      >;
      attendance: Partial<Record<AttendanceStatus, number>>;
      efficiency?: number;
    }

    // Group by worker
    const workerStats: Record<string, InternalWorkerStat> = {};
    let totalEntries = 0;
    let totalOutput = 0;
    let totalPlanned = 0;
    const hourlyOutputs: Record<string, HourlyOutput> = {};

    // Process all forms and their entries
    forms.forEach((form: ProductionForm) => {
      form.entries.forEach((entry: ProductionEntry) => {
        if (!entry.user) return; // Skip if no user data

        totalEntries++;
        totalOutput += entry.totalOutput;
        totalPlanned += entry.plannedOutput;

        const userId = entry.user.id;

        // Initialize worker data if needed
        if (!workerStats[userId]) {
          workerStats[userId] = {
            id: userId,
            name: entry.user.fullName,
            employeeId: entry.user.employeeId,
            entries: 0,
            output: 0,
            planned: 0,
            processes: {},
            handBags: {},
            attendance: {
              PRESENT: 0,
              ABSENT: 0,
              LATE: 0,
              EARLY_LEAVE: 0,
              LEAVE_APPROVED: 0,
            },
          };
        }

        workerStats[userId].entries++;
        workerStats[userId].output += entry.totalOutput;
        workerStats[userId].planned += entry.plannedOutput;

        // Update attendance counters
        const status = entry.attendanceStatus;
        if (status && status in workerStats[userId].attendance) {
          workerStats[userId].attendance[status] =
            (workerStats[userId].attendance[status] || 0) + 1;
        }

        // Track worker's processes
        if (
          entry.process &&
          entry.processId &&
          !workerStats[userId].processes[entry.processId]
        ) {
          workerStats[userId].processes[entry.processId] = {
            id: entry.processId,
            name: entry.process.name,
            output: 0,
            planned: 0,
          };
        }

        if (
          entry.process &&
          entry.processId &&
          workerStats[userId].processes[entry.processId]
        ) {
          workerStats[userId].processes[entry.processId].output +=
            entry.totalOutput;
          workerStats[userId].processes[entry.processId].planned +=
            entry.plannedOutput;
        }

        // Track worker's handbags
        if (
          entry.handBag &&
          entry.handBagId &&
          !workerStats[userId].handBags[entry.handBagId]
        ) {
          workerStats[userId].handBags[entry.handBagId] = {
            id: entry.handBagId,
            name: entry.handBag.name,
            output: 0,
            planned: 0,
          };
        }

        if (
          entry.handBag &&
          entry.handBagId &&
          workerStats[userId].handBags[entry.handBagId]
        ) {
          workerStats[userId].handBags[entry.handBagId].output +=
            entry.totalOutput;
          workerStats[userId].handBags[entry.handBagId].planned +=
            entry.plannedOutput;
        }

        // Collect hourly data
        const hourlyData = entry.hourlyData;
        if (hourlyData) {
          for (const [hour, data] of Object.entries(hourlyData)) {
            if (!hourlyOutputs[hour]) {
              hourlyOutputs[hour] = {
                output: 0,
                issues: 0,
              };
            }
            hourlyOutputs[hour].output += data.output || 0;
            hourlyOutputs[hour].issues += data.qualityIssues || 0;
          }
        }
      });
    });

    // Transform the worker stats to match our WorkerStat interface
    const workers: WorkerStat[] = Object.values(workerStats).map((worker) => {
      const efficiency =
        worker.planned > 0
          ? Math.round((worker.output / worker.planned) * 100)
          : 0;

      const processArray = Object.values(worker.processes);
      const handBagsArray = Object.values(worker.handBags);

      // Convert to expected WorkerStat format
      return {
        id: worker.id,
        name: worker.name,
        employeeId: worker.employeeId,
        entries: worker.entries,
        output: worker.output,
        planned: worker.planned,
        efficiency: efficiency,
        attendance: worker.attendance as AttendanceStats,
        processes: processArray,
        handBags: handBagsArray,
      } as WorkerStat;
    });

    // Sort workers by output
    workers.sort((a, b) => b.output - a.output);

    // Calculate overall efficiency
    const efficiency =
      totalPlanned > 0 ? Math.round((totalOutput / totalPlanned) * 100) : 0;

    return {
      groupId,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      summary: {
        totalForms: forms.length,
        totalEntries,
        totalOutput,
        totalPlanned,
        efficiency,
      },
      workers,
      hourlyBreakdown: Object.entries(hourlyOutputs)
        .map(([hour, data]) => ({
          hour: parseInt(hour, 10),
          output: data.output,
          issues: data.issues,
        }))
        .sort((a, b) => a.hour - b.hour),
    };
  }

  /**
   * Get real-time production stats for dashboard
   * This provides current day's stats for a specific organizational unit
   */
  async getDashboardStats(params: {
    factoryId?: string;
    lineId?: string;
    teamId?: string;
    groupId?: string;
    date?: Date;
  }) {
    const { factoryId, lineId, teamId, groupId, date } = params;

    // Default to today if no date is provided
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Build the query based on provided parameters
    const where: any = {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    if (factoryId) where.factoryId = factoryId;
    if (lineId) where.lineId = lineId;
    if (teamId) where.teamId = teamId;
    if (groupId) where.groupId = groupId;

    // Get forms for the current day
    const prismaForms = await this.prisma.digitalProductionForm.findMany({
      where,
      include: {
        entries: true,
      },
    });

    // Map Prisma data to our interface
    const forms: ProductionForm[] = prismaForms.map((form) =>
      this.mapToProductionForm(form),
    );

    // Process the data for dashboard display
    let totalOutput = 0;
    let totalPlanned = 0;
    const hourlyOutputs: Record<string, { output: number; planned: number }> =
      {};
    let workersPresent = 0;
    let workersAbsent = 0;

    forms.forEach((form: ProductionForm) => {
      form.entries.forEach((entry: ProductionEntry) => {
        totalOutput += entry.totalOutput;
        totalPlanned += entry.plannedOutput;

        // Track attendance
        if (entry.attendanceStatus === AttendanceStatus.PRESENT) {
          workersPresent++;
        } else if (entry.attendanceStatus === AttendanceStatus.ABSENT) {
          workersAbsent++;
        }

        // Collect hourly data
        const hourlyData = entry.hourlyData;
        if (hourlyData) {
          for (const [hour, data] of Object.entries(hourlyData)) {
            if (!hourlyOutputs[hour]) {
              hourlyOutputs[hour] = {
                output: 0,
                planned: 0,
              };
            }
            hourlyOutputs[hour].output += data.output || 0;

            // Calculate planned output per hour (divide total planned by shift hours)
            const plannedPerHour = entry.plannedOutput / 8; // Assuming 8-hour shifts
            hourlyOutputs[hour].planned += plannedPerHour;
          }
        }
      });
    });

    // Calculate efficiency
    const efficiency =
      totalPlanned > 0 ? Math.round((totalOutput / totalPlanned) * 100) : 0;

    // Format hourly data
    const hourlyBreakdown = Object.entries(hourlyOutputs)
      .map(([hour, data]) => ({
        hour: parseInt(hour, 10),
        output: data.output,
        planned: Math.round(data.planned),
        efficiency:
          data.planned > 0 ? Math.round((data.output / data.planned) * 100) : 0,
      }))
      .sort((a, b) => a.hour - b.hour);

    // Get current hour
    const currentHour = new Date().getHours() - 7; // Convert to 1-based hour (7:30 AM start)

    // Calculate trend (comparing to previous hour)
    let trend = 0;
    if (currentHour > 1 && hourlyBreakdown.length >= currentHour) {
      const currentOutput = hourlyBreakdown[currentHour - 1]?.output || 0;
      const previousOutput = hourlyBreakdown[currentHour - 2]?.output || 0;
      trend =
        previousOutput > 0
          ? ((currentOutput - previousOutput) / previousOutput) * 100
          : 0;
    }

    return {
      date: targetDate,
      summary: {
        totalForms: forms.length,
        totalEntries: forms.reduce((sum, form) => sum + form.entries.length, 0),
        totalOutput,
        totalPlanned,
        efficiency,
        trend, // Percentage change from previous hour
      },
      attendance: {
        present: workersPresent,
        absent: workersAbsent,
      },
      hourlyBreakdown,
      lastUpdated: new Date(),
    };
  }

  /**
   * Compare production statistics between teams or groups
   */
  async compareStats(
    entityType: 'team' | 'group',
    entityIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<ComparisonStats> {
    // Fetch basic information for each entity first (name, code)
    const entities = await this.getEntityInfo(entityType, entityIds);

    // Create a map for easier lookup of entity names
    const entityNames: Record<string, { name: string; code: string }> = {};
    entities.forEach((entity) => {
      entityNames[entity.id] = { name: entity.name, code: entity.code };
    });

    // Prepare results structure
    const results: ComparisonStats = {
      entityType,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      entities: entities.map((entity) => ({
        id: entity.id,
        name: entity.name,
        code: entity.code,
      })),
      summary: [],
      dailyComparison: [],
      byHandBag: [],
      byProcess: [],
    };

    // Fetch statistics for each entity
    const statsPromises = entityIds.map(async (id) => {
      let stats: TeamStats | GroupStats;
      if (entityType === 'team') {
        stats = (await this.getTeamStats(id, startDate, endDate)) as TeamStats;
      } else {
        stats = (await this.getGroupStats(
          id,
          startDate,
          endDate,
        )) as GroupStats;
      }
      return { id, stats };
    });

    const statsResults = await Promise.all(statsPromises);

    // Process statistics for summary
    statsResults.forEach(({ id, stats }) => {
      const entity = entityNames[id];
      if (!entity) return;

      // Add summary data
      results.summary.push({
        id,
        name: entity.name,
        code: entity.code,
        totalOutput: stats.summary.totalOutput,
        totalPlanned: stats.summary.totalPlanned,
        efficiency: stats.summary.efficiency,
        workers:
          entityType === 'team'
            ? (stats as TeamStats).byGroup?.length || 0
            : (stats as GroupStats).workers?.length || 0,
        forms: stats.summary.totalForms,
      });

      // Process daily data if available
      if ('dailyBreakdown' in stats && stats.dailyBreakdown) {
        stats.dailyBreakdown.forEach((dailyData) => {
          // Find or create date entry in results
          let dateEntry = results.dailyComparison.find(
            (d) => d.date === dailyData.date,
          );
          if (!dateEntry) {
            dateEntry = { date: dailyData.date, entities: {} };
            results.dailyComparison.push(dateEntry);
          }

          // Add entity's data for this date
          dateEntry.entities[id] = {
            output: dailyData.totalOutput,
            planned: dailyData.plannedOutput || 0,
            efficiency: dailyData.efficiency || 0,
          };
        });
      }

      // Process handbag data if available
      if ('byHandBag' in stats && stats.byHandBag) {
        stats.byHandBag.forEach((handBagData) => {
          // Find or create handbag entry in results
          let handBagEntry = results.byHandBag.find(
            (h) => h.handBagId === handBagData.id,
          );
          if (!handBagEntry) {
            handBagEntry = {
              handBagId: handBagData.id,
              handBagName: handBagData.name,
              handBagCode: handBagData.code,
              entities: {},
            };
            results.byHandBag.push(handBagEntry);
          }

          // Add entity's data for this handbag
          handBagEntry.entities[id] = {
            output: handBagData.output,
            planned: handBagData.planned,
            efficiency:
              handBagData.planned > 0
                ? (handBagData.output / handBagData.planned) * 100
                : 0,
          };
        });
      }

      // Process process data if available
      if ('byProcess' in stats && stats.byProcess) {
        stats.byProcess.forEach((processData) => {
          // Find or create process entry in results
          let processEntry = results.byProcess.find(
            (p) => p.processId === processData.id,
          );
          if (!processEntry) {
            processEntry = {
              processId: processData.id,
              processName: processData.name,
              processCode: processData.code,
              entities: {},
            };
            results.byProcess.push(processEntry);
          }

          // Add entity's data for this process
          processEntry.entities[id] = {
            output: processData.output,
            planned: processData.planned,
            efficiency:
              processData.planned > 0
                ? (processData.output / processData.planned) * 100
                : 0,
          };
        });
      }
    });

    // Sort data for better presentation
    results.summary.sort((a, b) => b.totalOutput - a.totalOutput);
    results.dailyComparison.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    results.byHandBag.sort((a, b) => {
      // Calculate total output across all entities for this handbag
      const totalOutputA = Object.values(a.entities).reduce(
        (sum, e) => sum + e.output,
        0,
      );
      const totalOutputB = Object.values(b.entities).reduce(
        (sum, e) => sum + e.output,
        0,
      );
      return totalOutputB - totalOutputA;
    });
    results.byProcess.sort((a, b) => {
      const totalOutputA = Object.values(a.entities).reduce(
        (sum, e) => sum + e.output,
        0,
      );
      const totalOutputB = Object.values(b.entities).reduce(
        (sum, e) => sum + e.output,
        0,
      );
      return totalOutputB - totalOutputA;
    });

    return results;
  }

  /**
   * Helper method to get entity information
   */
  private async getEntityInfo(
    entityType: 'team' | 'group',
    entityIds: string[],
  ) {
    if (entityType === 'team') {
      return this.prisma.team.findMany({
        where: {
          id: {
            in: entityIds,
          },
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
      });
    } else {
      return this.prisma.group.findMany({
        where: {
          id: {
            in: entityIds,
          },
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
      });
    }
  }

  /**
   * Export standard report to Excel, PDF or CSV
   */
  async exportReport(
    reportType: 'factory' | 'line' | 'team' | 'group',
    id: string,
    startDate: Date,
    endDate: Date,
    format: 'excel' | 'pdf' | 'csv',
  ): Promise<string> {
    // Get the report data first
    let reportData: FactoryStats | LineStats | TeamStats | GroupStats;
    let entityName = '';
    let entityCode = '';

    try {
      switch (reportType) {
        case 'factory': {
          reportData = (await this.getFactoryStats(
            id,
            startDate,
            endDate,
          )) as FactoryStats;
          const factoryInfo = await this.prisma.factory.findUnique({
            where: { id },
            select: { name: true, code: true },
          });
          if (factoryInfo) {
            entityName = factoryInfo.name;
            entityCode = factoryInfo.code;
          }
          break;
        }
        case 'line': {
          reportData = await this.getLineStats(id, startDate, endDate);
          const lineInfo = await this.prisma.line.findUnique({
            where: { id },
            select: { name: true, code: true },
          });
          if (lineInfo) {
            entityName = lineInfo.name;
            entityCode = lineInfo.code;
          }
          break;
        }
        case 'team': {
          reportData = await this.getTeamStats(id, startDate, endDate);
          const teamInfo = await this.prisma.team.findUnique({
            where: { id },
            select: { name: true, code: true },
          });
          if (teamInfo) {
            entityName = teamInfo.name;
            entityCode = teamInfo.code;
          }
          break;
        }
        case 'group': {
          reportData = await this.getGroupStats(id, startDate, endDate);
          const groupInfo = await this.prisma.group.findUnique({
            where: { id },
            select: { name: true, code: true },
          });
          if (groupInfo) {
            entityName = groupInfo.name;
            entityCode = groupInfo.code;
          }
          break;
        }
        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }
    } catch (error) {
      throw new Error(`Error getting report data: ${error.message}`);
    }

    // Sử dụng report export service để xuất báo cáo
    return this.reportExportService.exportReport(
      reportType,
      reportData,
      {
        entityName,
        entityCode,
        startDate,
        endDate,
      },
      format,
    );
  }

  /**
   * Export comparison report to Excel, PDF or CSV
   */
  async exportComparisonReport(
    entityType: 'team' | 'group',
    entityIds: string[],
    startDate: Date,
    endDate: Date,
    format: 'excel' | 'pdf' | 'csv',
  ): Promise<string> {
    // Get the comparison data
    const reportData = await this.compareStats(
      entityType,
      entityIds,
      startDate,
      endDate,
    );

    // Sử dụng report export service để xuất báo cáo so sánh
    return this.reportExportService.exportComparisonReport(
      reportData,
      {
        startDate,
        endDate,
      },
      format,
    );
  }
}
