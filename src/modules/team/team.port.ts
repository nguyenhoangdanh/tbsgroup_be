import { PromiseReturnDataType } from 'src/interface/common.interface';
import { Team } from './team.model';
import { TeamDTO } from './team.dto';

export interface ITeamService {
  create(dto: TeamDTO): PromiseReturnDataType<string>;
}

export interface ITeamRepository {
  // Query
  get(id: string): Promise<TeamDTO | null>;
  findByName(cond: Omit<TeamDTO, 'lineId'>): Promise<TeamDTO | null>;

  // Command
  insert(info: Team): Promise<void>;
  update(id: string, dto: TeamDTO): Promise<void>;
  delete(id: string, isHard: boolean): Promise<void>;
}
