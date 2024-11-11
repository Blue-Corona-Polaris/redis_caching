import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MetadataService {
  async generateMetadata(pattern: string, metadataFile: string): Promise<string> {
    try {
      const directoryPath = path.resolve(__dirname, '../../dist/data');
      console.log(`Reading files from directory: ${directoryPath}`);

      // Get all files matching the pattern
      const files = fs.readdirSync(directoryPath).filter(
        (file) => file.includes(pattern) && file.endsWith('_records.json')
      );

      if (files.length === 0) {
        throw new Error(`No matching files found with pattern: ${pattern}`);
      }

      console.log(`Found matching files: ${files}`);

      // Metadata map and counter initialization
      const metadataMap = new Map<string, number>();
      let counter = 1;

      // Process each file
      for (const file of files) {
        const filePath = path.join(directoryPath, file);
        console.log(`Processing file: ${filePath}`);

        const fileData = fs.readFileSync(filePath, 'utf8');
        const records = JSON.parse(fileData);

        if (!Array.isArray(records) || records.length === 0) {
          console.warn(`Skipping file due to invalid format or empty content: ${filePath}`);
          continue;
        }

        // Extract metadata and update keys in records
        records.forEach((item) => {
          item.value.forEach((record: any) => {
            for (const field of Object.keys(record)) {
              // Only use the field name, not the combined key-value
              if (!metadataMap.has(field)) {
                metadataMap.set(field, counter++);
              }
            }
          });
        });

        // Update the records using the metadata map
        records.forEach((item) => {
          item.value.forEach((record: any) => {
            for (const field of Object.keys(record)) {
              if (metadataMap.has(field)) {
                const newKey = metadataMap.get(field)!;
                record[newKey] = record[field];
                delete record[field];
              }
            }
          });
        });

        // Write back the updated records to the same file
        fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
        console.log(`Updated file: ${filePath}`);
      }

      // Convert the metadata map to an object for output
      const metadataObject: Record<string, number> = {};
      metadataMap.forEach((value, key) => {
        metadataObject[key] = value;
      });

      // Define the output metadata file path
      const outputFilePath = path.resolve(__dirname, `../../dist/data/${metadataFile}`);
      console.log(`Writing metadata to: ${outputFilePath}`);

      // Write the metadata object to the output file
      fs.writeFileSync(outputFilePath, JSON.stringify(metadataObject, null, 2));

      return `Metadata file generated successfully: ${outputFilePath}`;
    } catch (error) {
      console.error('Error generating metadata:', error.message);
      throw new Error(`Failed to generate metadata: ${error.message}`);
    }
  }
}
