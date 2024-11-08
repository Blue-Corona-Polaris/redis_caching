// src/redis/redis-analyzer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service'; // Import RedisService to handle Redis operations

@Injectable()
export class RedisAnalyzerService {
  private readonly logger = new Logger(RedisAnalyzerService.name);

  constructor(private readonly redisService: RedisService) {}

  // Method to scan and fetch values for keys that match the given pattern
  async scanAndGetValues(pattern: string): Promise<{ [key: string]: any }> {
    try {
      // Step 1: Scan for matching keys
      const keys = await this.redisService.scan(pattern);
      if (keys.length === 0) {
        return { message: 'No keys found matching the pattern' };
      }

      // Step 2: Fetch the values for the scanned keys
      const values = await this.getValues(keys);

      return { keys: values }; // Return the key-value pairs
    } catch (error) {
      this.logger.error(`Error in scanAndGetValues: ${error.message}`);
      throw error; // Re-throw to be handled by the controller
    }
  }

  // Method to fetch values for a list of keys
  private async getValues(keys: string[]): Promise<{ [key: string]: any }> {
    const valuesPromises = keys.map((key) => this.redisService.get(key));
    const values = await Promise.all(valuesPromises);

    return keys.reduce((acc, key, index) => {
      acc[key] = values[index];
      return acc;
    }, {});
  }

  // Method to get TTL for keys
  async getKeysTTL(keys: string[]): Promise<{ [key: string]: number }> {
    const ttlPromises = keys.map((key) => this.redisService.getTTL(key));
    const ttlValues = await Promise.all(ttlPromises);

    return keys.reduce((acc, key, index) => {
      acc[key] = ttlValues[index];
      return acc;
    }, {});
  }

  async scanKeys(pattern: string): Promise<string[]> {
    return this.redisService.scan(pattern);
  }
}
