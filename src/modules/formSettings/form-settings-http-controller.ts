import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FORM_SETTINGS_SERVICE } from './form-settings.id-token';
import { IFormSettingService } from './form-settings.port';
import { RemoteAuthGuard } from 'src/share/guard';
import { FormSettingCreateDTO } from './form-settings.dto';

@Controller()
export class FormSettingsHttpController {
  constructor(
    @Inject(FORM_SETTINGS_SERVICE)
    private readonly service: IFormSettingService,
  ) {}

  @Post('form-settings-create')
  @UseGuards(RemoteAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createFormSetting(@Body() dto: FormSettingCreateDTO) {
    const newFormSetting = await this.service.createFormSetting(dto);
    return { data: newFormSetting };
  }
}
