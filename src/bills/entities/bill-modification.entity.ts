import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';
import { BillFrequency } from './bill-frequency.enum';
import { CategoryDocument } from 'src/categories/entities/category.entity';
import { AccountDocument } from 'src/accounts/entities/account.entity';

export type BillModificationDocument = BillModification & Types.Subdocument;

@Schema({ _id: false })
export class BillModification {
  @Prop({ type: String })
  name?: string;

  @Prop({ type: Number })
  amount?: number;

  @Prop({ type: Date })
  dueDate?: Date;

  @Prop({ type: Date })
  endDate?: Date;

  @Prop({ enum: BillFrequency, type: String })
  frequency?: BillFrequency;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Category',
    autopopulate: true,
  })
  category?: CategoryDocument;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Account',
    autopopulate: true,
  })
  account?: AccountDocument;

  @Prop({ type: Boolean })
  isPaid?: boolean;

  @Prop({ type: Date })
  paidDate?: Date;

  @Prop({ type: String })
  transactionId?: string;

  @Prop({ type: Boolean })
  applyToFuture?: boolean;

  @Prop({ type: Boolean })
  isDeleted?: boolean;
}

export const BillModificationSchema =
  SchemaFactory.createForClass(BillModification);
