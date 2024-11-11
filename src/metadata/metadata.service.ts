import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MetadataService {
  // Generate metadata without modifying original files
  async generateMetadata(pattern: string, metadataFile: string): Promise<string> {
    try {
      const directoryPath = path.resolve(__dirname, '../../dist/data');
      const metadataFilePath = path.join(directoryPath, metadataFile);

      const keyMetadataMap = new Map<string, number>();
      const valueMetadataMap = new Map<string, number>();
      let keyCounter = 1;
      let valueCounter = 1;

      const files = fs.readdirSync(directoryPath).filter(
        (file) => file.includes(pattern) && file.endsWith('_records.json')
      );

      if (files.length === 0) {
        throw new Error(`No matching files found with pattern: ${pattern}`);
      }

      console.log(`Found matching files: ${files}`);

      // Extract keys and values to build metadata
      for (const file of files) {
        const filePath = path.join(directoryPath, file);
        const fileData = fs.readFileSync(filePath, 'utf8');
        const records = JSON.parse(fileData);

        records.forEach((item) => {
          item.value.forEach((record: any) => {
            for (const [key, value] of Object.entries(record)) {
              if (!keyMetadataMap.has(key)) {
                keyMetadataMap.set(key, keyCounter++);
              }
              const valueStr = String(value);
              if (!valueMetadataMap.has(valueStr)) {
                valueMetadataMap.set(valueStr, valueCounter++);
              }
            }
          });
        });
      }

      // Serialize metadata
      const metadata = {
        keys: Object.fromEntries(keyMetadataMap),
        values: Object.fromEntries(valueMetadataMap),
      };

      // Write metadata to a file
      fs.writeFileSync(metadataFilePath, JSON.stringify(metadata, null, 2));
      console.log(`Metadata saved to: ${metadataFilePath}`);

      return `Metadata generated successfully and saved to ${metadataFilePath}`;
    } catch (error) {
      console.error('Error generating metadata:', error.message);
      throw new Error(`Failed to generate metadata: ${error.message}`);
    }
  }

  // Transform data using metadata without modifying original files
  async transformAndSaveData(inputPattern: string, metadataFile: string, outputFolder: string): Promise<string> {
    try {
      const dataDirectoryPath = path.resolve(__dirname, '../../dist/data');
      const metadataFilePath = path.join(dataDirectoryPath, metadataFile);
      const outputDirectoryPath = path.resolve(__dirname, `../../output/${outputFolder}`);

      // Ensure output directory exists
      if (!fs.existsSync(outputDirectoryPath)) {
        fs.mkdirSync(outputDirectoryPath, { recursive: true });
      }

      const metadata = JSON.parse(fs.readFileSync(metadataFilePath, 'utf8'));
      const keyMetadataMap = metadata.keys;
      const valueMetadataMap = metadata.values;

      const files = fs.readdirSync(dataDirectoryPath).filter(
        (file) => file.includes(inputPattern) && file.endsWith('_records.json')
      );

      if (files.length === 0) {
        throw new Error(`No matching files found with pattern: ${inputPattern}`);
      }

      for (const file of files) {
        const filePath = path.join(dataDirectoryPath, file);
        const fileData = fs.readFileSync(filePath, 'utf8');
        const records = JSON.parse(fileData);

        const transformedRecords = [];

        records.forEach((item) => {
          const transformedValue = item.value.map((record: any) => {
            const transformedRecord: any = {};
            for (const [key, value] of Object.entries(record)) {
              const newKey = keyMetadataMap[key] ?? key;
              const newValue = valueMetadataMap[String(value)] ?? value;
              transformedRecord[newKey] = newValue;
            }
            return transformedRecord;
          });
          transformedRecords.push({ key: item.key, value: transformedValue });
        });

        // Save transformed file
        const transformedFilePath = path.join(outputDirectoryPath, file);
        fs.writeFileSync(transformedFilePath, JSON.stringify(transformedRecords, null, 2));
        console.log(`Transformed data saved to: ${transformedFilePath}`);
      }

      return `Transformed files saved in folder: ${outputDirectoryPath}`;
    } catch (error) {
      console.error('Error transforming and saving data:', error.message);
      throw new Error(`Failed to transform and save data: ${error.message}`);
    }
  }
}
