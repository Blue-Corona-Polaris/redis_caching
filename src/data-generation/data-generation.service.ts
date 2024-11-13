import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class DataGenerationService {
  private readonly logger = new Logger(DataGenerationService.name);
  private inputFolder = path.join(process.cwd(), 'input'); // Folder parallel to 'src'
  private years = [2023, 2024];
  private months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  private metrics = ['63172f6a37c225c482d7e61a', '6318d837af8d74d5027edd98'];
  private ttl = 6000; // TTL in seconds

  constructor(private readonly redisService: RedisService) { }

  // Utility to read and parse all JSON files dynamically
  private readAllJsonFiles() {
    const files = fs.readdirSync(this.inputFolder);
    const data = {};

    files.forEach((file) => {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.inputFolder, file);
        const fileKey = path.basename(file, '.json'); // Use filename without extension as key
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        if (Array.isArray(fileData) && fileData.length > 0) {
          data[fileKey] = {};
          const keys = Object.keys(fileData[0]);

          keys.forEach((key) => {
            data[fileKey][key] = fileData.map((item) => item[key]);
          });
        }
      }
    });

    return data;
  }

  // Generate dataset for a specific metric, year, and month
  private async generateAndCacheDataForMetric(metric: string, inputData: any) {
    for (const year of this.years) {
      for (const month of this.months) {
        const dataset = [];

        for (let i = 0; i < 100000; i++) {
          const record: any = {
            year,
            month,
          };

          for (const [fileKey, fields] of Object.entries(inputData)) {
            for (const [fieldKey, values] of Object.entries(fields)) {
              record[fieldKey] = values[Math.floor(Math.random() * values.length)] || `Unknown ${fieldKey}`;
            }
          }

          record[metric] = Math.floor(Math.random() * 1000);
          dataset.push(record);
        }

        const cacheKey = `${metric}_${year}_${month}`;
        await this.redisService.set(cacheKey, dataset, this.ttl);
        console.log(`Stored dataset in Redis with key: ${cacheKey}`);
      }
    }
  }

  // Generate and cache data for all metrics
  public async generateAndCacheAllMetrics() {
    const inputData = this.readAllJsonFiles();

    for (const metric of this.metrics) {
      await this.generateAndCacheDataForMetric(metric, inputData);
    }

    console.log('Data generation and caching complete.');
  }

  // Fetch data from Redis based on metricId, year, and month
  public async getDataFromCache(metricId: string, year: number, month: string) {
    const cacheKey = `${metricId}_${year}_${month}`;
    const data = await this.redisService.get(cacheKey);

    if (data) {
      return {
        key: cacheKey,
        data,
      };
    } else {
      return {
        message: `No data found for key: ${cacheKey}`,
      };
    }
  }

  // Method to fetch and group data based on groupBy fields get all
  public async getDataGroupedByAll(metricId: string, year: number, month: string, groupBy: string) {
    const cacheKey = `${metricId}_${year}_${month}`;
    const data = await this.redisService.get<Record<string, any>[]>(cacheKey);

    // Ensure data is an array and not empty
    if (!Array.isArray(data) || data.length === 0) {
      return {
        message: `No data found for key: ${cacheKey}`,
      };
    }

    // Split the groupBy parameter into an array of fields
    const groupByFields = groupBy.split(',').map((field) => field.trim());

    // Validate that groupByFields are provided
    if (groupByFields.length === 0) {
      return {
        message: 'No valid groupBy fields provided.',
      };
    }

    // Group the data manually using plain JavaScript
    const groupedData: Record<string, any[]> = {};

    for (const item of data) {
      // Construct the group key using the specified fields
      const groupKey = groupByFields.map((field) => (field in item ? item[field] : `Unknown ${field}`)).join('|');

      // Initialize the group if it does not exist
      if (!groupedData[groupKey]) {
        groupedData[groupKey] = [];
      }

      // Add the current item to the group
      groupedData[groupKey].push(item);
    }

    // Format the response
    const result = Object.entries(groupedData).map(([group, items]) => ({
      group,
      count: items.length,
      items,
    }));

    return {
      key: cacheKey,
      groupedBy: groupByFields,
      result,
    };
  }

  // Method to fetch and group data based on groupBy fields
  public async getDataGroupedByTest(metricId: string, year: number, month: string, groupBy: string) {
    const cacheKey = `${metricId}_${year}_${month}`;
    const data = await this.redisService.get<Record<string, any>[]>(cacheKey);

    // Ensure data is an array and not empty
    if (!Array.isArray(data) || data.length === 0) {
      return {
        message: `No data found for key: ${cacheKey}`,
      };
    }

    // Split the groupBy parameter into an array of fields
    const groupByFields = groupBy.split(',').map((field) => field.trim());

    // Validate that groupByFields are provided
    if (groupByFields.length === 0) {
      return {
        message: 'No valid groupBy fields provided.',
      };
    }

    // Group the data manually using plain JavaScript
    const groupedData: Record<string, any[]> = {};

    for (const item of data) {
      // Construct the group key using the specified fields
      const groupKey = groupByFields.map((field) => (field in item ? item[field] : `Unknown ${field}`)).join('|');

      // Initialize the group if it does not exist
      if (!groupedData[groupKey]) {
        groupedData[groupKey] = [];
      }

      // Add the current item to the group
      groupedData[groupKey].push(item);
    }

    // Format the response to include only groupBy fields, metricId, year, and month
    const result = Object.entries(groupedData).map(([group, items]) => {
      // Extract only the required fields for each item
      const formattedItems = items.map((item) => {
        const filteredItem: Record<string, any> = {
          metricId,
          year,
          month,
        };

        // Include only the fields specified in groupBy
        groupByFields.forEach((field) => {
          filteredItem[field] = item[field] ?? `Unknown ${field}`;
        });

        return filteredItem;
      });

      return {
        group,
        count: items.length,
        items: formattedItems,
      };
    });

    return {
      key: cacheKey,
      groupedBy: groupByFields,
      result,
    };
  }

  // Method to fetch and group data based on groupBy fields
  public async getDataGroupedBy(metricId: string, year: number, month: string, groupBy: string) {
    const cacheKey = `${metricId}_${year}_${month}`;
    const data = await this.redisService.get<Record<string, any>[]>(cacheKey);

    // Ensure data is an array and not empty
    if (!Array.isArray(data) || data.length === 0) {
      return {
        message: `No data found for key: ${cacheKey}`,
      };
    }

    // Split the groupBy parameter into an array of fields
    const groupByFields = groupBy.split(',').map((field) => field.trim());

    // Validate that groupByFields are provided
    if (groupByFields.length === 0) {
      return {
        message: 'No valid groupBy fields provided.',
      };
    }

    // Group the data manually using plain JavaScript
    const groupedData: Record<string, any> = {};

    for (const item of data) {
      // Construct the group key using the specified fields
      const groupKey = groupByFields.map((field) => (field in item ? item[field] : `Unknown ${field}`)).join('|');

      // Initialize the group if it does not exist
      if (!groupedData[groupKey]) {
        // Create a summary record for the group
        const summaryRecord = groupByFields.reduce((obj, field) => {
          obj[field] = item[field] ?? `Unknown ${field}`;
          return obj;
        }, {} as Record<string, any>);

        // Include metricId, year, and month in the summary record
        summaryRecord['metricId'] = metricId;
        summaryRecord['year'] = year;
        summaryRecord['month'] = month;

        // Store the summary record in the grouped data
        groupedData[groupKey] = summaryRecord;
      }
    }

    // Convert grouped data into an array of records
    const result = Object.values(groupedData);

    return {
      key: cacheKey,
      groupedBy: groupByFields,
      result,
      count: result.length,
    };
  }

  // Method to fetch and group data based on groupBy fields with performance logging
  public async getDataGroupedByPerfMetrics(metricId: string, year: number, month: string, groupBy: string) {
    const cacheKey = `${metricId}_${year}_${month}`;
    this.logger.log(`Starting to process key: ${cacheKey}`);

    console.time('Total Execution Time');

    // Measure time for fetching data from Redis
    console.time('Redis Fetch Time');
    const data = await this.redisService.get<Record<string, any>[]>(cacheKey);
    console.timeEnd('Redis Fetch Time');

    // Ensure data is an array and not empty
    if (!Array.isArray(data) || data.length === 0) {
      this.logger.log(`No data found for key: ${cacheKey}`);
      return {
        message: `No data found for key: ${cacheKey}`,
      };
    }

    // Measure time for processing groupBy fields
    console.time('GroupBy Processing Time');
    const groupByFields = groupBy.split(',').map((field) => field.trim());
    if (groupByFields.length === 0) {
      return {
        message: 'No valid groupBy fields provided.',
      };
    }
    console.timeEnd('GroupBy Processing Time');

    // Measure time for grouping the data
    console.time('Data Grouping Time');
    const groupedData: Record<string, any> = {};

    for (const item of data) {
      const groupKey = groupByFields.map((field) => (field in item ? item[field] : `Unknown ${field}`)).join('|');

      if (!groupedData[groupKey]) {
        const summaryRecord = groupByFields.reduce((obj, field) => {
          obj[field] = item[field] ?? `Unknown ${field}`;
          return obj;
        }, {} as Record<string, any>);

        summaryRecord['metricId'] = metricId;
        summaryRecord['year'] = year;
        summaryRecord['month'] = month;

        groupedData[groupKey] = summaryRecord;
      }
    }
    console.timeEnd('Data Grouping Time');

    // Measure time for converting grouped data to array
    console.time('Result Formatting Time');
    const result = Object.values(groupedData);
    console.timeEnd('Result Formatting Time');

    console.timeEnd('Total Execution Time');

    return {
      key: cacheKey,
      groupedBy: groupByFields,
      result,
      count: result.length,
    };
  }
}
