import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { AppError, ErrNotFound, ReqWithRequester, UserRole } from 'src/share';
import { RemoteAuthGuard, Roles, RolesGuard } from 'src/share/guard';
import { WORK_INFO_SERVICE } from './work-info.di-token';
import { IWorkInfoService } from './work-info.port';
import { WorkInfoRegistrationDTO } from './work-info.dto';

@Controller()
export class WorkInfoHttpController {
  constructor(
    @Inject(WORK_INFO_SERVICE) private readonly workInfoService: IWorkInfoService,
  ) {}

  @Post('/create')
  @HttpCode(HttpStatus.OK)
  async register(@Body() dto: WorkInfoRegistrationDTO) {
    const data = await this.workInfoService.create(dto);
    return { data };
  }

}
