import { Controller, Get, Post, Body } from '@nestjs/common';
import { SummaryService } from './summary.service';
import { Summary } from './summary.schema';

@Controller('summary')
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get()
  async getSummaries(): Promise<Summary[]> {
    return this.summaryService.getSummaries();
  }

  @Post()
  async createSummary(@Body() body: { title: string; text: string }): Promise<Summary> {
    return this.summaryService.createSummary(body);
  }
}
