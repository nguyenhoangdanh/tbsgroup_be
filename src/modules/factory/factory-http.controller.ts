import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import { FACTORY_SERVICE } from './factory.di-token';
import { IFactoryService } from './factory.port';
import { FactoryDTO } from './factory.dto';
import { HTTP_CONTROLLER } from 'src/constant';

@Controller(HTTP_CONTROLLER.FACTORY)
export class FactoryHttpController {
  @Inject(FACTORY_SERVICE)
  private readonly factoryService: IFactoryService;

  @Post('create')
  // @UseGuards(RemoteAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createFactory(@Body() dto: FactoryDTO) {
    return await this.factoryService.create(dto);
  }
}
