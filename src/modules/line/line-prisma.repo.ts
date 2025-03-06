import { Injectable } from '@nestjs/common';
import prisma from 'src/share/components/prisma';
import { Line as LinePrisma } from '@prisma/client';
import { ILineRepository } from './line.port';
import { Line } from './line.model';
import { LineDTO } from './line.dto';

@Injectable()
export class LinePrismaRepository implements ILineRepository {
  async get(id: string): Promise<Line | null> {
    const data = await prisma.line.findUnique({
      where: { id },
    });
    if (!data) return null;

    return this._toModel(data);
  }

  async findById(id: string): Promise<Line | null> {
    const data = await prisma.line.findUnique({ where: { id } });
    if (!data) return null;

    return this._toModel(data);
  }

  async findByName(cond: LineDTO): Promise<Line | null> {
    const data = await prisma.line.findFirst({ where: cond });
    if (!data) return null;

    return this._toModel(data);
  }

  async insert(data: Line): Promise<void> {
    await prisma.line.create({ data });
  }

  async listByIds(ids: string[]): Promise<Line[]> {
    const data = await prisma.line.findMany({ where: { id: { in: ids } } });
    return data.map(this._toModel);
  }

  async update(id: string, data: Line): Promise<void> {
    await prisma.line.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.line.delete({ where: { id } });
  }

  private _toModel(data: LinePrisma): Line {
    return {
      id: data.id,
      name: data.name,
      lineCode: data.lineCode,
      factoryId: data.factoryId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
