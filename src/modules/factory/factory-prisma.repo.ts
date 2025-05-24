import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/share/prisma.service';
import { IFactoryRepository } from './factory.port';
import { Factory } from './factory.model';
import { FactoryManagerDTO } from './factory.dto';

@Injectable()
export class FactoryPrismaRepository implements IFactoryRepository {
  private readonly logger = new Logger(FactoryPrismaRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get a factory by ID
   */
  async get(id: string): Promise<Factory | null> {
    try {
      const result = await this.prisma.factory.findUnique({
        where: { id },
      });
      return result ? Factory.from(result) : null;
    } catch (error) {
      this.logger.error(`Error getting factory by ID: ${error.message}`);
      return null;
    }
  }

  /**
   * Find a factory by code
   */
  async findByCode(code: string): Promise<Factory | null> {
    try {
      const result = await this.prisma.factory.findUnique({
        where: { code },
      });
      return result ? Factory.from(result) : null;
    } catch (error) {
      this.logger.error(`Error finding factory by code: ${error.message}`);
      return null;
    }
  }

  /**
   * Find a factory by conditions
   */
  async findByCond(cond: any): Promise<Factory | null> {
    try {
      const result = await this.prisma.factory.findFirst({
        where: cond,
      });
      return result ? Factory.from(result) : null;
    } catch (error) {
      this.logger.error(`Error finding factory by condition: ${error.message}`);
      return null;
    }
  }

  /**
   * List factories with pagination and filtering
   */
  async list(
    conditions: any,
    pagination: {
      page: number;
      limit: number;
      sortBy?: string;
      sortOrder?: string;
    },
  ): Promise<{ data: Factory[]; total: number }> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = pagination;
      const skip = (page - 1) * limit;

      // Handle OR conditions if present (for search functionality)
      let where = { ...conditions };
      if (conditions.OR) {
        where = {
          OR: conditions.OR,
          ...where,
        };
        delete where.OR;
      }

      // Handle IN condition for ID filtering
      if (conditions.id && conditions.id.in) {
        where = {
          ...where,
          id: {
            in: conditions.id.in,
          },
        };
        delete where.id;
      }

      const [results, total] = await Promise.all([
        this.prisma.factory.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            [sortBy]: sortOrder.toLowerCase(),
          },
        }),
        this.prisma.factory.count({
          where,
        }),
      ]);

      const data = results.map((factory) => Factory.from(factory));
      return { data, total };
    } catch (error) {
      this.logger.error(`Error listing factories: ${error.message}`);
      return { data: [], total: 0 };
    }
  }

  /**
   * List factories by IDs
   */
  async listByIds(ids: string[]): Promise<Factory[]> {
    try {
      const results = await this.prisma.factory.findMany({
        where: {
          id: {
            in: ids,
          },
        },
      });
      return results.map((factory) => Factory.from(factory));
    } catch (error) {
      this.logger.error(`Error listing factories by IDs: ${error.message}`);
      return [];
    }
  }

  /**
   * List factories by department ID
   */
  async listByDepartmentId(departmentId: string): Promise<Factory[]> {
    try {
      const results = await this.prisma.factory.findMany({
        where: {
          departmentId,
        },
      });
      return results.map((factory) => Factory.from(factory));
    } catch (error) {
      this.logger.error(
        `Error listing factories by department ID: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Insert a new factory
   */
  async insert(factory: Factory): Promise<void> {
    try {
      await this.prisma.factory.create({
        data: factory.toDb(),
      });
    } catch (error) {
      this.logger.error(`Error inserting factory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a factory
   */
  async update(id: string, dto: Partial<Factory>): Promise<void> {
    try {
      const data = new Factory({
        ...dto,
        id,
      }).toDb();

      // Remove undefined values
      Object.keys(data).forEach((key) => {
        if (data[key] === undefined) {
          delete data[key];
        }
      });

      await this.prisma.factory.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.logger.error(`Error updating factory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a factory
   */
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.factory.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Error deleting factory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add a manager to a factory
   */
  async addManager(
    factoryId: string,
    managerDTO: FactoryManagerDTO,
  ): Promise<void> {
    try {
      await this.prisma.factoryManager.create({
        data: {
          factoryId,
          userId: managerDTO.userId,
          isPrimary: managerDTO.isPrimary,
          startDate: managerDTO.startDate,
          endDate: managerDTO.endDate,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error adding factory manager: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove a manager from a factory
   */
  async removeManager(factoryId: string, userId: string): Promise<void> {
    try {
      await this.prisma.factoryManager.delete({
        where: {
          factoryId_userId: {
            factoryId,
            userId,
          },
        },
      });
    } catch (error) {
      this.logger.error(`Error removing factory manager: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a factory manager
   */
  async updateManager(
    factoryId: string,
    userId: string,
    isPrimary: boolean,
    endDate?: Date,
  ): Promise<void> {
    try {
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
    } catch (error) {
      this.logger.error(`Error updating factory manager: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all managers for a factory
   */
  async getManagers(factoryId: string): Promise<
    Array<{
      userId: string;
      isPrimary: boolean;
      startDate: Date;
      endDate: Date | null;
    }>
  > {
    try {
      return await this.prisma.factoryManager.findMany({
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
    } catch (error) {
      this.logger.error(`Error getting factory managers: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if a factory has associated lines
   */
  async hasLines(factoryId: string): Promise<boolean> {
    try {
      const count = await this.prisma.line.count({
        where: {
          factoryId,
        },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking if factory has lines: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Check if a user is a manager for a factory
   */
  async isManager(userId: string, factoryId: string): Promise<boolean> {
    try {
      const manager = await this.prisma.factoryManager.findUnique({
        where: {
          factoryId_userId: {
            factoryId,
            userId,
          },
        },
      });
      return !!manager;
    } catch (error) {
      this.logger.error(
        `Error checking if user is factory manager: ${error.message}`,
      );
      return false;
    }
  }
}
