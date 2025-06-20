import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { CurrencyCode } from './currency-code.enum';
import { UserDocument } from 'src/users/entities/user.entity';
import { AuditableSchema } from 'src/core/schemas';
import { AccountType } from './account-type.enum';

export type AccountDocument = HydratedDocument<Account>;

@Schema()
export class Account {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, default: 0 })
  balance: number;

  @Prop({ type: String, enum: CurrencyCode, required: true })
  currencyCode: CurrencyCode;

  @Prop({ type: String, enum: AccountType, required: true })
  accountType: AccountType;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    autopopulate: true,
  })
  user: UserDocument;
}

export const AccountSchema =
  SchemaFactory.createForClass(Account).add(AuditableSchema);
