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
}
