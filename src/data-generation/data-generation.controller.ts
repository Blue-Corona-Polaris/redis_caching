import { Controller, Get } from '@nestjs/common';
import { DataGenerationService } from './data-generation.service';

@Controller('data-generation')
export class DataGenerationController {
  constructor(private readonly dataGenerationService: DataGenerationService) {}

  @Get('generate')
  async generateAndCacheData() {
    await this.dataGenerationService.generateAndCacheAllMetrics();
    return {
      message: 'Data generation and caching started.',
    };
  }
}
