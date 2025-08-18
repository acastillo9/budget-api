import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AccountCategory } from './account-category.enum';
import { BaseSchema } from 'src/shared/schemas';

export type AccountTypeDocument = HydratedDocument<AccountType>;

@Schema()
export class AccountType {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, enum: AccountCategory, required: true })
  accountCategory: AccountCategory;
}

export const AccountTypeSchema =
  SchemaFactory.createForClass(AccountType).add(BaseSchema);
