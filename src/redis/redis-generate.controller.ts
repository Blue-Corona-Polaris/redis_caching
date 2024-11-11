import { Controller, Get, Query } from '@nestjs/common';
import { RedisGenerateService } from './redis-generate.service';

@Controller('redis-generate')
export class RedisGenerateController {
  constructor(private readonly redisGenerateService: RedisGenerateService) {}

  @Get('generate')
  async generateData() {
    try {
      await this.redisGenerateService.generateAndStoreData();
      return { message: 'Data generation and storage completed.' };
    } catch (error) {
      return { message: 'Error generating data', error: error.message };
    }
  }

  // API to fetch records based on a key pattern
  @Get('fetch')
  async fetchData(@Query('pattern') pattern: string) {
    try {
      const data = await this.redisGenerateService.fetchDataByPattern(pattern);
      return data;
    } catch (error) {
      return { message: 'Error fetching data', error: error.message };
    }
  }
}
