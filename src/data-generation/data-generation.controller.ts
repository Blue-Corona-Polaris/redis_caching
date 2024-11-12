import { Controller, Get } from '@nestjs/common';
import { DataGenerationService } from './data-generation.service';

@Controller('data-generation')
export class DataGenerationController {
  constructor(private readonly dataGenerationService: DataGenerationService) {}

  @Get('generate')
  generateData() {
    const data = this.dataGenerationService.generateFullData();
    return {
      message: 'Data generated successfully',
      totalRecords: data.length,
      metricsProcessed: this.dataGenerationService['metrics'].length,
      sampleData: data.slice(0, 5), // Return a sample of the data
    };
  }
}
