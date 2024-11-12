import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DataGenerationService {
  private inputFolder = path.join(process.cwd(), 'input'); // Folder parallel to 'src'
  private years = [2023, 2024];
  private months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  private metrics = ['63172f6a37c225c482d7e61a', '6318d837af8d74d5027edd98'];

  // Utility to read and parse all JSON files dynamically
  private readAllJsonFiles() {
    const files = fs.readdirSync(this.inputFolder);
    const data = {};

    files.forEach((file) => {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.inputFolder, file);
        const fileKey = path.basename(file, '.json'); // Use filename without extension as key
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // Extract keys from the JSON array objects and map them
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

  // Generate dataset for a specific metric
  private generateDataForMetric(metric: string, inputData: any): any[] {
    const dataset = [];

    // Generate 100,000 records for the given metric
    for (let i = 0; i < 100000; i++) {
      const record: any = {
        year: this.years[Math.floor(Math.random() * this.years.length)],
        month: this.months[Math.floor(Math.random() * this.months.length)],
      };

      // Dynamically add fields based on the keys from inputData
      for (const [fileKey, fields] of Object.entries(inputData)) {
        for (const [fieldKey, values] of Object.entries(fields)) {
          record[fieldKey] = values[Math.floor(Math.random() * values.length)] || `Unknown ${fieldKey}`;
        }
      }

      // Add the current metric as a key with a random value
      record[metric] = Math.floor(Math.random() * 1000); // Random value for the metric

      dataset.push(record);
    }

    return dataset;
  }

  // Generate full dataset for all metrics
  public generateFullData(): any[] {
    const inputData = this.readAllJsonFiles();
    const fullDataset = [];

    // Process each metric individually and generate 100,000 records per metric
    for (const metric of this.metrics) {
      const metricDataset = this.generateDataForMetric(metric, inputData);
      fullDataset.push(...metricDataset);
    }

    return fullDataset;
  }
}
