// src/share/prisma.service.ts
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });

    // Sửa lỗi type cho event handler
    // @ts-ignore - Bỏ qua kiểm tra type cho event handler Prisma
    this.$on('query', (e: any) => {
      if (process.env.DEBUG_PRISMA === 'true') {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      }
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to the database');
    } catch (error) {
      this.logger.error(
        `Failed to connect to the database: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Successfully disconnected from the database');
    } catch (error) {
      this.logger.error(
        `Error disconnecting from the database: ${error.message}`,
        error.stack,
      );
    }
  }

  // Utility method to handle Prisma errors consistently
  handleError(error: any, context: string): never {
    // Log the error with context
    this.logger.error(
      `Database error in ${context}: ${error.message}`,
      error.stack,
    );

    // Rethrow as a more specific error if needed
    throw error;
  }
}
