import { Requester } from 'src/share';
import {
  DigitalFormCondDTO,
  DigitalFormCreateDTO,
  DigitalFormEntryDTO,
  DigitalFormSubmitDTO,
  DigitalFormUpdateDTO,
  PaginationDTO,
  UpdateFormEntryDTO,
} from './digital-form.dto';
import {
  DigitalForm,
  DigitalFormEntry,
  FactoryProductionReport,
  GroupProductionReport,
  LineProductionReport,
  ProductionComparisonReport,
  ShiftType,
  TeamProductionReport,
} from './digital-form.model';

// Interface for digital form repository
export interface IDigitalFormRepository {
  // Form methods
  getDigitalForm(id: string): Promise<DigitalForm | null>;
  insertDigitalForm(form: DigitalForm): Promise<void>;
  updateDigitalForm(id: string, dto: Partial<DigitalForm>): Promise<void>;
  deleteDigitalForm(id: string): Promise<void>;
  listDigitalForms(
    conditions: DigitalFormCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: DigitalForm[];
    total: number;
  }>;

  // Form entry methods
  listDigitalFormEntries(formId: string): Promise<DigitalFormEntry[]>;
  findFormEntry(
    formId: string,
    userId: string,
    handBagId: string,
    bagColorId: string,
    processId: string,
  ): Promise<DigitalFormEntry | null>;
  insertFormEntry(entry: DigitalFormEntry): Promise<void>;
  updateFormEntry(id: string, dto: Partial<DigitalFormEntry>): Promise<void>;
  updateEntryShiftType(id: string, shiftType: ShiftType): Promise<void>;
  deleteFormEntry(id: string): Promise<void>;

  // Utility methods
  getFactoryCode(factoryId: string): Promise<string>;
  getLineCode(lineId: string): Promise<string>;
  getTeamCode(teamId: string): Promise<string>;
  getGroupCode(groupId: string): Promise<string>;

  // Team report methods
  getTeamInfo(teamId: string): Promise<{
    id: string;
    name: string;
    code: string;
    lineId: string;
    lineName: string;
  }>;
  getTeamForms(
    teamId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DigitalForm[]>;
  getFormEntriesByFormIds(formIds: string[]): Promise<DigitalFormEntry[]>;
  getHandBagDetails(
    handBagIds: string[],
  ): Promise<{ id: string; code: string; name: string }[]>;
  getBagProcessDetails(
    processIds: string[],
  ): Promise<{ id: string; code: string; name: string }[]>;
  getTeamGroups(
    teamId: string,
  ): Promise<{ id: string; name: string; code: string }[]>;
  getGroupEntries(
    groupId: string,
    formIds: string[],
  ): Promise<DigitalFormEntry[]>;

  // Group report methods
  getGroupInfo(groupId: string): Promise<{
    id: string;
    name: string;
    code: string;
    teamId: string;
    teamName: string;
    lineId: string;
    lineName: string;
  }>;
  getGroupForms(
    groupId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DigitalForm[]>;
  getGroupWorkers(
    groupId: string,
  ): Promise<{ id: string; employeeId: string; fullName: string }[]>;
  getWorkerEntries(
    userId: string,
    formIds: string[],
  ): Promise<DigitalFormEntry[]>;

  // Comparison report methods
  getFactoryInfo(factoryId: string): Promise<{
    id: string;
    name: string;
    code: string;
  }>;

  getLineInfo(
    lineId: string,
  ): Promise<{ id: string; name: string; code: string }>;
  getLineTeams(
    lineId: string,
  ): Promise<{ id: string; name: string; code: string }[]>;
  getLineGroups(lineId: string): Promise<
    {
      id: string;
      name: string;
      code: string;
      teamId: string;
      teamName: string;
    }[]
  >;

  getFactoryLines(
    factoryId: string,
  ): Promise<{ id: string; name: string; code: string }[]>;

  getFactoryForms(
    factoryId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DigitalForm[]>;

  getLineForms(
    lineId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DigitalForm[]>;

  getLineFactory(
    lineId: string,
  ): Promise<{ id: string; name: string; code: string }>;
}

// Interface for digital form service
// export interface IDigitalFormService {
//   // Form methods
//   createDigitalForm(
//     requester: Requester,
//     dto: DigitalFormCreateDTO,
//   ): Promise<string>;

//   getDigitalForm(id: string): Promise<DigitalForm>;

//   getDigitalFormWithEntries(id: string): Promise<{
//     form: DigitalForm;
//     entries: DigitalFormEntry[];
//   }>;

//   updateDigitalForm(
//     requester: Requester,
//     id: string,
//     dto: DigitalFormUpdateDTO,
//   ): Promise<void>;

//   deleteDigitalForm(requester: Requester, id: string): Promise<void>;

//   listDigitalForms(
//     conditions: DigitalFormCondDTO,
//     pagination: PaginationDTO,
//   ): Promise<{
//     data: DigitalForm[];
//     total: number;
//     page: number;
//     limit: number;
//   }>;

//   // Form entry methods
//   addFormEntry(
//     requester: Requester,
//     formId: string,
//     dto: DigitalFormEntryDTO,
//   ): Promise<string>;

//   deleteFormEntry(
//     requester: Requester,
//     formId: string,
//     entryId: string,
//   ): Promise<void>;

//   // Form workflow methods
//   submitDigitalForm(
//     requester: Requester,
//     id: string,
//     dto: DigitalFormSubmitDTO,
//   ): Promise<void>;

//   approveDigitalForm(requester: Requester, id: string): Promise<void>;

//   rejectDigitalForm(requester: Requester, id: string): Promise<void>;

//   getProductionReportByFactory(
//     factoryId: string,
//     dateFrom: string,
//     dateTo: string,
//     options?: {
//       includeLines?: boolean;
//       includeTeams?: boolean;
//       includeGroups?: boolean;
//       groupByBag?: boolean;
//       groupByProcess?: boolean;
//     },
//   ): Promise<FactoryProductionReport>;

//   getProductionReportByLine(
//     lineId: string,
//     dateFrom: string,
//     dateTo: string,
//     options?: {
//       includeTeams?: boolean;
//       includeGroups?: boolean;
//       groupByBag?: boolean;
//       groupByProcess?: boolean;
//     },
//   ): Promise<LineProductionReport>;

//   getProductionReportByTeam(
//     teamId: string,
//     dateFrom: string,
//     dateTo: string,
//     options?: {
//       includeGroups?: boolean;
//       includeWorkers?: boolean;
//       groupByBag?: boolean;
//       groupByProcess?: boolean;
//     },
//   ): Promise<TeamProductionReport>;

//   getProductionReportByGroup(
//     groupId: string,
//     dateFrom: string,
//     dateTo: string,
//     options?: {
//       includeWorkers?: boolean;
//       detailedAttendance?: boolean;
//       groupByBag?: boolean;
//       groupByProcess?: boolean;
//     },
//   ): Promise<GroupProductionReport>;

//   getProductionComparisonReport(
//     lineId: string,
//     entityIds: string[], // Team or group IDs
//     compareBy: 'team' | 'group',
//     dateFrom: string,
//     dateTo: string,
//     options?: {
//       includeHandBags?: boolean;
//       includeProcesses?: boolean;
//       includeTimeSeries?: boolean;
//     },
//   ): Promise<ProductionComparisonReport>;

//   // Specialized reports
//   // getProductivityTrendsReport(
//   //   entityType: 'line' | 'team' | 'group',
//   //   entityId: string,
//   //   period: 'day' | 'week' | 'month',
//   //   dateFrom: string,
//   //   dateTo: string,
//   // ): Promise<ProductivityTrendsReport>;

//   // getQualityAnalysisReport(
//   //   entityType: 'line' | 'team' | 'group',
//   //   entityId: string,
//   //   dateFrom: string,
//   //   dateTo: string,
//   // ): Promise<QualityAnalysisReport>;

//   // Export reports
//   exportProductionReport(
//     reportType: 'team' | 'group' | 'comparison',
//     parameters: any,
//     format: 'pdf' | 'excel' | 'csv',
//   ): Promise<{ fileUrl: string }>;
// }

// Main interface for service (unchanged)
export interface IDigitalFormService {
  // Form methods
  createDigitalForm(
    requester: Requester,
    dto: DigitalFormCreateDTO,
  ): Promise<string>;

  getDigitalForm(id: string): Promise<DigitalForm>;

  getDigitalFormWithEntries(id: string): Promise<{
    form: DigitalForm;
    entries: DigitalFormEntry[];
  }>;

  updateDigitalForm(
    requester: Requester,
    id: string,
    dto: DigitalFormUpdateDTO,
  ): Promise<void>;

  deleteDigitalForm(requester: Requester, id: string): Promise<void>;

  listDigitalForms(
    conditions: DigitalFormCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: DigitalForm[];
    total: number;
    page: number;
    limit: number;
  }>;

  // Form entry methods
  addFormEntry(
    requester: Requester,
    formId: string,
    dto: DigitalFormEntryDTO,
  ): Promise<string>;

  deleteFormEntry(
    requester: Requester,
    formId: string,
    entryId: string,
  ): Promise<void>;

  // Form workflow methods
  submitDigitalForm(
    requester: Requester,
    id: string,
    dto: DigitalFormSubmitDTO,
  ): Promise<void>;

  approveDigitalForm(requester: Requester, id: string): Promise<void>;

  rejectDigitalForm(requester: Requester, id: string): Promise<void>;

  // Report methods
  getProductionReportByFactory(
    factoryId: string,
    dateFrom: string,
    dateTo: string,
    options?: {
      includeLines?: boolean;
      includeTeams?: boolean;
      includeGroups?: boolean;
      groupByBag?: boolean;
      groupByProcess?: boolean;
    },
  ): Promise<FactoryProductionReport>;

  getProductionReportByLine(
    lineId: string,
    dateFrom: string,
    dateTo: string,
    options?: {
      includeTeams?: boolean;
      includeGroups?: boolean;
      groupByBag?: boolean;
      groupByProcess?: boolean;
    },
  ): Promise<LineProductionReport>;

  getProductionReportByTeam(
    teamId: string,
    dateFrom: string,
    dateTo: string,
    options?: {
      includeGroups?: boolean;
      includeWorkers?: boolean;
      groupByBag?: boolean;
      groupByProcess?: boolean;
    },
  ): Promise<TeamProductionReport>;

  getProductionReportByGroup(
    groupId: string,
    dateFrom: string,
    dateTo: string,
    options?: {
      includeWorkers?: boolean;
      detailedAttendance?: boolean;
      groupByBag?: boolean;
      groupByProcess?: boolean;
    },
  ): Promise<GroupProductionReport>;

  getProductionComparisonReport(
    lineId: string,
    entityIds: string[],
    compareBy: 'team' | 'group',
    dateFrom: string,
    dateTo: string,
    options?: {
      includeHandBags?: boolean;
      includeProcesses?: boolean;
      includeTimeSeries?: boolean;
    },
  ): Promise<ProductionComparisonReport>;

  // Export methods
  exportProductionReport(
    reportType: 'team' | 'group' | 'comparison',
    parameters: any,
    format: 'pdf' | 'excel' | 'csv',
  ): Promise<{ fileUrl: string }>;
}

// New interfaces for each specialized service
export interface IDigitalFormCoreService {
  createDigitalForm(
    requester: Requester,
    dto: DigitalFormCreateDTO,
  ): Promise<string>;

  createDigitalFormForWorker(
    workerId: string,
    requester: Requester,
  ): Promise<string>;

  getDigitalForm(id: string): Promise<DigitalForm>;

  getDigitalFormWithEntries(id: string): Promise<{
    form: DigitalForm;
    entries: DigitalFormEntry[];
  }>;

  updateDigitalForm(
    requester: Requester,
    id: string,
    dto: DigitalFormUpdateDTO,
  ): Promise<void>;

  deleteDigitalForm(requester: Requester, id: string): Promise<void>;

  listDigitalForms(
    conditions: DigitalFormCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: DigitalForm[];
    total: number;
    page: number;
    limit: number;
  }>;
}

export interface IDigitalFormEntryService {
  addFormEntry(
    requester: Requester,
    formId: string,
    dto: DigitalFormEntryDTO,
  ): Promise<string>;

  updateEntry(
    requester: Requester,
    formId: string,
    entryId: string,
    dto: UpdateFormEntryDTO,
  ): Promise<void>;

  deleteFormEntry(
    requester: Requester,
    formId: string,
    entryId: string,
  ): Promise<void>;
}

export interface IDigitalFormWorkflowService {
  submitDigitalForm(
    requester: Requester,
    id: string,
    dto: DigitalFormSubmitDTO,
  ): Promise<void>;

  approveDigitalForm(requester: Requester, id: string): Promise<void>;

  rejectDigitalForm(requester: Requester, id: string): Promise<void>;
}

export interface IDigitalFormReportService {
  getProductionReportByFactory(
    factoryId: string,
    dateFrom: string,
    dateTo: string,
    options?: {
      includeLines?: boolean;
      includeTeams?: boolean;
      includeGroups?: boolean;
      groupByBag?: boolean;
      groupByProcess?: boolean;
    },
  ): Promise<FactoryProductionReport>;

  getProductionReportByLine(
    lineId: string,
    dateFrom: string,
    dateTo: string,
    options?: {
      includeTeams?: boolean;
      includeGroups?: boolean;
      groupByBag?: boolean;
      groupByProcess?: boolean;
    },
  ): Promise<LineProductionReport>;

  getProductionReportByTeam(
    teamId: string,
    dateFrom: string,
    dateTo: string,
    options?: {
      includeGroups?: boolean;
      includeWorkers?: boolean;
      groupByBag?: boolean;
      groupByProcess?: boolean;
    },
  ): Promise<TeamProductionReport>;

  getProductionReportByGroup(
    groupId: string,
    dateFrom: string,
    dateTo: string,
    options?: {
      includeWorkers?: boolean;
      detailedAttendance?: boolean;
      groupByBag?: boolean;
      groupByProcess?: boolean;
    },
  ): Promise<GroupProductionReport>;

  getProductionComparisonReport(
    lineId: string,
    entityIds: string[],
    compareBy: 'team' | 'group',
    dateFrom: string,
    dateTo: string,
    options?: {
      includeHandBags?: boolean;
      includeProcesses?: boolean;
      includeTimeSeries?: boolean;
    },
  ): Promise<ProductionComparisonReport>;
}

export interface IDigitalFormExportService {
  exportProductionReport(
    reportType: 'team' | 'group' | 'comparison',
    parameters: any,
    format: 'pdf' | 'excel' | 'csv',
  ): Promise<{ fileUrl: string }>;
}
