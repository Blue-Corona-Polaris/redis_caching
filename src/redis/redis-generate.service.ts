import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import { faker } from '@faker-js/faker'; // Correct import

@Injectable()
export class RedisGenerateService {
  private readonly logger = new Logger(RedisGenerateService.name);
  private readonly organizations = Array.from({ length: 50 }, (_, i) => `Campbell & Company ${i + 1}`);
  private readonly years = [2023, 2024];
//   private readonly months = [
//     'January', 'February', 'March', 'April', 'May', 'June',
//     'July', 'August', 'September', 'October', 'November', 'December',
//   ];
  private readonly weeks = Array.from({ length: 52 }, (_, i) => `Week ${i + 1}`);
  private readonly days = Array.from({ length: 31 }, (_, i) => `Day ${i + 1}`);
  private readonly totalRecords = 100_000_000;
  private readonly batchSize = 1000;
  private readonly metrics = Array.from({ length: 500 }, (_, i) => `metric${i + 1}`);
//   private readonly years = [2023, 2024];
  private readonly months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  private readonly recordCount = 100_00; // 10K records per key


  constructor(private readonly redisService: RedisService) {}

  private getQuarter(month: string): string {
    const monthNum = parseInt(month);
    if (monthNum >= 1 && monthNum <= 3) return 'Q1';
    if (monthNum >= 4 && monthNum <= 6) return 'Q2';
    if (monthNum >= 7 && monthNum <= 9) return 'Q3';
    return 'Q4';
  }

  // Method to generate large dataset
  async generateLargeDataset(): Promise<string> {
    let currentKeyCount = 0;

    while (currentKeyCount < this.totalRecords) {
      const pipelineCommands: Array<[string, ...any[]]> = [];

      for (let i = 0; i < this.batchSize && currentKeyCount < this.totalRecords; i++) {
        const tenantId = `tenant_${Math.floor(Math.random() * 100) + 1}`;
        const year = this.years[Math.floor(Math.random() * this.years.length)];
        const month = this.months[Math.floor(Math.random() * this.months.length)];
        const organization = this.organizations[Math.floor(Math.random() * this.organizations.length)];
        const week = this.weeks[Math.floor(Math.random() * this.weeks.length)];
        const day = this.days[Math.floor(Math.random() * this.days.length)];

        // Random data fields
        const value = Math.random() * 1000;
        const randomMetricId = '6305f9c5d734309f38344768';

        // Create key and value
        const key = `tenant_${tenantId}_org_${organization.replace(/\s/g, '_')}_year_${year}_month_${month}`;
        const data = {
          tenantId,
          parentOrganization: 'Turnpoint Services',
          organization,
          locationGroup: 'General',
          location: 'General',
          marketSegment: 'General',
          channelId: '_GoogleLocalServices',
          channel: 'Paid Google Local Services',
          platformId: '_GoogleLocalServicesGoogleLocalServices',
          platform: 'Paid Google Local Services',
          campaignTypeId: '_GoogleLocalServicesGoogleLocalServicesGoogleLocalServices',
          campaignType: 'Paid Google Local Services',
          campaignGroup: 'other',
          campaign: 'xcat:service_area_business_electrician',
          year,
          quarter: null,
          month: `${month} ${year}`,
          week,
          day,
          [randomMetricId]: value,
        };

        // Add to pipeline
        pipelineCommands.push(['set', key, JSON.stringify(data)]);
        currentKeyCount++;
      }

      // Execute batch insert
      await this.redisService.executePipeline(pipelineCommands);
      this.logger.log(`Inserted ${currentKeyCount} records so far...`);
    }

    return `Successfully generated ${this.totalRecords} records.`;
  }

  // Method to fetch data based on a key pattern
  async fetchDataByPattern(pattern: string): Promise<Record<string, any>> {
    const keys = await this.redisService.scan(pattern);
    const result: Record<string, any> = {};

    for (const key of keys) {
      const value = await this.redisService.get(key);
      result[key] = value;
    }

    return result;
  }
  private generateRecord(year: number, month: string) {
    return {
      tenantId: faker.database.mongodbObjectId(),
      parentOrganization: faker.company.name(),
      organization: `${faker.company.name()} ${faker.number.int({ min: 1, max: 100 })}`,
      locationGroup: faker.commerce.department(),
      location: faker.location.city(),
      marketSegment: faker.commerce.department(),
      channelId: faker.string.alphanumeric(8), // Updated to use `faker.string.alphaNumeric()`
      channel: faker.commerce.productName(),
      platformId: faker.string.alphanumeric(8), // Updated to use `faker.string.alphaNumeric()`
      platform: faker.commerce.product(),
      campaignTypeId: faker.string.alphanumeric(8), // Updated to use `faker.string.alphaNumeric()`
      campaignType: faker.commerce.productAdjective(),
      campaignGroup: faker.word.noun(), // Use `faker.word.noun()` instead of random.word
      campaign: faker.commerce.productName(),
      year,
      quarter: this.getQuarter(month),
      month: `${month} ${year}`,
      week: `Week ${faker.number.int({ min: 1, max: 52 })}`, // Use `faker.number.int()` for integers
      day: `Day ${faker.number.int({ min: 1, max: 31 })}`, // Use `faker.number.int()` for integers
      metricValue1: faker.number.float({ min: 100, max: 500 }).toFixed(2), // Use `faker.number.float()` for floats
      metricValue2: faker.number.float({ min: 10, max: 100 }).toFixed(2),
      metricValue3: faker.number.float({ min: 50, max: 300 }).toFixed(2),
      metricValue4: faker.number.float({ min: 200, max: 600 }).toFixed(2),
      metricValue5: faker.number.float({ min: 100, max: 700 }).toFixed(2),
      metricValue6: faker.number.float({ min: 50, max: 350 }).toFixed(2),
      metricValue7: faker.number.float({ min: 100, max: 450 }).toFixed(2),
      metricValue8: faker.number.float({ min: 200, max: 800 }).toFixed(2),
    };
  }

  async generateAndStoreData(): Promise<void> {
    for (const metric of this.metrics) {
      for (const year of this.years) {
        for (const month of this.months) {
          const key = `${metric}_${year}_${month}`;
          const records = [];
          for (let i = 0; i < this.recordCount; i++) {
            records.push(this.generateRecord(year, month));
          }
          await this.redisService.set(key, records, 86400); // Store with a TTL of 24 hours
          this.logger.log(`Stored ${this.recordCount} records for key: ${key}`);
        }
      }
    }
  }
}
