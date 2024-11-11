import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MetadataService {
  async generateMetadata(pattern: string, metadataFile: string): Promise<string> {
    try {
      // Define the directory path for data files
      const directoryPath = path.resolve(__dirname, '../../dist/data');
      console.log(`Reading files from directory: ${directoryPath}`);

      // Get all files in the directory
      const files = fs.readdirSync(directoryPath);

      // Filter files based on the pattern (e.g., 'metric1_2023')
      const matchingFiles = files.filter((file) => file.includes(pattern) && file.endsWith('_records.json'));

      if (matchingFiles.length === 0) {
        throw new Error(`No matching files found with pattern: ${pattern}`);
      }

      console.log(`Found matching files: ${matchingFiles}`);

      // Initialize metadata map and counter
      const metadataMap = new Map<string, number>();
      let counter = 1;

      // Iterate through each matching file and extract metadata
      for (const file of matchingFiles) {
        const filePath = path.join(directoryPath, file);
        console.log(`Processing file: ${filePath}`);

        // Read and parse the JSON file
        const fileData = fs.readFileSync(filePath, 'utf8');
        const records = JSON.parse(fileData);

        if (!Array.isArray(records) || records.length === 0) {
          console.warn(`Skipping file due to invalid format or empty content: ${filePath}`);
          continue;
        }

        // Extract metadata from each record
        records.forEach((item) => {
          const key = item.key;
          item.value.forEach((record: any) => {
            for (const [field, value] of Object.entries(record)) {
              const metadataKey = `${field}_${value}`;
              if (!metadataMap.has(metadataKey)) {
                metadataMap.set(metadataKey, counter++);
              }
            }
          });
        });
      }

      // Convert the metadata map to an object
      const metadataObject: Record<string, number> = {};
      metadataMap.forEach((value, key) => {
        metadataObject[key] = value;
      });

      // Define the output file path
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
