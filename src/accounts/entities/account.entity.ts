import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { UserDocument } from 'src/users/entities/user.entity';
import { AuditableSchema } from 'src/shared/schemas';
import { CurrencyCode } from 'src/shared/entities/currency-code.enum';
import { AccountTypeDocument } from '../../account-types/entities/account-type.entity';

export type AccountDocument = HydratedDocument<Account>;

@Schema()
export class Account {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, default: 0 })
  balance: number;

  @Prop({ type: String, enum: CurrencyCode, required: true })
  currencyCode: CurrencyCode;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'AccountType',
    required: true,
    autopopulate: true,
  })
  accountType: AccountTypeDocument;

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
