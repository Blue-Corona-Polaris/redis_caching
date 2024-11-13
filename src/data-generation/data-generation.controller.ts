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

  
  @Post('multiple-perf')
  async getMultipleMetricsData(
    @Body() requestBody: { metricIds: string[], year: number, month: string, groupBy: string },
  ) {
    console.time('Total API Execution Time'); // Track the overall time for the API call

    const { metricIds, year, month, groupBy } = requestBody;

    console.time('Redis Fetch Time'); // Track the time it takes to fetch data from Redis
    const result = await this.dataGenerationService.getMultipleMetricsDataPerfMetrics(metricIds, year, month, groupBy);
    console.timeEnd('Redis Fetch Time'); // End Redis fetch timing

    console.timeEnd('Total API Execution Time'); // End total execution time

    return result;
  }

  @Post('multiple-combinations')
  async getMultipleCombinationsData(
    @Body() requestBody: { 
      metricIds: string[], 
      years: number[], 
      months: string[], 
      groupBy: string[] 
    },
  ) {
    console.time('Total API Execution Time'); // Track the overall time for the API call

    const { metricIds, years, months, groupBy } = requestBody;

    // Create all possible combinations of year, month, and groupBy
    const combinations = this.createCombinations(years, months, groupBy);

    // Initialize an array to store the results for all combinations
    const allResults = [];

    // Process each combination and fetch data
    console.time('Total Data Fetch Time'); // Measure the time taken to fetch all data
    for (const combination of combinations) {
      const { year, month, groupByFields } = combination;
      const result = await this.dataGenerationService.getMultipleMetricsGroupedDataSeparateCacheCall(
        metricIds, year, month, groupByFields.join(',')
      );
      allResults.push(result);
    }
    console.timeEnd('Total Data Fetch Time'); // End the time taken to fetch data

    console.timeEnd('Total API Execution Time'); // End total execution time

    return allResults;
  }

  // Helper method to create combinations of year, month, and groupBy
  private createCombinations(years: number[], months: string[], groupBy: string[]): any[] {
    const combinations = [];
    for (const year of years) {
      for (const month of months) {
        for (const groupByField of groupBy) {
          combinations.push({
            year,
            month,
            groupByFields: [groupByField], // GroupBy is an array, so keep it as array for processing
          });
        }
      }
    }
    return combinations;
  }

  
}
