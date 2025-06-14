import { Logger } from '@nestjs/common';
/**
 * Base repository class that provides common functionality for all Prisma repositories
 * This helps reduce code duplication and standardizes error handling
 */
export abstract class BasePrismaRepository<T, TWhereInput, TUpdateInput> {
  protected abstract readonly logger: Logger;

  /**
   * Convert a database entity to a domain model
   * @param data Database entity
   */
  protected abstract _toModel(data: any): T;

  /**
   * Convert search conditions to Prisma where clause
   * @param conditions Search conditions
   */
  protected abstract _conditionsToWhereClause(conditions: any): TWhereInput;

  /**
   * Standard error handling for repository methods
   * @param operation Description of the operation being performed
   * @param error The caught error
   * @param entityId Optional ID of the entity being operated on
   */
  protected _handleError(
    operation: string,
    error: any,
    entityId?: string,
  ): never {
    const idInfo = entityId ? ` ${entityId}` : '';
    this.logger.error(
      `Error ${operation}${idInfo}: ${error.message}`,
      error.stack,
    );
    throw new Error(`Failed to ${operation}: ${error.message}`);
  }

  /**
   * Execute a database operation with standard error handling
   * @param operation Description of the operation
   * @param dbOperation Function that performs the actual database operation
   * @param entityId Optional ID of the entity being operated on
   */
  protected async _executeWithErrorHandling<R>(
    operation: string,
    dbOperation: () => Promise<R>,
    entityId?: string,
  ): Promise<R> {
    try {
      return await dbOperation();
    } catch (error) {
      this._handleError(operation, error, entityId);
    }
  }

  /**
   * Validate pagination parameters and provide defaults
   * @param pagination Pagination parameters
   * @param defaultSortBy Default sort field
   * @param defaultSortOrder Default sort order
   */
  protected _validatePagination(
    pagination: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
    defaultSortBy = 'createdAt',
    defaultSortOrder: 'asc' | 'desc' = 'desc',
  ) {
    return {
      page: Math.max(1, pagination.page || 1),
      limit: Math.min(100, Math.max(1, pagination.limit || 10)),
      sortBy: pagination.sortBy || defaultSortBy,
      sortOrder: pagination.sortOrder || defaultSortOrder,
    };
  }
}
