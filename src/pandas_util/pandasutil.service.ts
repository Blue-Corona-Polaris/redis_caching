import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { DataFrame } from 'pandas-js';

@Injectable()
export class PandasUtilService {

  // Method to group by specified keys and sum the metric values
  async groupAndSumMetricsWithPandas(pattern: string, groupByKeys: string[], metricKeys: string[]): Promise<{ result: any[], totalTime: string, processingTime: string, fileReadTime: string, parseTime: string }> {
    const startTime = performance.now(); // Start tracking the overall time

    let fileReadTime = 0;
    let parseTime = 0;
    let processingTime: any = 0;

    try {
      // Find all matching JSON files based on the pattern
      const filesToProcess = await this.findFilesByPattern(pattern);

      if (!filesToProcess || filesToProcess.length === 0) {
        throw new Error('No files found to process.');
      }

      const processingStartTime = performance.now(); // Start time for processing loop
      const groupedResults: any[] = [];

      // Parallelize file reading and processing to improve performance
      const fileProcessingPromises = filesToProcess.map(async (filePath) => {
        console.log(`Processing file: ${filePath}`);

        // Start tracking file reading time
        const fileReadStart = performance.now();
        if (!fs.existsSync(filePath)) {
          console.warn(`File does not exist: ${filePath}`);
          return;
        }

        // Read the file (file reading time)
        const jsonData = await fs.promises.readFile(filePath, 'utf-8'); // Asynchronous read
        const fileReadEnd = performance.now();
        fileReadTime += (fileReadEnd - fileReadStart); // Accumulate file read time

        // Start tracking JSON parsing time
        const parseStart = performance.now();
        const records = JSON.parse(jsonData);
        const parseEnd = performance.now();
        parseTime += (parseEnd - parseStart); // Accumulate parse time

        // Create an object to store the groups
        const groups: Record<string, any> = {};

        // Manually group and sum the data
        for (const record of records) {
          // Loop through each 'value' array in the record
          for (const valueRecord of record.value) {
            const groupKey = groupByKeys.map((key) => valueRecord[key]).join('|'); // Join group keys to create a unique group identifier

            // Initialize the group if it doesn't exist
            if (!groups[groupKey]) {
              groups[groupKey] = { ...this.extractGroupKeys(valueRecord, groupByKeys), sum: 0 };
            }

            // Sum the metric values
            let sum = 0;
            for (const metricKey of metricKeys) {
              // Check if the metric key exists in the valueRecord
              if (valueRecord.hasOwnProperty(metricKey)) {
                const metricValue = parseFloat(valueRecord[metricKey] || '0'); // Ensure the value is treated as a number
                sum += metricValue; // Add the metric value to the sum
              } else {
                console.warn(`Metric key "${metricKey}" not found in value record.`);
              }
            }

            // Add the sum to the group's total
            groups[groupKey].sum += sum;
          }
        }

        // Flatten the groupedResults into a single array of objects
        groupedResults.push(...Object.values(groups)); // Spread the groups into a single array
      });

      // Wait for all file processing to complete
      await Promise.all(fileProcessingPromises);

      // Calculate the processing time for the loop
      const processingEndTime = performance.now(); // End time for processing loop
      processingTime = (processingEndTime - processingStartTime).toFixed(2); // Total processing time

      const endTime = performance.now(); // End overall time
      const totalTime = (endTime - startTime).toFixed(2); // Total execution time

      console.log(`Total processing time: ${totalTime} ms`);
      console.log(`Processing time for loop: ${processingTime} ms`);
      console.log(`Total file read time: ${fileReadTime.toFixed(2)} ms`);
      console.log(`Total JSON parse time: ${parseTime.toFixed(2)} ms`);
      console.log(`Total records: ${groupedResults.length}`);

      return {
        result: groupedResults,
        totalTime,
        processingTime,
        fileReadTime: fileReadTime.toFixed(2),
        parseTime: parseTime.toFixed(2)
      }; // Return time details along with the result
    } catch (error) {
      console.error('Error grouping and summing metrics with pandas:', error);
      throw new Error('Error grouping and summing metrics');
    }
  }

  // Helper method to extract group keys from the record
  private extractGroupKeys(record: any, groupByKeys: string[]) {
    const groupValues: Record<string, any> = {};
    groupByKeys.forEach(key => {
      groupValues[key] = record[key];
    });
    return groupValues;
  }

  // Helper method to find JSON files matching the pattern in the dist/data directory
  private async findFilesByPattern(pattern: string): Promise<string[]> {
    const directoryPath = path.join(__dirname, '..', 'data'); // Relative path to the dist/data folder
    const files = await fs.promises.readdir(directoryPath); // Asynchronous read

    return files
      .filter((file) => file.includes(pattern) && file.endsWith('.json')) // Match files based on pattern and ensure it's a JSON file
      .map((file) => path.join(directoryPath, file)); // Return full file path
  }

  async aggregateData(payload: any): Promise<string> {
    console.time('Total Time');
    const directoryPath = path.join(__dirname, '../../output/regenerated');
    const { pattern, groupByKeys, metricKeys, outputFile } = payload;

    console.time('File Matching');
    // Get all files matching the pattern
    const files = fs.readdirSync(directoryPath);
    const matchedFiles = files.filter((file) =>
      pattern.some((p: string) => file.includes(p))
    );
    console.timeEnd('File Matching');

    let allData: any[] = [];

    console.time('File Reading and Parsing');
    // Read and parse each matching file
    for (const file of matchedFiles) {
      const filePath = path.join(directoryPath, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);

      // Extract the 'value' array from each JSON entry and combine into one dataset
      jsonData.forEach((record: any) => {
        allData = allData.concat(record.value);
      });
    }
    console.timeEnd('File Reading and Parsing');

    if (allData.length === 0) {
      throw new Error('No data found matching the specified patterns.');
    }

    console.time('Data Frame Creation');
    // Create a DataFrame from the extracted data
    const df = new DataFrame(allData);
    console.timeEnd('Data Frame Creation');

    // Log the DataFrame columns for debugging
    console.log('DataFrame Columns:', df.columns); // Access columns directly, not a function

    console.time('Metric Conversion');
    // Convert metric columns to numeric values if they exist
    metricKeys.forEach((metric) => {
      if (df.hasOwnProperty(metric)) {
        df[metric] = df[metric].apply((value: any) => parseFloat(value) || 0);
      } else {
        console.warn(`Column '${metric}' not found in DataFrame.`);
      }
    });
    console.timeEnd('Metric Conversion');

    console.time('Grouping and Aggregation');
    // Manually group data based on the groupByKeys
    const groupedData: Record<string, any> = {};

    allData.forEach((row: any) => {
      // Create a key from groupByKeys
      const groupKey = groupByKeys.map((key) => row[key]).join('_');

      if (!groupedData[groupKey]) {
        groupedData[groupKey] = { ...row }; // Start with the first row as the base
        groupByKeys.forEach((key) => delete groupedData[groupKey][key]); // Remove groupByKeys from aggregation
        metricKeys.forEach((metric) => (groupedData[groupKey][metric] = 0)); // Initialize metrics
      }

      // Aggregate the metrics
      metricKeys.forEach((metric) => {
        if (row.hasOwnProperty(metric)) {
          groupedData[groupKey][metric] += parseFloat(row[metric]) || 0;
        }
      });
    });

    // Convert groupedData into an array of aggregated results
    const aggregatedResult = Object.values(groupedData);
    console.timeEnd('Grouping and Aggregation');

    console.time('Saving Result');
    // Add timestamp to the aggregated result
    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];

    // Create the 'aggregated' folder if it doesn't exist
    const output = path.join(__dirname, '../../output');
    const aggregatedFolderPath = path.join(output, 'aggregated_pandas');
    if (!fs.existsSync(aggregatedFolderPath)) {
      fs.mkdirSync(aggregatedFolderPath);
    }

    // Create the output file path with timestamp
    const outputFilePath = path.join(
      aggregatedFolderPath,
      `aggregated_result_${timestamp}.json`
    );

    // Save the result to the file
    fs.writeFileSync(outputFilePath, JSON.stringify(aggregatedResult, null, 2), 'utf-8');
    console.timeEnd('Saving Result');

    console.timeEnd('Total Time');
    return `Aggregated data saved to ${outputFilePath}`;
  }

}
