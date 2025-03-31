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
  UsePipes,
} from '@nestjs/common';
import { AppError, ReqWithRequester, UserRole } from 'src/share';
import { RemoteAuthGuard, Roles, RolesGuard } from 'src/share/guard';
import { BAG_GROUP_RATE_SERVICE } from './bag-group-rate.di-token';
import {
  BagGroupRateCondDTO,
  BagGroupRateCreateDTO,
  BagGroupRateUpdateDTO,
  batchCreateBagGroupRateDTOSchema,
  PaginationDTO,
} from './bag-group-rate.dto';
import { ErrBagGroupRateNotFound } from './bag-group-rate.model';
import { IBagGroupRateService } from './bag-group-rate.port';
import { ZodValidationPipe } from 'src/share/pipes/zod-validation.pipe';

@Controller('bag-group-rates')
@UseGuards(RemoteAuthGuard)
export class BagGroupRateHttpController {
  private readonly logger = new Logger(BagGroupRateHttpController.name);

  constructor(
    @Inject(BAG_GROUP_RATE_SERVICE)
    private readonly bagGroupRateService: IBagGroupRateService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createBagGroupRate(
    @Request() req: ReqWithRequester,
    @Body() dto: BagGroupRateCreateDTO,
  ) {
    const id = await this.bagGroupRateService.createBagGroupRate(
      req.requester,
      dto,
    );
    return {
      success: true,
      data: { id },
    };
  }

  @Post('batch')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.LINE_MANAGER,
    UserRole.TEAM_LEADER,
  )
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(batchCreateBagGroupRateDTOSchema))
  async batchCreateBagGroupRates(
    @Request() req: ReqWithRequester,
    @Body() dto: any,
  ) {
    const ids = await this.bagGroupRateService.batchCreateBagGroupRates(
      req.requester,
      dto,
    );
    return {
      success: true,
      data: { ids },
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listBagGroupRates(
    @Query() conditions: BagGroupRateCondDTO,
    @Query() pagination: PaginationDTO,
  ) {
    // Ensure pagination has default values
    const validatedPagination: PaginationDTO = {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      sortBy: pagination.sortBy || 'createdAt',
      sortOrder: pagination.sortOrder || 'desc',
    };

    const result = await this.bagGroupRateService.listBagGroupRates(
      conditions,
      validatedPagination,
    );

    return { success: true, ...result };
  }

  @Get('group-by-hand-bags')
  @HttpCode(HttpStatus.OK)
  async getBagGroupRatesByHandBag() {
    try {
      this.logger.log('Calling group-by-hand-bags endpoint');
      const data = await this.bagGroupRateService.groupBagGroupRatesByHandBag();
      this.logger.log(
        `Successfully retrieved grouped data: ${data.handBags?.length} handbags`,
      );
      return { success: true, data };
    } catch (error) {
      this.logger.error(
        `Error in group-by-hand-bags: ${error.message}`,
        error.stack,
      );
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.from(
        new Error(`Lỗi khi lấy dữ liệu túi theo nhóm: ${error.message}`),
        500,
      );
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getBagGroupRate(@Param('id') id: string) {
    try {
      const bagGroupRate = await this.bagGroupRateService.getBagGroupRate(id);
      return { success: true, data: bagGroupRate };
    } catch (error) {
      if (error instanceof AppError && error.message === 'Not found') {
        throw AppError.from(ErrBagGroupRateNotFound, 404);
      }
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateBagGroupRate(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Body() dto: BagGroupRateUpdateDTO,
  ) {
    await this.bagGroupRateService.updateBagGroupRate(req.requester, id, dto);
    return { success: true };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteBagGroupRate(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
  ) {
    await this.bagGroupRateService.deleteBagGroupRate(req.requester, id);
    return { success: true };
  }

  @Get('hand-bag/:handBagId')
  @HttpCode(HttpStatus.OK)
  async getBagGroupRatesForHandBag(@Param('handBagId') handBagId: string) {
    const data =
      await this.bagGroupRateService.getBagGroupRatesForHandBag(handBagId);
    return { success: true, data };
  }

  @Get('group/:groupId')
  @HttpCode(HttpStatus.OK)
  async getBagGroupRatesForGroup(@Param('groupId') groupId: string) {
    const data =
      await this.bagGroupRateService.getBagGroupRatesForGroup(groupId);
    return { success: true, data };
  }

  @Get('analysis/hand-bag/:handBagId')
  @HttpCode(HttpStatus.OK)
  async getProductivityAnalysis(@Param('handBagId') handBagId: string) {
    const data =
      await this.bagGroupRateService.getProductivityAnalysis(handBagId);
    return { success: true, data };
  }

  // Đảm bảo các endpoint với tham số động ở sau endpoint cố định
  @Get('hand-bag/:handBagId/details')
  @HttpCode(HttpStatus.OK)
  async getHandBagGroupRatesDetails(@Param('handBagId') handBagId: string) {
    const data =
      await this.bagGroupRateService.getHandBagGroupRatesDetails(handBagId);
    return { success: true, data };
  }
}

// RPC Controller cho giao tiếp nội bộ giữa các service
@Controller('rpc/bag-group-rates')
export class BagGroupRateRpcHttpController {
  constructor(
    @Inject(BAG_GROUP_RATE_SERVICE)
    private readonly bagGroupRateService: IBagGroupRateService,
  ) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getBagGroupRate(@Param('id') id: string) {
    try {
      const bagGroupRate = await this.bagGroupRateService.getBagGroupRate(id);
      return { success: true, data: bagGroupRate };
    } catch (error) {
      if (error instanceof AppError && error.message === 'Not found') {
        throw AppError.from(ErrBagGroupRateNotFound, 404);
      }
      throw error;
    }
  }

  @Get('hand-bag/:handBagId')
  @HttpCode(HttpStatus.OK)
  async getBagGroupRatesForHandBag(@Param('handBagId') handBagId: string) {
    const data =
      await this.bagGroupRateService.getBagGroupRatesForHandBag(handBagId);
    return { success: true, data };
  }

  @Get('group/:groupId')
  @HttpCode(HttpStatus.OK)
  async getBagGroupRatesForGroup(@Param('groupId') groupId: string) {
    const data =
      await this.bagGroupRateService.getBagGroupRatesForGroup(groupId);
    return { success: true, data };
  }

  @Get('analysis/hand-bag/:handBagId')
  @HttpCode(HttpStatus.OK)
  async getProductivityAnalysis(@Param('handBagId') handBagId: string) {
    const data =
      await this.bagGroupRateService.getProductivityAnalysis(handBagId);
    return { success: true, data };
  }
}
