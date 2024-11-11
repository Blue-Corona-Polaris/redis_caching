import * as fs from 'fs';
import * as path from 'path';
import * as fsExtra from 'fs-extra';

export class MetadataService {
  private metadataMap: Record<string, number> = {};
  private currentId: number = 1;

  // Helper to get or create an ID for a metadata key or value
  private getOrCreateId(value: string): number {
    if (!this.metadataMap[value]) {
      this.metadataMap[value] = this.currentId++;
    }
    return this.metadataMap[value];
  }

  // Step 1: Create Metadata (Keys and Common Values)
  async createMetadata(pattern: string, metadataFile: string): Promise<void> {
    const inputDir = path.join(process.cwd(), 'dist', 'data');
    const files = fs.readdirSync(inputDir).filter(file => file.includes(pattern) && file.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(inputDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      data.forEach((entry: any) => {
        entry.value.forEach((record: any) => {
          for (const key in record) {
            this.getOrCreateId(key);
            const value = record[key];
            if (typeof value === 'string') {
              this.getOrCreateId(value);
            }
          }
        });
      });
    }

    const metadataFilePath = path.join(process.cwd(), 'dist', 'output', metadataFile);
    await fsExtra.ensureDir(path.join(process.cwd(), 'dist', 'output'));
    fs.writeFileSync(metadataFilePath, JSON.stringify(this.metadataMap, null, 2));
  }

  // Step 2: Transform Files using Metadata
  async transformFiles(pattern: string, metadataFile: string): Promise<void> {
    const metadata = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'dist', 'output', metadataFile), 'utf-8'));
    const inputDir = path.join(process.cwd(), 'dist', 'data');
    const outputDir = path.join(process.cwd(), 'dist', 'output');
    const files = fs.readdirSync(inputDir).filter(file => file.includes(pattern) && file.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(inputDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      const transformedData = data.map((entry: any) => ({
        key: entry.key,
        value: entry.value.map((record: any) => {
          const transformedRecord: Record<number, number | string> = {};
          for (const key in record) {
            const keyId = metadata[key];
            const value = record[key];
            if (typeof value === 'string') {
              transformedRecord[keyId] = metadata[value] || value;
            } else {
              transformedRecord[keyId] = value;
            }
          }
          return transformedRecord;
        }),
      }));

      const outputFilePath = path.join(outputDir, file.replace('.json', `_transformed.json`));
      await fsExtra.ensureDir(outputDir);
      fs.writeFileSync(outputFilePath, JSON.stringify(transformedData, null, 2));
    }
  }

  // Step 3: Regenerate Original Files
  async regenerateFiles(pattern: string, metadataFile: string): Promise<void> {
    const metadata = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'dist', 'output', metadataFile), 'utf-8'));
    const reverseMetadata = Object.fromEntries(Object.entries(metadata).map(([key, value]) => [value, key]));
    const inputDir = path.join(process.cwd(), 'dist', 'output');
    const files = fs.readdirSync(inputDir).filter(file => file.includes(pattern) && file.endsWith('_transformed.json'));

    for (const file of files) {
      const filePath = path.join(inputDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      const regeneratedData = data.map((entry: any) => ({
        key: entry.key,
        value: entry.value.map((record: any) => {
          const originalRecord: Record<string, any> = {};
          for (const keyId in record) {
            const key = reverseMetadata[keyId];
            const valueId = record[keyId];
            const value = reverseMetadata[valueId] || valueId;
            originalRecord[key] = value;
          }
          return originalRecord;
        }),
      }));

      const outputFilePath = filePath.replace('_transformed.json', '_regenerated.json');
      fs.writeFileSync(outputFilePath, JSON.stringify(regeneratedData, null, 2));
    }
  }

  // Step 4: Aggregate Data from Transformed Files with Reverse Metadata Mapping  
  async aggregateData(pattern: string, groupByKeys: string[], metricKeys: string[], outputFileName: string): Promise<any[]> {
    const inputDir = path.join(process.cwd(), 'dist', 'output');
    const metadataFile = path.join(process.cwd(), 'dist', 'output', 'metadata.json');
    
    // Load metadata and reverse it for key translation
    const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
    const reverseMetadata = Object.fromEntries(Object.entries(metadata).map(([key, value]) => [value, key]));
  
    // Read all transformed files matching the pattern
    const files = fs.readdirSync(inputDir).filter(file => file.includes(pattern) && file.endsWith('_transformed.json'));
    
    const aggregatedData: Record<string, any> = {};
  
    // Process each file
    for (const file of files) {
      const filePath = path.join(inputDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
      data.forEach((entry: any) => {
        entry.value.forEach((record: any) => {
          // Construct the group key using original keys from metadata
          const groupKey = groupByKeys
            .map(key => {
              const keyId = metadata[key];
              return record[keyId]; // Use the integer key for the record
            })
            .join('|');
  
          // Initialize group if not present
          if (!aggregatedData[groupKey]) {
            aggregatedData[groupKey] = {};
  
            // Add groupBy keys with their original values
            groupByKeys.forEach(key => {
              const keyId = metadata[key];
              const originalKey = reverseMetadata[keyId];  // Reverse lookup to get original key
              aggregatedData[groupKey][originalKey] = reverseMetadata[record[keyId]] || record[keyId]; // Translate value to original
            });
  
            // Initialize metrics for the group
            metricKeys.forEach(metric => (aggregatedData[groupKey][metric] = 0));
          }
  
          // Sum metrics for the group
          metricKeys.forEach(metric => {
            const metricValue = parseFloat(record[metric]);  // Ensure that metric values are numbers
            
            // Only sum if it's a valid number
            if (!isNaN(metricValue)) {
              aggregatedData[groupKey][metric] += metricValue;  // Sum metric value
            }
          });
        });
      });
    }
  
    // Convert aggregated data to an array and replace integer keys with original string keys
    const finalData = Object.values(aggregatedData).map(record => {
      const result: Record<string, any> = {};
  
      // Replace keys with original string values for groupBy and metric fields
      for (const key in record) {
        const originalKey = reverseMetadata[key] || key; // Use reverse metadata to map back
        result[originalKey] = record[key];
      }
  
      return result;
    });
  
    // Write the final aggregated result to a JSON file in the output folder
    const outputFilePath = path.join(inputDir, outputFileName);
    fs.writeFileSync(outputFilePath, JSON.stringify(finalData, null, 2)); // Save as formatted JSON
  
    return finalData;  // Return the aggregated data for further use
  }
  
  
}
