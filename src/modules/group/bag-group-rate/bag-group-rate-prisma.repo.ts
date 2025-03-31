import { Injectable, Logger } from '@nestjs/common';
import { BagGroupRate as PrismaBagGroupRate, Prisma } from '@prisma/client';
import prisma from 'src/share/components/prisma';
import { BagGroupRateCondDTO, PaginationDTO } from './bag-group-rate.dto';
import { BagGroupRate, BagGroupRateWithName } from './bag-group-rate.model';
import { IBagGroupRateRepository } from './bag-group-rate.port';
import { isValidUUID } from 'src/utils/uuid-utils';

@Injectable()
export class BagGroupRatePrismaRepository implements IBagGroupRateRepository {
  private readonly logger = new Logger(BagGroupRatePrismaRepository.name);

  // ========== Private Utility Methods ==========
  private _toBagGroupRateModel(
    data: PrismaBagGroupRate & {
      handBag?: any;
      group?: any;
    },
  ): BagGroupRateWithName {
    return {
      id: data.id,
      handBagId: data.handBagId,
      groupId: data.groupId,
      outputRate: data.outputRate,
      notes: data.notes,
      active: data.active,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),

      handBagName: data.handBag?.name,
      groupName: data.group?.name,
      handBagCode: data.handBag?.code,
      groupCode: data.group?.code,
    };
  }

  private _bagGroupRateConditionsToWhereClause(
    conditions: BagGroupRateCondDTO,
  ): Prisma.BagGroupRateWhereInput {
    const whereClause: Prisma.BagGroupRateWhereInput = {};

    if (conditions.handBagId) {
      whereClause.handBagId = conditions.handBagId;
    }

    if (conditions.groupId) {
      whereClause.groupId = conditions.groupId;
    }

    // if (conditions.active !== undefined) {
    //   // Handle various formats of active condition
    //   if (typeof conditions.active === 'string') {
    //     const lowerActive = conditions.active.toLowerCase();
    //     whereClause.active = lowerActive === 'true' || lowerActive === '1';
    //   } else if (typeof conditions.active === 'boolean') {
    //     whereClause.active = conditions.active;
    //   } else if (typeof conditions.active === 'number') {
    //     whereClause.active = conditions.active === 1;
    //   }
    // }
    return whereClause;
  }

  // ========== Repository Implementation ==========

  async getBagGroupRate(id: string): Promise<BagGroupRate | null> {
    try {
      // Validate UUID format before querying
      if (!isValidUUID(id)) {
        this.logger.warn(`Invalid UUID format: ${id}`);
        return null;
      }

      const data = await prisma.bagGroupRate.findUnique({
        where: { id },
        include: {
          handBag: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          group: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      return data ? this._toBagGroupRateModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error fetching bag group rate ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get bag group rate: ${error.message}`);
    }
  }

  async findBagGroupRate(
    handBagId: string,
    groupId: string,
  ): Promise<BagGroupRate | null> {
    try {
      // Validate UUID format for both IDs
      if (!isValidUUID(handBagId) || !isValidUUID(groupId)) {
        this.logger.warn(
          `Invalid UUID format: handBagId=${handBagId}, groupId=${groupId}`,
        );
        return null;
      }

      const data = await prisma.bagGroupRate.findUnique({
        where: {
          handBagId_groupId: {
            handBagId,
            groupId,
          },
        },
        include: {
          handBag: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          group: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      return data ? this._toBagGroupRateModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error finding bag group rate for handBag ${handBagId} and group ${groupId}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to find bag group rate: ${error.message}`);
    }
  }

  async listBagGroupRates(
    conditions: BagGroupRateCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: BagGroupRate[];
    total: number;
  }> {
    try {
      // Validate pagination parameters
      const page = Math.max(1, pagination.page || 1);
      const limit = Math.min(100, Math.max(1, pagination.limit || 10));
      const sortBy = pagination.sortBy || 'createdAt';
      const sortOrder = pagination.sortOrder || 'desc';

      const whereClause = this._bagGroupRateConditionsToWhereClause(conditions);

      // Run count and data queries in parallel for efficiency
      const [total, data] = await Promise.all([
        prisma.bagGroupRate.count({ where: whereClause }),
        prisma.bagGroupRate.findMany({
          where: whereClause,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            handBag: true,
            group: true,
          },
        }),
      ]);

      return {
        data: data.map(this._toBagGroupRateModel),
        total,
      };
    } catch (error) {
      this.logger.error(
        `Error listing bag group rates: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to list bag group rates: ${error.message}`);
    }
  }

  async insertBagGroupRate(bagGroupRate: BagGroupRate): Promise<void> {
    try {
      await prisma.bagGroupRate.create({
        data: {
          id: bagGroupRate.id,
          handBagId: bagGroupRate.handBagId,
          groupId: bagGroupRate.groupId,
          outputRate: bagGroupRate.outputRate,
          notes: bagGroupRate.notes,
          active: bagGroupRate.active,
          createdAt: bagGroupRate.createdAt,
          updatedAt: bagGroupRate.updatedAt,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error inserting bag group rate: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to insert bag group rate: ${error.message}`);
    }
  }

  async updateBagGroupRate(
    id: string,
    dto: Partial<BagGroupRate>,
  ): Promise<void> {
    try {
      // Filter out undefined values to avoid unintended updates
      const updateData: Prisma.BagGroupRateUpdateInput = {};

      if (dto.outputRate !== undefined) updateData.outputRate = dto.outputRate;
      if (dto.notes !== undefined) updateData.notes = dto.notes;
      if (dto.active !== undefined) updateData.active = dto.active;
      if (dto.updatedAt) updateData.updatedAt = dto.updatedAt;

      await prisma.bagGroupRate.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      this.logger.error(
        `Error updating bag group rate ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to update bag group rate: ${error.message}`);
    }
  }

  async deleteBagGroupRate(id: string): Promise<void> {
    try {
      await prisma.bagGroupRate.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(
        `Error deleting bag group rate ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to delete bag group rate: ${error.message}`);
    }
  }

  async getBagGroupRatesForHandBag(handBagId: string): Promise<BagGroupRate[]> {
    try {
      const data = await prisma.bagGroupRate.findMany({
        where: { handBagId, active: true },
        include: {
          group: true,
        },
        orderBy: { outputRate: 'desc' },
      });

      return data.map(this._toBagGroupRateModel);
    } catch (error) {
      this.logger.error(
        `Error getting bag group rates for handBag ${handBagId}: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Failed to get bag group rates for handBag: ${error.message}`,
      );
    }
  }

  async getBagGroupRatesForGroup(groupId: string): Promise<BagGroupRate[]> {
    try {
      const data = await prisma.bagGroupRate.findMany({
        where: { groupId, active: true },
        include: {
          handBag: true,
        },
        orderBy: { outputRate: 'desc' },
      });

      return data.map(this._toBagGroupRateModel);
    } catch (error) {
      this.logger.error(
        `Error getting bag group rates for group ${groupId}: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Failed to get bag group rates for group: ${error.message}`,
      );
    }
  }
}
