import { FormSettings } from '@prisma/client';
import { FormSettingCreateDTO } from './form-settings.dto';
export interface IFormSettingService {
  createFormSetting(dto: FormSettingCreateDTO): Promise<FormSettings | null>;
  // updateFormSetting(dto: FormSettingUpdateDTO): Promise<void>;
  // fetchFormSetting(): Promise<FormSetting | null>;
}

export interface IFormSettingRepository {
  get(id: string): Promise<FormSettings | null>;
  insert(dto: FormSettingCreateDTO): Promise<FormSettings>;
  // update(id: string, dto: FormSettingUpdateDTO): Promise<void>;
  // delete(id: string): Promise<void>;
}
