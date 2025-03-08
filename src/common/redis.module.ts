// redis.module.ts
import { Module, Global, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './di-tokens';

const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (configService: ConfigService) => {
    const redisConfig = {
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
      password: configService.get<string>('REDIS_PASSWORD', ''),
      db: configService.get<number>('REDIS_DB', 0),
    };

    return new Redis(redisConfig);
  },
  inject: [ConfigService],
};

@Global()
@Module({
  imports: [ConfigModule], // Thêm ConfigModule vào đây
  providers: [redisProvider],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
