import { Injectable, Logger } from '@nestjs/common';
import { BagProcess as PrismaBagProcess, Prisma } from '@prisma/client';
import prisma from 'src/share/components/prisma';
import {
  BagProcessCondDTO,
  PaginationDTO,
} from './bag-process.dto';
import { BagProcess } from './bag-process.model';
import { IBagProcessRepository } from './bag-process.port';

@Injectable()
export class BagProcessPrismaRepository implements IBagProcessRepository {
  private readonly logger = new Logger(BagProcessPrismaRepository.name);

  // ========== Private Utility Methods ==========
  private _toBagProcessModel(data: PrismaBagProcess): BagProcess {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      orderIndex: data.orderIndex,
      processType: data.processType,
      standardOutput: data.standardOutput,
      cycleDuration: data.cycleDuration,
      machineType: data.machineType,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  private _bagProcessConditionsToWhereClause(
    conditions: BagProcessCondDTO,
  ): Prisma.BagProcessWhereInput {
    const whereClause: Prisma.BagProcessWhereInput = {};

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

    if (conditions.processType) {
      whereClause.processType = {
        contains: conditions.processType,
        mode: 'insensitive',
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
        {
          processType: {
            contains: conditions.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return whereClause;
  }

  // ========== Query Methods ==========
  async getBagProcess(id: string): Promise<BagProcess | null> {
    try {
      const data = await prisma.bagProcess.findUnique({
        where: { id },
      });

      return data ? this._toBagProcessModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error fetching bag process ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get bag process: ${error.message}`);
    }
  }

  async findBagProcessByCode(code: string): Promise<BagProcess | null> {
    try {
      const data = await prisma.bagProcess.findFirst({
        where: { code: { equals: code, mode: 'insensitive' } },
      });

      return data ? this._toBagProcessModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error finding bag process by code ${code}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to find bag process by code: ${error.message}`);
    }
  }

  async findBagProcessByCond(cond: BagProcessCondDTO): Promise<BagProcess | null> {
    try {
      const data = await prisma.bagProcess.findFirst({
        where: this._bagProcessConditionsToWhereClause(cond),
      });

      return data ? this._toBagProcessModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error finding bag process by conditions: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to find bag process by conditions: ${error.message}`);
    }
  }

  async listBagProcesses(
    conditions: BagProcessCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: BagProcess[];
    total: number;
  }> {
    try {
      // Validate pagination parameters
      const page = Math.max(1, pagination.page || 1);
      const limit = Math.min(100, Math.max(1, pagination.limit || 10));
      const sortBy = pagination.sortBy || 'orderIndex';
      const sortOrder = pagination.sortOrder || 'asc';

      const whereClause = this._bagProcessConditionsToWhereClause(conditions);

      // Run count and data queries in parallel for efficiency
      const [total, data] = await Promise.all([
        prisma.bagProcess.count({ where: whereClause }),
        prisma.bagProcess.findMany({
          where: whereClause,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      return {
        data: data.map(this._toBagProcessModel),
        total,
      };
    } catch (error) {
      this.logger.error(
        `Error listing bag processes: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to list bag processes: ${error.message}`);
    }
  }

  // ========== Command Methods ==========
  async insertBagProcess(bagProcess: BagProcess): Promise<void> {
    try {
      await prisma.bagProcess.create({
        data: {
          id: bagProcess.id,
          code: bagProcess.code,
          name: bagProcess.name,
          description: bagProcess.description,
          orderIndex: bagProcess.orderIndex,
          processType: bagProcess.processType,
          standardOutput: bagProcess.standardOutput,
          cycleDuration: bagProcess.cycleDuration,
          machineType: bagProcess.machineType,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error inserting bag process: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to insert bag process: ${error.message}`);
    }
  }

  async updateBagProcess(id: string, dto: Partial<BagProcess>): Promise<void> {
    try {
      // Filter out undefined values to avoid unintended updates
      const updateData: Prisma.BagProcessUpdateInput = {};

      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.orderIndex !== undefined) updateData.orderIndex = dto.orderIndex;
      if (dto.processType !== undefined) updateData.processType = dto.processType;
      if (dto.standardOutput !== undefined) updateData.standardOutput = dto.standardOutput;
      if (dto.cycleDuration !== undefined) updateData.cycleDuration = dto.cycleDuration;
      if (dto.machineType !== undefined) updateData.machineType = dto.machineType;

      await prisma.bagProcess.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      this.logger.error(
        `Error updating bag process ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to update bag process: ${error.message}`);
    }
  }

  async deleteBagProcess(id: string): Promise<void> {
    try {
      await prisma.bagProcess.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(
        `Error deleting bag process ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to delete bag process: ${error.message}`);
    }
  }

  // ========== Validation Methods ==========
  async hasProductionRecords(bagProcessId: string): Promise<boolean> {
    try {
      const count = await prisma.productionRecord.count({
        where: { bagProcessId },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking if bag process ${bagProcessId} has production records: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to check production records: ${error.message}`);
    }
  }

  async hasPositionLinks(bagProcessId: string): Promise<boolean> {
    try {
      const count = await prisma.positionProcess.count({
        where: { processId: bagProcessId },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking if bag process ${bagProcessId} has position links: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to check position links: ${error.message}`);
    }
  }

  async hasColorProcessLinks(bagProcessId: string): Promise<boolean> {
    try {
      const count = await prisma.bagColorProcess.count({
        where: { bagProcessId },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking if bag process ${bagProcessId} has color process links: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to check color process links: ${error.message}`);
    }
  }
}