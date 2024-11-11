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

  // Regenerate the original data using the transformed files and metadata
  async regenerateOriginalData(
    pattern: string,
    metadataFile: string,
    outputFolder: string,
  ): Promise<string> {
    try {
      const transformedDirectoryPath = path.resolve(__dirname, `../../output/transformed`);
      const metadataFilePath = path.resolve(__dirname, `../../dist/data/${metadataFile}`);
      const outputDirectoryPath = path.resolve(__dirname, `../../output/${outputFolder}`);

      console.log(`Reading metadata file from: ${metadataFilePath}`);

      // Ensure output directory exists
      if (!fs.existsSync(outputDirectoryPath)) {
        fs.mkdirSync(outputDirectoryPath, { recursive: true });
      }

      // Load metadata
      const metadata = JSON.parse(fs.readFileSync(metadataFilePath, 'utf8'));
      const keyMetadataMap: Record<string, string> = metadata.keys;
      const valueMetadataMap: Record<string, string> = metadata.values;

      // Create reverse maps for easy lookup
      const reverseKeyMetadataMap: Record<string, string> = Object.fromEntries(
        Object.entries(keyMetadataMap).map(([key, value]) => [value, key])
      );
      const reverseValueMetadataMap: Record<string, string> = Object.fromEntries(
        Object.entries(valueMetadataMap).map(([key, value]) => [value, key])
      );

      // Find all transformed files matching the pattern
      const transformedFiles = fs.readdirSync(transformedDirectoryPath).filter(
        (file) => file.includes(pattern) && file.endsWith('_records.json')
      );

      if (transformedFiles.length === 0) {
        throw new Error(`No matching transformed files found with pattern: ${pattern}`);
      }

      console.log(`Found matching transformed files: ${transformedFiles}`);

      // Process each transformed file
      for (const transformedFile of transformedFiles) {
        const transformedFilePath = path.join(transformedDirectoryPath, transformedFile);
        console.log(`Processing transformed file: ${transformedFilePath}`);

        // Read transformed data
        const transformedData = JSON.parse(fs.readFileSync(transformedFilePath, 'utf8')) as Array<any>;
        const regeneratedRecords = [];

        // Regenerate each record in the transformed data
        transformedData.forEach((item) => {
          const regeneratedValue = item.value.map((record: Record<string, any>) => {
            const regeneratedRecord: Record<string, any> = {};
            for (const [key, value] of Object.entries(record)) {
              // Use reverse maps to get original key and value
              const originalKey = reverseKeyMetadataMap[key as string] ?? key;
              const originalValue = reverseValueMetadataMap[value as string] ?? value;
              regeneratedRecord[originalKey] = originalValue;
            }
            return regeneratedRecord;
          });

          // Add regenerated record to the list
          regeneratedRecords.push({ key: item.key, value: regeneratedValue });
        });

        // Save the regenerated file
        const regeneratedFileName = `regenerated_${transformedFile}`;
        const regeneratedFilePath = path.join(outputDirectoryPath, regeneratedFileName);
        fs.writeFileSync(regeneratedFilePath, JSON.stringify(regeneratedRecords, null, 2));
        console.log(`Regenerated original data saved to: ${regeneratedFilePath}`);
      }

      return `All regenerated files have been saved in folder: ${outputDirectoryPath}`;
    } catch (error) {
      console.error('Error regenerating original data:', error.message);
      throw new Error(`Failed to regenerate original data: ${error.message}`);
    }
  }

  // Aggregate regenerated data based on group by keys and sum metric values
  async aggregateRegeneratedData(
    pattern: string,
    groupByKeys: string[],
    metricKeys: string[],
    outputFile: string,
  ): Promise<string> {
    try {
      console.time('Total execution time');  // Start total execution timer

      const regeneratedDirectoryPath = path.resolve(__dirname, `../../output/regenerated`);
      const outputDirectoryPath = path.resolve(__dirname, `../../output/aggregated`);

      // Ensure the output directory exists
      if (!fs.existsSync(outputDirectoryPath)) {
        fs.mkdirSync(outputDirectoryPath, { recursive: true });
      }

      // Append a timestamp to the output filename
      const timestamp = new Date().toISOString();
      const outputFilePath = path.join(outputDirectoryPath, `${outputFile.replace('.json', '')}_${timestamp}.json`);

      console.time('File Read Time');  // Start timer for reading files
      const regeneratedFiles = fs.readdirSync(regeneratedDirectoryPath).filter(
        (file) => file.includes(`regenerated_${pattern}`) && file.endsWith('_records.json')
      );
      console.timeEnd('File Read Time');  // End timer for reading files

      if (regeneratedFiles.length === 0) {
        throw new Error(`No matching regenerated files found with pattern: regenerated_${pattern}`);
      }

      console.log(`Found matching regenerated files: ${regeneratedFiles}`);

      const aggregatedData = new Map<string, Record<string, number>>();

      // Helper function to create a group key
      const createGroupKey = (record: Record<string, any>, keys: string[]): string => {
        const keyValues = keys.map((key) => {
          const value = record[key];
          if (value === undefined) {
            console.warn(`Key "${key}" not found in record. Using "UNKNOWN".`);
            return 'UNKNOWN';
          }
          return value;
        });
        return keyValues.join('|');
      };

      console.time('Processing Files');  // Start timer for processing files

      // Read and aggregate data from each regenerated file
      for (const file of regeneratedFiles) {
        const filePath = path.join(regeneratedDirectoryPath, file);
        console.log(`Processing regenerated file: ${filePath}`);

        console.time(`Reading file ${file}`);  // Start timer for reading a single file
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.timeEnd(`Reading file ${file}`);  // End timer for reading a single file

        console.time(`Processing data in ${file}`);  // Start timer for processing the data in a file
        fileData.forEach((item: any) => {
          item.value.forEach((record: Record<string, any>) => {
            const groupKey = createGroupKey(record, groupByKeys);

            // Initialize aggregation for this group if not already done
            if (!aggregatedData.has(groupKey)) {
              aggregatedData.set(groupKey, {});
            }

            const currentAggregates = aggregatedData.get(groupKey)!;

            // Sum up the metric values
            for (const metricKey of metricKeys) {
              const metricValue = parseFloat(record[metricKey]);
              if (isNaN(metricValue)) {
                console.warn(`Metric key "${metricKey}" not found or not a number in record. Using 0.`);
                currentAggregates[metricKey] = (currentAggregates[metricKey] || 0);
              } else {
                currentAggregates[metricKey] = (currentAggregates[metricKey] || 0) + metricValue;
              }
            }
          });
        });
        console.timeEnd(`Processing data in ${file}`);  // End timer for processing the data in a file
      }

      console.timeEnd('Processing Files');  // End timer for processing all files

      // Convert aggregated data to an array format
      console.time('Convert Aggregated Data to Array');  // Start timer for converting to array
      const aggregatedArray = Array.from(aggregatedData.entries()).map(([groupKey, metrics]) => {
        const groupValues = groupKey.split('|');
        const aggregatedRecord: Record<string, any> = {};

        // Assign group values to the aggregated record
        groupByKeys.forEach((key, index) => {
          aggregatedRecord[key] = groupValues[index];
        });

        // Assign metric values to the aggregated record
        Object.entries(metrics).forEach(([metricKey, value]) => {
          aggregatedRecord[metricKey] = value;
        });

        return aggregatedRecord;
      });
      console.timeEnd('Convert Aggregated Data to Array');  // End timer for converting to array

      // Write aggregated data to the output file with timestamp
      console.time('Write Aggregated Data to File');  // Start timer for writing to file
      fs.writeFileSync(outputFilePath, JSON.stringify(aggregatedArray, null, 2));
      console.timeEnd('Write Aggregated Data to File');  // End timer for writing to file

      console.timeEnd('Total execution time');  // End total execution timer
      console.log(`Aggregated data saved to: ${outputFilePath}`);

      return `Aggregated data saved successfully to ${outputFilePath}`;
    } catch (error) {
      console.error('Error aggregating regenerated data:', error.message);
      throw new Error(`Failed to aggregate regenerated data: ${error.message}`);
    }
  }

}
