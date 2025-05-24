import {
  Controller,
  Inject,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
  Logger,
} from '@nestjs/common';
import { RemoteAuthGuard } from 'src/share/guard';
import { LINE_SERVICE } from './line.di-token';
import { ILineService } from './line.port';
import { ErrLineNotFound } from './line.model';
import { AppError } from 'src/share';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('internal/lines')
@UseGuards(RemoteAuthGuard)
@ApiTags('Lines RPC')
export class LineRpcHttpController {
  private readonly logger = new Logger(LineRpcHttpController.name);

  constructor(
    @Inject(LINE_SERVICE) private readonly lineService: ILineService,
  ) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy thông tin dây chuyền theo ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thông tin dây chuyền',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dây chuyền không tồn tại',
  })
  async getLineById(@Param('id') id: string) {
    try {
      const line = await this.lineService.getEntity(id);
      if (!line) {
        throw AppError.from(ErrLineNotFound, 404);
      }
      return { success: true, data: line };
    } catch (error) {
      this.handleControllerError(
        error,
        `Lỗi khi lấy thông tin dây chuyền ${id}`,
      );
    }
  }

  @Get('by-code/:code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy thông tin dây chuyền theo mã code' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thông tin dây chuyền',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dây chuyền không tồn tại',
  })
  async getLineByCode(@Param('code') code: string) {
    try {
      const line = await this.lineService.findByCode(code);
      if (!line) {
        throw AppError.from(ErrLineNotFound, 404);
      }
      return { success: true, data: line };
    } catch (error) {
      this.handleControllerError(
        error,
        `Lỗi khi lấy thông tin dây chuyền với mã ${code}`,
      );
    }
  }

  @Get('factory/:factoryId/list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách dây chuyền theo nhà máy' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Danh sách dây chuyền',
  })
  async getLinesByFactoryId(
    @Param('factoryId') factoryId: string,
    @Query('active') active?: string,
  ) {
    try {
      let lines = await this.lineService.findByFactoryId(factoryId);

      // Lọc theo trạng thái hoạt động nếu có
      if (active === 'true') {
        lines = lines.filter((line) => line.capacity > 0);
      }

      return {
        success: true,
        data: lines,
        meta: {
          total: lines.length,
          factoryId,
        },
      };
    } catch (error) {
      this.handleControllerError(
        error,
        `Lỗi khi lấy danh sách dây chuyền của nhà máy ${factoryId}`,
      );
    }
  }

  // Xử lý lỗi controller một cách nhất quán
  private handleControllerError(error: any, message: string): never {
    this.logger.error(`${message}: ${error.message}`, error.stack);

    if (error instanceof AppError) {
      throw error;
    }

    throw AppError.from(
      new Error(`${message}: ${error.message}`),
      error.status || 500,
    );
  }
}
