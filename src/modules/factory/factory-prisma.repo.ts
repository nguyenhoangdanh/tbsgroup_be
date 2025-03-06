import { Injectable } from '@nestjs/common';
import { IFactoryRepository } from './factory.port';
import { Factory } from './factory.model';
import prisma from 'src/share/components/prisma';
import { FactoryDTO } from './factory.dto';
import { Factory as FactoryPrisma } from '@prisma/client';

@Injectable()
export class FactoryPrismaRepository implements IFactoryRepository {
  async get(id: string): Promise<Factory | null> {
    const data = await prisma.factory.findUnique({
      where: { id },
    });
    if (!data) return null;

    return this._toModel(data);
  }

  async findById(id: string): Promise<Factory | null> {
    const data = await prisma.factory.findUnique({ where: { id } });
    if (!data) return null;

    return this._toModel(data);
  }

  async findByName(cond: FactoryDTO): Promise<Factory | null> {
    const data = await prisma.factory.findFirst({ where: cond });
    if (!data) return null;

    return this._toModel(data);
  }

  async insert(factory: Factory): Promise<void> {
    await prisma.factory.create({ data: factory });
  }

  async listByIds(ids: string[]): Promise<Factory[]> {
    const data = await prisma.factory.findMany({ where: { id: { in: ids } } });
    return data.map(this._toModel);
  }

  async update(id: string, factory: Factory): Promise<void> {
    await prisma.factory.update({ where: { id }, data: factory });
  }

  async delete(id: string): Promise<void> {
    await prisma.factory.delete({ where: { id } });
  }

  private _toModel(data: FactoryPrisma): Factory {
    return {
      id: data.id,
      name: data.name,
      factoryCode: data.factoryCode,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
