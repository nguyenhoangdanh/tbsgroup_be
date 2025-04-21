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
