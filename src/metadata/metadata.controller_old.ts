import { Controller, Get, Query } from '@nestjs/common';
import { MetadataService } from './metadata.service_old';

@Controller('metadata')
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  @Get('create')
  async createMetadata(
    @Query('pattern') pattern: string,
    @Query('metadataFile') metadataFile: string,
  ): Promise<string> {
    await this.metadataService.createMetadata(pattern, metadataFile);
    return `Metadata created and saved to ${metadataFile}.`;
  }

  @Get('transform')
  async transformFiles(
    @Query('pattern') pattern: string,
    @Query('metadataFile') metadataFile: string,
  ): Promise<string> {
    await this.metadataService.transformFiles(pattern, metadataFile);
    return `Files transformed successfully.`;
  }

  @Get('regenerate')
  async regenerateFiles(
    @Query('pattern') pattern: string,
    @Query('metadataFile') metadataFile: string,
  ): Promise<string> {
    await this.metadataService.regenerateFiles(pattern, metadataFile);
    return `Files regenerated successfully.`;
  }

  @Get('aggregate')
  async aggregateData(
    @Query('pattern') pattern: string,
    @Query('groupByKeys') groupByKeys: string,
    @Query('metricKeys') metricKeys: string,
    @Query('outputFile') outputFile: string,  // Specify the output file name here
  ): Promise<any[]> {
    const groupKeys = groupByKeys.split(',');
    const metricKeysArray = metricKeys.split(',');
    return await this.metadataService.aggregateData(pattern, groupKeys, metricKeysArray, outputFile);
  }
}
