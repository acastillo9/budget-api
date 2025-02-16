import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserStatus } from './user-status.enum';
import { BaseSchema } from 'src/core/schemas';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: String })
  password: string;

  @Prop({ type: String })
  activationCode: string;

  @Prop({ type: Date })
  activationCodeExpires: Date;

  @Prop({ type: Date })
  activationCodeResendAt: Date;

  @Prop({ type: Number, default: 0 })
  activationCodeRetries: number;

  @Prop({ type: Number, default: 0 })
  resetPasswordRetries: number;

  @Prop({ type: Date })
  resetPasswordLastSentAt: Date;

  @Prop({ type: String })
  picture: string;

  @Prop({
    type: String,
    enum: UserStatus,
    required: true,
    default: UserStatus.UNVERIFIED,
  })
  status: UserStatus;
}

export const UserSchema = SchemaFactory.createForClass(User).add(BaseSchema);
