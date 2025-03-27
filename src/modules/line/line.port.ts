import { Requester, Paginated, PagingDTO } from 'src/share';
import {
  LineCondDTO,
  LineCreateDTO,
  LineManagerDTO,
  LineUpdateDTO,
} from './line.dto';
import { Line } from './line.model';
import { ICrudRepository, ICrudService } from 'src/CrudModule/crud.interface';

// Interface cho line repository
export interface ILineRepository extends ICrudRepository<Line, LineCreateDTO, LineUpdateDTO> {
  // Query
  findByCode(code: string): Promise<Line | null>;
  listByFactoryId(factoryId: string): Promise<Line[]>;

  // Line manager methods
  addManager(lineId: string, managerDTO: LineManagerDTO): Promise<void>;
  removeManager(lineId: string, userId: string): Promise<void>;
  updateManager(
    lineId: string,
    userId: string,
    isPrimary: boolean,
    endDate?: Date,
  ): Promise<void>;
  getManagers(lineId: string): Promise<{
    userId: string;
    isPrimary: boolean;
    startDate: Date;
    endDate: Date | null;
  }[]>;

  // Validation methods
  hasTeams(lineId: string): Promise<boolean>;
  isManager(userId: string, lineId: string): Promise<boolean>;

  // Add this method for the RPC controller
  findByCode(code: string): Promise<Line | null>;
}

// Interface cho line service
export interface ILineService extends ICrudService<Line, LineCreateDTO, LineUpdateDTO> {
  // Line manager methods
  addLineManager(
    requester: Requester,
    lineId: string,
    managerDTO: LineManagerDTO,
  ): Promise<void>;
  removeLineManager(
    requester: Requester,
    lineId: string,
    userId: string,
  ): Promise<void>;
  updateLineManager(
    requester: Requester,
    lineId: string,
    userId: string,
    isPrimary: boolean,
    endDate?: Date,
  ): Promise<void>;
  getLineManagers(lineId: string): Promise<{
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
  canManageLine(userId: string, lineId: string): Promise<boolean>;
  getUserAccessibleLines(userId: string): Promise<string[]>;
  
  // Query methods
  findByFactoryId(factoryId: string): Promise<Line[]>;

    // Add this method - needed by RPC controller
    findByCode(code: string): Promise<Line | null>;
}