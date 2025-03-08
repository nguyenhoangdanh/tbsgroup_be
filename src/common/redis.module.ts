// redis.module.ts
import { Module, Global, Provider, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import { REDIS_CLIENT, REDIS_HEALTH_SERVICE } from './di-tokens';

// Service kiểm tra sức khỏe của Redis
class RedisHealthService {
  private readonly logger = new Logger(RedisHealthService.name);

  constructor(private readonly redisClient: Redis) {}

  async check(): Promise<boolean> {
    try {
      const pong = await this.redisClient.ping();
      return pong === 'PONG';
    } catch (error) {
      this.logger.error(`Redis health check failed: ${error.message}`);
      return false;
    }
  }
}

const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (configService: ConfigService) => {
    const logger = new Logger('RedisProvider');

    // Get Redis configuration from environment variables
    const host = configService.get<string>('REDIS_HOST', 'localhost');
    const port = configService.get<number>('REDIS_PORT', 6379);
    const password = configService.get<string>('REDIS_PASSWORD');
    const db = configService.get<number>('REDIS_DB', 0);

    // Determine if we have a password
    const hasPassword = password && password.trim() !== '';

    logger.log(
      `Connecting to Redis at ${host}:${port} (DB: ${db}, Auth: ${hasPassword ? 'Yes' : 'No'})`,
    );

    // For Redis connections with authentication
    const redisOptions: RedisOptions = {
      host,
      port,
      db,
      // Only include password if it exists
      ...(hasPassword ? { password } : {}),
      // Additional connection options
      retryStrategy: (times: number) => {
        if (times > 10) {
          logger.error(`Redis connection failed after ${times} retries`);
          return null; // Stop retrying after 10 attempts
        }
        const delay = Math.min(times * 200, 2000);
        logger.warn(`Redis connection retry in ${delay}ms (attempt ${times})`);
        return delay; // Increase retry delay gradually, max 2s
      },
      // Set a connection name for better debugging
      connectionName: 'app_connection',
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      reconnectOnError: (err: Error) => {
        const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNREFUSED'];
        const shouldReconnect = targetErrors.some((e) =>
          err.message.includes(e),
        );
        if (shouldReconnect) {
          logger.warn(`Redis reconnecting due to error: ${err.message}`);
        }
        return shouldReconnect;
      },
    };

    const client = new Redis(redisOptions);

    // Add event listeners for better monitoring
    client.on('connect', () => {
      logger.log('Connected to Redis server');
    });

    client.on('error', (error) => {
      logger.error(`Redis error: ${error.message}`);

      // Provide more helpful error messages for authentication issues
      if (
        error.message.includes('NOAUTH') ||
        error.message.includes('WRONGPASS')
      ) {
        logger.error(
          'Redis authentication failed. Please check your REDIS_PASSWORD environment variable.',
        );

        if (!hasPassword) {
          logger.error(
            'No Redis password provided but authentication is required. Add REDIS_PASSWORD to your environment variables.',
          );
        }
      }
    });

    client.on('ready', () => {
      logger.log('Redis is ready to accept commands');
    });

    client.on('reconnecting', () => {
      logger.warn('Reconnecting to Redis server...');
    });

    return client;
  },
  inject: [ConfigService],
};

const redisHealthProvider: Provider = {
  provide: REDIS_HEALTH_SERVICE,
  useFactory: (redisClient: Redis) => {
    return new RedisHealthService(redisClient);
  },
  inject: [REDIS_CLIENT],
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [redisProvider, redisHealthProvider],
  exports: [REDIS_CLIENT, REDIS_HEALTH_SERVICE],
})
export class RedisModule {}
