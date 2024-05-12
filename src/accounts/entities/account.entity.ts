import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AccountDocument = HydratedDocument<Account>;

@Schema()
export class Account {
  @Prop({ type: Number, default: 0 })
  balance: number;

  @Prop({ type: Number, default: 0 })
  monthBalance: number;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
