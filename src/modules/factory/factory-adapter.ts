import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BaseAdapter,
  ServiceAdapterFactory,
} from 'src/share/patterns/abstract-factory';
import { IFactoryRepository } from './factory.port';
import { Factory } from './factory.model';
import { PrismaService } from 'src/share/prisma.service';

/**
 * Factory Repository Adapter Interface
 * Defines the adapter pattern for factory repositories
 * This allows switching between different implementations at runtime
 */
export interface IFactoryRepositoryAdapter {
  /**
   * Get the factory repository implementation
   */
  getFactoryRepository(): IFactoryRepository;

  /**
   * Initialize the adapter with configuration
   */
  initialize(config?: any): Promise<void>;

  /**
   * Get adapter information
   */
  getAdapterInfo(): { type: string; name: string; version?: string };
}

/**
 * Prisma Factory Repository Adapter
 * Implements the adapter for Prisma-based factory repository
 */
export class PrismaFactoryRepositoryAdapter
  extends BaseAdapter
  implements IFactoryRepositoryAdapter
{
  private factoryRepository: IFactoryRepository;

  constructor(private prisma: PrismaService) {
    super('PrismaFactoryRepositoryAdapter', 'prisma', '1.0.0');

    // Implement the IFactoryRepository interface using Prisma
    this.factoryRepository = {
      get: async (id: string): Promise<Factory | null> => {
        const result = await this.prisma.factory.findUnique({
          where: { id },
        });
        return result ? Factory.from(result) : null;
      },

      findByCode: async (code: string): Promise<Factory | null> => {
        const result = await this.prisma.factory.findUnique({
          where: { code },
        });
        return result ? Factory.from(result) : null;
      },

      findByCond: async (cond: any): Promise<Factory | null> => {
        const result = await this.prisma.factory.findFirst({
          where: cond,
        });
        return result ? Factory.from(result) : null;
      },

      list: async (
        conditions: any,
        pagination: any,
      ): Promise<{ data: Factory[]; total: number }> => {
        const {
          page = 1,
          limit = 10,
          sortBy = 'createdAt',
          sortOrder = 'desc',
        } = pagination;
        const skip = (page - 1) * limit;

        const [results, total] = await Promise.all([
          this.prisma.factory.findMany({
            where: conditions,
            skip,
            take: limit,
            orderBy: {
              [sortBy]: sortOrder.toLowerCase(),
            },
          }),
          this.prisma.factory.count({
            where: conditions,
          }),
        ]);

        const data = results.map((factory) => Factory.from(factory));
        return { data, total };
      },

      listByIds: async (ids: string[]): Promise<Factory[]> => {
        const results = await this.prisma.factory.findMany({
          where: {
            id: {
              in: ids,
            },
          },
        });
        return results.map((factory) => Factory.from(factory));
      },

      listByDepartmentId: async (departmentId: string): Promise<Factory[]> => {
        const results = await this.prisma.factory.findMany({
          where: {
            departmentId,
          },
        });
        return results.map((factory) => Factory.from(factory));
      },

      insert: async (factory: Factory): Promise<void> => {
        await this.prisma.factory.create({
          data: factory,
        });
      },

      update: async (id: string, dto: Partial<Factory>): Promise<void> => {
        await this.prisma.factory.update({
          where: { id },
          data: dto,
        });
      },

      delete: async (id: string): Promise<void> => {
        await this.prisma.factory.delete({
          where: { id },
        });
      },

      addManager: async (factoryId: string, managerDTO: any): Promise<void> => {
        await this.prisma.factoryManager.create({
          data: {
            factoryId,
            userId: managerDTO.userId,
            isPrimary: managerDTO.isPrimary || false,
            startDate: managerDTO.startDate || new Date(),
            endDate: managerDTO.endDate || null,
          },
        });
      },

      removeManager: async (
        factoryId: string,
        userId: string,
      ): Promise<void> => {
        await this.prisma.factoryManager.delete({
          where: {
            factoryId_userId: {
              factoryId,
              userId,
            },
          },
        });
      },

      updateManager: async (
        factoryId: string,
        userId: string,
        isPrimary: boolean,
        endDate?: Date,
      ): Promise<void> => {
        await this.prisma.factoryManager.update({
          where: {
            factoryId_userId: {
              factoryId,
              userId,
            },
          },
          data: {
            isPrimary,
            endDate,
            updatedAt: new Date(),
          },
        });
      },

      getManagers: async (factoryId: string) => {
        return this.prisma.factoryManager.findMany({
          where: {
            factoryId,
          },
          select: {
            userId: true,
            isPrimary: true,
            startDate: true,
            endDate: true,
          },
        });
      },

      hasLines: async (factoryId: string): Promise<boolean> => {
        const count = await this.prisma.line.count({
          where: {
            factoryId,
          },
        });
        return count > 0;
      },

      isManager: async (
        userId: string,
        factoryId: string,
      ): Promise<boolean> => {
        const manager = await this.prisma.factoryManager.findUnique({
          where: {
            factoryId_userId: {
              factoryId,
              userId,
            },
          },
        });
        return !!manager;
      },
    };
  }

  getFactoryRepository(): IFactoryRepository {
    return this.factoryRepository;
  }

  async initialize(_config?: any): Promise<void> {
    // Initialize the adapter with configuration if needed
    // Prefix param with underscore to indicate it's intentionally unused
  }

  getAdapterInfo(): { type: string; name: string; version?: string } {
    return {
      type: 'prisma',
      name: 'PrismaFactoryRepositoryAdapter',
      version: '1.0.0',
    };
  }
}

/**
 * Memory Factory Repository Adapter
 * Implements an in-memory repository for testing/development
 */
export class MemoryFactoryRepositoryAdapter
  extends BaseAdapter
  implements IFactoryRepositoryAdapter
{
  private factoryRepository: IFactoryRepository;
  private factories: Map<string, Factory> = new Map();
  private factoryManagers: Map<
    string,
    {
      userId: string;
      isPrimary: boolean;
      startDate: Date;
      endDate: Date | null;
    }[]
  > = new Map();

  constructor() {
    super('MemoryFactoryRepositoryAdapter', 'memory', '1.0.0');

    this.factoryRepository = {
      get: async (id: string): Promise<Factory | null> => {
        return this.factories.get(id) || null;
      },

      findByCode: async (code: string): Promise<Factory | null> => {
        return (
          Array.from(this.factories.values()).find(
            (factory) => factory.code === code,
          ) || null
        );
      },

      findByCond: async (cond: any): Promise<Factory | null> => {
        return (
          Array.from(this.factories.values()).find((factory) => {
            for (const key in cond) {
              // Xử lý an toàn cho các thuộc tính động
              const factoryKey = key as keyof Factory;
              if (factory[factoryKey] !== cond[key]) {
                return false;
              }
            }
            return true;
          }) || null
        );
      },

      list: async (
        conditions: any,
        pagination: any,
      ): Promise<{ data: Factory[]; total: number }> => {
        const { page = 1, limit = 10 } = pagination;
        const skip = (page - 1) * limit;

        // Filter based on conditions
        let data = Array.from(this.factories.values());
        for (const key in conditions) {
          if (conditions[key]) {
            // Xử lý an toàn cho các thuộc tính động
            const factoryKey = key as keyof Factory;
            data = data.filter(
              (factory) => factory[factoryKey] === conditions[key],
            );
          }
        }

        const total = data.length;
        data = data.slice(skip, skip + limit);

        return { data, total };
      },

      listByIds: async (ids: string[]): Promise<Factory[]> => {
        return ids
          .map((id) => this.factories.get(id))
          .filter(Boolean) as Factory[];
      },

      listByDepartmentId: async (departmentId: string): Promise<Factory[]> => {
        return Array.from(this.factories.values()).filter(
          (factory) => factory.departmentId === departmentId,
        );
      },

      insert: async (factory: Factory): Promise<void> => {
        this.factories.set(factory.id, factory);
      },

      update: async (id: string, dto: Partial<Factory>): Promise<void> => {
        const factory = this.factories.get(id);
        if (factory) {
          // Create a new Factory instance from the updated data to ensure toDb() method exists
          const updatedFactory = Factory.from({
            ...factory,
            ...dto,
            updatedAt: new Date(),
          });
          this.factories.set(id, updatedFactory);
        }
      },

      delete: async (id: string): Promise<void> => {
        this.factories.delete(id);
        this.factoryManagers.delete(id);
      },

      addManager: async (factoryId: string, managerDTO: any): Promise<void> => {
        const managers = this.factoryManagers.get(factoryId) || [];
        managers.push({
          userId: managerDTO.userId,
          isPrimary: managerDTO.isPrimary || false,
          startDate: managerDTO.startDate || new Date(),
          endDate: managerDTO.endDate || null,
        });
        this.factoryManagers.set(factoryId, managers);
      },

      removeManager: async (
        factoryId: string,
        userId: string,
      ): Promise<void> => {
        const managers = this.factoryManagers.get(factoryId) || [];
        const updatedManagers = managers.filter(
          (manager) => manager.userId !== userId,
        );
        this.factoryManagers.set(factoryId, updatedManagers);
      },

      updateManager: async (
        factoryId: string,
        userId: string,
        isPrimary: boolean,
        endDate?: Date,
      ): Promise<void> => {
        const managers = this.factoryManagers.get(factoryId) || [];
        const updatedManagers = managers.map((manager) => {
          if (manager.userId === userId) {
            return {
              ...manager,
              isPrimary,
              endDate: endDate || manager.endDate,
            };
          }
          return manager;
        });
        this.factoryManagers.set(factoryId, updatedManagers);
      },

      getManagers: async (factoryId: string) => {
        return this.factoryManagers.get(factoryId) || [];
      },

      hasLines: async (_factoryId: string): Promise<boolean> => {
        // In memory implementation always returns false for simplicity
        // Prefix param with underscore to indicate it's intentionally unused
        return false;
      },

      isManager: async (
        userId: string,
        factoryId: string,
      ): Promise<boolean> => {
        const managers = this.factoryManagers.get(factoryId) || [];
        return managers.some((manager) => manager.userId === userId);
      },
    };
  }

  getFactoryRepository(): IFactoryRepository {
    return this.factoryRepository;
  }

  async initialize(_config?: any): Promise<void> {
    // Initialize the adapter with configuration if needed
    // Prefix param with underscore to indicate it's intentionally unused
  }

  getAdapterInfo(): { type: string; name: string; version?: string } {
    return {
      type: 'memory',
      name: 'MemoryFactoryRepositoryAdapter',
      version: '1.0.0',
    };
  }

  // Example method for testing - add test data
  async addTestData(factories: Factory[]): Promise<void> {
    factories.forEach((factory) => {
      this.factories.set(factory.id, factory);
    });
  }
}

/**
 * Factory for creating factory repository adapters
 * This implementation supports 'prisma' and 'memory' adapter types
 */
@Injectable()
export class FactoryRepositoryAdapterFactory
  implements ServiceAdapterFactory<IFactoryRepositoryAdapter>
{
  private readonly logger = new Logger(FactoryRepositoryAdapterFactory.name);
  private readonly SUPPORTED_TYPES = ['prisma', 'memory'];

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a factory repository adapter of the specified type
   * @param type Type of adapter to create (prisma or memory)
   * @param config Optional configuration for the adapter
   */
  createAdapter(type: string, _config?: any): IFactoryRepositoryAdapter {
    this.logger.log(`Creating factory repository adapter of type: ${type}`);

    switch (type) {
      case 'prisma':
        return new PrismaFactoryRepositoryAdapter(this.prismaService);

      case 'memory':
        return new MemoryFactoryRepositoryAdapter();

      default:
        throw new Error(`Unsupported factory repository adapter type: ${type}`);
    }
  }

  /**
   * Check if the factory can create an adapter of the specified type
   * @param type Type of adapter to check
   */
  canCreate(type: string): boolean {
    return this.SUPPORTED_TYPES.includes(type);
  }

  /**
   * Get all supported adapter types
   */
  getSupportedTypes(): string[] {
    return [...this.SUPPORTED_TYPES];
  }
}
