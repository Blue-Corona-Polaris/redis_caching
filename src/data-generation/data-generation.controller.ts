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

    // API to get grouped data by metricId, year, month, and groupBy fields
    @Post('group-data')
    async getGroupedData(@Body() payload: { metricId: string; year: number; month: string; groupBy: string }) {
      const { metricId, year, month, groupBy } = payload;
      return await this.dataGenerationService.getDataGroupedByPerfMetrics(metricId, year, month, groupBy);
    }

  // Endpoint for fetching multiple metrics
  @Post('/multiple')
  async getMultipleMetrics(@Body() body: any): Promise<any> {
    const { metricIds, year, month, groupBy } = body;

    if (!Array.isArray(metricIds) || metricIds.length === 0) {
      return {
        message: 'Please provide an array of metricIds.',
      };
    }

    // Call service method to process the data
    const result = await this.dataGenerationService.getMultipleMetricsData(metricIds, year, month, groupBy);
    return result;
  }
}
