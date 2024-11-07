import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager'; // Import CacheModule
import { SummaryService } from './summary.service';
import { SummaryController } from './summary.controller';
import { Summary, SummarySchema } from './summary.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Summary.name, schema: SummarySchema }]),
    CacheModule.register(), // Add CacheModule here
  ],
  providers: [SummaryService],
  controllers: [SummaryController],
  exports: [SummaryService], // Optionally export the service if needed in other modules
})
export class SummaryModule {}
