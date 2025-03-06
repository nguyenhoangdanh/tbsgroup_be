import { Injectable } from '@nestjs/common';
import { UserWorkInfo as WorkInfoPrisma } from '@prisma/client';
import prisma from 'src/share/components/prisma';
import { IWorkInfoRepository } from './work-info.port';
import { WorkInfo } from './work-info.model';
import { WorkInfoCondDTO, WorkInfoUpdateDTO } from './work-info.dto';

@Injectable()
export class WorkInfoPrismaRepository implements IWorkInfoRepository {
  async get(id: string): Promise<WorkInfo | null> {
    const data = await prisma.userWorkInfo.findUnique({
      where: { id },
    });
    if (!data) return null;

    return this._toModel(data);
  }

  async findByCond(cond: WorkInfoCondDTO): Promise<WorkInfo | null> {
    const data = await prisma.userWorkInfo.findFirst();
    if (!data) return null;

    return this._toModel(data);
  }

  async insert(info: WorkInfo): Promise<void> {
    // await prisma.userWorkInfo.create({ data: info });
  }

  async listByIds(ids: string[]): Promise<WorkInfo[]> {
    const data = await prisma.userWorkInfo.findMany({
      where: { id: { in: ids } },
    });
    return data.map(this._toModel);
  }

  async update(id: string, dto: WorkInfoUpdateDTO): Promise<void> {
    // await prisma.userWorkInfo.update({ where: { id }, data: dto });
  }

  // async delete(id: string, isHard: boolean): Promise<void> {
  //   isHard
  //     ? await prisma.user.delete({ where: { id } })
  //     : await prisma.user.update({
  //         where: { id },
  //         data: { status: Status.DELETED },
  //       });
  // }

  async delete(id: string, isHard: boolean): Promise<void> {
    if (isHard) {
      await prisma.userWorkInfo.delete({ where: { id } });
    }
  }

  private _toModel(data: WorkInfoPrisma): any {
    return {
      id: data.id,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
