import { Logger } from '@nestjs/common';

/**
 * Base repository class that provides common functionality and error handling
 * for all repository implementations.
 *
 * @template T - The domain entity type
 * @template TDb - The database entity type
 * @template TWhereInput - The Prisma where input type for queries
 */
export abstract class BaseRepository<T, TDb, TWhereInput = any> {
  protected readonly logger: Logger;
  protected readonly entityName: string;

  constructor(loggerContext: string, entityName: string) {
    this.logger = new Logger(loggerContext);
    this.entityName = entityName;
  }

  /**
   * Converts a database entity to domain entity
   * Must be implemented by subclasses
   */
  protected abstract _toModel(data: TDb): T;

  /**
   * Safely executes a database query and handles errors
   * @param operation - A descriptive name of the operation
   * @param action - The async database action to perform
   * @returns The result of the action
   */
  protected async _executeQuery<R>(
    operation: string,
    action: () => Promise<R>,
    entityId?: string,
  ): Promise<R> {
    try {
      return await action();
    } catch (error) {
      const idInfo = entityId ? ` ${this.entityName} ${entityId}` : '';
      this.logger.error(
        `Error ${operation}${idInfo}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to ${operation}: ${error.message}`);
    }
  }

  /**
   * Generic method to find entity by ID
   */
  protected async _findById(
    prismaModel: any,
    id: string,
    include?: any,
  ): Promise<T | null> {
    return this._executeQuery(
      `get ${this.entityName}`,
      async () => {
        const data = await prismaModel.findUnique({
          where: { id },
          ...(include ? { include } : {}),
        });

        return data ? this._toModel(data) : null;
      },
      id,
    );
  }

  /**
   * Generic method to find first entity matching conditions
   */
  protected async _findFirst(
    prismaModel: any,
    whereClause: any,
    include?: any,
  ): Promise<T | null> {
    return this._executeQuery(`find ${this.entityName}`, async () => {
      const data = await prismaModel.findFirst({
        where: whereClause,
        ...(include ? { include } : {}),
      });

      return data ? this._toModel(data) : null;
    });
  }

  /**
   * Generic method to find many entities with pagination
   */
  protected async _findMany(
    prismaModel: any,
    whereClause: any,
    pagination: {
      page: number;
      limit: number;
      sortBy: string;
      sortOrder: 'asc' | 'desc';
    },
    include?: any,
  ): Promise<{ data: T[]; total: number }> {
    return this._executeQuery(`list ${this.entityName}s`, async () => {
      const { page, limit, sortBy, sortOrder } = pagination;

      // Run count and data queries in parallel for efficiency
      const [total, data] = await Promise.all([
        prismaModel.count({ where: whereClause }),
        prismaModel.findMany({
          where: whereClause,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
          ...(include ? { include } : {}),
        }),
      ]);

      return {
        data: data.map((item: any) => this._toModel(item)),
        total,
      };
    });
  }
}
