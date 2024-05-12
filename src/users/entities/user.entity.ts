import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { AccountDocument } from 'src/accounts/entities/account.entity';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Account',
    required: true,
    autopopulate: true,
  })
  account: AccountDocument;
}

export const UserSchema = SchemaFactory.createForClass(User);
