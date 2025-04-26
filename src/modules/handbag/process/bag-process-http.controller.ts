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
import { BAG_PROCESS_SERVICE } from './bag-process.di-token';
import {
  BagProcessCondDTO,
  BagProcessCreateDTO,
  BagProcessUpdateDTO,
  PaginationDTO,
} from './bag-process.dto';
import { ErrBagProcessNotFound } from './bag-process.model';
import { IBagProcessService } from './bag-process.port';
import { ApiTags } from '@nestjs/swagger';

@Controller('bag-processes')
@ApiTags('Bag-Processes')
@UseGuards(RemoteAuthGuard)
export class BagProcessHttpController {
  private readonly logger = new Logger(BagProcessHttpController.name);

  constructor(
    @Inject(BAG_PROCESS_SERVICE)
    private readonly bagProcessService: IBagProcessService,
  ) {}

  // Helper method for pagination
  private getPaginationWithDefaults(
    partial: Partial<PaginationDTO>,
  ): PaginationDTO {
    return {
      page: partial.page || 1,
      limit: partial.limit || 10,
      sortBy: partial.sortBy || 'orderIndex',
      sortOrder: partial.sortOrder || 'asc',
    };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createBagProcess(
    @Request() req: ReqWithRequester,
    @Body() dto: BagProcessCreateDTO,
  ) {
    const bagProcessId = await this.bagProcessService.createBagProcess(
      req.requester,
      dto,
    );
    return {
      success: true,
      data: { id: bagProcessId },
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listBagProcesses(
    @Query() conditions: BagProcessCondDTO,
    @Query() pagination: PaginationDTO,
  ) {
    // Ensure pagination has default values
    const validatedPagination = this.getPaginationWithDefaults(pagination);

    const result = await this.bagProcessService.listBagProcesses(
      conditions,
      validatedPagination,
    );

    return { success: true, ...result };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getBagProcess(@Param('id') id: string) {
    try {
      const bagProcess = await this.bagProcessService.getBagProcess(id);
      return { success: true, data: bagProcess };
    } catch (error) {
      if (error instanceof AppError && error.message === 'Not found') {
        throw AppError.from(ErrBagProcessNotFound, 404);
      }
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateBagProcess(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Body() dto: BagProcessUpdateDTO,
  ) {
    await this.bagProcessService.updateBagProcess(req.requester, id, dto);
    return { success: true };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteBagProcess(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
  ) {
    await this.bagProcessService.deleteBagProcess(req.requester, id);
    return { success: true };
  }
}

// RPC controller cho internal service communication
@Controller('rpc/bag-processes')
export class BagProcessRpcHttpController {
  constructor(
    @Inject(BAG_PROCESS_SERVICE)
    private readonly bagProcessService: IBagProcessService,
  ) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getBagProcess(@Param('id') id: string) {
    try {
      const bagProcess = await this.bagProcessService.getBagProcess(id);
      return { success: true, data: bagProcess };
    } catch (error) {
      if (error instanceof AppError && error.message === 'Not found') {
        throw AppError.from(ErrBagProcessNotFound, 404);
      }
      throw error;
    }
  }

  @Post('list-by-ids')
  @HttpCode(HttpStatus.OK)
  async listBagProcessesByIds(@Body('ids') ids: string[]) {
    if (!ids || !ids.length) {
      return { success: true, data: [] };
    }

    const bagProcesses = await Promise.all(
      ids.map((id) =>
        this.bagProcessService.getBagProcess(id).catch(() => null),
      ),
    );

    return {
      success: true,
      data: bagProcesses.filter((bagProcess) => bagProcess !== null),
    };
  }

  @Get('by-process-type/:type')
  @HttpCode(HttpStatus.OK)
  async getProcessesByType(@Param('type') processType: string) {
    try {
      const result = await this.bagProcessService.listBagProcesses(
        { processType },
        { page: 1, limit: 100, sortBy: 'orderIndex', sortOrder: 'asc' },
      );

      return { success: true, data: result.data };
    } catch (error) {
      throw AppError.from(
        new Error(
          `Lỗi khi lấy danh sách công đoạn theo loại: ${error.message}`,
        ),
        400,
      );
    }
  }
}
