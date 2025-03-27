import { Requester, Paginated, PagingDTO } from 'src/share';
import {
  TeamCondDTO,
  TeamCreateDTO,
  TeamLeaderDTO,
  TeamUpdateDTO,
} from './team.dto';
import { Team } from './team.model';
import { ICrudRepository, ICrudService } from 'src/CrudModule/crud.interface';

// Interface for team repository
export interface ITeamRepository extends ICrudRepository<Team, TeamCreateDTO, TeamUpdateDTO> {
  // Query
  findByCode(code: string): Promise<Team | null>;
  listByLineId(lineId: string): Promise<Team[]>;

  // Team leader methods
  addLeader(teamId: string, leaderDTO: TeamLeaderDTO): Promise<void>;
  removeLeader(teamId: string, userId: string): Promise<void>;
  updateLeader(
    teamId: string,
    userId: string,
    isPrimary: boolean,
    endDate?: Date,
  ): Promise<void>;
  getLeaders(teamId: string): Promise<{
    userId: string;
    isPrimary: boolean;
    startDate: Date;
    endDate: Date | null;
  }[]>;

  // Validation methods
  hasGroups(teamId: string): Promise<boolean>;
  isLeader(userId: string, teamId: string): Promise<boolean>;

  // Add this method for the RPC controller
  findByCode(code: string): Promise<Team | null>;
}

// Interface for team service
export interface ITeamService extends ICrudService<Team, TeamCreateDTO, TeamUpdateDTO> {
  // Team leader methods
  addTeamLeader(
    requester: Requester,
    teamId: string,
    leaderDTO: TeamLeaderDTO,
  ): Promise<void>;
  removeTeamLeader(
    requester: Requester,
    teamId: string,
    userId: string,
  ): Promise<void>;
  updateTeamLeader(
    requester: Requester,
    teamId: string,
    userId: string,
    isPrimary: boolean,
    endDate?: Date,
  ): Promise<void>;
  getTeamLeaders(teamId: string): Promise<{
    userId: string;
    isPrimary: boolean;
    startDate: Date;
    endDate: Date | null;
    user?: {
      id: string;
      fullName: string;
      avatar?: string | null;
    };
  }[]>;

  // Access validation
  canManageTeam(userId: string, teamId: string): Promise<boolean>;
  getUserAccessibleTeams(userId: string): Promise<string[]>;
  
  // Query methods
  findByLineId(lineId: string): Promise<Team[]>;

  // Add this method - needed by RPC controller
  findByCode(code: string): Promise<Team | null>;
}