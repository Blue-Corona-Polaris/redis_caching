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

  // Method to handle multiple metrics
  async getMultipleMetricsData(
    metricIds: string[],
    year: number,
    month: string,
    groupBy: string
  ): Promise<any> {
    // Build the keys for Redis (metricId_year_month)
    const keys = metricIds.map((metricId) => `${metricId}_${year}_${month}`);
    this.logger.log(`Fetching data for keys: ${keys.join(', ')}`);

    // Fetch data for all keys using mget from Redis
    const dataList = await this.redisService.mget(keys);
    const groupedResults = [];

    // Process the data for each metricId
    for (let i = 0; i < dataList.length; i++) {
      const data = dataList[i];
      const metricId = metricIds[i];

      if (!data) {
        this.logger.warn(`No data found for key: ${keys[i]}`);
        continue;
      }

      // Cast the `data` to an array, assuming it is an array of objects
      const dataArray = data as Array<{ [key: string]: any }>;

      // Split the groupBy parameter into an array of fields
      const groupByFields = groupBy.split(',').map((field) => field.trim());
      const resultMap = new Map();

      // Iterate over the data and group it based on groupBy fields
      dataArray.forEach((item) => {
        const groupKey = groupByFields
          .map((field) => item[field] ?? `Unknown ${field}`)
          .join('|');
        if (!resultMap.has(groupKey)) {
          resultMap.set(groupKey, {
            metricId,
            year,
            month,
            ...Object.fromEntries(groupByFields.map((field) => [field, item[field] ?? `Unknown ${field}`])),
          });
        }
      });

      // Add the grouped results to the final output
      groupedResults.push(...Array.from(resultMap.values()));
    }

    return {
      keys,
      groupedBy: groupBy.split(','),
      result: groupedResults,
      count: groupedResults.length,
    };
  }

  async getMultipleMetricsDataPerfMetrics(
    metricIds: string[],
    year: number,
    month: string,
    groupBy: string
  ): Promise<any> {
    console.time('Build Keys Time'); // Track the time it takes to build the Redis keys
    const keys = metricIds.map((metricId) => `${metricId}_${year}_${month}`);
    console.timeEnd('Build Keys Time');

    console.time('MGET Redis Call Time'); // Track the time for the MGET Redis call
    const dataList = await this.redisService.mget(keys);
    console.timeEnd('MGET Redis Call Time');

    const groupedResults = [];

    // Process the data for each metricId
    for (let i = 0; i < dataList.length; i++) {
      console.time(`Processing Metric ID: ${metricIds[i]} Time`); // Track time to process each metric

      const data = dataList[i];
      const metricId = metricIds[i];

      if (!data) {
        this.logger.warn(`No data found for key: ${keys[i]}`);
        continue;
      }

      // Cast the `data` to an array, assuming it is an array of objects
      const dataArray = data as Array<{ [key: string]: any }>;

      // Split the groupBy parameter into an array of fields
      const groupByFields = groupBy.split(',').map((field) => field.trim());
      const resultMap = new Map();

      // Grouping the data by fields
      dataArray.forEach((item) => {
        const groupKey = groupByFields
          .map((field) => item[field] ?? `Unknown ${field}`)
          .join('|');
        if (!resultMap.has(groupKey)) {
          resultMap.set(groupKey, {
            metricId,
            year,
            month,
            ...Object.fromEntries(groupByFields.map((field) => [field, item[field] ?? `Unknown ${field}`])),
          });
        }
      });

      // Add the grouped results to the final output
      groupedResults.push(...Array.from(resultMap.values()));

      console.timeEnd(`Processing Metric ID: ${metricIds[i]} Time`); // End processing time for this metric
    }

    return {
      keys,
      groupedBy: groupBy.split(','),
      result: groupedResults,
      count: groupedResults.length,
    };
  }

  async getMultipleMetricsGroupedDataSeparateCacheCall(
    metricIds: string[],
    year: number,
    month: string,
    groupBy: string
  ): Promise<any> {
    console.time('Build Keys Time'); // Track the time it takes to build the Redis keys
    const keys = metricIds.map((metricId) => `${metricId}_${year}_${month}`);
    console.timeEnd('Build Keys Time');

    console.time('MGET Redis Call Time'); // Track the time for the MGET Redis call
    const dataList = await this.redisService.mget(keys);
    console.timeEnd('MGET Redis Call Time');

    const groupedResults = [];

    // Process the data for each metricId
    for (let i = 0; i < dataList.length; i++) {
      console.time(`Processing Metric ID: ${metricIds[i]} Time`); // Track time to process each metric

      const data = dataList[i];
      const metricId = metricIds[i];

      if (!data) {
        this.logger.warn(`No data found for key: ${keys[i]}`);
        continue;
      }

      // Cast the `data` to an array, assuming it is an array of objects
      const dataArray = data as Array<{ [key: string]: any }>;

      // Split the groupBy parameter into an array of fields
      const groupByFields = groupBy.split(',').map((field) => field.trim());
      const resultMap = new Map();

      // Grouping the data by fields
      dataArray.forEach((item) => {
        const groupKey = groupByFields
          .map((field) => item[field] ?? `Unknown ${field}`)
          .join('|');
        if (!resultMap.has(groupKey)) {
          resultMap.set(groupKey, {
            metricId,
            year,
            month,
            ...Object.fromEntries(groupByFields.map((field) => [field, item[field] ?? `Unknown ${field}`])),
          });
        }
      });

      // Add the grouped results to the final output
      groupedResults.push(...Array.from(resultMap.values()));

      console.timeEnd(`Processing Metric ID: ${metricIds[i]} Time`); // End processing time for this metric
    }

    return {
      keys,
      groupedBy: groupBy.split(','),
      result: groupedResults,
      count: groupedResults.length,
    };
  }

  // Fetch data in bulk using mget
  async getMultipleMetricsDataSingleCall(
    metricIds: string[],
    years: number[],
    months: string[],
    groupBy: string[]
  ) {
    console.time('Data Fetching from Cache'); // Track the cache fetching time

    // Generate all possible combinations of metricIds, years, months
    const keys = this.generateKeys(metricIds, years, months);
    console.log('Generated Keys:', keys);

    // Fetch data from Redis in bulk using mget
    const dataList: (string | null)[] = await this.redisService.mget(keys);

    console.timeEnd('Data Fetching from Cache'); // End cache fetching time

    // Process the data to group it based on groupBy fields
    const groupedData = this.processData(dataList, keys, groupBy);

    return groupedData;
  }

  // Helper method to generate Redis keys from combinations
  private generateKeys(metricIds: string[], years: number[], months: string[]): string[] {
    const keys: string[] = [];
    metricIds.forEach((metricId) => {
      years.forEach((year) => {
        months.forEach((month) => {
          keys.push(`${metricId}_${year}_${month}`);
        });
      });
    });
    return keys;
  }

  private processData(
    dataList: (string | null)[],
    keys: string[],
    groupBy: string[]
  ): any[] {
    const groupedResults: any[] = [];

    // Loop through dataList and process each entry
    dataList.forEach((data:any, index) => {
      if (data) {
        try {
          // If data is already an array of objects, use it directly
          const dataArray = data;

          dataArray.forEach((obj) => {
            // Extract metricId, year, and month from the Redis key
            const [metricId, year, month] = keys[index].split('_');

            // Create a comprehensive group key using metricId, year, month, and all groupBy fields
            const groupKey = [
              metricId,
              year,
              month,
              ...groupBy.map((field) => obj[field] || 'Unknown')
            ].join('|');

            // Check if an existing entry with the same group key exists
            let existingEntry = groupedResults.find((entry) =>
              entry.groupKey === groupKey
            );

            if (existingEntry) {
              // If an existing entry is found, update it (custom merging logic can be applied here)
              groupBy.forEach((field) => {
                existingEntry[field] = obj[field] || existingEntry[field];
              });
            } else {
              // Create a new entry if none exists
              const resultObject = {
                metricId,
                year: parseInt(year, 10),
                month,
              };

              // Add all groupBy fields to the result object
              groupBy.forEach((field) => {
                resultObject[field] = obj[field] || 'Unknown';
              });

              // Add a unique groupKey for internal tracking (not part of final output)
              resultObject['groupKey'] = groupKey;

              groupedResults.push(resultObject);
            }
          });
        } catch (error) {
          this.logger.error(`Error processing data at index ${index}: ${error.message}`);
        }
      }
    });

    // Return only the result array, excluding the internal groupKey
    return groupedResults.map(({ groupKey, ...rest }) => rest);
  }



}
