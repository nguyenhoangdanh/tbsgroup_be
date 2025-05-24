import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import prisma from './prisma';

/**
 * Lớp cơ sở cung cấp các chức năng CRUD phổ biến cho repository
 */
export abstract class BaseRepository<
  T,
  CreateDto,
  UpdateDto,
  WhereInput,
  ConditionDto,
> {
  protected readonly logger: Logger;
  protected readonly modelName: string;

  constructor(loggerContext: string, modelName: string) {
    this.logger = new Logger(loggerContext);
    this.modelName = modelName;
  }

  /**
   * Chuyển đổi entity từ cơ sở dữ liệu sang model domain
   * @param data Entity từ Prisma
   */
  protected abstract _toModel(data: any): T;

  /**
   * Chuyển đổi điều kiện tìm kiếm từ DTO sang Prisma where clause
   * @param conditions Điều kiện tìm kiếm
   */
  protected abstract _conditionsToWhereClause(
    conditions: ConditionDto,
  ): WhereInput;

  /**
   * Phương thức truy vấn một bản ghi theo ID
   */
  protected async _get(id: string, prismaDelegate: any): Promise<T | null> {
    try {
      const data = await prismaDelegate.findUnique({
        where: { id },
      });

      return data ? this._toModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error fetching ${this.modelName} ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get ${this.modelName}: ${error.message}`);
    }
  }

  /**
   * Phương thức truy vấn một bản ghi theo code
   */
  protected async _findByCode(
    code: string,
    prismaDelegate: any,
  ): Promise<T | null> {
    try {
      const data = await prismaDelegate.findFirst({
        where: { code: { equals: code, mode: 'insensitive' } },
      });

      return data ? this._toModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error finding ${this.modelName} by code ${code}: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Failed to find ${this.modelName} by code: ${error.message}`,
      );
    }
  }

  /**
   * Phương thức truy vấn một bản ghi theo điều kiện
   */
  protected async _findByCond(
    cond: ConditionDto,
    prismaDelegate: any,
  ): Promise<T | null> {
    try {
      const data = await prismaDelegate.findFirst({
        where: this._conditionsToWhereClause(cond),
      });

      return data ? this._toModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error finding ${this.modelName} by conditions: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Failed to find ${this.modelName} by conditions: ${error.message}`,
      );
    }
  }

  /**
   * Phương thức liệt kê các bản ghi theo điều kiện, có phân trang
   */
  protected async _list(
    conditions: ConditionDto,
    pagination: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
    prismaDelegate: any,
    includeOptions?: any,
  ): Promise<{
    data: T[];
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
        prismaDelegate.count({ where: whereClause }),
        prismaDelegate.findMany({
          where: whereClause,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
          ...(includeOptions ? { include: includeOptions } : {}),
        }),
      ]);

      return {
        data: data.map((item: any) => this._toModel(item)),
        total,
      };
    } catch (error) {
      this.logger.error(
        `Error listing ${this.modelName}s: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to list ${this.modelName}s: ${error.message}`);
    }
  }

  /**
   * Phương thức thêm mới một bản ghi
   */
  protected async _insert(data: CreateDto, prismaDelegate: any): Promise<void> {
    try {
      await prismaDelegate.create({
        data,
      });
    } catch (error) {
      this.logger.error(
        `Error inserting ${this.modelName}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to insert ${this.modelName}: ${error.message}`);
    }
  }

  /**
   * Phương thức cập nhật một bản ghi
   */
  protected async _update(
    id: string,
    dto: UpdateDto,
    prismaDelegate: any,
  ): Promise<void> {
    try {
      await prismaDelegate.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      this.logger.error(
        `Error updating ${this.modelName} ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to update ${this.modelName}: ${error.message}`);
    }
  }

  /**
   * Phương thức xóa một bản ghi
   */
  protected async _delete(id: string, prismaDelegate: any): Promise<void> {
    try {
      await prismaDelegate.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(
        `Error deleting ${this.modelName} ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to delete ${this.modelName}: ${error.message}`);
    }
  }
}
