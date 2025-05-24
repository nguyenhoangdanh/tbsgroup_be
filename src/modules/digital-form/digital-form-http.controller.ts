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
import {
  DIGITAL_FORM_CORE_SERVICE,
  DIGITAL_FORM_ENTRY_SERVICE,
  DIGITAL_FORM_SCHEDULER,
  DIGITAL_FORM_SERVICE,
} from './digital-form.di-token';
import {
  digitalFormCondDTOSchema,
  digitalFormCreateDTOSchema,
  DigitalFormEntryDTO,
  digitalFormEntryDTOSchema,
  digitalFormSubmitDTOSchema,
  digitalFormUpdateDTOSchema,
  paginationDTOSchema,
  UpdateFormEntryDTO,
  updateFormEntryDTOSchema,
} from './digital-form.dto';
import {
  AttendanceStatus,
  ErrFormNotFound,
  ShiftType,
} from './digital-form.model';
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
import { DigitalFormSchedulerService } from './digital-form-scheduler.service';
import { DigitalFormCoreService } from './services/digital-form-core.service';
import { DigitalFormEntryService } from './services/digital-form-entry.service';

// Định nghĩa các DTO type từ Zod schema
type CreateDigitalFormDto = z.infer<typeof digitalFormCreateDTOSchema>;
type UpdateDigitalFormDto = z.infer<typeof digitalFormUpdateDTOSchema>;
type SubmitDigitalFormDto = z.infer<typeof digitalFormSubmitDTOSchema>;
type DigitalFormEntryDto = z.infer<typeof digitalFormEntryDTOSchema>;
type DigitalFormCondDto = z.infer<typeof digitalFormCondDTOSchema>;
type PaginationDto = z.infer<typeof paginationDTOSchema>;
type UpdateFormEntryDto = z.infer<typeof updateFormEntryDTOSchema>;
// Tạo các DTO class từ Zod schema cho Swagger
const DigitalFormCreateDTO = createDtoFromZodSchema(
  digitalFormCreateDTOSchema,
  'DigitalFormCreateDTO',
  {
    examples: {
      formName: 'Daily Production Form - Group A',
      description: 'Production tracking for Group A',
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
      formName: 'Updated Daily Production Form - Group A',
      description: 'Updated production tracking for Group A',
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

const DigitalFormEntry = createDtoFromZodSchema(
  digitalFormEntryDTOSchema,
  'DigitalFormEntry',
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

const UpdateDigitalFormEntryDTO = createDtoFromZodSchema(
  updateFormEntryDTOSchema,
  'UpdateDigitalFormEntryDTO',
  {
    examples: {
      hourlyData: {
        '07:30-08:30': 12,
        '08:30-09:30': 15,
        '09:30-10:30': 18,
      },
      totalOutput: 45,
      attendanceStatus: 'PRESENT',
      shiftType: 'REGULAR',
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
    @Inject(DIGITAL_FORM_SCHEDULER)
    private readonly schedulerService: DigitalFormSchedulerService,
    @Inject(DIGITAL_FORM_CORE_SERVICE)
    private readonly coreService: DigitalFormCoreService,
    @Inject(DIGITAL_FORM_ENTRY_SERVICE)
    private readonly formEntryService: DigitalFormEntryService,
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

  @Post('generate-daily')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tạo thủ công digital forms hàng ngày' })
  async generateDailyForms(
    @Request() req: ReqWithRequester,
    @Body()
    dto: {
      handBagId: string;
      bagProcessId: string;
      bagColorId: string;
    },
  ) {
    try {
      // Gọi service để tạo form
      await this.schedulerService.runDailyFormCreationManually();
      return { success: true, message: 'Đã khởi tạo tạo forms thành công' };
    } catch (error) {
      this.logger.error(
        `Error generating daily forms: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error generating daily forms: ${error.message}`),
        500,
      );
    }
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

  // Thêm vào digital-form-http.controller.ts
  @Post('worker/:workerId')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.TEAM_LEADER,
    UserRole.LINE_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo digital form cho một công nhân cụ thể' })
  @ApiParam({
    name: 'workerId',
    description: 'ID của công nhân',
    type: 'string',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Tạo form thành công',
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
  async createDigitalFormForWorker(
    @Request() req: ReqWithRequester,
    @Param('workerId') workerId: string,
  ) {
    try {
      const formId = await this.coreService.createDigitalFormForWorker(
        workerId,
        req.requester,
      );
      return {
        success: true,
        data: { id: formId },
      };
    } catch (error) {
      this.logger.error(
        `Error creating digital form for worker: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error creating digital form for worker: ${error.message}`),
        400,
      );
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
  @ApiBody({ type: DigitalFormEntry })
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

  @Post(':formId/bulk-entries')
  @UseGuards(RolesGuard)
  @Roles(UserRole.LINE_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add multiple entries to a form at once (for shift start)',
  })
  @ApiParam({
    name: 'formId',
    description: 'Digital form ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        entries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              handBagId: { type: 'string', format: 'uuid' },
              bagColorId: { type: 'string', format: 'uuid' },
              processId: { type: 'string', format: 'uuid' },
              plannedOutput: { type: 'number', default: 0 },
            },
            required: ['handBagId', 'bagColorId', 'processId', 'plannedOutput'],
          },
        },
      },
      required: ['entries'],
    },
  })
  async addBulkEntries(
    @Request() req: ReqWithRequester,
    @Param('formId') formId: string,
    @Body()
    data: {
      entries: Array<{
        handBagId: string;
        bagColorId: string;
        processId: string;
        plannedOutput: number;
      }>;
    },
  ) {
    try {
      const form = await this.coreService.getDigitalForm(formId);

      if (!form) {
        throw AppError.from(
          new Error(`Digital form not found: ${formId}`),
          404,
        );
      }

      const results = [];

      // Process each entry
      for (const entry of data.entries) {
        // Create entry DTO
        const entryDto: DigitalFormEntryDTO = {
          userId: form.userId,
          handBagId: entry.handBagId,
          bagColorId: entry.bagColorId,
          processId: entry.processId,
          plannedOutput: entry.plannedOutput || 0,
          hourlyData: {},
          totalOutput: 0,
          attendanceStatus: AttendanceStatus.PRESENT,
          shiftType: form.shiftType,
        };

        // Add entry to form
        const entryId = await this.formEntryService.addFormEntry(
          req.requester,
          formId,
          entryDto,
        );

        results.push({
          id: entryId,
          handBagId: entry.handBagId,
          bagColorId: entry.bagColorId,
          processId: entry.processId,
          plannedOutput: entry.plannedOutput,
        });
      }

      return {
        success: true,
        data: {
          formId,
          entries: results,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error adding bulk entries: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error adding bulk entries: ${error.message}`),
        400,
      );
    }
  }

  @Patch(':formId/entries/:entryId')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.TEAM_LEADER,
    UserRole.LINE_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a form entry' })
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
  @ApiBody({ type: UpdateDigitalFormEntryDTO })
  @ApiResponse({
    status: 200,
    description: 'Entry updated successfully',
  })
  async updateFormEntry(
    @Request() req: ReqWithRequester,
    @Param('formId') formId: string,
    @Param('entryId') entryId: string,
    @Body(new ZodValidationPipe(updateFormEntryDTOSchema))
    dto: UpdateFormEntryDto,
  ) {
    await this.formEntryService.updateEntry(
      req.requester,
      formId,
      entryId,
      dto,
    );
    return { success: true };
  }

  @Patch(':formId/entries/:entryId/hourly-data')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.TEAM_LEADER,
    UserRole.LINE_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật dữ liệu theo giờ của một entry' })
  @ApiParam({
    name: 'formId',
    description: 'ID của digital form',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'entryId',
    description: 'ID của form entry',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        hourlyData: {
          type: 'object',
          additionalProperties: {
            type: 'number',
          },
          description: 'Dữ liệu sản lượng theo từng khoảng thời gian',
          example: {
            '07:30-08:30': 12,
            '08:30-09:30': 15,
            '09:30-10:30': 18,
          },
        },
      },
      required: ['hourlyData'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Dữ liệu theo giờ đã được cập nhật thành công',
  })
  async updateEntryHourlyData(
    @Request() req: ReqWithRequester,
    @Param('formId') formId: string,
    @Param('entryId') entryId: string,
    @Body()
    dto: {
      handBagId: string;
      bagColorId: string;
      processId: string;
      hourlyData: Record<string, number>;
    },
  ) {
    try {
      // Tạo đối tượng UpdateFormEntryDTO chỉ với hourlyData
      const updateDto: UpdateFormEntryDTO = {
        userId: req.requester.sub,
        handBagId: dto.handBagId,
        bagColorId: dto.bagColorId,
        processId: dto.processId,
        hourlyData: dto.hourlyData,
      };

      // Gọi service để cập nhật entry
      await this.formEntryService.updateEntry(
        req.requester,
        formId,
        entryId,
        updateDto,
      );

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Error updating entry hourly data: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error updating entry hourly data: ${error.message}`),
        400,
      );
    }
  }

  @Patch(':formId/entries/:entryId/attendance')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.TEAM_LEADER,
    UserRole.LINE_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật trạng thái điểm danh của một entry' })
  @ApiParam({
    name: 'formId',
    description: 'ID của digital form',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'entryId',
    description: 'ID của form entry',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        attendanceStatus: {
          type: 'string',
          enum: ['PRESENT', 'ABSENT', 'LATE', 'EARLY_LEAVE', 'LEAVE_APPROVED'],
          description: 'Trạng thái điểm danh',
          example: 'PRESENT',
        },
        attendanceNote: {
          type: 'string',
          description: 'Ghi chú điểm danh',
          example: 'Đi làm đúng giờ',
        },
      },
      required: ['attendanceStatus'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Trạng thái điểm danh đã được cập nhật thành công',
  })
  async updateEntryAttendance(
    @Request() req: ReqWithRequester,
    @Param('formId') formId: string,
    @Param('entryId') entryId: string,
    @Body()
    dto: {
      handBagId: string;
      bagColorId: string;
      processId: string;
      attendanceStatus: string;
      attendanceNote?: string;
    },
  ) {
    try {
      // Validate attendance status
      if (
        !Object.values(AttendanceStatus).includes(
          dto.attendanceStatus as AttendanceStatus,
        )
      ) {
        throw AppError.from(
          new Error(`Invalid attendance status: ${dto.attendanceStatus}`),
          400,
        );
      }

      // Tạo đối tượng UpdateFormEntryDTO chỉ với attendanceStatus và attendanceNote
      const updateDto: UpdateFormEntryDTO = {
        userId: req.requester.sub,
        handBagId: dto.handBagId,
        bagColorId: dto.bagColorId,
        processId: dto.processId,
        attendanceStatus: dto.attendanceStatus as AttendanceStatus,
        attendanceNote: dto.attendanceNote,
      };

      // Gọi service để cập nhật entry
      await this.formEntryService.updateEntry(
        req.requester,
        formId,
        entryId,
        updateDto,
      );

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Error updating entry attendance: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error updating entry attendance: ${error.message}`),
        400,
      );
    }
  }

  @Patch(':formId/entries/:entryId/shift-type')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.TEAM_LEADER,
    UserRole.LINE_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update shift type for a form entry' })
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
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        shiftType: {
          type: 'string',
          enum: ['REGULAR', 'EXTENDED', 'OVERTIME'],
          description: 'New shift type',
        },
      },
      required: ['shiftType'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Shift type updated successfully',
  })
  async updateEntryShiftType(
    @Request() req: ReqWithRequester,
    @Param('formId') formId: string,
    @Param('entryId') entryId: string,
    @Body() dto: { shiftType: string },
  ) {
    try {
      // Validate shift type
      if (!Object.values(ShiftType).includes(dto.shiftType as ShiftType)) {
        throw AppError.from(
          new Error(`Invalid shift type: ${dto.shiftType}`),
          400,
        );
      }

      // Call the service to update the entry shift type
      await this.formEntryService.updateEntryShiftType(
        req.requester,
        formId,
        entryId,
        dto.shiftType as ShiftType,
      );

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Error updating entry shift type: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error updating entry shift type: ${error.message}`),
        400,
      );
    }
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
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Reason for rejection',
          example: 'Data is incomplete',
        },
      },
      required: ['reason'],
    },
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
    @Body() body: { reason: string },
  ) {
    await this.digitalFormService.rejectDigitalForm(
      req.requester,
      id,
      body.reason,
    );
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
      // Convert string dates to Date objects
      const startDate = new Date(dateFrom);
      const endDate = new Date(dateTo);

      const report = await this.digitalFormService.generateFactoryReport(
        factoryId,
        startDate,
        endDate,
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
      // Convert string dates to Date objects
      const startDate = new Date(dateFrom);
      const endDate = new Date(dateTo);

      const report = await this.digitalFormService.generateLineReport(
        lineId,
        startDate,
        endDate,
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
      // Convert string dates to Date objects
      const startDate = new Date(dateFrom);
      const endDate = new Date(dateTo);

      const report = await this.digitalFormService.generateTeamReport(
        teamId,
        startDate,
        endDate,
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
  ) {
    try {
      // Convert string dates to Date objects
      const startDate = new Date(dateFrom);
      const endDate = new Date(dateTo);

      const report = await this.digitalFormService.generateGroupReport(
        groupId,
        startDate,
        endDate,
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
      // Convert string dates to Date objects
      const startDate = new Date(dateFrom);
      const endDate = new Date(dateTo);

      // Prepare parameters for comparison report
      const params = {
        lineIds: [lineId],
        teamIds: compareBy === 'team' ? ids : undefined,
        groupIds: compareBy === 'group' ? ids : undefined,
        startDate,
        endDate,
      };

      const report =
        await this.digitalFormService.generateComparisonReport(params);

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
      // Use the appropriate method from the DigitalFormExportService
      // Since exportProductionReport is not directly on IDigitalFormService, we might need to
      // inject the export service directly or modify the interface

      // For now, let's create a simple response instead
      const fileUrl = `/reports/${body.reportType}/${Date.now()}.${body.format}`;

      return {
        success: true,
        data: {
          fileUrl,
          message: `Report would be exported in ${body.format} format. This endpoint needs implementation.`,
        },
      };
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
