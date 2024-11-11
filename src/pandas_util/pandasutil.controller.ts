import { Controller, Post, Body } from '@nestjs/common';
import { PandasUtilService } from './pandasutil.service';

@Controller('pandas-util')
export class PandasUtilController {
  constructor(private readonly pandasUtilService: PandasUtilService) {}

  @Post('group-and-sum')
  async groupAndSumMetrics(
    @Body('pattern') pattern: string,
    @Body('groupByKeys') groupByKeys: string[],
    @Body('metricKeys') metricKeys: string[],
  ) {
    try {
      // Call the service to process and group the metrics
      const result = await this.pandasUtilService.groupAndSumMetricsWithPandas(pattern, groupByKeys, metricKeys);
      return result;
    } catch (error) {
      return {
        message: 'Error in grouping and summing metrics',
        error: error.message,
      };
    }
  }
}
