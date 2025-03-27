import { Injectable, Logger } from '@nestjs/common';
import { BagColor as PrismaBagColor, BagColorProcess as PrismaBagColorProcess, HandBag as PrismaHandBag, Prisma } from '@prisma/client';
import prisma from 'src/share/components/prisma';
import {
  BagColorCondDTO,
  BagColorProcessCondDTO,
  HandBagCondDTO,
  PaginationDTO,
} from './handbag.dto';
import { BagColor, BagColorProcess, HandBag } from './handbag.model';
import { IHandBagRepository } from './handbag.port';

@Injectable()
export class HandBagPrismaRepository implements IHandBagRepository {
  private readonly logger = new Logger(HandBagPrismaRepository.name);

  // ========== Private Utility Methods ==========
  private _toHandBagModel(data: PrismaHandBag): HandBag {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      active: data.active,
      category: data.category,
      dimensions: data.dimensions,
      material: data.material,
      weight: data.weight,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  private _toBagColorModel(data: PrismaBagColor): BagColor {
    return {
      id: data.id,
      handBagId: data.handBagId,
      colorCode: data.colorCode,
      colorName: data.colorName,
      hexCode: data.hexCode,
      active: data.active,
      imageUrl: data.imageUrl,
      notes: data.notes,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  private _toBagColorProcessModel(data: PrismaBagColorProcess): BagColorProcess {
    return {
      id: data.id,
      bagColorId: data.bagColorId,
      bagProcessId: data.bagProcessId,
      standardOutput: data.standardOutput,
      difficulty: data.difficulty,
      timeEstimate: data.timeEstimate,
      materialUsage: data.materialUsage,
      qualityNotes: data.qualityNotes,
      specialTools: data.specialTools,
      productivity: data.productivity,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  private _handBagConditionsToWhereClause(
    conditions: HandBagCondDTO,
  ): Prisma.HandBagWhereInput {
    const whereClause: Prisma.HandBagWhereInput = {};

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

    if (conditions.category) {
      whereClause.category = {
        contains: conditions.category,
        mode: 'insensitive',
      };
    }

    if (conditions.active !== undefined) {
      whereClause.active = conditions.active;
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
          category: {
            contains: conditions.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return whereClause;
  }

  private _bagColorConditionsToWhereClause(
    conditions: BagColorCondDTO,
  ): Prisma.BagColorWhereInput {
    const whereClause: Prisma.BagColorWhereInput = {};

    if (conditions.handBagId) {
      whereClause.handBagId = conditions.handBagId;
    }

    if (conditions.colorCode) {
      whereClause.colorCode = {
        contains: conditions.colorCode,
        mode: 'insensitive',
      };
    }

    if (conditions.colorName) {
      whereClause.colorName = {
        contains: conditions.colorName,
        mode: 'insensitive',
      };
    }

    if (conditions.active !== undefined) {
      whereClause.active = conditions.active;
    }

    // Tìm kiếm chung theo code hoặc name
    if (conditions.search) {
      whereClause.OR = [
        {
          colorCode: {
            contains: conditions.search,
            mode: 'insensitive',
          },
        },
        {
          colorName: {
            contains: conditions.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return whereClause;
  }

  private _bagColorProcessConditionsToWhereClause(
    conditions: BagColorProcessCondDTO,
  ): Prisma.BagColorProcessWhereInput {
    const whereClause: Prisma.BagColorProcessWhereInput = {};

    if (conditions.bagColorId) {
      whereClause.bagColorId = conditions.bagColorId;
    }

    if (conditions.bagProcessId) {
      whereClause.bagProcessId = conditions.bagProcessId;
    }

    return whereClause;
  }

  // ========== HandBag Methods ==========
  async getHandBag(id: string): Promise<HandBag | null> {
    try {
      const data = await prisma.handBag.findUnique({
        where: { id },
      });

      return data ? this._toHandBagModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error fetching handbag ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get handbag: ${error.message}`);
    }
  }

  async findHandBagByCode(code: string): Promise<HandBag | null> {
    try {
      const data = await prisma.handBag.findFirst({
        where: { code: { equals: code, mode: 'insensitive' } },
      });

      return data ? this._toHandBagModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error finding handbag by code ${code}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to find handbag by code: ${error.message}`);
    }
  }

  async findHandBagByCond(cond: HandBagCondDTO): Promise<HandBag | null> {
    try {
      const data = await prisma.handBag.findFirst({
        where: this._handBagConditionsToWhereClause(cond),
      });

      return data ? this._toHandBagModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error finding handbag by conditions: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to find handbag by conditions: ${error.message}`);
    }
  }

  async listHandBags(
    conditions: HandBagCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: HandBag[];
    total: number;
  }> {
    try {
      // Validate pagination parameters
      const page = Math.max(1, pagination.page || 1);
      const limit = Math.min(100, Math.max(1, pagination.limit || 10));
      const sortBy = pagination.sortBy || 'createdAt';
      const sortOrder = pagination.sortOrder || 'desc';

      const whereClause = this._handBagConditionsToWhereClause(conditions);

      // Run count and data queries in parallel for efficiency
      const [total, data] = await Promise.all([
        prisma.handBag.count({ where: whereClause }),
        prisma.handBag.findMany({
          where: whereClause,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            groupRates: true,
          }
        }),
      ]);

      return {
        data: data.map(this._toHandBagModel),
        total,
      };
    } catch (error) {
      this.logger.error(
        `Error listing handbags: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to list handbags: ${error.message}`);
    }
  }

  async insertHandBag(handBag: HandBag): Promise<void> {
    try {
      await prisma.handBag.create({
        data: {
          id: handBag.id,
          code: handBag.code,
          name: handBag.name,
          description: handBag.description,
          imageUrl: handBag.imageUrl,
          active: handBag.active,
          category: handBag.category,
          dimensions: handBag.dimensions,
          material: handBag.material,
          weight: handBag.weight,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error inserting handbag: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to insert handbag: ${error.message}`);
    }
  }

  async updateHandBag(id: string, dto: Partial<HandBag>): Promise<void> {
    try {
      // Filter out undefined values to avoid unintended updates
      const updateData: Prisma.HandBagUpdateInput = {};

      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.imageUrl !== undefined) updateData.imageUrl = dto.imageUrl;
      if (dto.active !== undefined) updateData.active = dto.active;
      if (dto.category !== undefined) updateData.category = dto.category;
      if (dto.dimensions !== undefined) updateData.dimensions = dto.dimensions;
      if (dto.material !== undefined) updateData.material = dto.material;
      if (dto.weight !== undefined) updateData.weight = dto.weight;

      await prisma.handBag.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      this.logger.error(
        `Error updating handbag ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to update handbag: ${error.message}`);
    }
  }

  async deleteHandBag(id: string): Promise<void> {
    try {
      await prisma.handBag.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(
        `Error deleting handbag ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to delete handbag: ${error.message}`);
    }
  }

  async hasProductionRecords(handBagId: string): Promise<boolean> {
    try {
      const count = await prisma.productionRecord.count({
        where: { handBagId },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking if handbag ${handBagId} has production records: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to check production records: ${error.message}`);
    }
  }

  // ========== BagColor Methods ==========
  async getBagColor(id: string): Promise<BagColor | null> {
    try {
      const data = await prisma.bagColor.findUnique({
        where: { id },
      });

      return data ? this._toBagColorModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error fetching bag color ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get bag color: ${error.message}`);
    }
  }

  async findBagColorByCode(handBagId: string, colorCode: string): Promise<BagColor | null> {
    try {
      const data = await prisma.bagColor.findFirst({
        where: {
          handBagId,
          colorCode: { equals: colorCode, mode: 'insensitive' },
        },
      });

      return data ? this._toBagColorModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error finding bag color by code: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to find bag color by code: ${error.message}`);
    }
  }

  async listBagColors(
    conditions: BagColorCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: BagColor[];
    total: number;
  }> {
    try {
      // Validate pagination parameters
      const page = Math.max(1, pagination.page || 1);
      const limit = Math.min(100, Math.max(1, pagination.limit || 10));
      const sortBy = pagination.sortBy || 'createdAt';
      const sortOrder = pagination.sortOrder || 'desc';

      const whereClause = this._bagColorConditionsToWhereClause(conditions);

      // Run count and data queries in parallel for efficiency
      const [total, data] = await Promise.all([
        prisma.bagColor.count({ where: whereClause }),
        prisma.bagColor.findMany({
          where: whereClause,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      return {
        data: data.map(this._toBagColorModel),
        total,
      };
    } catch (error) {
      this.logger.error(
        `Error listing bag colors: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to list bag colors: ${error.message}`);
    }
  }

  async insertBagColor(bagColor: BagColor): Promise<void> {
    try {
      await prisma.bagColor.create({
        data: {
          id: bagColor.id,
          handBagId: bagColor.handBagId,
          colorCode: bagColor.colorCode,
          colorName: bagColor.colorName,
          hexCode: bagColor.hexCode,
          active: bagColor.active,
          imageUrl: bagColor.imageUrl,
          notes: bagColor.notes,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error inserting bag color: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to insert bag color: ${error.message}`);
    }
  }

  async updateBagColor(id: string, dto: Partial<BagColor>): Promise<void> {
    try {
      // Filter out undefined values to avoid unintended updates
      const updateData: Prisma.BagColorUpdateInput = {};

      if (dto.colorName !== undefined) updateData.colorName = dto.colorName;
      if (dto.hexCode !== undefined) updateData.hexCode = dto.hexCode;
      if (dto.active !== undefined) updateData.active = dto.active;
      if (dto.imageUrl !== undefined) updateData.imageUrl = dto.imageUrl;
      if (dto.notes !== undefined) updateData.notes = dto.notes;

      await prisma.bagColor.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      this.logger.error(
        `Error updating bag color ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to update bag color: ${error.message}`);
    }
  }

  async deleteBagColor(id: string): Promise<void> {
    try {
      await prisma.bagColor.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(
        `Error deleting bag color ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to delete bag color: ${error.message}`);
    }
  }

  async hasProductionRecordsForColor(bagColorId: string): Promise<boolean> {
    try {
      const count = await prisma.productionRecord.count({
        where: { bagColorId },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking if bag color ${bagColorId} has production records: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to check production records for color: ${error.message}`);
    }
  }

  // ========== BagColorProcess Methods ==========
  async getBagColorProcess(id: string): Promise<BagColorProcess | null> {
    try {
      const data = await prisma.bagColorProcess.findUnique({
        where: { id },
      });

      return data ? this._toBagColorProcessModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error fetching bag color process ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get bag color process: ${error.message}`);
    }
  }

  async findBagColorProcess(
    bagColorId: string,
    bagProcessId: string,
  ): Promise<BagColorProcess | null> {
    try {
      const data = await prisma.bagColorProcess.findFirst({
        where: {
          bagColorId,
          bagProcessId,
        },
      });

      return data ? this._toBagColorProcessModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error finding bag color process: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to find bag color process: ${error.message}`);
    }
  }

  async listBagColorProcesses(
    conditions: BagColorProcessCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: BagColorProcess[];
    total: number;
  }> {
    try {
      // Validate pagination parameters
      const page = Math.max(1, pagination.page || 1);
      const limit = Math.min(100, Math.max(1, pagination.limit || 10));
      const sortBy = pagination.sortBy || 'createdAt';
      const sortOrder = pagination.sortOrder || 'desc';

      const whereClause = this._bagColorProcessConditionsToWhereClause(conditions);

      // Run count and data queries in parallel for efficiency
      const [total, data] = await Promise.all([
        prisma.bagColorProcess.count({ where: whereClause }),
        prisma.bagColorProcess.findMany({
          where: whereClause,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            bagColor: true,
            bagProcess: true,
          },
        }),
      ]);

      return {
        data: data.map(this._toBagColorProcessModel),
        total,
      };
    } catch (error) {
      this.logger.error(
        `Error listing bag color processes: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to list bag color processes: ${error.message}`);
    }
  }

  async insertBagColorProcess(bagColorProcess: BagColorProcess): Promise<void> {
    try {
      await prisma.bagColorProcess.create({
        data: {
          id: bagColorProcess.id,
          bagColorId: bagColorProcess.bagColorId,
          bagProcessId: bagColorProcess.bagProcessId,
          standardOutput: bagColorProcess.standardOutput,
          difficulty: bagColorProcess.difficulty,
          timeEstimate: bagColorProcess.timeEstimate,
          materialUsage: bagColorProcess.materialUsage,
          productivity: bagColorProcess.productivity,
          qualityNotes: bagColorProcess.qualityNotes,
          specialTools: bagColorProcess.specialTools,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error inserting bag color process: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to insert bag color process: ${error.message}`);
    }
  }

  async updateBagColorProcess(id: string, dto: Partial<BagColorProcess>): Promise<void> {
    try {
      // Filter out undefined values to avoid unintended updates
      const updateData: Prisma.BagColorProcessUpdateInput = {};

      if (dto.standardOutput !== undefined) updateData.standardOutput = dto.standardOutput;
      if (dto.difficulty !== undefined) updateData.difficulty = dto.difficulty;
      if (dto.timeEstimate !== undefined) updateData.timeEstimate = dto.timeEstimate;
      if (dto.materialUsage !== undefined) updateData.materialUsage = dto.materialUsage;
      if (dto.qualityNotes !== undefined) updateData.qualityNotes = dto.qualityNotes;
      if (dto.specialTools !== undefined) updateData.specialTools = dto.specialTools;

      await prisma.bagColorProcess.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      this.logger.error(
        `Error updating bag color process ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to update bag color process: ${error.message}`);
    }
  }

  async deleteBagColorProcess(id: string): Promise<void> {
    try {
      await prisma.bagColorProcess.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(
        `Error deleting bag color process ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to delete bag color process: ${error.message}`);
    }
  }
}