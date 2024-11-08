// data-service.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DataServiceTitanJobsAggregatedDaily } from './data-service.schema';
import { RedisService } from '../redis/redis.service';
import { createHash } from 'crypto';
import { promisify } from 'util';
import * as zlib from 'zlib';

const zipAsync = promisify(zlib.gzip);
const unzipAsync = promisify(zlib.gunzip);

@Injectable()
export class DataServiceService {
  private readonly logger = new Logger(DataServiceService.name);
  private currentKeyCount = 0;

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


  // Example method to create multiple keys in Redis with TTL and random JSON objects
  async createBulkKeysWithTTL(totalKeys: number): Promise<{ message: string; timeTaken: number }> {
    const metrics = ['metric1', 'metric2', 'metric3'];
    const dimensions = ['organization', 'campaign', 'platform', 'channel'];
    const batchSize = 1000; // Number of keys per pipeline batch
    const ttlInSeconds = 3600; // Set TTL for 1 hour (3600 seconds)

    let currentKeyCount = this.currentKeyCount;

    // Record the start time
    const startTime = Date.now();

    while (currentKeyCount < totalKeys) {
      const pipelineCommands: Array<[string, ...any[]]> = []; // Store pipeline commands here

      for (let i = 0; i < batchSize && currentKeyCount < totalKeys; i++) {
        // Generate random values for tenant, month, year, metric, and dimension
        const tenantId = Math.floor(Math.random() * 100) + 1; // Random tenant between 1-100
        const month = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'][Math.floor(Math.random() * 12)]; // Random month
        const year = 2024; // Hardcoded year, but this can be randomized if needed
        const metric = metrics[Math.floor(Math.random() * metrics.length)];  // Random metric for each key
        const dimension = dimensions[Math.floor(Math.random() * dimensions.length)];  // Random dimension for each key

        // Construct the Redis key with unique elements for each key generation
        const key = `tenant:${tenantId}:month:${month}:year:${year}:metrics:[${metric}]:dimensions:[${dimension}]:id:${currentKeyCount}`;

        // Generate a random JSON object as the value
        const value = this.generateRandomJsonObject(currentKeyCount);

        // Add the SET command to the pipeline (key, value)
        pipelineCommands.push(['set', key, JSON.stringify(value)]);

        // Add the EXPIRE command to set TTL for this key
        pipelineCommands.push(['expire', key, ttlInSeconds]);

        currentKeyCount++;
      }

      try {
        // Execute the pipeline with the batched commands
        await this.redisService.executePipeline(pipelineCommands);
        console.log(`Inserted ${currentKeyCount} keys so far...`);
      } catch (error) {
        console.error('Error executing pipeline:', error);
        break; // Break out of the loop if there is an error
      }
    }

    // Record the end time
    const endTime = Date.now();

    // Calculate the time taken in milliseconds
    const timeTaken = endTime - startTime;

    console.log('All keys created successfully!');

    // Return the response with the time taken
    return {
      message: 'Bulk keys created successfully with TTL!',
      timeTaken,  // Time taken in milliseconds
    };
  }

  async getKeyFromCache(key: string): Promise<any> {
    try {
      const value = await this.redisService.get(key);
      return value;
    } catch (error) {
      console.error(`Error fetching key "${key}":`, error);
      throw new Error('Failed to retrieve the key from cache.');
    }
  }

  // Method to create keys in Redis with the specified format and combinations
  async createComplexBulkKeys(): Promise<{ message: string; timeTaken: number }> {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const years = [2023, 2024];
    const totalTenants = 500;
    const totalMetrics = 400;
    const dimensions = ['organization', 'campaign', 'platform', 'channel'];
    const batchSize = 1000; // Number of keys per pipeline batch
    const ttlInSeconds = 3600; // Set TTL for 1 hour (3600 seconds)
    let currentKeyCount = 0;

    // Record the start time
    const startTime = Date.now();

    while (currentKeyCount < 19_200_000) { // Loop until all keys are created
      const pipelineCommands: Array<[string, ...any[]]> = [];

      for (let i = 0; i < batchSize && currentKeyCount < 19_200_000; i++) {
        // Generate random values for tenantId, month, year, metricId, and dimension
        const tenantId = Math.floor(Math.random() * totalTenants) + 1;
        const month = months[Math.floor(Math.random() * months.length)];
        const year = years[Math.floor(Math.random() * years.length)];
        const metricId = Math.floor(Math.random() * totalMetrics) + 1;
        const dimension = dimensions[Math.floor(Math.random() * dimensions.length)];

        // Construct the Redis key
        const key = `tenant:${tenantId}:month:${month}:year:${year}:metrics:${metricId}:dimensions:[${dimension}]`;

        // Generate a random JSON value for the key
        const value = this.generateRandomJsonObject(currentKeyCount);

        // Add SET command to the pipeline
        pipelineCommands.push(['set', key, JSON.stringify(value)]);
        // Add EXPIRE command to the pipeline for TTL
        pipelineCommands.push(['expire', key, ttlInSeconds]);

        currentKeyCount++;
      }

      try {
        // Execute the pipeline with the batched commands
        await this.redisService.executePipeline(pipelineCommands);
        console.log(`Inserted ${currentKeyCount} keys so far...`);
      } catch (error) {
        console.error('Error executing pipeline:', error);
        break;
      }
    }

    // Record the end time
    const endTime = Date.now();
    const timeTaken = endTime - startTime;

    console.log('All keys created successfully!');
    return {
      message: 'Complex keys created successfully with TTL!',
      timeTaken,
    };
  }


  // Function to generate a random JSON object
  generateRandomJsonObject(keyIndex: number) {
    return {
      id: keyIndex,  // Use the current key count as an ID
      timestamp: new Date().toISOString(),
      metricValue: Math.random() * 100, // Random metric value between 0-100
      dimensions: {
        organization: Math.random() < 0.5 ? 'orgA' : 'orgB',
        campaign: Math.random() < 0.5 ? 'campaign1' : 'campaign2',
        platform: Math.random() < 0.5 ? 'platformX' : 'platformY',
        channel: Math.random() < 0.5 ? 'channel1' : 'channel2',
      },
      extraData: {
        randomString: Math.random().toString(36).substring(7),  // Random string for extra data
        isActive: Math.random() < 0.5,  // Random boolean value
      },
    };
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

  // Get keys based on the pattern
  async getKeys(pattern: string): Promise<string[]> {
    return this.redisService.scan(pattern); // Delegate scanning to RedisService
  }
  // Method to get values for a list of keys
  async getValues(keys: string[]): Promise<{ [key: string]: any }> {
    // Create an array of promises for fetching values of all keys
    const valuesPromises = keys.map(async (key) => {
      try {
        // Get value for the key using the redisService.get() method
        const value = await this.redisService.get(key);

        // Return a key-value pair, if the key doesn't exist, return null
        return { key, value: value || null };
      } catch (error) {
        // Log error for failed key fetch
        this.logger.error(`Error fetching key ${key}: ${error.message}`);
        return { key, value: null }; // Return null if an error occurs while fetching the key
      }
    });

    // Wait for all values to be retrieved
    const values = await Promise.all(valuesPromises);

    // Combine the results into a single object
    return values.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {});
  }

  // Method to create keys in Redis with a shortened format and combinations
  async createShortenedBulkKeys(): Promise<{ message: string; timeTaken: number }> {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const years = [2023, 2024];
    const totalTenants = 500;
    const totalMetrics = 400;
    const dimensions = ['organization', 'campaign', 'platform', 'channel'];
    const batchSize = 1000; // Number of keys per pipeline batch
    const ttlInSeconds = 3600; // Set TTL for 1 hour (3600 seconds)
    let currentKeyCount = 0;

    // Record the start time
    const startTime = Date.now();

    // Loop until all keys are created (adjusted for your expected total count)
    while (currentKeyCount < 19_200_000) {
      const pipelineCommands: Array<[string, ...any[]]> = [];

      for (let i = 0; i < batchSize && currentKeyCount < 19_200_000; i++) {
        // Generate random values for tenantId, month, year, metricId, and dimension
        const tenantId = Math.floor(Math.random() * totalTenants) + 1;
        const month = months[Math.floor(Math.random() * months.length)];
        const year = years[Math.floor(Math.random() * years.length)];
        const metricId = Math.floor(Math.random() * totalMetrics) + 1;
        const dimensionCount = 4; // Since we are using 4 dimensions, we pick a random selection of 4
        const selectedDimensions = [];

        // Randomly select dimensions for this key
        while (selectedDimensions.length < dimensionCount) {
          const dimension = dimensions[Math.floor(Math.random() * dimensions.length)];
          if (!selectedDimensions.includes(dimension)) {
            selectedDimensions.push(dimension);
          }
        }

        // Construct the Redis key using the new shortened format
        const key = `${metricId}:${tenantId}:${year}:${month}:dimensions:[${selectedDimensions.join(',')}]`;

        // Generate a random JSON value for the key
        const value = this.generateRandomJsonObject(currentKeyCount);

        // Add SET command to the pipeline
        pipelineCommands.push(['set', key, JSON.stringify(value)]);
        // Add EXPIRE command to the pipeline for TTL
        pipelineCommands.push(['expire', key, ttlInSeconds]);

        currentKeyCount++;
      }

      try {
        // Execute the pipeline with the batched commands
        await this.redisService.executePipeline(pipelineCommands);
        console.log(`Inserted ${currentKeyCount} keys so far...`);
      } catch (error) {
        console.error('Error executing pipeline:', error);
        break;
      }
    }

    // Record the end time
    const endTime = Date.now();
    const timeTaken = endTime - startTime; // Calculate the time taken

    console.log(`All keys created in ${timeTaken}ms!`);

    // Return the response with the time taken
    return {
      message: 'Bulk keys created successfully with shortened format and TTL!',
      timeTaken, // Time taken in milliseconds
    };
  }


  // Utility function to hash the dimensions array
  public hashDimensions(dimensions: string[]): string {
    const dimensionString = dimensions.join(',');
    return createHash('md5').update(dimensionString).digest('hex').slice(0, 8);
  }

  // Method to create keys in Redis with the specified format and hashed dimensions
  async createHashedBulkKeys(): Promise<{ message: string; timeTaken: number }> {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const years = [2023, 2024];
    const totalTenants = 500;
    const totalMetrics = 400;
    const dimensions = ['organization', 'campaign', 'platform', 'channel'];
    const batchSize = 1000;
    const ttlInSeconds = 3600;
    let currentKeyCount = 0;

    // Record the start time
    const startTime = Date.now();

    while (currentKeyCount < 19_200_000) {
      const pipelineCommands: Array<[string, ...any[]]> = [];

      for (let i = 0; i < batchSize && currentKeyCount < 19_200_000; i++) {
        const tenantId = Math.floor(Math.random() * totalTenants) + 1;
        const month = months[Math.floor(Math.random() * months.length)];
        const year = years[Math.floor(Math.random() * years.length)];
        const metricId = Math.floor(Math.random() * totalMetrics) + 1;
        const randomDimensions = dimensions.map(() => dimensions[Math.floor(Math.random() * dimensions.length)]);
        const dimensionHash = this.hashDimensions(randomDimensions);

        // Construct the key in the new format
        const key = `${metricId}:${tenantId}:${year}:${month}:dimHash:${dimensionHash}`;
        const value = this.generateRandomJsonObject(currentKeyCount);

        // Add commands to the pipeline
        pipelineCommands.push(['set', key, JSON.stringify(value)]);
        pipelineCommands.push(['expire', key, ttlInSeconds]);

        currentKeyCount++;
      }

      await this.redisService.executePipeline(pipelineCommands);
      console.log(`Inserted ${currentKeyCount} keys so far...`);
    }

    const endTime = Date.now();
    const timeTaken = endTime - startTime;

    return {
      message: 'Hashed bulk keys created successfully!',
      timeTaken,
    };
  }

  // Method to get the value based on hashed key format
  async getKeyValueHashed(metricId: number, tenantId: number, year: number, month: string, dimensions: string[]): Promise<any> {
    const dimensionHash = this.hashDimensions(dimensions);
    const key = `${metricId}:${tenantId}:${year}:${month}:dimHash:${dimensionHash}`;

    const value = await this.redisService.get(key);

    if (!value) {
      throw new Error(`Key not found: ${key}`);
    }

    return value;
  }


  // Method to create keys in Redis with compressed (zipped) values
  async createZippedHashedKeys(): Promise<{ message: string; timeTaken: number }> {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const years = [2023, 2024];
    const totalTenants = 500;
    const totalMetrics = 400;
    const dimensions = ['organization', 'campaign', 'platform', 'channel'];
    const batchSize = 1000;
    const ttlInSeconds = 3600;
    let currentKeyCount = 0;

    const startTime = Date.now();

    while (currentKeyCount < 19_200_000) {
      const pipelineCommands: Array<[string, ...any[]]> = [];

      for (let i = 0; i < batchSize && currentKeyCount < 19_200_000; i++) {
        const tenantId = Math.floor(Math.random() * totalTenants) + 1;
        const month = months[Math.floor(Math.random() * months.length)];
        const year = years[Math.floor(Math.random() * years.length)];
        const metricId = Math.floor(Math.random() * totalMetrics) + 1;
        const randomDimensions = dimensions.map(() => dimensions[Math.floor(Math.random() * dimensions.length)]);
        const dimensionHash = this.hashDimensions(randomDimensions);

        const key = `${metricId}:${tenantId}:${year}:${month}:dimHash:${dimensionHash}`;
        const value = this.generateRandomJsonObject(currentKeyCount);

        // Compress the value using gzip
        const compressedValue = await zipAsync(Buffer.from(JSON.stringify(value)));

        pipelineCommands.push(['set', key, compressedValue.toString('base64')]);
        pipelineCommands.push(['expire', key, ttlInSeconds]);

        currentKeyCount++;
      }

      await this.redisService.executePipeline(pipelineCommands);
      console.log(`Inserted ${currentKeyCount} keys with compressed values...`);
    }

    const endTime = Date.now();
    const timeTaken = endTime - startTime;

    return {
      message: 'Zipped bulk keys created successfully!',
      timeTaken,
    };
  }

  // Method to get the unzipped value based on the hashed key format
  async getUnzippedValueHashed(metricId: number, tenantId: number, year: number, month: string, dimensions: string[]): Promise<any> {
    const dimensionHash = this.hashDimensions(dimensions);
    const key = `${metricId}:${tenantId}:${year}:${month}:dimHash:${dimensionHash}`;

    const compressedData = await this.redisService.get(key);

    if (!compressedData) {
      throw new Error(`Key not found: ${key}`);
    }
    if (typeof compressedData !== 'string') {
      throw new Error('Expected compressed data to be a string');
    }

    // Ensure that compressedData is a string before converting it to a Buffer
    const decompressedValue = await unzipAsync(Buffer.from(String(compressedData), 'base64'));


    return JSON.parse(decompressedValue.toString());
  }
}
