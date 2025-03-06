import { Inject, Injectable } from '@nestjs/common';
import { v7 } from 'uuid';
import { PromiseReturnDataType } from 'src/interface/common.interface';
import { AppError } from 'src/share';
import { ITeamRepository, ITeamService } from './team.port';
import { TEAM_REPOSITORY } from './team.di-token';
import { TeamDTO, teamDTOSchema } from './team.dto';
import { ErrorTeamOfLineExists, Team } from './team.model';
import { LINE_REPOSITORY } from '../line/line.di-token';
import { ILineRepository } from '../line/line.port';
import { ErrorLineNotFound } from '../line/line.model';

@Injectable()
export class TeamService implements ITeamService {
  constructor(
    @Inject(TEAM_REPOSITORY)
    private readonly teamRepository: ITeamRepository,
    @Inject(LINE_REPOSITORY)
    private readonly lineRepository: ILineRepository,
  ) {}

  async create(dto: TeamDTO): PromiseReturnDataType<string> {
    const data = teamDTOSchema.parse(dto);

    const existedTeam = await this.teamRepository.findByName({
      name: data.name,
      teamCode: data.teamCode,
    });
    if (existedTeam) {
      throw AppError.from(ErrorTeamOfLineExists, 400);
    }

    const line = await this.lineRepository.findById(data.lineId);

    if (!line) {
      throw AppError.from(ErrorLineNotFound, 404);
    }

    const newId = v7();
    const team: Team = {
      ...data,
      id: newId,
      description: data.description,
      teamCode: data.teamCode,
      lineId: line.id,
      name: data.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.teamRepository.insert(team);
    return {
      data: newId,
      message: 'Create team successfully',
      success: true,
    };
  }
}
