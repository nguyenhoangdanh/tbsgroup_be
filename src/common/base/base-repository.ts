import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Base Repository class that provides common functionality for repository implementations
 * This helps reduce repetitive code and standardize error handling across repositories
 */
export abstract class BaseRepository<T, TConditions, TPagination> {
  protected readonly logger: Logger;

  constructor(
    protected readonly prisma: PrismaService,
    loggerContext: string,
  ) {
    this.logger = new Logger(loggerContext);
  }

  /**
   * Standard error handler for repository operations
   * Centralizes error logging and optionally transforms errors
   */
  protected handleError(
    operation: string,
    error: any,
    entityId?: string,
  ): never {
    const idInfo = entityId ? ` ${entityId}` : '';
    const errorMessage = `Error ${operation}${idInfo}: ${error.message}`;
    this.logger.error(errorMessage, error.stack);

    // Preserve original error for better debugging
    throw error;
  }

  /**
   * Generic pagination helper
   * Standardizes pagination parameter validation
   */
  protected validatePagination(pagination: TPagination): any {
    // This should be implemented by each repository based on its pagination type
    // But provides a common interface
    return pagination;
  }

  /**
   * Generic pagination query helper
   * Runs both count and data queries in parallel for efficiency
   */
  protected async paginateQuery<TItem>(
    totalQuery: Promise<number>,
    dataQuery: Promise<TItem[]>,
  ): Promise<{ data: TItem[]; total: number }> {
    try {
      const [total, data] = await Promise.all([totalQuery, dataQuery]);
      return { data, total };
    } catch (error) {
      this.handleError('executing paginated query', error);
    }
  }
}
