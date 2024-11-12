import { Controller, Get, Query } from '@nestjs/common';
import { MetadataService } from './metadata.service';

@Controller('metadata')
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  @Get('generate_metadata')
  async generateMetadata(
    @Query('inputPattern') inputPattern: string,
    @Query('metadataFile') metadataFile: string,
  ) {
    return this.metadataService.generateMetadata(inputPattern, metadataFile);
  }

  @Get('transform_and_save')
  async transformAndSave(
    @Query('inputPattern') inputPattern: string,
    @Query('metadataFile') metadataFile: string,
    @Query('outputFolder') outputFolder: string,
  ) {
    return this.metadataService.transformAndSaveData(inputPattern, metadataFile, outputFolder);
  }

  @Get('regenerate_original')
  async regenerateOriginalData(
    @Query('pattern') pattern: string,
    @Query('metadataFile') metadataFile: string,
    @Query('outputFolder') outputFolder: string,
  ) {
    console.log(`Received pattern: ${pattern}, metadataFile: ${metadataFile}, outputFolder: ${outputFolder}`);

    // Validate input parameters
    if (!pattern || !metadataFile || !outputFolder) {
      throw new Error('Pattern, metadata file, or output folder is missing.');
    }

    return this.metadataService.regenerateOriginalData(pattern, metadataFile, outputFolder);
  }

  @Get('aggregate_regenerated_data')
  async aggregateRegeneratedData(
    @Query('pattern') pattern: string,
    @Query('groupByKeys') groupByKeys: string,
    @Query('metricKeys') metricKeys: string,
    @Query('outputFile') outputFile: string,
  ) {
    try {
      // Parse the groupByKeys and metricKeys from the query params
      const groupByKeysArray = groupByKeys.split(',');
      const metricKeysArray = metricKeys.split(',');

      // Call the service method to aggregate the data
      const result = await this.metadataService.aggregateRegeneratedDataInParallel(
        pattern,
        groupByKeysArray,
        metricKeysArray,
        outputFile,
      );

      return {
        message: result,
      };
    } catch (error) {
      console.error('Error in aggregation API:', error.message);
      throw new Error(`Failed to aggregate data: ${error.message}`);
    }
  }
}
