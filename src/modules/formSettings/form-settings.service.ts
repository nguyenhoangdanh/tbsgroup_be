import { Inject, Injectable } from '@nestjs/common';
import {
  FORM_SETTINGS_REPOSITORY,
  FORM_SETTINGS_SERVICE,
} from './form-settings.id-token';
import {
  IFormSettingRepository,
  IFormSettingService,
} from './form-settings.port';
import { FormSettingCreateDTO } from './form-settings.dto';

@Injectable()
export class FormSettingsService implements IFormSettingService {
  constructor(
    @Inject(FORM_SETTINGS_REPOSITORY)
    @Inject(FORM_SETTINGS_SERVICE)
    private readonly repository: IFormSettingRepository,
  ) {}

  async createFormSetting(dto: FormSettingCreateDTO) {
    const newFormSetting = await this.repository.insert(dto);
    return newFormSetting;
  }
}
