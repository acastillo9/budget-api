import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { CategoryDocument } from 'src/categories/entities/category.entity';
import { AccountDocument } from 'src/accounts/entities/account.entity';
import { UserDocument } from 'src/users/entities/user.entity';
import { AuditableSchema } from 'src/shared/schemas';
import { BillDocument } from 'src/bills/entities/bill.entity';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema()
export class Transaction {
  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: String })
  description: string;

  @Prop({ type: String })
  notes: string;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Category',
    autopopulate: true,
  })
  category?: CategoryDocument;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Account',
    required: true,
    autopopulate: true,
  })
  account: AccountDocument;

  @Prop({ type: Boolean, required: true, default: false })
  isTransfer: boolean;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Transaction',
    autopopulate: true,
  })
  transfer?: TransactionDocument;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Bill',
    autopopulate: true,
  })
  bill?: BillDocument;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    autopopulate: true,
  })
  user: UserDocument;
}

export const TransactionSchema =
  SchemaFactory.createForClass(Transaction).add(AuditableSchema);
