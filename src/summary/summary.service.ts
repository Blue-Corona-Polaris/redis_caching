// src/summary/summary.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Summary } from './summary.schema';
import { RedisService } from '../redis/redis.service'; // Import RedisService

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(
    @InjectModel(Summary.name) private summaryModel: Model<Summary>,
    private readonly redisService: RedisService,
  ) {}

  async getSummaries(): Promise<Summary[]> {
    const cachedSummaries = await this.redisService.get<Summary[]>('summaries');
    this.logger.log('Cached Summaries: ' + cachedSummaries && JSON.stringify(cachedSummaries));

    if (cachedSummaries) {
      return cachedSummaries;
    }

    const summaries = await this.summaryModel.find().exec();
    this.logger.log('Fetched from MongoDB: ' + cachedSummaries && JSON.stringify(summaries));

    await this.redisService.set('summaries', summaries, 30); // Cache for 5 minutes
    await this.redisService.set('summaries', summaries, 3000); // Cache for 5 minutes
    this.logger.log('Summaries stored in cache: ' + cachedSummaries && JSON.stringify(summaries));

    return summaries;
  }

  async createSummary(summaryData: { title: string; text: string }): Promise<Summary> {
    const newSummary = new this.summaryModel(summaryData);
    const createdSummary = await newSummary.save();
    this.logger.log('Created Summary: ' + JSON.stringify(createdSummary));

    await this.redisService.del('summaries'); // Clear cache
    this.logger.log('Cleared summaries from cache');

    return createdSummary;
  }
}
