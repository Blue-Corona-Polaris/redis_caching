import { Controller, Get, Query, Req } from '@nestjs/common';
import { MetadataService } from './metadata.service';
import { Request } from 'express';

@Controller('metadata')
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  @Get('generate_metadata')
  async generateMetadata(
    @Query('pattern') pattern: string,
    @Query('metadataFile') metadataFile: string,
    @Req() request: Request,
  ) {
    console.log('Full Request Query:', request.query);
    console.log(`Received inputPattern: ${pattern}, outputFile: ${metadataFile}`);

    // Validate input parameters
    if (!pattern || !metadataFile) {
      throw new Error('Input pattern or output file name is missing.');
    }

    return this.metadataService.generateMetadata(pattern, metadataFile);
  }
}
