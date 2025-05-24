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
import { FACTORY_SERVICE } from './factory.di-token';
import {
  FactoryCondDTO,
  FactoryCreateDTO,
  FactoryManagerDTO,
  FactoryUpdateDTO,
  PaginationDTO,
  SwitchRepositoryDTO,
} from './factory.dto';
import { ErrFactoryNotFound } from './factory.model';
import { IFactoryService } from './factory.port';
import { ApiTags } from '@nestjs/swagger';

@Controller('factories')
@ApiTags('Factories')
@UseGuards(RemoteAuthGuard)
export class FactoryHttpController {
  private readonly logger = new Logger(FactoryHttpController.name);

  constructor(
    @Inject(FACTORY_SERVICE) private readonly factoryService: IFactoryService,
  ) {}

  // Factory CRUD endpoints
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createFactory(
    @Request() req: ReqWithRequester,
    @Body() dto: FactoryCreateDTO,
  ) {
    // Log user role for debugging
    this.logger.log(
      `User ${req.requester.sub} with role ${req.requester.role} attempting to create factory`,
    );

    const factoryId = await this.factoryService.createFactory(
      req.requester,
      dto,
    );
    return {
      success: true,
      data: { id: factoryId },
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listFactories(
    @Request() req: ReqWithRequester,
    @Query() conditions: FactoryCondDTO,
    @Query() pagination: PaginationDTO,
  ) {
    // Ensure pagination has default values
    const validatedPagination: PaginationDTO = {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      sortBy: pagination.sortBy || 'createdAt',
      sortOrder: pagination.sortOrder || 'desc',
    };

    const result = await this.factoryService.listFactories(
      req.requester,
      conditions,
      validatedPagination,
    );

    return { success: true, ...result };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getFactory(@Param('id') id: string) {
    try {
      const factory = await this.factoryService.getFactory(id);
      return { success: true, data: factory };
    } catch (error) {
      if (error instanceof AppError && error.message === 'Not found') {
        throw AppError.from(ErrFactoryNotFound, 404);
      }
      throw error;
    }
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateFactory(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Body() dto: FactoryUpdateDTO,
  ) {
    await this.factoryService.updateFactory(req.requester, id, dto);
    return { success: true };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteFactory(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
  ) {
    await this.factoryService.deleteFactory(req.requester, id);
    return { success: true };
  }

  // Factory manager endpoints
  @Get(':id/managers')
  @HttpCode(HttpStatus.OK)
  async getFactoryManagers(@Param('id') id: string) {
    const managers = await this.factoryService.getFactoryManagers(id);
    return { success: true, data: managers };
  }

  @Post(':id/managers')
  @HttpCode(HttpStatus.CREATED)
  async addFactoryManager(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Body() dto: FactoryManagerDTO,
  ) {
    await this.factoryService.addFactoryManager(req.requester, id, dto);
    return { success: true };
  }

  @Patch(':id/managers/:userId')
  @HttpCode(HttpStatus.OK)
  async updateFactoryManager(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: { isPrimary?: boolean; endDate?: Date },
  ) {
    await this.factoryService.updateFactoryManager(
      req.requester,
      id,
      userId,
      dto.isPrimary !== undefined ? dto.isPrimary : false,
      dto.endDate,
    );
    return { success: true };
  }

  @Delete(':id/managers/:userId')
  @HttpCode(HttpStatus.OK)
  async removeFactoryManager(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    await this.factoryService.removeFactoryManager(req.requester, id, userId);
    return { success: true };
  }

  // Access validation endpoints
  @Get(':id/can-manage')
  @HttpCode(HttpStatus.OK)
  async canManageFactory(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
  ) {
    const canManage = await this.factoryService.canManageFactory(
      req.requester.sub,
      id,
    );
    return { success: true, data: canManage };
  }

  @Get('accessible')
  @HttpCode(HttpStatus.OK)
  async getAccessibleFactories(@Request() req: ReqWithRequester) {
    const factoryIds = await this.factoryService.getUserAccessibleFactories(
      req.requester.sub,
    );

    // Nếu cần trả về thông tin chi tiết của các nhà máy
    if (factoryIds.length > 0) {
      const factories = await Promise.all(
        factoryIds.map((id) => this.factoryService.getFactory(id)),
      );
      return { success: true, data: factories };
    }

    return { success: true, data: [] };
  }

  // New endpoints for managing factory repository adapter
  @Get('system/repository-info')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getRepositoryInfo(): Promise<{
    type: string;
    name: string;
    version?: string;
  }> {
    return this.factoryService.getRepositoryInfo();
  }

  @Post('system/switch-repository')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async switchRepositoryType(
    @Body() dto: SwitchRepositoryDTO,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.factoryService.switchRepositoryType(dto.type, dto.config);
      return {
        success: true,
        message: `Successfully switched to repository type: ${dto.type}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to switch repository: ${error.message}`,
      };
    }
  }
}

// RPC controller cho internal service communication
@Controller('rpc/factories')
export class FactoryRpcHttpController {
  constructor(
    @Inject(FACTORY_SERVICE) private readonly factoryService: IFactoryService,
  ) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getFactory(@Param('id') id: string) {
    try {
      const factory = await this.factoryService.getFactory(id);
      return { success: true, data: factory };
    } catch (error) {
      if (error instanceof AppError && error.message === 'Not found') {
        throw AppError.from(ErrFactoryNotFound, 404);
      }
      throw error;
    }
  }

  @Post('list-by-ids')
  @HttpCode(HttpStatus.OK)
  async listFactoriesByIds(@Body('ids') ids: string[]) {
    if (!ids || !ids.length) {
      return { success: true, data: [] };
    }

    const factories = await Promise.all(
      ids.map((id) => this.factoryService.getFactory(id).catch(() => null)),
    );

    return {
      success: true,
      data: factories.filter((factory) => factory !== null),
    };
  }

  @Post('check-access')
  @HttpCode(HttpStatus.OK)
  async checkFactoryAccess(
    @Body() body: { userId: string; factoryId: string },
  ) {
    const hasAccess = await this.factoryService.canManageFactory(
      body.userId,
      body.factoryId,
    );
    return { success: true, data: hasAccess };
  }

  @Get('user/:userId/accessible')
  @HttpCode(HttpStatus.OK)
  async getUserAccessibleFactories(@Param('userId') userId: string) {
    const factoryIds =
      await this.factoryService.getUserAccessibleFactories(userId);
    return { success: true, data: factoryIds };
  }
}
