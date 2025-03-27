import { Injectable, Logger } from '@nestjs/common';
import { Factory as PrismaFactory, Prisma } from '@prisma/client';
import prisma from 'src/share/components/prisma';
import {
  FactoryCondDTO,
  FactoryManagerDTO,
  PaginationDTO,
} from './factory.dto';
import { Factory } from './factory.model';
import { IFactoryRepository } from './factory.port';
import { UserRole } from 'src/share';

@Injectable()
export class FactoryPrismaRepository implements IFactoryRepository {
  private readonly logger = new Logger(FactoryPrismaRepository.name);

  // ========== Private Utility Methods ==========
  private _toModel(data: PrismaFactory): Factory {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      address: data.address,
      departmentId: data.departmentId,
      managingDepartmentId: data.managingDepartmentId, // Thêm trường này
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  private _conditionsToWhereClause(
    conditions: FactoryCondDTO,
  ): Prisma.FactoryWhereInput {
    const whereClause: Prisma.FactoryWhereInput = {};

    if (conditions.code) {
      whereClause.code = {
        contains: conditions.code,
        mode: 'insensitive',
      };
    }

    if (conditions.name) {
      whereClause.name = {
        contains: conditions.name,
        mode: 'insensitive',
      };
    }

    if (conditions.departmentId) {
      whereClause.departmentId = conditions.departmentId;
    }

    if (conditions.managingDepartmentId) {
      whereClause.managingDepartmentId = conditions.managingDepartmentId;
    }

    // Tìm kiếm theo department type nếu được chỉ định
    if (conditions.departmentType) {
      whereClause.managingDepartment = {
        departmentType: conditions.departmentType,
      };
    }

    // Tìm kiếm chung theo code hoặc name
    if (conditions.search) {
      whereClause.OR = [
        {
          code: {
            contains: conditions.search,
            mode: 'insensitive',
          },
        },
        {
          name: {
            contains: conditions.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return whereClause;
  }

  // ========== Query methods ==========
  async get(id: string): Promise<Factory | null> {
    try {
      const data = await prisma.factory.findUnique({
        where: { id },
        include: { department: true, managingDepartment: true },
      });

      return data ? this._toModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error fetching factory ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get factory: ${error.message}`);
    }
  }

  async findByCode(code: string): Promise<Factory | null> {
    try {
      const data = await prisma.factory.findFirst({
        where: { code: { equals: code, mode: 'insensitive' } },
      });

      return data ? this._toModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error finding factory by code ${code}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to find factory by code: ${error.message}`);
    }
  }

  async findByCond(cond: FactoryCondDTO): Promise<Factory | null> {
    try {
      const data = await prisma.factory.findFirst({
        where: this._conditionsToWhereClause(cond),
      });

      return data ? this._toModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error finding factory by conditions: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to find factory by conditions: ${error.message}`);
    }
  }

  async list(
    conditions: FactoryCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: Factory[];
    total: number;
  }> {
    try {
      // Validate pagination parameters
      const page = Math.max(1, pagination.page || 1);
      const limit = Math.min(100, Math.max(1, pagination.limit || 10));
      const sortBy = pagination.sortBy || 'createdAt';
      const sortOrder = pagination.sortOrder || 'desc';

      const whereClause = this._conditionsToWhereClause(conditions);

      // Run count and data queries in parallel for efficiency
      const [total, data] = await Promise.all([
        prisma.factory.count({ where: whereClause }),
        prisma.factory.findMany({
          where: whereClause,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      return {
        data: data.map(this._toModel),
        total,
      };
    } catch (error) {
      this.logger.error(
        `Error listing factories: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to list factories: ${error.message}`);
    }
  }

  async listByIds(ids: string[]): Promise<Factory[]> {
    try {
      if (!ids.length) return [];

      const data = await prisma.factory.findMany({
        where: { id: { in: ids } },
      });

      return data.map(this._toModel);
    } catch (error) {
      this.logger.error(
        `Error listing factories by IDs: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to list factories by IDs: ${error.message}`);
    }
  }

  async listByDepartmentId(departmentId: string): Promise<Factory[]> {
    try {
      const data = await prisma.factory.findMany({
        where: { departmentId },
        orderBy: { name: 'asc' },
      });

      return data.map(this._toModel);
    } catch (error) {
      this.logger.error(
        `Error listing factories by department ID: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Failed to list factories by department ID: ${error.message}`,
      );
    }
  }

  // ========== Command methods ==========
  async update(id: string, dto: Partial<Factory>): Promise<void> {
    try {
      // Filter out undefined values to avoid unintended updates
      const updateData: Prisma.FactoryUpdateInput = {};

      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.description !== undefined)
        updateData.description = dto.description;
      if (dto.address !== undefined) updateData.address = dto.address;

      // Cập nhật mối quan hệ với Department HEAD_OFFICE
      if (dto.departmentId !== undefined) {
        updateData.department = dto.departmentId
          ? { connect: { id: dto.departmentId } }
          : { disconnect: true };
      }

      // Cập nhật mối quan hệ với Department FACTORY_OFFICE
      if (dto.managingDepartmentId !== undefined) {
        updateData.managingDepartment = dto.managingDepartmentId
          ? { connect: { id: dto.managingDepartmentId } }
          : { disconnect: true };
      }

      await prisma.factory.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      this.logger.error(
        `Error updating factory ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to update factory: ${error.message}`);
    }
  }

  // Cập nhật phương thức insert
  async insert(factory: Factory): Promise<void> {
    try {
      const data: Prisma.FactoryCreateInput = {
        id: factory.id,
        code: factory.code,
        name: factory.name,
        description: factory.description,
        address: factory.address,
      };

      // Thêm mối quan hệ với Department HEAD_OFFICE nếu có
      if (factory.departmentId) {
        data.department = {
          connect: { id: factory.departmentId },
        };
      }

      // Thêm mối quan hệ với Department FACTORY_OFFICE nếu có
      if (factory.managingDepartmentId) {
        data.managingDepartment = {
          connect: { id: factory.managingDepartmentId },
        };
      }

      await prisma.factory.create({ data });
    } catch (error) {
      this.logger.error(
        `Error inserting factory: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to insert factory: ${error.message}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await prisma.factory.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(
        `Error deleting factory ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to delete factory: ${error.message}`);
    }
  }

  // ========== Factory manager methods ==========
  async addManager(
    factoryId: string,
    managerDTO: FactoryManagerDTO,
  ): Promise<void> {
    try {
      // If this is a primary manager, update all existing managers to not be primary
      if (managerDTO.isPrimary) {
        await prisma.factoryManager.updateMany({
          where: { factoryId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      // Add the new manager
      await prisma.factoryManager.create({
        data: {
          factoryId,
          userId: managerDTO.userId,
          isPrimary: managerDTO.isPrimary,
          startDate: managerDTO.startDate,
          endDate: managerDTO.endDate,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error adding manager to factory ${factoryId}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to add factory manager: ${error.message}`);
    }
  }

  async removeManager(factoryId: string, userId: string): Promise<void> {
    try {
      await prisma.factoryManager.deleteMany({
        where: { factoryId, userId },
      });
    } catch (error) {
      this.logger.error(
        `Error removing manager from factory ${factoryId}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to remove factory manager: ${error.message}`);
    }
  }

  async updateManager(
    factoryId: string,
    userId: string,
    isPrimary: boolean,
    endDate?: Date,
  ): Promise<void> {
    try {
      // If setting as primary, update all existing primary managers
      if (isPrimary) {
        await prisma.factoryManager.updateMany({
          where: { factoryId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      // Update the specific manager
      await prisma.factoryManager.updateMany({
        where: { factoryId, userId },
        data: {
          isPrimary,
          ...(endDate ? { endDate } : {}),
        },
      });
    } catch (error) {
      this.logger.error(
        `Error updating manager for factory ${factoryId}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to update factory manager: ${error.message}`);
    }
  }

  async getManagers(factoryId: string): Promise<
    {
      userId: string;
      isPrimary: boolean;
      startDate: Date;
      endDate: Date | null;
    }[]
  > {
    try {
      const managers = await prisma.factoryManager.findMany({
        where: {
          factoryId,
          OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        },
        orderBy: [{ isPrimary: 'desc' }, { startDate: 'desc' }],
      });

      return managers.map((manager) => ({
        userId: manager.userId,
        isPrimary: manager.isPrimary,
        startDate: manager.startDate,
        endDate: manager.endDate,
      }));
    } catch (error) {
      this.logger.error(
        `Error getting managers for factory ${factoryId}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get factory managers: ${error.message}`);
    }
  }

  // ========== Validation methods ==========
  async hasLines(factoryId: string): Promise<boolean> {
    try {
      const count = await prisma.line.count({
        where: { factoryId },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking if factory ${factoryId} has lines: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to check if factory has lines: ${error.message}`);
    }
  }

  async isManager(userId: string, factoryId: string): Promise<boolean> {
    try {
      // Check if user has admin role
      const hasAdminRole = await prisma.userRoleAssignment.findFirst({
        where: {
          userId,
          role: {
            code: {
              in: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
            },
          },
          OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
        },
      });

      if (hasAdminRole) {
        return true;
      }

      // Check direct factory manager assignment
      const directAssignment = await prisma.factoryManager.findFirst({
        where: {
          userId,
          factoryId,
          OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        },
      });

      if (directAssignment) {
        return true;
      }

      // Check role-based factory manager assignment
      const roleAssignment = await prisma.userRoleAssignment.findFirst({
        where: {
          userId,
          role: {
            code: UserRole.FACTORY_MANAGER,
          },
          scope: `factory:${factoryId}`,
          OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
        },
      });

      return !!roleAssignment;
    } catch (error) {
      this.logger.error(
        `Error checking if user ${userId} is manager of factory ${factoryId}: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Failed to check factory manager status: ${error.message}`,
      );
    }
  }
}
