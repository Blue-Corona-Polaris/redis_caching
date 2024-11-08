// src/redis/redis.module.ts
import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisAnalyzerService } from './redis-analyzer.service'; // If you need it
import { RedisAnalyzeController } from './redis-analyze.controller'; // If you need it
import { Redis } from 'ioredis';

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
    RedisAnalyzerService, // Adding RedisAnalyzerService to the providers
  ],
  controllers: [RedisAnalyzeController], // If you need to add the controller to the module
  exports: [RedisService, RedisAnalyzerService], // Make services available for other modules
})
export class RedisModule {}



