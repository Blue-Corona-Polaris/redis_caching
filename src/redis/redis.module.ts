// src/redis/redis.module.ts
import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { Redis } from 'ioredis';
import { RedisGenerateService } from './redis-generate.service';
import { RedisGenerateController } from './redis-generate.controller';

@Global() // Make Redis globally available in the application
@Module({
  providers: [
    // Setting up Redis client as a provider
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        const client = new Redis({
          host: 'localhost', // Redis host
          port: 6379,        // Redis port
        });
        return client;
      },
    },
    RedisService, // Adding RedisService to the providers
    RedisGenerateService
  ],
  controllers: [RedisGenerateController], // If you need to add the controller to the module
  exports: [RedisService, RedisGenerateService], // Make services available for other modules
})
export class RedisModule {}



