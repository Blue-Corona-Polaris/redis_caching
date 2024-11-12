// src/metrics/metrics.service.ts
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';
import glob from 'glob';

@Injectable()
export class MetricsService {
    // Method to evaluate the formula and sum all results from the JSON file
    async evaluateAndSumMetrics(filePattern: string): Promise<{
        totalSum: number;
        recordCount: number;
        fileReadTime: number;
        loopProcessingTime: number;
        totalExecutionTime: number;
    }> {
        const startTime = performance.now();

        try {
            // Construct the JSON file path using the metric pattern and current working directory
            const jsonFilePath = path.join(process.cwd(), 'dist', 'data', `${filePattern}_records.json`);

            // Ensure the file exists before proceeding
            if (!fs.existsSync(jsonFilePath)) {
                throw new Error(`JSON file not found: ${jsonFilePath}`);
            }

            // Measure time taken to read and parse the JSON file
            const fileReadStart = performance.now();
            const jsonData = fs.readFileSync(jsonFilePath, 'utf-8');
            const records = JSON.parse(jsonData);
            const fileReadEnd = performance.now();

            let totalSum = 0;
            let recordCount = 0;

            // Measure time taken to process the loop
            const loopProcessingStart = performance.now();
            for (const record of records) {
                const dataArray = record.value;

                for (const data of dataArray) {
                    // Parse metric values and handle missing or invalid data
                    const metric1 = parseFloat(data.metricValue1 || '0');
                    const metric2 = parseFloat(data.metricValue2 || '0');
                    const metric3 = parseFloat(data.metricValue3 || '0');

                    // Avoid division by zero and calculate the formula
                    const result = metric3 !== 0 ? (metric1 + metric2 + metric3) / metric3 : 0;
                    totalSum += result;
                    recordCount += 1;
                }
            }
            const loopProcessingEnd = performance.now();

            const endTime = performance.now();

            return {
                totalSum,
                recordCount,
                fileReadTime: fileReadEnd - fileReadStart,
                loopProcessingTime: loopProcessingEnd - loopProcessingStart,
                totalExecutionTime: endTime - startTime,
            };
        } catch (error) {
            console.error('Error evaluating and summing metrics:', error);
            throw new Error('Error evaluating and summing metrics');
        }
    }

    // Method to group by a specified field and sum the metric values based on the formula
    async groupAndSumMetricsGet(filePattern: string, groupByField: string): Promise<{
        groupedResults: Record<string, number>;
        recordCount: number;
        fileReadTime: number;
        loopProcessingTime: number;
        totalExecutionTime: number;
    }> {
        const startTime = performance.now();

        try {
            // Construct the JSON file path using the metric pattern
            const jsonFilePath = path.join(process.cwd(), 'dist', 'data', `${filePattern}_records.json`);

            // Ensure the file exists
            if (!fs.existsSync(jsonFilePath)) {
                throw new Error(`JSON file not found: ${jsonFilePath}`);
            }

            // Read and parse the JSON file
            const fileReadStart = performance.now();
            const jsonData = fs.readFileSync(jsonFilePath, 'utf-8');
            const records = JSON.parse(jsonData);
            const fileReadEnd = performance.now();

            const groupedResults: Record<string, number> = {};
            let recordCount = 0;

            // Measure time taken to process the loop
            const loopProcessingStart = performance.now();
            for (const record of records) {
                const dataArray = record.value;

                for (const data of dataArray) {
                    // Get the group by field value (e.g., `channel`)
                    const groupKey = data[groupByField];

                    if (!groupKey) {
                        continue; // Skip if the group key is missing
                    }

                    // Parse metric values and handle missing or invalid data
                    const metric1 = parseFloat(data.metricValue1 || '0');
                    const metric2 = parseFloat(data.metricValue2 || '0');
                    const metric3 = parseFloat(data.metricValue3 || '0');

                    // Avoid division by zero and calculate the formula
                    const result = metric3 !== 0 ? (metric1 + metric2 + metric3) / metric3 : 0;

                    // Aggregate the result for the current group
                    if (!groupedResults[groupKey]) {
                        groupedResults[groupKey] = 0;
                    }
                    groupedResults[groupKey] += result;
                    recordCount += 1;
                }
            }
            const loopProcessingEnd = performance.now();

            const endTime = performance.now();

            return {
                groupedResults,
                recordCount,
                fileReadTime: fileReadEnd - fileReadStart,
                loopProcessingTime: loopProcessingEnd - loopProcessingStart,
                totalExecutionTime: endTime - startTime,
            };
        } catch (error) {
            console.error('Error grouping and summing metrics:', error);
            throw new Error('Error grouping and summing metrics');
        }
    }

    // Method to group by a specified key and sum the metric values
    async groupAndSumMetricsPost(filePath: string, groupByKey: string, metricKeys: string[]): Promise<any[]> {
        const startTime = performance.now();

        try {
            // Ensure the file exists
            if (!fs.existsSync(filePath)) {
                throw new Error(`JSON file not found: ${filePath}`);
            }

            // Read and parse the JSON file
            const jsonData = fs.readFileSync(filePath, 'utf-8');
            const records = JSON.parse(jsonData);

            const groupedResults: Record<string, number> = {};

            // Loop through records and group by the specified key
            for (const record of records) {
                const dataArray = record.value;

                for (const data of dataArray) {
                    // Get the group key value (e.g., `channel`, `platform`)
                    const groupKey = data[groupByKey];

                    if (!groupKey) {
                        continue; // Skip if the group key is missing
                    }

                    // Calculate the sum of specified metric keys
                    let sum = 0;
                    for (const metricKey of metricKeys) {
                        const metricValue = parseFloat(data[metricKey] || '0');
                        sum += metricValue;
                    }

                    // Aggregate the result for the current group
                    if (!groupedResults[groupKey]) {
                        groupedResults[groupKey] = 0;
                    }
                    groupedResults[groupKey] += sum;
                }
            }

            // Convert the grouped results to an array of objects
            const resultArray = Object.entries(groupedResults).map(([key, value]) => ({
                key,
                sum: value,
            }));

            const endTime = performance.now();
            console.log(`Total processing time: ${(endTime - startTime).toFixed(2)} ms`);

            return resultArray;
        } catch (error) {
            console.error('Error grouping and summing metrics:', error);
            throw new Error('Error grouping and summing metrics');
        }
    }

    // Method to group by specified keys and sum the metric values, including performance tracking
    async groupAndSumMetrics(pattern: string, groupByKeys: string[], metricKeys: string[]): Promise<{ result: any[], totalTime: string, processingTime: string, fileReadTime: string, parseTime: string }> {
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

            const groupedResults: Record<string, any> = {}; // Store results for grouping
            const processingStartTime = performance.now(); // Start time for processing loop

            // Loop through each file and process it
            for (const filePath of filesToProcess) {
                console.log(`Processing file: ${filePath}`);

                // Start tracking file reading time
                const fileReadStart = performance.now();
                if (!fs.existsSync(filePath)) {
                    console.warn(`File does not exist: ${filePath}`);
                    continue;
                }

                // Read the file (file reading time)
                const jsonData = fs.readFileSync(filePath, 'utf-8');
                const fileReadEnd = performance.now();
                fileReadTime += (fileReadEnd - fileReadStart); // Accumulate file read time

                // Start tracking JSON parsing time
                const parseStart = performance.now();
                const records = JSON.parse(jsonData);
                const parseEnd = performance.now();
                parseTime += (parseEnd - parseStart); // Accumulate parse time

                // Iterate over records and group by specified keys
                for (const record of records) {
                    const dataArray = record.value || []; // Ensure value is an array

                    for (const data of dataArray) {
                        // Ensure the data contains all groupByKeys
                        const groupKey = groupByKeys.map((key) => data[key]).join('|');

                        // Initialize the grouping object if it doesn't exist
                        if (!groupedResults[groupKey]) {
                            groupedResults[groupKey] = { ...this.extractGroupKeys(data, groupByKeys), sum: 0 };
                        }

                        // Sum the specified metric keys
                        let sum = 0;
                        for (const metricKey of metricKeys) {
                            const metricValue = parseFloat(data[metricKey] || '0');
                            sum += metricValue;
                        }

                        // Aggregate the sum for the current group
                        groupedResults[groupKey].sum += sum;
                    }
                }
            }

            // Convert the grouped results to an array of objects
            const resultArray = Object.values(groupedResults);

            const processingEndTime = performance.now(); // End time for processing loop
            processingTime = (processingEndTime - processingStartTime).toFixed(2); // Total processing time

            const endTime = performance.now(); // End overall time
            const totalTime = (endTime - startTime).toFixed(2); // Total execution time

            console.log(`Total processing time: ${totalTime} ms`);
            console.log(`Processing time for loop: ${processingTime} ms`);
            console.log(`Total file read time: ${fileReadTime.toFixed(2)} ms`);
            console.log(`Total JSON parse time: ${parseTime.toFixed(2)} ms`);

            // Optionally, save the results to a JSON file (if needed)
            const outputFilePath = path.join(__dirname, '..', 'data', 'grouped_metrics_results.json');
            fs.writeFileSync(outputFilePath, JSON.stringify(resultArray, null, 2));
            console.log(`Grouped results saved to: ${outputFilePath}`);

            return { result: resultArray, totalTime, processingTime, fileReadTime: fileReadTime.toFixed(2), parseTime: parseTime.toFixed(2) }; // Return time details along with the result
        } catch (error) {
            console.error('Error grouping and summing metrics:', error);
            throw new Error('Error grouping and summing metrics');
        }
    }

    // Helper method to extract group keys from data
    private extractGroupKeys(data: any, groupByKeys: string[]): Record<string, any> {
        const groupObject: Record<string, any> = {};
        for (const key of groupByKeys) {
            groupObject[key] = data[key];
        }
        return groupObject;
    }

    // Helper method to find JSON files matching the pattern in the dist/data directory
    private async findFilesByPattern(pattern: string): Promise<string[]> {
        const directoryPath = path.join(__dirname, '..', 'data'); // Relative path to the dist/data folder
        const files = fs.readdirSync(directoryPath);

        return files
            .filter((file) => file.includes(pattern) && file.endsWith('.json')) // Match files based on pattern and ensure it's a JSON file
            .map((file) => path.join(directoryPath, file)); // Return full file path
    }

}
