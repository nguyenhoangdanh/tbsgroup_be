import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import { HTTP_CONTROLLER } from 'src/constant';
import { LINE_SERVICE } from './line.di-token';
import { ILineService } from './line.port';
import { LineDTO } from './line.dto';

@Controller(HTTP_CONTROLLER.LINE)
export class LineHttpController {
  @Inject(LINE_SERVICE)
  private readonly lineService: ILineService;

  @Post('create')
  // @UseGuards(RemoteAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createLine(@Body() dto: LineDTO) {
    return await this.lineService.create(dto);
  }
}
