import { ReqWithRequester } from 'src/share';
import { Factory } from './factory.model';
import {
  FactoryCondDTO,
  FactoryCreateDTO,
  FactoryManagerDTO,
  FactoryUpdateDTO,
  PaginationDTO,
} from './factory.dto';
// Re-export tokens from di-token.ts to avoid duplication
import {
  FACTORY_SERVICE,
  FACTORY_REPOSITORY,
  FACTORY_ADAPTER_FACTORY,
} from './factory.di-token';
export { FACTORY_SERVICE, FACTORY_REPOSITORY, FACTORY_ADAPTER_FACTORY };

/**
 * Factory Repository Interface
 * Defines the operations that can be performed on factory data
 */
export interface IFactoryRepository {
  /**
   * Get a factory by ID
   */
  get(id: string): Promise<Factory | null>;

  /**
   * Find a factory by code
   */
  findByCode(code: string): Promise<Factory | null>;

  /**
   * Find a factory by conditions
   */
  findByCond(cond: any): Promise<Factory | null>;

  /**
   * List factories with pagination and filtering
   */
  list(
    conditions: any,
    pagination: {
      page: number;
      limit: number;
      sortBy?: string;
      sortOrder?: string;
    },
  ): Promise<{ data: Factory[]; total: number }>;

  /**
   * List factories by IDs
   */
  listByIds(ids: string[]): Promise<Factory[]>;

  /**
   * List factories by department ID
   */
  listByDepartmentId(departmentId: string): Promise<Factory[]>;

  /**
   * Insert a new factory
   */
  insert(factory: Factory): Promise<void>;

  /**
   * Update a factory
   */
  update(id: string, dto: Partial<Factory>): Promise<void>;

  /**
   * Delete a factory
   */
  delete(id: string): Promise<void>;

  /**
   * Add a manager to a factory
   */
  addManager(factoryId: string, managerDTO: any): Promise<void>;

  /**
   * Remove a manager from a factory
   */
  removeManager(factoryId: string, userId: string): Promise<void>;

  /**
   * Update a factory manager
   */
  updateManager(
    factoryId: string,
    userId: string,
    isPrimary: boolean,
    endDate?: Date,
  ): Promise<void>;

  /**
   * Get all managers for a factory
   */
  getManagers(factoryId: string): Promise<
    Array<{
      userId: string;
      isPrimary: boolean;
      startDate: Date;
      endDate: Date | null;
    }>
  >;

  /**
   * Check if a factory has associated lines
   */
  hasLines(factoryId: string): Promise<boolean>;

  /**
   * Check if a user is a manager for a factory
   */
  isManager(userId: string, factoryId: string): Promise<boolean>;
}

/**
 * Factory Service Interface
 * Defines the business logic for factory operations
 */
export interface IFactoryService {
  /**
   * Create a new factory
   */
  createFactory(
    requester: ReqWithRequester['requester'],
    dto: FactoryCreateDTO,
  ): Promise<string>;

  /**
   * List factories with pagination and filtering
   */
  listFactories(
    requester: ReqWithRequester['requester'],
    conditions: FactoryCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: Factory[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * Get a factory by ID
   */
  getFactory(id: string): Promise<Factory>;

  /**
   * Update a factory
   */
  updateFactory(
    requester: ReqWithRequester['requester'],
    id: string,
    dto: FactoryUpdateDTO,
  ): Promise<void>;

  /**
   * Delete a factory
   */
  deleteFactory(
    requester: ReqWithRequester['requester'],
    id: string,
  ): Promise<void>;

  /**
   * Add a manager to a factory
   */
  addFactoryManager(
    requester: ReqWithRequester['requester'],
    factoryId: string,
    dto: FactoryManagerDTO,
  ): Promise<void>;

  /**
   * Update a factory manager
   */
  updateFactoryManager(
    requester: ReqWithRequester['requester'],
    factoryId: string,
    userId: string,
    isPrimary: boolean,
    endDate?: Date,
  ): Promise<void>;

  /**
   * Remove a manager from a factory
   */
  removeFactoryManager(
    requester: ReqWithRequester['requester'],
    factoryId: string,
    userId: string,
  ): Promise<void>;

  /**
   * Get all managers for a factory
   */
  getFactoryManagers(factoryId: string): Promise<
    Array<{
      userId: string;
      isPrimary: boolean;
      startDate: Date;
      endDate: Date | null;
    }>
  >;

  /**
   * Check if a user can manage a factory
   */
  canManageFactory(userId: string, factoryId: string): Promise<boolean>;

  /**
   * Get all factories that a user has access to
   */
  getUserAccessibleFactories(userId: string): Promise<string[]>;

  /**
   * Switch repository type at runtime
   */
  switchRepositoryType(type: string, config?: any): Promise<void>;

  /**
   * Get repository adapter information
   */
  getRepositoryInfo(): Promise<{
    type: string;
    name: string;
    version?: string;
  }>;
}
