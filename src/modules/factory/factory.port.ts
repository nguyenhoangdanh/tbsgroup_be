import { Requester } from 'src/share';
import {
  FactoryCondDTO,
  FactoryCreateDTO,
  FactoryManagerDTO,
  FactoryUpdateDTO,
  PaginationDTO,
} from './factory.dto';
import { Factory } from './factory.model';

// Interface cho factory repository
export interface IFactoryRepository {
  // Query
  get(id: string): Promise<Factory | null>;
  findByCode(code: string): Promise<Factory | null>;
  findByCond(cond: FactoryCondDTO): Promise<Factory | null>;
  list(
    conditions: FactoryCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: Factory[];
    total: number;
  }>;
  listByIds(ids: string[]): Promise<Factory[]>;
  listByDepartmentId(departmentId: string): Promise<Factory[]>;

  // Command
  insert(factory: Factory): Promise<void>;
  update(id: string, dto: Partial<Factory>): Promise<void>;
  delete(id: string): Promise<void>;

  // Factory manager methods
  addManager(factoryId: string, managerDTO: FactoryManagerDTO): Promise<void>;
  removeManager(factoryId: string, userId: string): Promise<void>;
  updateManager(
    factoryId: string,
    userId: string,
    isPrimary: boolean,
    endDate?: Date,
  ): Promise<void>;
  getManagers(factoryId: string): Promise<
    {
      userId: string;
      isPrimary: boolean;
      startDate: Date;
      endDate: Date | null;
    }[]
  >;

  // Validation methods
  hasLines(factoryId: string): Promise<boolean>;
  isManager(userId: string, factoryId: string): Promise<boolean>;
}

// Interface cho factory service
export interface IFactoryService {
  // Factory CRUD
  createFactory(requester: Requester, dto: FactoryCreateDTO): Promise<string>;
  updateFactory(
    requester: Requester,
    id: string,
    dto: FactoryUpdateDTO,
  ): Promise<void>;
  deleteFactory(requester: Requester, id: string): Promise<void>;
  getFactory(id: string): Promise<Factory>;
  listFactories(
    requester: Requester,
    conditions: FactoryCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: Factory[];
    total: number;
    page: number;
    limit: number;
  }>;

  // Factory manager methods
  addFactoryManager(
    requester: Requester,
    factoryId: string,
    managerDTO: FactoryManagerDTO,
  ): Promise<void>;
  removeFactoryManager(
    requester: Requester,
    factoryId: string,
    userId: string,
  ): Promise<void>;
  updateFactoryManager(
    requester: Requester,
    factoryId: string,
    userId: string,
    isPrimary: boolean,
    endDate?: Date,
  ): Promise<void>;
  getFactoryManagers(factoryId: string): Promise<
    {
      userId: string;
      isPrimary: boolean;
      startDate: Date;
      endDate: Date | null;
      user?: {
        id: string;
        fullName: string;
        avatar?: string | null;
      };
    }[]
  >;

  // Access validation
  canManageFactory(userId: string, factoryId: string): Promise<boolean>;
  getUserAccessibleFactories(userId: string): Promise<string[]>;
  linkFactoryWithManagingDepartment(
    requester: Requester,
    factoryId: string,
    departmentId: string,
  ): Promise<void>;
  listFactories(
    requester: Requester,
    conditions: FactoryCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: Factory[];
    total: number;
    page: number;
    limit: number;
  }>;
}
