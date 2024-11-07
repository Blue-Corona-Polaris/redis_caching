// redis.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: Redis;

  constructor() {
    // Initialize Redis client
    this.redisClient = new Redis(); // Use your Redis configuration here
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    await this.redisClient.set(key, JSON.stringify(value), 'EX', ttl);
    this.logger.log(`Stored key: ${key} with TTL: ${ttl}`);
  }

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

  // Method to scan for keys by pattern
  async scan(pattern: string): Promise<string[]> {
    let cursor = '0';
    const keys: string[] = [];

    do {
      // SCAN command to find keys matching the pattern
      const [nextCursor, foundKeys] = await this.redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      keys.push(...foundKeys);
    } while (cursor !== '0'); // Continue until full scan is completed

    this.logger.log(`Found ${keys.length} keys matching pattern "${pattern}"`);
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
}
