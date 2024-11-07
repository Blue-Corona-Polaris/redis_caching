// src/data-service/data-service.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DataServiceController } from './data-service.controller';
import { DataServiceService } from './data-service.service';
import { DataServiceTitanJobsAggregatedDaily, DataServiceTitanJobsAggregatedDailySchema } from './data-service.schema';
import { Entity, EntitySchema } from './entity.schema'; // Import the Entity schema

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DataServiceTitanJobsAggregatedDaily.name, schema: DataServiceTitanJobsAggregatedDailySchema },
      { name: Entity.name, schema: EntitySchema }, // Register the Entity schema
    ]),
  ],
  controllers: [DataServiceController],
  providers: [DataServiceService],
  exports: [DataServiceService], // Export if needed elsewhere
})
export class DataServiceModule {}
