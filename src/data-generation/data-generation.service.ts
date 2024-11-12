import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DataGenerationService {
  private inputFolder = path.join(process.cwd(), 'input'); // Folder parallel to 'src'
  private years = [2023, 2024];
  private months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  private metrics = ['63172f6a37c225c482d7e61a', '63172f6a37c225c482d7e61b', '63172f6a37c225c482d7e61c'];

  // Utility to read all JSON files and extract their objects dynamically
  private readAllJsonFiles() {
    const files = fs.readdirSync(this.inputFolder);
    const data = {};

    files.forEach((file) => {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.inputFolder, file);
        const fileKey = path.basename(file, '.json'); // Use filename without extension as key
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // Collect all unique object keys from the JSON array
        const keys = Object.keys(fileData[0] || {});
        data[fileKey] = keys.reduce((acc, key) => {
          acc[key] = fileData.map((item) => item[key]);
          return acc;
        }, {});
      }
    });

    return data;
  }

  // Generate dataset for a specific metric
  private generateDataForMetric(metric: string, inputData: any): any[] {
    const dataset = [];

    // Get data arrays from the input data
    const campaignData = inputData['campaign']?.campaign || [];
    const campaignGroupData = inputData['campaignGroup']?.campaignGroup || [];
    const productData = inputData['product']?.product || [];

    // Generate 100,000 records for the given metric
    for (let i = 0; i < 100000; i++) {
      const year = this.years[Math.floor(Math.random() * this.years.length)];
      const month = this.months[Math.floor(Math.random() * this.months.length)];
      const campaign = campaignData[Math.floor(Math.random() * campaignData.length)] || 'Unknown Campaign';
      const campaignGroup = campaignGroupData[Math.floor(Math.random() * campaignGroupData.length)] || 'Unknown Group';
      const product = productData[Math.floor(Math.random() * productData.length)] || 'Unknown Product';

      dataset.push({
        year,
        month,
        campaign,
        campaignGroup,
        product,
        metric,
        value: Math.floor(Math.random() * 1000), // Random value for the metric
      });
    }

    return dataset;
  }

  // Generate full dataset for all metrics
  public generateData(): any[] {
    const inputData = this.readAllJsonFiles();
    const fullDataset = [];

    // Process each metric individually
    for (const metric of this.metrics) {
      const metricDataset = this.generateDataForMetric(metric, inputData);
      fullDataset.push(...metricDataset);
    }

    return fullDataset;
  }
}
