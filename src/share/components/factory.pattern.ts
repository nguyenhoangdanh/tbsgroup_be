import { PrismaService } from '../prisma.service';
import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import {
  BaseAdapter,
  IAdapter,
  ServiceAdapterFactory,
} from '../patterns/abstract-factory';

/**
 * Add TypeScript interface to allow indexing PrismaService with string keys
 * This makes dynamic model access type-safe
 */
interface PrismaServiceWithDynamicModels extends PrismaService {
  [key: string]: any;
}

/**
 * Generic repository interface
 */
export interface IRepository<T> {
  findOne(id: string): Promise<T | null>;
  findAll(criteria?: any): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

/**
 * Repository adapter interface
 * All repository adapters must implement this interface
 */
export interface IRepositoryAdapter<T> extends IAdapter {
  getRepository(): IRepository<T>;
}

/**
 * Base repository adapter with common functionality
 */
export abstract class BaseRepositoryAdapter<T>
  extends BaseAdapter
  implements IRepositoryAdapter<T>
{
  protected repository: IRepository<T>;

  constructor(name: string, type: string, version?: string) {
    super(name, type, version);
  }

  abstract getRepository(): IRepository<T>;
}

/**
 * Prisma repository adapter
 * Implements repository operations using Prisma
 */
export class PrismaRepositoryAdapter<T> extends BaseRepositoryAdapter<T> {
  protected prismaService: PrismaServiceWithDynamicModels;
  protected modelName: string;
  protected repository: IRepository<T>;

  constructor(prismaService: PrismaService, modelName: string) {
    super(`Prisma${modelName}Repository`, 'prisma', '1.0.0');
    this.prismaService = prismaService as PrismaServiceWithDynamicModels;
    this.modelName = modelName;
    this.createRepository();
  }

  private createRepository(): void {
    // Create a generic repository using Prisma's dynamic model access
    this.repository = {
      findOne: async (id: string): Promise<T | null> => {
        // Use type assertion to handle dynamic property access
        const model = this.prismaService[this.modelName.toLowerCase()];
        return (await model.findUnique({
          where: { id },
        })) as T | null;
      },
      findAll: async (criteria?: any): Promise<T[]> => {
        const model = this.prismaService[this.modelName.toLowerCase()];
        return (await model.findMany({
          where: criteria,
        })) as T[];
      },
      create: async (data: Partial<T>): Promise<T> => {
        const model = this.prismaService[this.modelName.toLowerCase()];
        return (await model.create({
          data,
        })) as T;
      },
      update: async (id: string, data: Partial<T>): Promise<T> => {
        const model = this.prismaService[this.modelName.toLowerCase()];
        return (await model.update({
          where: { id },
          data,
        })) as T;
      },
      delete: async (id: string): Promise<boolean> => {
        const model = this.prismaService[this.modelName.toLowerCase()];
        await model.delete({
          where: { id },
        });
        return true;
      },
    };
  }

  async initialize(config?: any): Promise<void> {
    await super.initialize(config);
    // Additional initialization if needed
  }

  getRepository(): IRepository<T> {
    return this.repository;
  }
}

/**
 * In-memory repository adapter for testing
 * Implements repository operations using in-memory storage
 */
export class InMemoryRepositoryAdapter<
  T extends { id: string },
> extends BaseRepositoryAdapter<T> {
  protected items: Map<string, T>;

  constructor(modelName: string) {
    super(`InMemory${modelName}Repository`, 'memory', '1.0.0');
    this.items = new Map<string, T>();
  }

  async initialize(config?: any): Promise<void> {
    await super.initialize(config);
    // Initialize with seed data if provided
    if (config?.seedData) {
      for (const item of config.seedData) {
        this.items.set(item.id, item);
      }
    }
  }

  getRepository(): IRepository<T> {
    return {
      findOne: async (id: string): Promise<T | null> => {
        return this.items.get(id) || null;
      },
      findAll: async (criteria?: any): Promise<T[]> => {
        const items = Array.from(this.items.values());
        if (!criteria) return items;

        return items.filter((item) => {
          for (const [key, value] of Object.entries(criteria)) {
            // Use type assertion to fix TypeScript error
            if ((item as any)[key] !== value) return false;
          }
          return true;
        });
      },
      create: async (data: Partial<T>): Promise<T> => {
        const item = data as T;
        this.items.set(item.id, item);
        return item;
      },
      update: async (id: string, data: Partial<T>): Promise<T> => {
        const existingItem = this.items.get(id);
        if (!existingItem) {
          throw new Error(`Item with ID ${id} not found`);
        }

        const updatedItem = {
          ...existingItem,
          ...data,
        };

        this.items.set(id, updatedItem);
        return updatedItem;
      },
      delete: async (id: string): Promise<boolean> => {
        return this.items.delete(id);
      },
    };
  }
}

/**
 * Repository factory for creating repository adapters
 */
@Injectable()
export class RepositoryAdapterFactory<T>
  implements ServiceAdapterFactory<IRepositoryAdapter<T>>
{
  private readonly SUPPORTED_TYPES = ['prisma', 'memory'];
  private prismaService: PrismaService;

  constructor(prismaService: PrismaService) {
    this.prismaService = prismaService;
  }

  createAdapter(
    type: string,
    config?: { modelName: string; seedData?: T[] },
  ): IRepositoryAdapter<T> {
    const modelName = config?.modelName || 'Entity';

    switch (type) {
      case 'prisma':
        return new PrismaRepositoryAdapter<T>(this.prismaService, modelName);
      case 'memory':
        const adapter = new InMemoryRepositoryAdapter<T & { id: string }>(
          modelName,
        );
        // Initialize with seed data if provided
        if (config?.seedData) {
          void adapter.initialize({ seedData: config.seedData });
        }
        return adapter as unknown as IRepositoryAdapter<T>;
      default:
        throw new Error(`Unsupported repository adapter type: ${type}`);
    }
  }

  canCreate(type: string): boolean {
    return this.SUPPORTED_TYPES.includes(type);
  }

  getSupportedTypes(): string[] {
    return [...this.SUPPORTED_TYPES];
  }
}

/**
 * Entity access service for authorization checks
 */
@Injectable()
export class EntityAccessService {
  constructor(private prisma: PrismaService) {}

  // Kiểm tra người dùng có quyền truy cập factory không
  async canAccessFactory(userId: string, factoryId: string): Promise<boolean> {
    // Check if user has access to this factory via roles or direct assignment
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: { role: true },
        },
        managedFactories: true,
      },
    });

    if (!user) return false;

    // Check if user is an admin/super admin
    const isAdmin = user.userRoles.some(
      (ur) => ur.role.code === 'ADMIN' || ur.role.code === 'SUPER_ADMIN',
    );
    if (isAdmin) return true;

    // Check if user is a manager of this factory
    const isFactoryManager = user.managedFactories.some(
      (mf) => mf.factoryId === factoryId,
    );
    if (isFactoryManager) return true;

    // Check if user has factory manager role for this specific factory
    const hasFactoryRole = user.userRoles.some(
      (ur) =>
        ur.role.code === 'FACTORY_MANAGER' &&
        ur.scope === `factory:${factoryId}`,
    );

    return hasFactoryRole;
  }

  // Kiểm tra quyền truy cập Line
  async canAccessLine(userId: string, lineId: string): Promise<boolean> {
    // Similar implementation as canAccessFactory but for line
    // First check if user can access the factory that owns this line
    const line = await this.prisma.line.findUnique({
      where: { id: lineId },
      select: { factoryId: true },
    });

    if (!line) return false;

    // If user can access the factory, they can access the line
    const canAccessFactory = await this.canAccessFactory(
      userId,
      line.factoryId,
    );
    if (canAccessFactory) return true;

    // Check specific line access
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        managedLines: true,
      },
    });

    if (!user) return false;

    // Check if user is a manager of this line
    return user.managedLines.some((ml) => ml.lineId === lineId);
  }

  // Kiểm tra quyền truy cập Team
  async canAccessTeam(userId: string, teamId: string): Promise<boolean> {
    // Get the line for this team to check access
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { lineId: true },
    });

    if (!team) return false;

    // If user can access the line, they can access the team
    const canAccessLine = await this.canAccessLine(userId, team.lineId);
    if (canAccessLine) return true;

    // Check specific team leadership
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        ledTeams: true,
      },
    });

    if (!user) return false;

    // Check if user is a leader of this team
    return user.ledTeams.some((lt) => lt.teamId === teamId);
  }

  // Kiểm tra quyền truy cập Group
  async canAccessGroup(userId: string, groupId: string): Promise<boolean> {
    // Get the team for this group to check access
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { teamId: true },
    });

    if (!group) return false;

    // If user can access the team, they can access the group
    const canAccessTeam = await this.canAccessTeam(userId, group.teamId);
    if (canAccessTeam) return true;

    // Check specific group leadership
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        ledGroups: true,
      },
    });

    if (!user) return false;

    // Check if user is a leader of this group
    return user.ledGroups.some((lg) => lg.groupId === groupId);
  }
}

/**
 * Generic Repository Factory for Prisma models
 * This is a factory pattern implementation that creates repository methods for Prisma models
 */
export class PrismaRepositoryFactory<T extends Record<string, any>> {
  private logger = new Logger(PrismaRepositoryFactory.name);
  private modelName: string;
  private prismaService: PrismaService;

  /**
   * Create a new repository factory for a specific model
   * @param prismaService The Prisma service instance
   * @param modelName The name of the Prisma model (e.g., 'user', 'product')
   */
  constructor(prismaService: PrismaService, modelName: string) {
    this.prismaService = prismaService;
    this.modelName = modelName;

    // Validate that the model exists in Prisma
    if (!this.getPrismaModel()) {
      throw new Error(`Model '${modelName}' not found in Prisma service`);
    }
  }

  /**
   * Get the Prisma model from the service
   * Uses type assertion to access dynamic model names
   */
  private getPrismaModel(): any {
    const model = (this.prismaService as any)[this.modelName.toLowerCase()];
    if (!model) {
      throw new Error(`Model '${this.modelName}' not found in Prisma service`);
    }
    return model;
  }

  /**
   * Create a findById method for the repository
   * @param transformer Optional function to transform the database result
   */
  createFindByIdMethod(
    transformer?: (data: any) => T,
  ): (id: string) => Promise<T | null> {
    return async (id: string): Promise<T | null> => {
      try {
        const model = this.getPrismaModel();
        const result = await model.findUnique({
          where: { id },
        });
        return result ? (transformer ? transformer(result) : result) : null;
      } catch (error) {
        this.logger.error(
          `Error in findById for ${this.modelName}: ${(error as Error).message}`,
          (error as Error).stack,
        );
        throw error;
      }
    };
  }

  /**
   * Create a findMany method for the repository
   * @param transformer Optional function to transform the database results
   */
  createFindManyMethod(
    transformer?: (data: any) => T,
  ): (params?: any) => Promise<T[]> {
    return async (params?: any): Promise<T[]> => {
      try {
        const model = this.getPrismaModel();
        const results = await model.findMany(params || {});
        return results.map((item: any) =>
          transformer ? transformer(item) : item,
        );
      } catch (error) {
        this.logger.error(
          `Error in findMany for ${this.modelName}: ${(error as Error).message}`,
          (error as Error).stack,
        );
        throw error;
      }
    };
  }

  /**
   * Create a create method for the repository
   * @param transformer Optional function to transform the database result
   */
  createCreateMethod(
    transformer?: (data: any) => T,
  ): (data: any) => Promise<T> {
    return async (data: any): Promise<T> => {
      try {
        const model = this.getPrismaModel();
        const result = await model.create({
          data,
        });
        return transformer ? transformer(result) : result;
      } catch (error) {
        this.logger.error(
          `Error in create for ${this.modelName}: ${(error as Error).message}`,
          (error as Error).stack,
        );
        throw error;
      }
    };
  }

  /**
   * Create an update method for the repository
   * @param transformer Optional function to transform the database result
   */
  createUpdateMethod(
    transformer?: (data: any) => T,
  ): (id: string, data: any) => Promise<T> {
    return async (id: string, data: any): Promise<T> => {
      try {
        const model = this.getPrismaModel();
        const result = await model.update({
          where: { id },
          data,
        });
        return transformer ? transformer(result) : result;
      } catch (error) {
        this.logger.error(
          `Error in update for ${this.modelName}: ${(error as Error).message}`,
          (error as Error).stack,
        );
        throw error;
      }
    };
  }

  /**
   * Create a delete method for the repository
   */
  createDeleteMethod(): (id: string) => Promise<void> {
    return async (id: string): Promise<void> => {
      try {
        const model = this.getPrismaModel();
        await model.delete({
          where: { id },
        });
      } catch (error) {
        this.logger.error(
          `Error in delete for ${this.modelName}: ${(error as Error).message}`,
          (error as Error).stack,
        );
        throw error;
      }
    };
  }
}

/**
 * Helper class for filtering objects based on criteria
 */
export class ObjectFilter {
  /**
   * Filter a collection based on an equality criteria
   * @param collection Array of objects to filter
   * @param key The property name to check
   * @param value The value to compare against
   */
  static byProperty<T extends Record<string, any>>(
    collection: T[],
    key: keyof T,
    value: any,
  ): T[] {
    return collection.filter((item) => item[key] === value);
  }

  /**
   * Find a single item in a collection that matches an equality criteria
   * @param collection Array of objects to search
   * @param key The property name to check
   * @param value The value to compare against
   */
  static findByProperty<T extends Record<string, any>>(
    collection: T[],
    key: keyof T,
    value: any,
  ): T | undefined {
    return collection.find((item) => item[key] === value);
  }
}
