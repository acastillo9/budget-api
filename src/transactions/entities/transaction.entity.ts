import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { RepeatType } from './repeat-type.enum';
import { CategoryDocument } from 'src/categories/entities/category.entity';
import { TransactionType } from './transaction-type.enum';
import { AccountDocument } from 'src/accounts/entities/account.entity';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema()
export class Transaction {
  @Prop({ type: String, enum: TransactionType, required: true })
  transactionType: TransactionType;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date })
  endDate: Date;

  @Prop({ type: String, enum: RepeatType, default: RepeatType.NEVER })
  repeatType: RepeatType;

  @Prop({ type: String })
  description: string;

  @Prop({ type: Date, required: true })
  creationDate: Date;

  @Prop({ type: Date })
  updateDate: Date;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Category',
    required: true,
    autopopulate: true,
  })
  category: CategoryDocument;

  @Prop({
    type: Boolean,
    default: false,
  })
  paid: boolean;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Account',
    required: true,
    autopopulate: true,
  })
  account: AccountDocument;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
