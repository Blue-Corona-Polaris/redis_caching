// src/redis/redis-analyze.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { RedisAnalyzerService } from './redis-analyzer.service'; // Import the RedisAnalyzerService

@Controller('redis-analyze')
export class RedisAnalyzeController {
  constructor(private readonly redisAnalyzerService: RedisAnalyzerService) {}

  // API to scan and get values for keys matching the pattern
  @Get('scan-and-get')
  async scanAndGetValues(@Query('pattern') pattern: string) {
    try {
      // Fetch the keys and values based on the pattern
      const result = await this.redisAnalyzerService.scanAndGetValues(pattern);
      return result;
    } catch (error) {
      return { message: 'Error scanning and fetching values', error: error.message };
    }
  }

  // API to get the TTL for multiple keys
  @Get('get-keys-ttl')
  async getKeysTTL(@Query('pattern') pattern: string) {
    try {
      // Step 1: Scan for keys matching the pattern
      const keys = await this.redisAnalyzerService.scanKeys(pattern);
      if (keys.length === 0) {
        return { message: 'No keys found matching the pattern' };
      }

      // Step 2: Fetch TTL for those keys
      const ttl = await this.redisAnalyzerService.getKeysTTL(keys);
      return { keys: ttl };
    } catch (error) {
      return { message: 'Error fetching TTL for keys', error: error.message };
    }
  }

}
