import { Module } from '@nestjs/common';
import { DataGenerationService } from './data-generation.service';
import { DataGenerationController } from './data-generation.controller';

@Module({
  providers: [DataGenerationService],
  controllers: [DataGenerationController],
})
export class DataGenerationModule {}
