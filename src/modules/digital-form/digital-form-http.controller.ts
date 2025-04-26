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
  digitalFormCondDTOSchema,
  digitalFormCreateDTOSchema,
  digitalFormEntryDTOSchema,
  digitalFormSubmitDTOSchema,
  digitalFormUpdateDTOSchema,
  paginationDTOSchema,
} from './digital-form.dto';
import { ErrFormNotFound } from './digital-form.model';
import { IDigitalFormService } from './digital-form.port';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { createDtoFromZodSchema } from 'src/utils/zod-to-swagger.util';
import { ZodValidationPipe } from 'src/share/pipes/zod-validation.pipe';
import { z } from 'zod';

// Định nghĩa các DTO type từ Zod schema
type CreateDigitalFormDto = z.infer<typeof digitalFormCreateDTOSchema>;
type UpdateDigitalFormDto = z.infer<typeof digitalFormUpdateDTOSchema>;
type SubmitDigitalFormDto = z.infer<typeof digitalFormSubmitDTOSchema>;
type DigitalFormEntryDto = z.infer<typeof digitalFormEntryDTOSchema>;
type DigitalFormCondDto = z.infer<typeof digitalFormCondDTOSchema>;
type PaginationDto = z.infer<typeof paginationDTOSchema>;

// Tạo các DTO class từ Zod schema cho Swagger
const DigitalFormCreateDTO = createDtoFromZodSchema(
  digitalFormCreateDTOSchema,
  'DigitalFormCreateDTO',
  {
    examples: {
      formName: 'Daily Production Form - Team A',
      description: 'Production tracking for Team A',
      date: '2023-04-15',
      shiftType: 'REGULAR',
      factoryId: '123e4567-e89b-12d3-a456-426614174000',
      lineId: '123e4567-e89b-12d3-a456-426614174001',
      teamId: '123e4567-e89b-12d3-a456-426614174002',
      groupId: '123e4567-e89b-12d3-a456-426614174003',
    },
  },
);

const DigitalFormUpdateDTO = createDtoFromZodSchema(
  digitalFormUpdateDTOSchema,
  'DigitalFormUpdateDTO',
  {
    examples: {
      formName: 'Updated Daily Production Form - Team A',
      description: 'Updated production tracking for Team A',
    },
  },
);

const DigitalFormSubmitDTO = createDtoFromZodSchema(
  digitalFormSubmitDTOSchema,
  'DigitalFormSubmitDTO',
  {
    examples: {
      approvalRequestId: '123e4567-e89b-12d3-a456-426614174030',
    },
  },
);

const DigitalFormEntryDTO = createDtoFromZodSchema(
  digitalFormEntryDTOSchema,
  'DigitalFormEntryDTO',
  {
    examples: {
      userId: '123e4567-e89b-12d3-a456-426614174011',
      handBagId: '123e4567-e89b-12d3-a456-426614174012',
      bagColorId: '123e4567-e89b-12d3-a456-426614174013',
      processId: '123e4567-e89b-12d3-a456-426614174014',
      hourlyData: {
        '07:30-08:30': 12,
        '08:30-09:30': 15,
        '09:30-10:30': 18,
      },
      totalOutput: 45,
      attendanceStatus: 'PRESENT',
      issues: [
        {
          type: 'WAITING_MATERIALS',
          hour: 2,
          impact: 20,
          description: 'Waiting for materials for 20 minutes',
        },
      ],
      qualityScore: 90,
    },
  },
);

@Controller('digital-forms')
@ApiTags('Digital-forms')
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
  @ApiOperation({ summary: 'Create a new digital form' })
  @ApiBody({ type: DigitalFormCreateDTO })
  @ApiCreatedResponse({
    description: 'The form has been successfully created',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createDigitalForm(
    @Request() req: ReqWithRequester,
    @Body(new ZodValidationPipe(digitalFormCreateDTOSchema))
    dto: CreateDigitalFormDto,
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
  @ApiOperation({ summary: 'List digital forms with filtering and pagination' })
  @ApiOkResponse({
    description: 'List of digital forms',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                example: '123e4567-e89b-12d3-a456-426614174000',
              },
              formCode: {
                type: 'string',
                example: 'PCD-230415-F01-L03-T02-G01-R-001',
              },
              formName: {
                type: 'string',
                example: 'Daily Production Form - Team A',
              },
              status: {
                type: 'string',
                enum: ['DRAFT', 'PENDING', 'CONFIRMED', 'REJECTED'],
                example: 'DRAFT',
              },
              date: {
                type: 'string',
                format: 'date-time',
                example: '2023-04-15T00:00:00.000Z',
              },
            },
          },
        },
        total: { type: 'number', example: 42 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
      },
    },
  })
  async listDigitalForms(
    // @Query(new ZodValidationPipe(digitalFormCondDTOSchema, true))
    // conditions: DigitalFormCondDto,
    // @Query(new ZodValidationPipe(paginationDTOSchema))
    // pagination: PaginationDto,
    @Query() queryParams: Record<string, string>,
  ) {
    // // Ensure pagination has default values
    // const validatedPagination: PaginationDTO = {
    //   page: pagination.page || 1,
    //   limit: pagination.limit || 10,
    //   sortBy: pagination.sortBy || 'createdAt',
    //   sortOrder: pagination.sortOrder || 'desc',
    // };

    // const result = await this.digitalFormService.listDigitalForms(
    //   conditions,
    //   validatedPagination,
    // );

    // Parse các điều kiện lọc
    const conditions: DigitalFormCondDto = {};
    if (queryParams.factoryId) conditions.factoryId = queryParams.factoryId;
    if (queryParams.lineId) conditions.lineId = queryParams.lineId;
    if (queryParams.teamId) conditions.teamId = queryParams.teamId;
    if (queryParams.groupId) conditions.groupId = queryParams.groupId;
    if (queryParams.createdById)
      conditions.createdById = queryParams.createdById;
    if (queryParams.status) conditions.status = queryParams.status as any; // Cast to expected enum type
    if (queryParams.dateFrom) conditions.dateFrom = queryParams.dateFrom;
    if (queryParams.dateTo) conditions.dateTo = queryParams.dateTo;
    if (queryParams.shiftType)
      conditions.shiftType = queryParams.shiftType as any; // Cast to expected enum type
    if (queryParams.search) conditions.search = queryParams.search;

    // Parse pagination
    const pagination: PaginationDto = {
      page: queryParams.page ? parseInt(queryParams.page, 10) : 1,
      limit: queryParams.limit ? parseInt(queryParams.limit, 10) : 10,
      sortBy: queryParams.sortBy || 'createdAt',
      sortOrder: (queryParams.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = await this.digitalFormService.listDigitalForms(
      conditions,
      pagination,
    );

    return { success: true, ...result };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a specific digital form by ID' })
  @ApiParam({
    name: 'id',
    description: 'Digital form ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'The form details',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            formCode: {
              type: 'string',
              example: 'PCD-230415-F01-L03-T02-G01-R-001',
            },
            formName: {
              type: 'string',
              example: 'Daily Production Form - Team A',
            },
            description: {
              type: 'string',
              example: 'Production tracking for Team A',
            },
            date: {
              type: 'string',
              format: 'date-time',
              example: '2023-04-15T00:00:00.000Z',
            },
            shiftType: {
              type: 'string',
              enum: ['REGULAR', 'EXTENDED', 'OVERTIME'],
              example: 'REGULAR',
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'PENDING', 'CONFIRMED', 'REJECTED'],
              example: 'DRAFT',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Digital form not found' })
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
  @ApiOperation({ summary: 'Update a digital form' })
  @ApiParam({
    name: 'id',
    description: 'Digital form ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: DigitalFormUpdateDTO })
  @ApiOkResponse({
    description: 'The form has been successfully updated',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Digital form not found' })
  async updateDigitalForm(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(digitalFormUpdateDTOSchema))
    dto: UpdateDigitalFormDto,
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
  @ApiOperation({ summary: 'Delete a digital form' })
  @ApiParam({
    name: 'id',
    description: 'Digital form ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'The form has been successfully deleted',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Digital form not found' })
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
  @ApiOperation({ summary: 'Add an entry to a digital form' })
  @ApiParam({
    name: 'id',
    description: 'Digital form ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: DigitalFormEntryDTO })
  @ApiCreatedResponse({
    description: 'The entry has been successfully created',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174020',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Digital form not found' })
  async addFormEntry(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(digitalFormEntryDTOSchema))
    dto: DigitalFormEntryDto,
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
  @ApiOperation({ summary: 'Delete an entry from a digital form' })
  @ApiParam({
    name: 'formId',
    description: 'Digital form ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'entryId',
    description: 'Form entry ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'The entry has been successfully deleted',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Digital form or entry not found' })
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
  @ApiOperation({ summary: 'Submit a digital form for approval' })
  @ApiParam({
    name: 'id',
    description: 'Digital form ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: DigitalFormSubmitDTO })
  @ApiOkResponse({
    description: 'The form has been successfully submitted',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Digital form not found' })
  async submitDigitalForm(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(digitalFormSubmitDTOSchema))
    dto: SubmitDigitalFormDto,
  ) {
    await this.digitalFormService.submitDigitalForm(req.requester, id, dto);
    return { success: true };
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve a submitted digital form' })
  @ApiParam({
    name: 'id',
    description: 'Digital form ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'The form has been successfully approved',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - form is not in a state that can be approved',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have admin permissions',
  })
  @ApiResponse({ status: 404, description: 'Digital form not found' })
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
  @ApiOperation({ summary: 'Reject a submitted digital form' })
  @ApiParam({
    name: 'id',
    description: 'Digital form ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'The form has been successfully rejected',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - form is not in a state that can be rejected',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have admin permissions',
  })
  @ApiResponse({ status: 404, description: 'Digital form not found' })
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
@ApiTags('Digital-Forms-Reports')
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
