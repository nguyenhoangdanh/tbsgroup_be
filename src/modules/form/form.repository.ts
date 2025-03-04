import { Injectable } from '@nestjs/common';
import { IFormRepository } from './form.port';
import { FormCreateDTO } from './form.dto';
import { Form } from '@prisma/client';
import prisma from 'src/share/components/prisma';

@Injectable()
export class FormRepository implements IFormRepository {
  async get(id: string) {
    return null;
  }

  async listByIds(ids: string[]) {
    return [];
  }

  async findByCond(cond: Partial<FormCreateDTO>): Promise<Form | null> {
    // Implement the logic to find a form by condition
    return null;
  }

  async insert(
    form: FormCreateDTO,
    userId: string,
    formSettingId: number,
  ): Promise<Form> {
    const neworm = await prisma.form.create({
      data: {
        name: form.name,
        description: form.description,
        userId: userId,
        settingsId: formSettingId,
        creatorName: '',
      },
    });
    return neworm;
  }
  async update(id: string, dto: any) {
    return;
  }

  async delete(id: string, isHard: boolean) {
    return;
  }
}
