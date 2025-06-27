import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { CurrencyCode } from 'src/shared/entities/currency-code.enum';
import { AuditableSchema } from 'src/shared/schemas';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: String })
  picture: string;

  @Prop({ type: String, enum: CurrencyCode, required: true })
  currencyCode: CurrencyCode;
}

export const UserSchema =
  SchemaFactory.createForClass(User).add(AuditableSchema);
