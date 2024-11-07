import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Entity extends Document {
  @Prop({ required: true })
  locationId: string;

  @Prop({ required: true })
  locationGroupId: string;

  @Prop()
  source: string;

  @Prop()
  medium: string;

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
  channelTypeName: string;

  @Prop()
  noaaRegion: string;

  @Prop()
  channelId: string;

  @Prop()
  campaign: string;

  @Prop()
  campaignId: string;

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
  businessUnitName: string;

  @Prop({ required: true })
  EngagementType: string;

  @Prop({ required: true })
  EngagementSubType: string;

  @Prop({ required: true })
  typeId: number;

  @Prop({ required: true })
  typeName: string;

  @Prop()
  dma: string;

  @Prop()
  serviceLine: string;

  @Prop()
  serviceType: string;

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

export const EntitySchema = SchemaFactory.createForClass(Entity);
