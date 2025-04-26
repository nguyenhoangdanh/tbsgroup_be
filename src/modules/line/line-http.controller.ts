import {
  Inject,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
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
import { ApiTags } from '@nestjs/swagger';

@CrudController({
  path: 'lines',
  model: Line, // Using the class directly
  createDto: LineCreateDTO, // Using the class directly
  updateDto: LineUpdateDTO, // Using the class directly
  conditionDto: LineCondDTO, // Using the class directly
})
@ApiTags('Lines')
@UseGuards(RemoteAuthGuard) // Áp dụng RemoteAuthGuard cho tất cả các endpoints
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
  async getLineManagers(@Param('id') id: string) {
    const managers = await this.lineService.getLineManagers(id);
    return { success: true, data: managers };
  }

  @Post(':id/managers')
  @HttpCode(HttpStatus.CREATED)
  async addLineManager(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Body() dto: LineManagerDTO,
  ) {
    await this.lineService.addLineManager(req.requester, id, dto);
    return { success: true };
  }

  @Patch(':id/managers/:userId')
  @HttpCode(HttpStatus.OK)
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
    return { success: true };
  }

  @Delete(':id/managers/:userId')
  @HttpCode(HttpStatus.OK)
  async removeLineManager(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    await this.lineService.removeLineManager(req.requester, id, userId);
    return { success: true };
  }

  // Access validation endpoints
  @Get(':id/can-manage')
  @HttpCode(HttpStatus.OK)
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
