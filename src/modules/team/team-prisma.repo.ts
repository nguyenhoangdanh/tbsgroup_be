import { Injectable } from '@nestjs/common';
import prisma from 'src/share/components/prisma';
import { Team as TeamPrisma } from '@prisma/client';
import { Team } from './team.model';
import { ITeamRepository } from './team.port';
import { TeamDTO } from './team.dto';

@Injectable()
export class TeamPrismaRepository implements ITeamRepository {
  async get(id: string): Promise<Team | null> {
    const data = await prisma.team.findUnique({
      where: { id },
    });
    if (!data) return null;

    return this._toModel(data);
  }

  async findByName(cond: TeamDTO): Promise<Team | null> {
    const data = await prisma.team.findFirst({ where: cond });
    if (!data) return null;

    return this._toModel(data);
  }

  async insert(data: Team): Promise<void> {
    await prisma.team.create({ data });
  }

  async listByIds(ids: string[]): Promise<Team[]> {
    const data = await prisma.team.findMany({ where: { id: { in: ids } } });
    return data.map(this._toModel);
  }

  async update(id: string, data: Team): Promise<void> {
    await prisma.team.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.team.delete({ where: { id } });
  }

  private _toModel(data: TeamPrisma): Team {
    return {
      id: data.id,
      name: data.name,
      teamCode: data.teamCode,
      lineId: data.lineId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
