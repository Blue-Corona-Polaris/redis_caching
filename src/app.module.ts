import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { SummaryModule } from './summary/summary.module';
// import { redisStore } from 'cache-manager-redis-yet';
import { RedisModule } from './redis/redis.module';
import { DataServiceModule } from './data-service/data-service.module';
import { MetricsModule } from './metrics/metrics.module';
import { PandasUtilModule } from './pandas_util/pandasutil.module';
import { MetadataModule } from './metadata/metadata.module';
import { DataGenerationModule } from './data-generation/data-generation.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/testdb'),
    SummaryModule,
    RedisModule,
    DataServiceModule, 
    MetricsModule,
    PandasUtilModule,
    MetadataModule,
    DataGenerationModule
    // CacheModule.register({
    //   store: redisStore,
    //   url: 'redis://127.0.0.1:6379', // Check if this is the correct Redis URL
    // }),
    // CacheModule.registerAsync({
    //   useFactory: async () => ({
    //     store: await redisStore({
    //       socket: {
    //         host: 'localhost',
    //         port: 6379,
    //       },
    //       ttl: 300, // Time to live in seconds
    //     }),
    //   }),
    // })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

