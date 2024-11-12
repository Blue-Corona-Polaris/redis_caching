import { Controller, Get, Body, Post } from '@nestjs/common';
import { DataGenerationService } from './data-generation.service';

@Controller('data-generation')
export class DataGenerationController {
  constructor(private readonly dataGenerationService: DataGenerationService) {}

  // API to trigger data generation
  @Get('generate')
  async generateAndCacheData() {
    await this.dataGenerationService.generateAndCacheAllMetrics();
    return {
      message: 'Data generation and caching started.',
    };
  }

  // API to get the value by metricId, year, and month
  @Post('get-data')
  async getData(@Body() payload: { metricId: string; year: number; month: string }) {
    const { metricId, year, month } = payload;
    return await this.dataGenerationService.getDataFromCache(metricId, year, month);
  }
}
