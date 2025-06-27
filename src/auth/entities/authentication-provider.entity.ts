import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { AuthenticationProviderType } from './authentication-provider-type.enum';
import { UserDocument } from 'src/users/entities/user.entity';
import { BaseSchema } from 'src/shared/schemas';
import { AuthenticationProviderStatus } from './authentication-provider-status.enum';

export type AuthenticationProviderDocument =
  HydratedDocument<AuthenticationProvider>;

@Schema()
export class AuthenticationProvider {
  @Prop({ type: String, required: true })
  providerUserId: string;

  @Prop({
    type: String,
    enum: AuthenticationProviderType,
    required: true,
  })
  providerType: AuthenticationProviderType;

  @Prop({ type: String })
  activationCode: string;

  @Prop({ type: Date })
  activationCodeExpiresAt: Date;

  @Prop({ type: Date })
  activationCodeResendAt: Date;

  @Prop({ type: Number, default: 0 })
  activationCodeRetries: number;

  @Prop({ type: String })
  refreshToken: string;

  @Prop({ type: String })
  password: string;

  @Prop({ type: String })
  setPasswordToken: string;

  @Prop({ type: Date })
  setPasswordExpiresAt: Date;

  @Prop({ type: Number, default: 0 })
  setPasswordRetries: number;

  @Prop({ type: Date })
  setPasswordLastSentAt: Date;

  @Prop({
    type: String,
    enum: AuthenticationProviderStatus,
    required: true,
    default: AuthenticationProviderStatus.UNVERIFIED,
  })
  status: AuthenticationProviderStatus;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    autopopulate: true,
  })
  user: UserDocument;
}

export const AuthenticationProviderSchema = SchemaFactory.createForClass(
  AuthenticationProvider,
).add(BaseSchema);
