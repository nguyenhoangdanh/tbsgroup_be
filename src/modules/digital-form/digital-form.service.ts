import { Inject, Injectable } from '@nestjs/common';
import { Requester } from 'src/share';
import {
  DigitalFormCreateDTO,
  DigitalFormEntryDTO,
  DigitalFormCondDTO,
  PaginationDTO,
  DigitalFormUpdateDTO,
  DigitalFormSubmitDTO,
  UpdateFormEntryDTO,
} from './digital-form.dto';
import {
  DigitalForm,
  DigitalFormEntry,
  FactoryProductionReport,
  GroupProductionReport,
  LineProductionReport,
  ProductionComparisonReport,
  TeamProductionReport,
} from './digital-form.model';
import {
  DIGITAL_FORM_CORE_SERVICE,
  DIGITAL_FORM_ENTRY_SERVICE,
  DIGITAL_FORM_WORKFLOW_SERVICE,
  DIGITAL_FORM_REPORT_SERVICE,
  DIGITAL_FORM_EXPORT_SERVICE,
} from './digital-form.di-token';
import {
  IDigitalFormService,
  IDigitalFormCoreService,
  IDigitalFormEntryService,
  IDigitalFormWorkflowService,
  IDigitalFormReportService,
  IDigitalFormExportService,
} from './digital-form.port';

/**
 * This is a Facade service that delegates to specialized services
 * It implements the complete IDigitalFormService interface by composing
 * functionality from the specialized services
 */
@Injectable()
export class DigitalFormService implements IDigitalFormService {
  constructor(
    @Inject(DIGITAL_FORM_CORE_SERVICE)
    private readonly coreService: IDigitalFormCoreService,

    @Inject(DIGITAL_FORM_ENTRY_SERVICE)
    private readonly entryService: IDigitalFormEntryService,

    @Inject(DIGITAL_FORM_WORKFLOW_SERVICE)
    private readonly workflowService: IDigitalFormWorkflowService,

    @Inject(DIGITAL_FORM_REPORT_SERVICE)
    private readonly reportService: IDigitalFormReportService,

    @Inject(DIGITAL_FORM_EXPORT_SERVICE)
    private readonly exportService: IDigitalFormExportService,
  ) {}

  // Core form operations
  createDigitalForm(
    requester: Requester,
    dto: DigitalFormCreateDTO,
  ): Promise<string> {
    return this.coreService.createDigitalForm(requester, dto);
  }

  getDigitalForm(id: string): Promise<DigitalForm> {
    return this.coreService.getDigitalForm(id);
  }

  getDigitalFormWithEntries(id: string): Promise<{
    form: DigitalForm;
    entries: DigitalFormEntry[];
  }> {
    return this.coreService.getDigitalFormWithEntries(id);
  }

  updateDigitalForm(
    requester: Requester,
    id: string,
    dto: DigitalFormUpdateDTO,
  ): Promise<void> {
    return this.coreService.updateDigitalForm(requester, id, dto);
  }

  deleteDigitalForm(requester: Requester, id: string): Promise<void> {
    return this.coreService.deleteDigitalForm(requester, id);
  }

  listDigitalForms(
    conditions: DigitalFormCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: DigitalForm[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.coreService.listDigitalForms(conditions, pagination);
  }

  // Form entry operations
  addFormEntry(
    requester: Requester,
    formId: string,
    dto: DigitalFormEntryDTO,
  ): Promise<string> {
    return this.entryService.addFormEntry(requester, formId, dto);
  }

  updateFormEntry(
    requester: Requester,
    formId: string,
    entryId: string,
    dto: UpdateFormEntryDTO,
  ): Promise<void> {
    return this.entryService.updateEntry(requester, formId, entryId, dto);
  }

  deleteFormEntry(
    requester: Requester,
    formId: string,
    entryId: string,
  ): Promise<void> {
    return this.entryService.deleteFormEntry(requester, formId, entryId);
  }

  // Workflow operations
  submitDigitalForm(
    requester: Requester,
    id: string,
    dto: DigitalFormSubmitDTO,
  ): Promise<void> {
    return this.workflowService.submitDigitalForm(requester, id, dto);
  }

  approveDigitalForm(requester: Requester, id: string): Promise<void> {
    return this.workflowService.approveDigitalForm(requester, id);
  }

  rejectDigitalForm(
    requester: Requester,
    id: string,
    reason: string,
  ): Promise<void> {
    return this.workflowService.rejectDigitalForm(requester, id, reason);
  }

  // Report operations
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
  ): Promise<FactoryProductionReport> {
    return this.reportService.getProductionReportByFactory(
      factoryId,
      dateFrom,
      dateTo,
      options,
    );
  }

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
  ): Promise<LineProductionReport> {
    return this.reportService.getProductionReportByLine(
      lineId,
      dateFrom,
      dateTo,
      options,
    );
  }

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
  ): Promise<TeamProductionReport> {
    return this.reportService.getProductionReportByTeam(
      teamId,
      dateFrom,
      dateTo,
      options,
    );
  }

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
  ): Promise<GroupProductionReport> {
    return this.reportService.getProductionReportByGroup(
      groupId,
      dateFrom,
      dateTo,
      options,
    );
  }

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
  ): Promise<ProductionComparisonReport> {
    return this.reportService.getProductionComparisonReport(
      lineId,
      entityIds,
      compareBy,
      dateFrom,
      dateTo,
      options,
    );
  }

  // Export operations
  exportProductionReport(
    reportType: 'team' | 'group' | 'comparison',
    parameters: any,
    format: 'pdf' | 'excel' | 'csv',
  ): Promise<{ fileUrl: string }> {
    return this.exportService.exportProductionReport(
      reportType,
      parameters,
      format,
    );
  }

  // Required method implementations from IDigitalFormService
  generateTeamReport(
    teamId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TeamProductionReport> {
    // Convert dates to strings for the report service
    const dateFrom = startDate.toISOString().split('T')[0];
    const dateTo = endDate.toISOString().split('T')[0];

    return this.reportService.getProductionReportByTeam(
      teamId,
      dateFrom,
      dateTo,
      {
        includeGroups: true,
        includeWorkers: true,
        groupByBag: true,
        groupByProcess: true,
      },
    );
  }

  generateGroupReport(
    groupId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<GroupProductionReport> {
    // Convert dates to strings for the report service
    const dateFrom = startDate.toISOString().split('T')[0];
    const dateTo = endDate.toISOString().split('T')[0];

    return this.reportService.getProductionReportByGroup(
      groupId,
      dateFrom,
      dateTo,
      {
        includeWorkers: true,
        detailedAttendance: true,
        groupByBag: true,
        groupByProcess: true,
      },
    );
  }

  generateLineReport(
    lineId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<LineProductionReport> {
    // Convert dates to strings for the report service
    const dateFrom = startDate.toISOString().split('T')[0];
    const dateTo = endDate.toISOString().split('T')[0];

    return this.reportService.getProductionReportByLine(
      lineId,
      dateFrom,
      dateTo,
      {
        includeTeams: true,
        includeGroups: true,
        groupByBag: true,
        groupByProcess: true,
      },
    );
  }

  generateFactoryReport(
    factoryId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<FactoryProductionReport> {
    // Convert dates to strings for the report service
    const dateFrom = startDate.toISOString().split('T')[0];
    const dateTo = endDate.toISOString().split('T')[0];

    return this.reportService.getProductionReportByFactory(
      factoryId,
      dateFrom,
      dateTo,
      {
        includeLines: true,
        includeTeams: true,
        includeGroups: true,
        groupByBag: true,
        groupByProcess: true,
      },
    );
  }

  generateComparisonReport(params: {
    factoryId?: string;
    lineIds?: string[];
    teamIds?: string[];
    groupIds?: string[];
    startDate: Date;
    endDate: Date;
  }): Promise<ProductionComparisonReport> {
    // Convert dates to strings for the report service
    const dateFrom = params.startDate.toISOString().split('T')[0];
    const dateTo = params.endDate.toISOString().split('T')[0];

    // This is a simplified implementation, you may need to adapt it based on your actual requirements
    if (params.lineIds && params.lineIds.length > 0) {
      return this.reportService.getProductionComparisonReport(
        params.lineIds[0],
        params.teamIds || [],
        'team',
        dateFrom,
        dateTo,
        {
          includeHandBags: true,
          includeProcesses: true,
          includeTimeSeries: true,
        },
      );
    } else if (params.factoryId) {
      // If no lineIds provided but factoryId exists, you might need to handle this differently
      throw new Error('Comparison report requires lineIds to be provided');
    } else {
      throw new Error('Insufficient parameters for comparison report');
    }
  }
}
