import { Controller, Get, Query, Logger, Post, Delete, Body } from '@nestjs/common';
import { DataServiceService } from './data-service.service'; // Adjust path as needed

@Controller('data-service')
export class DataServiceController {
    private readonly logger = new Logger(DataServiceService.name);
    constructor(private readonly dataService: DataServiceService) { }

    @Get('by-date')
    async getDataByDate(@Query('date') date: string) {
        return this.dataService.getDataByDate(date);
    }

    @Get('by-campaign')
    async getDataByCampaign(@Query('campaignId') campaignId: string) {
        return this.dataService.getDataByCampaign(campaignId);
    }

    @Get('by-customer')
    async getDataByCustomer(@Query('customerId') customerId: string) {
        const numericCustomerId = parseInt(customerId, 10); // Convert to number
        console.log(`Received request for customerId: ${numericCustomerId}`);
        return this.dataService.getDataByCustomer(numericCustomerId);
    }

    @Get('aggregate-jobs')
    async aggregateJobs(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('status') status: string,
    ) {
        return await this.dataService.aggregateJobs(startDate, endDate, status);
    }

    @Get('aggregate-jobs2')
    async aggregateJobs2(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ): Promise<any> {
        this.logger.log(`Request to aggregate jobs from ${startDate} to ${endDate}`);

        try {
            const result = await this.dataService.complexAggregateJobs(startDate, endDate);
            this.logger.log(`Aggregated results: ${JSON.stringify(result.length)}`);
            return result;
        } catch (error) {
            this.logger.error(`Error aggregating jobs: ${error.message}`);
            throw error; // You can throw a specific HTTP exception here if needed
        }
    }

    @Post('create-keys')
    async createKeys() {
        await this.dataService.createKeys();
        return { message: 'Keys created successfully in Redis' };
    }

    @Delete('delete-keys')
    async deleteKeys(@Query('pattern') pattern: string) {
        const deletedCount = await this.dataService.deleteKeys(pattern);
        return { message: `Deleted ${deletedCount} keys matching pattern "${pattern}"` };
    }

    @Get('scan-keys')
    async scanKeys(@Query('pattern') pattern: string) {
        try {
            // Call the service to scan keys based on the pattern
            const keys = await this.dataService.getKeys(pattern);

            // Retrieve values for each key found
            const result = await this.dataService.getValues(keys);

            return { keys: result }; // Return the object containing keys and values
        } catch (error) {
            return { message: 'Error scanning keys', error: error.message };
        }
    }

    // Get a specific key from Redis
    @Get('get-key')
    async getKey(@Query('key') key: string) {
        try {
            if (!key) {
                return { message: 'Key parameter is required.' };
            }

            // Call the service to get the value of the key
            const value = await this.dataService.getKeyFromCache(key);

            if (value === null) {
                return { message: 'Key not found or expired.', key };
            }

            return { key, value };
        } catch (error) {
            return { message: 'Error retrieving key', error: error.message };
        }
    }

    @Post('create-bulk-keys')
    async createBulkKeys(@Body() body: { totalKeys?: number }): Promise<string> {
        const totalKeys = body.totalKeys ?? 10_000;
        await this.dataService.createBulkKeysWithTTL(totalKeys);
        return 'Bulk keys created successfully!';
    }

    @Post('create-complex-bulk-keys')
    async createComplexBulkKeys(): Promise<string> {
        await this.dataService.createComplexBulkKeys();
        return 'Bulk keys created successfully!';
    }

    // Endpoint to trigger the creation of complex bulk keys with the shortened format
    @Post('create-shortened-bulk-keys')
    async createShortenedBulkKeys(): Promise<string> {
        try {
            // Call the service to create bulk keys
            const result = await this.dataService.createShortenedBulkKeys();
            return `Bulk keys created successfully in ${result.timeTaken}ms!`;
        } catch (error) {
            console.error('Error creating keys:', error);
            return `Error creating bulk keys: ${error.message}`;
        }
    }

}
