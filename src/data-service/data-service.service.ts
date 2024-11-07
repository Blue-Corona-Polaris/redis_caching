// data-service.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DataServiceTitanJobsAggregatedDaily } from './data-service.schema';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class DataServiceService {
  private readonly logger = new Logger(DataServiceService.name);

  constructor(
    @InjectModel(DataServiceTitanJobsAggregatedDaily.name) private readonly dataServiceModel: Model<DataServiceTitanJobsAggregatedDaily>,
    private readonly redisService: RedisService,
  ) { }

  async getDataByDate(date: string): Promise<DataServiceTitanJobsAggregatedDaily[]> {
    // Check Redis cache first
    const cachedData = await this.redisService.get<DataServiceTitanJobsAggregatedDaily[]>(`dataByDate:${date}`);
    this.logger.log(`Cached Data for date ${date}: ${cachedData && JSON.stringify(cachedData.length)}`);

    if (cachedData) {
      return cachedData;
    }

    // If not in cache, fetch from MongoDB
    const records = await this.dataServiceModel.find({ 'entity.date': new Date(date) }).exec();
    this.logger.log(`Fetched from MongoDB for date ${date}: ${JSON.stringify(records.length)}`);

    // Store the records in Redis cache
    await this.redisService.set(`dataByDate:${date}`, records, 300); // Cache for 5 minutes
    this.logger.log(`Records stored in cache for date ${date}: ${JSON.stringify(records.length)}`);

    return records;
  }

  async getDataByCampaign(campaignId: string): Promise<DataServiceTitanJobsAggregatedDaily[]> {
    // Check Redis cache first
    const cachedData = await this.redisService.get<DataServiceTitanJobsAggregatedDaily[]>(`dataByCampaign:${campaignId}`);
    this.logger.log(`Cached Data for campaign ${campaignId}: ${JSON.stringify(cachedData && cachedData.length)}`);

    if (cachedData && cachedData.length) {
      return cachedData;
    }

    // If not in cache, fetch from MongoDB
    const records = await this.dataServiceModel.find({ 'entity.campaignGroupId': campaignId }).exec();
    this.logger.log(`Fetched from MongoDB for campaign ${campaignId}: ${JSON.stringify(records.length)}`);

    // Store the records in Redis cache
    await this.redisService.set(`dataByCampaign:${campaignId}`, records, 300); // Cache for 5 minutes
    this.logger.log(`Records stored in cache for campaign ${campaignId}: ${JSON.stringify(records.length)}`);

    return records;
  }

  async getDataByCustomer(customerId: number): Promise<DataServiceTitanJobsAggregatedDaily[]> {
    if (isNaN(customerId)) {
      this.logger.error(`Invalid customerId: ${customerId}`);
      throw new Error('Invalid customerId');
    }

    const cacheKey = `dataByCustomer:${customerId}`;
    this.logger.log(`Checking Redis cache for customerId: ${customerId}`);

    const cachedData = await this.redisService.get<DataServiceTitanJobsAggregatedDaily[]>(cacheKey);
    this.logger.log(`Cached Data for customer ${customerId}:`, cachedData);

    if (cachedData && cachedData.length) {
      this.logger.log(`Returning cached data for customerId: ${customerId}`);
      return cachedData;
    }

    const query = { 'entity.customerId': customerId };
    // this.logger.log(`Executing MongoDB query: ${JSON.stringify(query)}`);

    try {
      const records = await this.dataServiceModel.find(query).exec();
      this.logger.log(`Fetched from MongoDB for customerId ${customerId}: ${JSON.stringify(records.length)}`);

      if (records.length) {
        await this.redisService.set(cacheKey, records, 300);
        this.logger.log(`Records stored in cache for customer ${customerId}:`, records.length);
      } else {
        this.logger.log(`No records found for customer ${customerId}. Not storing in cache.`);
      }

      return records;
    } catch (error) {
      this.logger.error(`Error fetching data for customer ${customerId}: ${error.message}`);
      throw new Error('Failed to fetch customer data');
    }
  }


  async createDataServiceRecord(recordData: Partial<DataServiceTitanJobsAggregatedDaily>): Promise<DataServiceTitanJobsAggregatedDaily> {
    const newRecord = new this.dataServiceModel(recordData);
    const createdRecord = await newRecord.save();
    this.logger.log('Created Record: ' + JSON.stringify(createdRecord));

    // Clear the Redis cache since new data has been added
    await this.redisService.del('dataServiceTitanJobs');
    this.logger.log('Cleared data from cache');

    return createdRecord;
  }

  async aggregateJobs(startDate: string, endDate: string, status: string) {
    const cacheKey = `jobs:aggregate:${startDate}:${endDate}:${status}`;

    // Check if the result is already cached
    const cachedResult = await this.redisService.get(cacheKey);
    if (cachedResult) {
      return cachedResult; // Return cached result if available
    }

    // Perform the complex aggregation query
    const result = await this.dataServiceModel.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
          'metrics.total_jobs_Booked': {
            $gte: status === 'booked' ? 1 : 0,
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' },
          },
          totalRevenue: { $sum: '$metrics.total_attributed_revenue' },
          totalJobs: { $sum: '$metrics.jobs_total' },
          totalBooked: { $sum: '$metrics.total_jobs_Booked' },
          totalCanceled: { $sum: '$metrics.total_jobs_Canceled' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
      },
    ]);

    // Cache the result for 1 hour
    await this.redisService.set(cacheKey, result, 3600); // Cache for 1 hour

    return result;
  }

  async complexAggregateJobs(startDate: string, endDate: string): Promise<any> {
    this.logger.log(`Performing complex aggregation from ${startDate} to ${endDate}`);

    const cacheKey = `jobs:complexAggregate:${startDate}:${endDate}`;

    // Check if the result is already cached
    const cachedResult = await this.redisService.get(cacheKey);
    if (cachedResult) {
      this.logger.log(`Returning cached complex aggregation result for ${startDate} to ${endDate}`);
      return cachedResult; // Return cached result if available
    }

    // Perform the complex aggregation query
    const result = await this.dataServiceModel.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' },
          },
          totalRevenue: { $sum: '$metrics.total_attributed_revenue' },
          totalJobs: { $sum: '$metrics.jobs_total' },
          totalBooked: { $sum: '$metrics.total_jobs_Booked' },
          totalCanceled: { $sum: '$metrics.total_jobs_Canceled' },
          totalOnHold: { $sum: '$metrics.total_jobs_onhold' },
          totalInProgress: { $sum: '$metrics.total_jobs_inprogress' },
          averageRevenue: { $avg: '$metrics.earned_revenue' },
          totalFormLeads: { $sum: '$metrics.total_form_leads' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
      },
      {
        $limit: 1000, // Limit the number of results
      },
    ]);

    // Cache the result for 1 hour
    await this.redisService.set(cacheKey, result, 3600); // Cache for 1 hour

    this.logger.log(`Complex aggregation result: ${JSON.stringify(result)}`);
    return result;
  }

  async createKeys() {
    const keysToStore = [
      {
        pattern: 'tenant:1:day:2:metrics:[metric1,metric2,metric3]:dimensions:[campaign,platform,channel]',
        value: 'value1',
      },
      {
        pattern: 'tenant:1:day:3:metrics:[metric1,metric4,metric3]:dimensions:[organization,platform,channel]',
        value: 'value2',
      },
      {
        pattern: 'tenant:1:day:4:metrics:[metric1,metric2,metric5]:dimensions:[campaign,platform,channel]',
        value: 'value3',
      },
      {
        pattern: 'tenant:1:day:2:metrics:[metric4,metric5,metric6]:dimensions:[organization,campaign,channel]',
        value: 'value4',
      },
      {
        pattern: 'tenant:1:month:june:year:2024:metrics:[metric1,metric2,metric3]:dimensions:[organization,campaign,platform,channel]',
        value: 'value5',
      },
      {
        pattern: 'tenant:1:month:july:year:2024:metrics:[metric1,metric2,metric3]:dimensions:[organization,campaign,platform,channel]',
        value: 'value6',
      },
      {
        pattern: 'tenant:1:month:august:year:2024:metrics:[metric4,metric2]:dimensions:[organization,campaign,platform,channel]',
        value: 'value7',
      },
      {
        pattern: 'tenant:1:month:june:year:2024:metrics:[metric4,metric5,metric6]:dimensions:[organization,platform,channel]',
        value: 'value8',
      },
      {
        pattern: 'tenant:1:month:august:year:2024:metrics:[metric4,metric5]:dimensions:[organization,campaign,platform,channel]',
        value: 'value9',
      }
    ];

    // Store each key with its corresponding value in Redis
    for (const item of keysToStore) {
      await this.redisService.set(item.pattern, item.value, 600);
    }
  }

  async deleteKeys(pattern: string): Promise<number> {
    // Use the scan method to get all keys matching the pattern
    const keysToDelete = await this.redisService.scan(pattern);
    const deletedCount = keysToDelete.length;
  
    // Delete the found keys if any
    if (deletedCount > 0) {
      await this.redisService.deleteKeys(pattern);
      this.logger.log(`Deleted ${deletedCount} keys matching pattern: "${pattern}"`);
    } else {
      this.logger.log(`No keys found matching pattern: "${pattern}"`);
    }
  
    return deletedCount; // Return the count of deleted keys
  }
  
  async getKeys(pattern: string): Promise<string[]> {
    // Use the RedisService to scan for keys matching the pattern
    return this.redisService.scan(pattern);
  }

  async getValues(keys: string[]): Promise<{ [key: string]: any }> {
    // Retrieve values for each key found
    const valuesPromises = keys.map(key => this.redisService.get(key));
    const values = await Promise.all(valuesPromises);

    // Combine keys and their values into an object
    return keys.reduce((acc, key, index) => {
      acc[key] = values[index]; // Assign the corresponding value to the key
      return acc;
    }, {});
  }
}
