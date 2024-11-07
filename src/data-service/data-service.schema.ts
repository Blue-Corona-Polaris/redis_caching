import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Define the Entity schema
@Schema({ _id: false }) // Use _id: false to avoid creating an additional ID for subdocuments
export class Entity {
  @Prop({ required: true })
  locationId: string;

  @Prop({ required: true })
  locationGroupId: string;

  @Prop()
  source?: string;

  @Prop()
  medium?: string;

  @Prop({ required: true })
  channelNameId: string;

  @Prop({ required: true })
  campaignGroup: string;

  @Prop({ required: true })
  campaignGroupId: string;

  @Prop({ required: true })
  channelName: string;

  @Prop({ required: true })
  campaignTypeName: string;

  @Prop({ required: true })
  platformName: string;

  @Prop()
  channelTypeName?: string;

  @Prop()
  noaaRegion?: string;

  @Prop({ required: true })
  channelId: string;

  @Prop()
  campaign?: string;

  @Prop()
  campaignId?: string;

  @Prop({ required: true })
  campaignTypeId: string;

  @Prop({ required: true })
  platformId: string;

  @Prop({ required: true })
  tenantId: string;

  @Prop({ required: true })
  marketSegmentId: string;

  @Prop({ required: true })
  businessUnitId: number;

  @Prop()
  businessUnitName?: string;

  @Prop({ required: true })
  EngagementType: string;

  @Prop({ required: true })
  EngagementSubType: string;

  @Prop({ required: true })
  typeId: number;

  @Prop({ required: true })
  typeName: string;

  @Prop()
  dma?: string;

  @Prop()
  serviceLine?: string;

  @Prop()
  serviceType?: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  stCampaignId: number;

  @Prop({ required: true })
  stCampaignName: string;

  @Prop({ required: true })
  customerId: number;

  @Prop({ required: true })
  customerType: string;
}

// Define the Metrics schema
@Schema({ _id: false }) // Use _id: false to avoid creating an additional ID for subdocuments
export class Metrics {
  @Prop({ required: true })
  total_attributed_revenue: number;

  @Prop({ required: true })
  total_jobs_Booked: number;

  @Prop({ required: true })
  total_jobs_Canceled: number;

  @Prop({ required: true })
  total_jobs_inprogress: number;

  @Prop({ required: true })
  total_jobs_onhold: number;

  @Prop({ required: true })
  total_jobs_scheduled: number;

  @Prop({ required: true })
  jobs_total: number;

  @Prop({ required: true })
  earned_revenue: number;

  @Prop({ required: true })
  backlog_revenue: number;

  @Prop({ required: true })
  revenue: number;

  @Prop({ required: true })
  total_appointments: number;

  @Prop({ required: true })
  estimates_wo_revenue: number;

  @Prop({ required: true })
  revenue_plus_estimate: number;

  @Prop({ required: true })
  non_project_revenue: number;

  @Prop({ required: true })
  non_project_estimates_wo_revenue: number;

  @Prop({ required: true })
  project_revenue: number;

  @Prop({ required: true })
  project_estimates_wo_revenue: number;

  @Prop({ required: true })
  project_revenue_plus_estimate: number;

  @Prop({ required: true })
  total_form_leads: number;
}

// Main DataServiceTitanJobsAggregatedDaily schema
@Schema({ collection: 'DataServiceTitanJobsAggregatedDaily' }) // Specify the custom collection name
export class DataServiceTitanJobsAggregatedDaily extends Document {
  @Prop({ type: Entity, required: true })
  entity: Entity;

  @Prop({ type: Metrics, required: true })
  metrics: Metrics;

  @Prop({ required: true })
  dayOfWeek: number;

  @Prop({ required: true })
  weekNumber: number;

  @Prop({ required: true })
  month: number;

  @Prop({ required: true })
  quarter: number;

  @Prop({ required: true })
  year: number;

  @Prop({ required: true })
  date: Date;
}

// Create the schema for the DataServiceTitanJobsAggregatedDaily model
export const DataServiceTitanJobsAggregatedDailySchema = SchemaFactory.createForClass(DataServiceTitanJobsAggregatedDaily);
