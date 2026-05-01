import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

const redisFactory = {
  provide: REDIS_CLIENT,
  useFactory: () => {
    try {
      return new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 100, 500);
        },
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });
    } catch {
      return null;
    }
  },
};

@Global()
@Module({
  providers: [redisFactory],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
