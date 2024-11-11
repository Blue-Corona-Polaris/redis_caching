import { Module } from '@nestjs/common';
import { PandasUtilService } from './pandasutil.service';
import { PandasUtilController } from './pandasutil.controller';

@Module({
  imports: [],
  controllers: [PandasUtilController],
  providers: [PandasUtilService],
})
export class PandasUtilModule {}
