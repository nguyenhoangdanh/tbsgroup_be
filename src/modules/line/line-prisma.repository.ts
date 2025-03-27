import { Injectable, Logger } from '@nestjs/common';
import { Line as PrismaLine, Prisma } from '@prisma/client';
import prisma from 'src/share/components/prisma';
import { AppError, Paginated, PagingDTO } from 'src/share';
import { LineCondDTO, LineManagerDTO } from './line.dto';
import { Line } from './line.model';
import { BasePrismaRepository } from 'src/CrudModule/base-prisma.repository';
import { LineCreateDTO, LineUpdateDTO } from './line.dto';
import { UserRole } from 'src/share';

@Injectable()
export class LinePrismaRepository extends BasePrismaRepository<Line, LineCreateDTO, LineUpdateDTO> {
  constructor() {
    super('Line', prisma.line);
  }

  // Implement abstract methods from BasePrismaRepository
  protected _toModel(data: PrismaLine): Line {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      factoryId: data.factoryId,
      capacity: data.capacity || 0,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  protected _conditionsToWhereClause(
    conditions: LineCondDTO,
  ): Prisma.LineWhereInput {
    const whereClause: Prisma.LineWhereInput = {};

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

    if (conditions.factoryId) {
      whereClause.factoryId = conditions.factoryId;
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

  // Custom methods for Line Repository
  async findByCode(code: string): Promise<Line | null> {
    try {
      const data = await prisma.line.findFirst({
        where: { code: { equals: code, mode: 'insensitive' } },
      });

      return data ? this._toModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error finding line by code ${code}: ${error.message}`,
        error.stack,
      );
      throw AppError.from(
        new Error(`Failed to find line by code: ${error.message}`),
        500
      );
    }
  }

  async listByFactoryId(factoryId: string): Promise<Line[]> {
    try {
      const data = await prisma.line.findMany({
        where: { factoryId },
        orderBy: { name: 'asc' },
      });

      return data.map((item: any) => this._toModel(item));
    } catch (error) {
      this.logger.error(
        `Error listing lines by factory ID: ${error.message}`,
        error.stack,
      );
      throw AppError.from(
        new Error(`Failed to list lines by factory ID: ${error.message}`),
        500
      );
    }
  }

  // Update timestamp only
  async updateTimestamp(id: string): Promise<void> {
    try {
      await prisma.line.update({
        where: { id },
        data: {
          updatedAt: new Date()
        },
      });
    } catch (error) {
      this.logger.error(
        `Error updating line timestamp ${id}: ${error.message}`,
        error.stack,
      );
      throw AppError.from(
        new Error(`Failed to update line timestamp: ${error.message}`),
        500
      );
    }
  }

  // Line manager methods
  async addManager(
    lineId: string,
    managerDTO: LineManagerDTO,
  ): Promise<void> {
    try {
      // If this is a primary manager, update all existing managers to not be primary
      if (managerDTO.isPrimary) {
        await prisma.lineManager.updateMany({
          where: { lineId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      // Add the new manager
      await prisma.lineManager.create({
        data: {
          lineId,
          userId: managerDTO.userId,
          isPrimary: managerDTO.isPrimary,
          startDate: managerDTO.startDate,
          endDate: managerDTO.endDate,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error adding manager to line ${lineId}: ${error.message}`,
        error.stack,
      );
      throw AppError.from(
        new Error(`Failed to add line manager: ${error.message}`),
        500
      );
    }
  }

  async removeManager(lineId: string, userId: string): Promise<void> {
    try {
      await prisma.lineManager.deleteMany({
        where: { lineId, userId },
      });
    } catch (error) {
      this.logger.error(
        `Error removing manager from line ${lineId}: ${error.message}`,
        error.stack,
      );
      throw AppError.from(
        new Error(`Failed to remove line manager: ${error.message}`),
        500
      );
    }
  }

  async updateManager(
    lineId: string,
    userId: string,
    isPrimary: boolean,
    endDate?: Date,
  ): Promise<void> {
    try {
      // If setting as primary, update all existing primary managers
      if (isPrimary) {
        await prisma.lineManager.updateMany({
          where: { lineId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      // Update the specific manager
      await prisma.lineManager.updateMany({
        where: { lineId, userId },
        data: {
          isPrimary,
          ...(endDate ? { endDate } : {}),
        },
      });
    } catch (error) {
      this.logger.error(
        `Error updating manager for line ${lineId}: ${error.message}`,
        error.stack,
      );
      throw AppError.from(
        new Error(`Failed to update line manager: ${error.message}`),
        500
      );
    }
  }

  async getManagers(lineId: string): Promise<
    {
      userId: string;
      isPrimary: boolean;
      startDate: Date;
      endDate: Date | null;
    }[]
  > {
    try {
      const managers = await prisma.lineManager.findMany({
        where: {
          lineId,
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
        `Error getting managers for line ${lineId}: ${error.message}`,
        error.stack,
      );
      throw AppError.from(
        new Error(`Failed to get line managers: ${error.message}`),
        500
      );
    }
  }

  // Validation methods
  async hasTeams(lineId: string): Promise<boolean> {
    try {
      const count = await prisma.team.count({
        where: { lineId },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking if line ${lineId} has teams: ${error.message}`,
        error.stack,
      );
      throw AppError.from(
        new Error(`Failed to check if line has teams: ${error.message}`),
        500
      );
    }
  }

  async isManager(userId: string, lineId: string): Promise<boolean> {
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

      // Check direct line manager assignment
      const directAssignment = await prisma.lineManager.findFirst({
        where: {
          userId,
          lineId,
          OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        },
      });

      if (directAssignment) {
        return true;
      }

      // Check role-based line manager assignment
      const roleAssignment = await prisma.userRoleAssignment.findFirst({
        where: {
          userId,
          role: {
            code: UserRole.LINE_MANAGER,
          },
          scope: `line:${lineId}`,
          OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
        },
      });

      return !!roleAssignment;
    } catch (error) {
      this.logger.error(
        `Error checking if user ${userId} is manager of line ${lineId}: ${error.message}`,
        error.stack,
      );
      throw AppError.from(
        new Error(`Failed to check line manager status: ${error.message}`),
        500
      );
    }
  }
}