import { Module } from '@nestjs/common';
import { DataGenerationService } from './data-generation.service';
import { DataGenerationController } from './data-generation.controller';
import { RedisService } from 'src/redis/redis.service';

@Module({
  providers: [DataGenerationService, RedisService],
  controllers: [DataGenerationController],
})
export class DataGenerationModule { }
