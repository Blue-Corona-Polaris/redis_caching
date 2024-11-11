// src/redis/redis-analyzer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service'; // Import RedisService to handle Redis operations
import * as fs from 'fs';
import * as path from 'path';

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

  // Method to fetch all data matching a pattern and save to JSON file
  async fetchAndSaveData(pattern: string): Promise<string> {
    const keys = await this.redisService.scan(pattern);
    const records: Record<string, any>[] = [];

    this.logger.log(`Found ${keys.length} keys matching pattern: "${pattern}"`);

    // Fetch values for each key and aggregate into records array
    for (const key of keys) {
      const value = await this.redisService.get(key);
      if (value) {
        records.push({ key, value });
      }
    }

    // Define the file path for the JSON file
    const filePath = path.join(__dirname, '../../output', 'redis-data.json');

    // Ensure the output directory exists
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    // Write the aggregated records to the JSON file
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2));

    this.logger.log(`Data saved to file: ${filePath}`);
    return filePath;
  }

  // Method to fetch all records matching the pattern
  async fetchAllRecords(pattern: string): Promise<any[]> {
    const keys = await this.redisService.scan(pattern);
    if (keys.length === 0) {
      this.logger.log(`No keys found matching pattern: ${pattern}`);
      return [];
    }

    // Fetch values for each key
    const records = [];
    for (const key of keys) {
      const value = await this.redisService.get(key);
      if (value) {
        records.push({ key, value });
      }
    }

    this.logger.log(`Fetched ${records.length} records matching pattern: ${pattern}`);
    return records;
  }
}
