import { Injectable } from '@nestjs/common';
import { IFormSettingRepository } from './form-settings.port';
import { FormSettingCreateDTO } from './form-settings.dto';
import { FormSettings } from '@prisma/client';
import prisma from 'src/share/components/prisma';

@Injectable()
export class FormSettingsRepository implements IFormSettingRepository {
  async insert(dto: FormSettingCreateDTO): Promise<FormSettings> {
    const newFormSetting = await prisma.formSettings.create({
      data: {
        ...dto,
        primaryColor: dto.primaryColor,
        backgroundColor: dto.backgroundColor,
      },
    });
    return newFormSetting;
  }

  async get(id: string) {
    console.log('id', id);
    return null;
  }
}
