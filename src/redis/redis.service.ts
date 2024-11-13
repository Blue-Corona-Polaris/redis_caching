// src/redis/redis.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: Redis.Redis;

  constructor() {
    // In RedisService, use a singleton pattern
    this.redisClient = new Redis.Redis({
      host: 'localhost',
      port: 6379,
      lazyConnect: true,
    });
  }

  // Get value by key
  async get<T>(key: string): Promise<T | null> {
    const data = await this.redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

   // Get multiple values by keys using MGET
   async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) {
      this.logger.log('No keys provided for mget.');
      return [];
    }

    try {
      const data = await this.redisClient.mget(...keys);
      this.logger.log(`Retrieved ${keys.length} keys using mget.`);
      return data.map((item) => (item ? JSON.parse(item) : null));
    } catch (error) {
      this.logger.error(`Error during mget: ${error.message}`);
      throw error;
    }
  }
  
  // Set value by key with TTL
  async set(key: string, value: any, ttl: number): Promise<void> {
    await this.redisClient.set(key, JSON.stringify(value), 'EX', ttl);
    this.logger.log(`Stored key: ${key} with TTL: ${ttl}`);
  }

  // Delete key by key
  async del(key: string): Promise<void> {
    await this.redisClient.del(key);
    this.logger.log(`Deleted key: ${key}`);
  }

  async scanAndDelete(pattern: string): Promise<number> {
    let cursor = '0';
    let deletedCount = 0;

    do {
      // SCAN command to find keys matching the pattern
      const [nextCursor, keys] = await this.redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        // Delete matching keys
        await this.redisClient.del(...keys);
        deletedCount += keys.length;
        this.logger.log(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
      }
    } while (cursor !== '0'); // Continue until full scan is completed

    this.logger.log(`Total deleted keys for pattern "${pattern}": ${deletedCount}`);
    return deletedCount;
  }

  // Scan Redis for keys that match the pattern
  async scan(pattern: string): Promise<string[]> {
    let cursor = '0'; // Initial cursor for SCAN
    const keys: string[] = [];

    try {
      // Perform the SCAN operation until cursor returns to '0'
      do {
        const [nextCursor, foundKeys] = await this.redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor; // Update cursor for the next batch
        keys.push(...foundKeys); // Add found keys to the list
      } while (cursor !== '0'); // Continue until full scan is completed

      this.logger.log(`Found ${keys.length} keys matching pattern "${pattern}"`);
    } catch (error) {
      this.logger.error(`Error scanning keys: ${error.message}`);
      throw error; // Throw the error to be caught in the controller
    }

    return keys; // Return the found keys
  }

  // Method to delete keys by pattern
  async deleteByPattern(pattern: string): Promise<number> {
    const keysToDelete = await this.scan(pattern);
    const deletedCount = keysToDelete.length;

    if (deletedCount > 0) {
      await this.redisClient.del(...keysToDelete); // Delete all found keys
      this.logger.log(`Deleted ${deletedCount} keys matching pattern: "${pattern}"`);
    } else {
      this.logger.log(`No keys found matching pattern: "${pattern}"`);
    }

    return deletedCount; // Return the count of deleted keys
  }

  async deleteKeys(pattern: string): Promise<number> {
    // Use the scan method to get all keys matching the pattern
    const keysToDelete = await this.scan(pattern);
    const deletedCount = keysToDelete.length;

    // Delete the found keys if any
    if (deletedCount > 0) {
      await this.redisClient.del(...keysToDelete); // Delete all keys at once
      this.logger.log(`Deleted ${deletedCount} keys matching pattern: "${pattern}"`);
    } else {
      this.logger.log(`No keys found matching pattern: "${pattern}"`);
    }

    return deletedCount; // Return the count of deleted keys
  }

  // Method to execute Redis commands in a pipeline
  async executePipeline(commands: Array<[string, ...any[]]>): Promise<any[]> {
    const pipeline = this.redisClient.pipeline(); // Start a Redis pipeline

    // Add commands to the pipeline
    commands.forEach((command) => {
      // Ensure command is a tuple: ['set', key, value]
      pipeline[command[0]](...command.slice(1));  // This should now work, as command is typed correctly
    });

    // Execute the pipeline
    const results = await pipeline.exec();
    return results;
  }

  // Get TTL for a key
  async getTTL(key: string): Promise<number> {
    const ttl = await this.redisClient.ttl(key);
    return ttl;
  }
}
