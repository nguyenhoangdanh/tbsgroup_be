import {
  Inject,
  UseGuards,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { Line } from './line.model';
import {
  LineCreateDTO,
  LineUpdateDTO,
  LineCondDTO,
  LineManagerDTO,
} from './line.dto';
import { CRUD_OPTIONS, CrudController } from 'src/CrudModule/crud.decorator';
import { LINE_SERVICE } from './line.di-token';
import { ReqWithRequester } from 'src/share';
import { ILineService } from './line.port';
import { RemoteAuthGuard } from 'src/share/guard';
import { BaseCrudController } from 'src/CrudModule/base-crud.controller';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

// @Controller('lines')
@CrudController({
  path: 'lines',
  model: Line, // Using the class directly
  createDto: LineCreateDTO, // Using the class directly
  updateDto: LineUpdateDTO, // Using the class directly
  conditionDto: LineCondDTO, // Using the class directly
})
@ApiTags('Lines')
@UseGuards(RemoteAuthGuard)
export class LineCrudController extends BaseCrudController<
  Line,
  LineCreateDTO,
  LineUpdateDTO,
  LineCondDTO
> {
  constructor(
    @Inject(LINE_SERVICE) private readonly lineService: ILineService,
    @Inject(CRUD_OPTIONS) options: any,
  ) {
    super(lineService, options);
  }

  // Các endpoint tùy chỉnh ngoài CRUD cơ bản

  // Endpoint để lấy dây chuyền theo factory
  @Get('factory/:factoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách dây chuyền theo nhà máy' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Danh sách dây chuyền của nhà máy',
  })
  @ApiParam({ name: 'factoryId', description: 'ID của nhà máy' })
  @ApiBearerAuth()
  async getLinesByFactory(
    @Request() req: ReqWithRequester,
    @Param('factoryId') factoryId: string,
  ) {
    const lines = await this.lineService.findByFactoryId(factoryId);
    return { success: true, data: lines };
  }

  // Line manager endpoints
  @Get(':id/managers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách người quản lý dây chuyền' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Danh sách người quản lý',
  })
  @ApiParam({ name: 'id', description: 'ID của dây chuyền' })
  @ApiBearerAuth()
  async getLineManagers(@Param('id') id: string) {
    const managers = await this.lineService.getLineManagers(id);
    return { success: true, data: managers };
  }

  @Post(':id/managers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Thêm người quản lý cho dây chuyền' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Thêm người quản lý thành công',
  })
  @ApiParam({ name: 'id', description: 'ID của dây chuyền' })
  @ApiBody({ type: LineManagerDTO })
  @ApiBearerAuth()
  async addLineManager(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Body() dto: LineManagerDTO,
  ) {
    await this.lineService.addLineManager(req.requester, id, dto);
    return { success: true, message: 'Thêm người quản lý thành công' };
  }

  @Patch(':id/managers/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật thông tin người quản lý dây chuyền' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cập nhật thành công' })
  @ApiParam({ name: 'id', description: 'ID của dây chuyền' })
  @ApiParam({ name: 'userId', description: 'ID của người dùng' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isPrimary: {
          type: 'boolean',
          description: 'Là quản lý chính',
          default: false,
        },
        endDate: {
          type: 'string',
          format: 'date-time',
          description: 'Ngày kết thúc',
        },
      },
    },
  })
  @ApiBearerAuth()
  async updateLineManager(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: { isPrimary?: boolean; endDate?: Date },
  ) {
    await this.lineService.updateLineManager(
      req.requester,
      id,
      userId,
      dto.isPrimary !== undefined ? dto.isPrimary : false,
      dto.endDate,
    );
    return { success: true, message: 'Cập nhật người quản lý thành công' };
  }

  @Delete(':id/managers/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa người quản lý khỏi dây chuyền' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Xóa thành công' })
  @ApiParam({ name: 'id', description: 'ID của dây chuyền' })
  @ApiParam({ name: 'userId', description: 'ID của người dùng' })
  @ApiBearerAuth()
  async removeLineManager(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    await this.lineService.removeLineManager(req.requester, id, userId);
    return { success: true, message: 'Xóa người quản lý thành công' };
  }

  // Access validation endpoints
  @Get(':id/can-manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kiểm tra quyền quản lý dây chuyền' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Kết quả kiểm tra quyền' })
  @ApiParam({ name: 'id', description: 'ID của dây chuyền' })
  @ApiBearerAuth()
  async canManageLine(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
  ) {
    const canManage = await this.lineService.canManageLine(
      req.requester.sub,
      id,
    );
    return { success: true, data: canManage };
  }

  @Get('accessible')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy danh sách dây chuyền mà người dùng có quyền truy cập',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Danh sách dây chuyền' })
  @ApiBearerAuth()
  async getAccessibleLines(@Request() req: ReqWithRequester) {
    const lineIds = await this.lineService.getUserAccessibleLines(
      req.requester.sub,
    );

    // If line IDs are found, get full line details
    if (lineIds.length > 0) {
      const lines = await Promise.all(
        lineIds.map((id) => this.lineService.getEntity(id)),
      );
      return { success: true, data: lines };
    }

    return { success: true, data: [] };
  }
}
