// src/redis/redis-analyze.controller.ts
import { Controller, Get, Query, Res } from '@nestjs/common';
import { RedisAnalyzerService } from './redis-analyzer.service'; // Import the RedisAnalyzerService
import * as fs from 'fs';
import * as path from 'path';
import { Response } from 'express';
const archiver = require('archiver');
import AdmZip from 'adm-zip';
import { PassThrough } from 'stream'; // For streaming the data

@Controller('redis-analyze')
export class RedisAnalyzeController {
  constructor(private readonly redisAnalyzerService: RedisAnalyzerService) { }

  // API to scan and get values for keys matching the pattern
  @Get('scan-and-get')
  async scanAndGetValues(@Query('pattern') pattern: string) {
    try {
      // Fetch the keys and values based on the pattern
      const result = await this.redisAnalyzerService.scanAndGetValues(pattern);
      return result;
    } catch (error) {
      return { message: 'Error scanning and fetching values', error: error.message };
    }
  }

  // API to get the TTL for multiple keys
  @Get('get-keys-ttl')
  async getKeysTTL(@Query('pattern') pattern: string) {
    try {
      // Step 1: Scan for keys matching the pattern
      const keys = await this.redisAnalyzerService.scanKeys(pattern);
      if (keys.length === 0) {
        return { message: 'No keys found matching the pattern' };
      }

      // Step 2: Fetch TTL for those keys
      const ttl = await this.redisAnalyzerService.getKeysTTL(keys);
      return { keys: ttl };
    } catch (error) {
      return { message: 'Error fetching TTL for keys', error: error.message };
    }
  }

  // API to fetch all records matching the pattern and save to JSON file
  @Get('fetch-and-download-json')
  async fetchAndSave(@Query('pattern') pattern: string, @Res() res: Response) {
    try {
      // Fetch all records matching the pattern
      const records = await this.redisAnalyzerService.fetchAllRecords(pattern);

      // Define the file path to save the JSON file
      const filePath = path.join(__dirname, '..', 'data', `${pattern}_records.json`);

      // Ensure the directory exists
      fs.mkdirSync(path.dirname(filePath), { recursive: true });

      // Write the records to a JSON file
      fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
      console.log(`Records saved to ${filePath}`);

      // Download the JSON file
      res.download(filePath, `${pattern}records.json`, (err) => {
        if (err) {
          console.error('Error during file download:', err);
          res.status(500).send({ message: 'Error downloading file' });
        }
      });
    } catch (error) {
      console.error('Error fetching and saving records:', error);
      return res.status(500).send({ message: 'Error fetching and saving records', error: error.message });
    }
  }

  // Utility function to zip the JSON file using adm-zip and return a Promise
  private zipFile(filePath: string, zipPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const zip = new AdmZip(); // Create a new instance of AdmZip
        zip.addLocalFile(filePath); // Add the JSON file to the zip archive
        zip.writeZip(zipPath); // Write the zip file to the specified path
        console.log(`Created zip file at ${zipPath}`);
        resolve();
      } catch (err) {
        console.error('Error while zipping:', err);
        reject(err); // Reject the promise if an error occurs
      }
    });
  }

  // API to fetch all records matching the pattern, save to JSON, and download as a ZIP
  @Get('fetch-and-download_test')
  async fetchAndDownloadTest(@Query('pattern') pattern: string, @Res() res: Response) {
    try {
      // Fetch all records matching the pattern
      const records = await this.redisAnalyzerService.fetchAllRecords(pattern);

      // Define the JSON file path and the ZIP file path     
      const jsonFilePath = path.join(__dirname, '..', 'data', `${pattern}_records.json`);
      const zipFilePath = path.join(__dirname, '..', 'data', `${pattern}_records.zip`);

      // Ensure the directory exists for both JSON and ZIP files
      fs.mkdirSync(path.dirname(jsonFilePath), { recursive: true });

      // Write the records to a JSON file
      fs.writeFileSync(jsonFilePath, JSON.stringify(records, null, 2));
      console.log(`Records saved to ${jsonFilePath}`);

      // Wait for the zip to be created before sending it as a download
      await this.zipFile(jsonFilePath, zipFilePath);

      // Once the zip file is created, send it as a download
      res.download(zipFilePath, `${pattern}_records.zip`, (err) => {
        if (err) {
          console.error('Error during file download:', err);
          res.status(500).send({ message: 'Error downloading file' });
        } else {
          // Optionally delete the files after download to save space
          fs.unlinkSync(jsonFilePath);
          fs.unlinkSync(zipFilePath);
        }
      });
    } catch (error) {
      console.error('Error fetching and saving records:', error);
      return res.status(500).send({ message: 'Error fetching and saving records', error: error.message });
    }
  }


  // Utility function to zip the JSON data on-the-fly and return as a stream
  private zipJsonOnTheFly(jsonData: string, zipFileName: string, res: Response): void {
    const zip = new AdmZip(); // Create a new instance of AdmZip

    // Create a PassThrough stream to hold the zip content
    const passThroughStream = new PassThrough();

    // Add the JSON data as a file inside the zip, without saving to disk
    zip.addFile('records.json', Buffer.from(jsonData, 'utf8')); // Add JSON file to the zip

    // Write the zip file directly to the PassThrough stream
    zip.toBuffer((buffer) => {
      passThroughStream.end(buffer); // End the stream with the zip data
    });

    // Set the correct headers for downloading a zip file
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${zipFileName}`);

    // Pipe the PassThrough stream to the response
    passThroughStream.pipe(res);
  }

// API to fetch all records matching the pattern, save to JSON, zip the file, and store it on the server
@Get('fetch-and-save-zip')
async fetchAndSaveZip(@Query('pattern') pattern: string, @Res() res: Response) {
  try {
    // Fetch all records matching the pattern
    const records = await this.redisAnalyzerService.fetchAllRecords(pattern);

    // Calculate the number of records fetched
    const recordCount = records.length;

    // Convert the records to a JSON string
    const jsonData = JSON.stringify(records, null, 2);

    // Define the JSON file path and the ZIP file path     
    const jsonFilePath = path.join(__dirname, '../../output/', 'data', `${pattern}_records.json`);
    const zipFilePath = path.join(__dirname, '../../output/', 'data', `${pattern}_records.zip`);
    // Ensure the directory exists for both JSON and ZIP files
    fs.mkdirSync(path.dirname(jsonFilePath), { recursive: true });

    // Write the records to a JSON file
    fs.writeFileSync(jsonFilePath, jsonData);
    console.log(`Records saved to ${jsonFilePath}`);

    // Create a new Zip archive
    const zip = new AdmZip();

    // Read the JSON file into a buffer
    const jsonBuffer = fs.readFileSync(jsonFilePath);

    // Add the JSON buffer to the zip archive (with a custom filename in the ZIP)
    zip.addFile(`${pattern}_records.json`, jsonBuffer); 

    // Write the ZIP file to the disk
    zip.writeZip(zipFilePath);
    console.log(`ZIP file saved to ${zipFilePath}`);

    // Respond with a success message and the number of records processed
    return res.status(200).send({
      message: 'Records processed and ZIP file saved successfully.',
      recordCount,
      zipFilePath
    });

  } catch (error) {
    console.error('Error fetching and saving records:', error);
    return res.status(500).send({
      message: 'Error fetching and saving records',
      error: error.message
    });
  }
}

 // API to fetch all records matching the pattern, save to JSON, zip the file, and store it on the server
 @Get('fetch-and-process-zip')
 async processAndSaveZip(@Query('pattern') pattern: string, @Res() res: Response) {
   try {
     // Fetch all records matching the pattern
     const records = await this.redisAnalyzerService.fetchAllRecords(pattern);

     // Calculate the number of records fetched
     const recordCount = records.length;

     // Convert the records to a JSON string
     const jsonData = JSON.stringify(records, null, 2);

     // Define the JSON file path and the ZIP file path     
     const jsonFilePath = path.join(__dirname, '..', 'data', `${pattern}_records.json`);
     const zipFilePath = path.join(__dirname, '..', 'data', `${pattern}_records.zip`);

     // Ensure the directory exists for both JSON and ZIP files
     fs.mkdirSync(path.dirname(jsonFilePath), { recursive: true });

     // Write the records to a JSON file
     fs.writeFileSync(jsonFilePath, jsonData);
     console.log(`Records saved to ${jsonFilePath}`);

     // Create a new archiver instance with zip format and high compression
     const output = fs.createWriteStream(zipFilePath); // Create a write stream for the zip file
     const archive = archiver('zip', {
       zlib: { level: 9 } // Max compression
     });

     // Pipe the archiver output to the file
     archive.pipe(output);

     // Add the JSON file to the zip (add file with its stream)
     archive.file(jsonFilePath, { name: path.basename(jsonFilePath) });

     // Finalize the zip (this will start the zipping process)
     await archive.finalize();

     // Log successful zipping
     console.log(`ZIP file saved to ${zipFilePath}`);

     // Respond with a success message and the number of records processed
     return res.status(200).send({
       message: 'Records processed and ZIP file saved successfully.',
       recordCount,
       zipFilePath
     });

   } catch (error) {
     console.error('Error fetching and saving records:', error);
     return res.status(500).send({
       message: 'Error fetching and saving records',
       error: error.message
     });
   }
 }

}
