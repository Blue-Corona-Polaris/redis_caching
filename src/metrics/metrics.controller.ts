// src/metrics/metrics.controller.ts
import { Controller, Get, Query, Res, Post, Body } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { Response } from 'express';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  // API endpoint to evaluate and sum metrics from the JSON file
  @Get('evaluate-and-sum')
  async evaluateAndSum(@Query('filePattern') filePattern: string, @Res() res: Response) {
    try {
      const result = await this.metricsService.evaluateAndSumMetrics(filePattern);

      return res.status(200).send({
        message: 'Metrics evaluation successful',
        totalSum: result.totalSum,
        recordCount: result.recordCount,
        fileReadTime: `${result.fileReadTime.toFixed(2)} ms`,
        loopProcessingTime: `${result.loopProcessingTime.toFixed(2)} ms`,
        totalExecutionTime: `${result.totalExecutionTime.toFixed(2)} ms`,
      });
    } catch (error) {
      console.error('Error in evaluating metrics:', error);
      return res.status(500).send({
        message: 'Error in evaluating metrics',
        error: error.message,
      });
    }
  }

   // API endpoint to group by a specified field and sum metrics from the JSON file
   @Get('group-and-sum')
   async groupAndSum(@Query('filePattern') filePattern: string, @Query('groupBy') groupByField: string, @Res() res: Response) {
     try {
       const result = await this.metricsService.groupAndSumMetricsGet(filePattern, groupByField);
 
       return res.status(200).send({
         message: 'Metrics grouped and summed successfully',
         groupedResults: result.groupedResults,
         recordCount: result.recordCount,
         fileReadTime: `${result.fileReadTime.toFixed(2)} ms`,
         loopProcessingTime: `${result.loopProcessingTime.toFixed(2)} ms`,
         totalExecutionTime: `${result.totalExecutionTime.toFixed(2)} ms`,
       });
     } catch (error) {
       console.error('Error in grouping and summing metrics:', error);
       return res.status(500).send({
         message: 'Error in grouping and summing metrics',
         error: error.message,
       });
     }
   }

   // POST API endpoint to group by a specified key and sum metrics
  @Post('group-and-sum')
  async groupAndSumPost(@Body() requestBody: any, @Res() res: Response) {
    const { filePath, groupByKey, metricKeys } = requestBody;

    if (!filePath || !groupByKey || !Array.isArray(metricKeys) || metricKeys.length === 0) {
      return res.status(400).send({
        message: 'Invalid input. Please provide filePath, groupByKey, and an array of metricKeys.',
      });
    }

    try {
      const result = await this.metricsService.groupAndSumMetricsPost(filePath, groupByKey, metricKeys);

      return res.status(200).send({
        message: 'Metrics grouped and summed successfully',
        result,
      });
    } catch (error) {
      console.error('Error in grouping and summing metrics:', error);
      return res.status(500).send({
        message: 'Error in grouping and summing metrics',
        error: error.message,
      });
    }
  }

  @Post('group-and-sum-metrics')
  async groupAndSumMetrics(@Body() requestBody: any, @Res() res: Response) {
    const { pattern, groupByKeys, metricKeys } = requestBody;

    if (( !pattern) || !Array.isArray(groupByKeys) || groupByKeys.length === 0 || !Array.isArray(metricKeys) || metricKeys.length === 0) {
      return res.status(400).send({
        message: 'Invalid input. Please provide filePaths or pattern, groupByKeys, and metricKeys.',
      });
    }

    try {
      const { result, totalTime, processingTime } = await this.metricsService.groupAndSumMetrics(pattern, groupByKeys, metricKeys);
      
      return res.status(200).send({
        message: 'Metrics grouped and summed successfully',
        result, // result data
        totalTime,  // total calculation time
        processingTime  // processing time for the loop
      });
    } catch (error) {
      console.error('Error in grouping and summing metrics:', error);
      return res.status(500).send({
        message: 'Error in grouping and summing metrics',
        error: error.message,
      });
    }
  }
}
