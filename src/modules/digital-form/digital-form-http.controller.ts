import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AppError, ReqWithRequester, UserRole } from 'src/share';
import { RemoteAuthGuard, Roles, RolesGuard } from 'src/share/guard';
import { DIGITAL_FORM_SERVICE } from './digital-form.di-token';
import {
  DigitalFormCondDTO,
  DigitalFormCreateDTO,
  DigitalFormEntryDTO,
  DigitalFormSubmitDTO,
  DigitalFormUpdateDTO,
  PaginationDTO,
} from './digital-form.dto';
import { ErrFormNotFound } from './digital-form.model';
import { IDigitalFormService } from './digital-form.port';

@Controller('digital-forms')
@UseGuards(RemoteAuthGuard)
export class DigitalFormHttpController {
  private readonly logger = new Logger(DigitalFormHttpController.name);

  constructor(
    @Inject(DIGITAL_FORM_SERVICE)
    private readonly digitalFormService: IDigitalFormService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.TEAM_LEADER,
    UserRole.LINE_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @HttpCode(HttpStatus.CREATED)
  async createDigitalForm(
    @Request() req: ReqWithRequester,
    @Body() dto: DigitalFormCreateDTO,
  ) {
    const formId = await this.digitalFormService.createDigitalForm(
      req.requester,
      dto,
    );
    return {
      success: true,
      data: { id: formId },
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listDigitalForms(
    @Query() conditions: DigitalFormCondDTO,
    @Query() pagination: PaginationDTO,
  ) {
    // Ensure pagination has default values
    const validatedPagination: PaginationDTO = {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      sortBy: pagination.sortBy || 'createdAt',
      sortOrder: pagination.sortOrder || 'desc',
    };

    const result = await this.digitalFormService.listDigitalForms(
      conditions,
      validatedPagination,
    );

    return { success: true, ...result };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getDigitalForm(@Param('id') id: string) {
    try {
      const form = await this.digitalFormService.getDigitalForm(id);
      return { success: true, data: form };
    } catch (error) {
      if (error instanceof AppError && error.message === 'Not found') {
        throw AppError.from(ErrFormNotFound, 404);
      }
      throw error;
    }
  }

  @Get(':id/entries')
  @HttpCode(HttpStatus.OK)
  async getDigitalFormWithEntries(@Param('id') id: string) {
    try {
      const data = await this.digitalFormService.getDigitalFormWithEntries(id);
      return { success: true, data };
    } catch (error) {
      if (error instanceof AppError && error.message === 'Not found') {
        throw AppError.from(ErrFormNotFound, 404);
      }
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.TEAM_LEADER,
    UserRole.LINE_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @HttpCode(HttpStatus.OK)
  async updateDigitalForm(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Body() dto: DigitalFormUpdateDTO,
  ) {
    await this.digitalFormService.updateDigitalForm(req.requester, id, dto);
    return { success: true };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.TEAM_LEADER,
    UserRole.LINE_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @HttpCode(HttpStatus.OK)
  async deleteDigitalForm(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
  ) {
    await this.digitalFormService.deleteDigitalForm(req.requester, id);
    return { success: true };
  }

  @Post(':id/entries')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.TEAM_LEADER,
    UserRole.LINE_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @HttpCode(HttpStatus.CREATED)
  async addFormEntry(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Body() dto: DigitalFormEntryDTO,
  ) {
    const entryId = await this.digitalFormService.addFormEntry(
      req.requester,
      id,
      dto,
    );
    return {
      success: true,
      data: { id: entryId },
    };
  }

  @Delete(':formId/entries/:entryId')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.TEAM_LEADER,
    UserRole.LINE_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @HttpCode(HttpStatus.OK)
  async deleteFormEntry(
    @Request() req: ReqWithRequester,
    @Param('formId') formId: string,
    @Param('entryId') entryId: string,
  ) {
    await this.digitalFormService.deleteFormEntry(
      req.requester,
      formId,
      entryId,
    );
    return { success: true };
  }

  @Post(':id/submit')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.TEAM_LEADER,
    UserRole.LINE_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @HttpCode(HttpStatus.OK)
  async submitDigitalForm(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Body() dto: DigitalFormSubmitDTO,
  ) {
    await this.digitalFormService.submitDigitalForm(req.requester, id, dto);
    return { success: true };
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async approveDigitalForm(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
  ) {
    await this.digitalFormService.approveDigitalForm(req.requester, id);
    return { success: true };
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async rejectDigitalForm(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
  ) {
    await this.digitalFormService.rejectDigitalForm(req.requester, id);
    return { success: true };
  }

  @Get(':id/print')
  @HttpCode(HttpStatus.OK)
  async printDigitalForm(@Param('id') id: string) {
    try {
      // Get the form with entries to generate a print-friendly format
      const data = await this.digitalFormService.getDigitalFormWithEntries(id);

      // For the API, we'll return the data and let the frontend handle the printing
      return {
        success: true,
        data: {
          ...data,
          printableFormat: true,
          printTimestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof AppError && error.message === 'Not found') {
        throw AppError.from(ErrFormNotFound, 404);
      }
      throw error;
    }
  }
}

@Controller('digital-forms/reports')
@UseGuards(RemoteAuthGuard)
export class DigitalFormReportsController {
  private readonly logger = new Logger(DigitalFormReportsController.name);

  constructor(
    @Inject(DIGITAL_FORM_SERVICE)
    private readonly digitalFormService: IDigitalFormService,
  ) {}

  @Get('factory/:factoryId')
  @HttpCode(HttpStatus.OK)
  async getFactoryProductionReport(
    @Param('factoryId') factoryId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('includeLines') includeLines: string,
    @Query('includeTeams') includeTeams: string,
    @Query('includeGroups') includeGroups: string,
    @Query('groupByBag') groupByBag: string,
    @Query('groupByProcess') groupByProcess: string,
  ) {
    try {
      const options = {
        includeLines: includeLines === 'true',
        includeTeams: includeTeams === 'true',
        includeGroups: includeGroups === 'true',
        groupByBag: groupByBag === 'true',
        groupByProcess: groupByProcess === 'true',
      };

      const report = await this.digitalFormService.getProductionReportByFactory(
        factoryId,
        dateFrom,
        dateTo,
        options,
      );

      return { success: true, data: report };
    } catch (error) {
      this.logger.error(
        `Error getting factory production report: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error generating report: ${error.message}`),
        500,
      );
    }
  }

  @Get('line/:lineId')
  @HttpCode(HttpStatus.OK)
  async getLineProductionReport(
    @Param('lineId') lineId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('includeTeams') includeTeams: string,
    @Query('includeGroups') includeGroups: string,
    @Query('groupByBag') groupByBag: string,
    @Query('groupByProcess') groupByProcess: string,
  ) {
    try {
      const options = {
        includeTeams: includeTeams === 'true',
        includeGroups: includeGroups === 'true',
        groupByBag: groupByBag === 'true',
        groupByProcess: groupByProcess === 'true',
      };

      const report = await this.digitalFormService.getProductionReportByLine(
        lineId,
        dateFrom,
        dateTo,
        options,
      );

      return { success: true, data: report };
    } catch (error) {
      this.logger.error(
        `Error getting line production report: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error generating report: ${error.message}`),
        500,
      );
    }
  }

  @Get('team/:teamId')
  @HttpCode(HttpStatus.OK)
  async getTeamProductionReport(
    @Param('teamId') teamId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('includeGroups') includeGroups: string,
    @Query('includeWorkers') includeWorkers: string,
    @Query('groupByBag') groupByBag: string,
    @Query('groupByProcess') groupByProcess: string,
  ) {
    try {
      const options = {
        includeGroups: includeGroups === 'true',
        includeWorkers: includeWorkers === 'true',
        groupByBag: groupByBag === 'true',
        groupByProcess: groupByProcess === 'true',
      };

      const report = await this.digitalFormService.getProductionReportByTeam(
        teamId,
        dateFrom,
        dateTo,
        options,
      );

      return { success: true, data: report };
    } catch (error) {
      this.logger.error(
        `Error getting team production report: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error generating report: ${error.message}`),
        500,
      );
    }
  }

  @Get('group/:groupId')
  @HttpCode(HttpStatus.OK)
  async getGroupProductionReport(
    @Param('groupId') groupId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('includeWorkers') includeWorkers: string,
    @Query('detailedAttendance') detailedAttendance: string,
    @Query('groupByBag') groupByBag: string,
    @Query('groupByProcess') groupByProcess: string,
  ) {
    try {
      const options = {
        includeWorkers: includeWorkers === 'true',
        detailedAttendance: detailedAttendance === 'true',
        groupByBag: groupByBag === 'true',
        groupByProcess: groupByProcess === 'true',
      };

      const report = await this.digitalFormService.getProductionReportByGroup(
        groupId,
        dateFrom,
        dateTo,
        options,
      );

      return { success: true, data: report };
    } catch (error) {
      this.logger.error(
        `Error getting group production report: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error generating report: ${error.message}`),
        500,
      );
    }
  }

  @Get('comparison')
  @HttpCode(HttpStatus.OK)
  async getComparisonReport(
    @Query('lineId') lineId: string,
    @Query('entityIds') entityIds: string,
    @Query('compareBy') compareBy: 'team' | 'group',
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('includeHandBags') includeHandBags: string,
    @Query('includeProcesses') includeProcesses: string,
    @Query('includeTimeSeries') includeTimeSeries: string,
  ) {
    try {
      const ids = entityIds.split(',');
      const options = {
        includeHandBags: includeHandBags === 'true',
        includeProcesses: includeProcesses === 'true',
        includeTimeSeries: includeTimeSeries === 'true',
      };

      const report =
        await this.digitalFormService.getProductionComparisonReport(
          lineId,
          ids,
          compareBy,
          dateFrom,
          dateTo,
          options,
        );

      return { success: true, data: report };
    } catch (error) {
      this.logger.error(
        `Error getting comparison report: ${error.message}`,
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

  @Post('export')
  @HttpCode(HttpStatus.OK)
  async exportReport(
    @Body()
    body: {
      reportType: 'team' | 'group' | 'comparison';
      parameters: any;
      format: 'pdf' | 'excel' | 'csv';
    },
  ) {
    try {
      const result = await this.digitalFormService.exportProductionReport(
        body.reportType,
        body.parameters,
        body.format,
      );

      return { success: true, data: result };
    } catch (error) {
      this.logger.error(
        `Error exporting report: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error exporting report: ${error.message}`),
        500,
      );
    }
  }
}
