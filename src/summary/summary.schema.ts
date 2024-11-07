import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Summary extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  text: string;
}

export const SummarySchema = SchemaFactory.createForClass(Summary);
