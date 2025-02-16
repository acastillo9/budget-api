import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { AuthenticationProviderType } from './authentication-provider-type.enum';
import { UserDocument } from 'src/users/entities/user.entity';
import { BaseSchema } from 'src/core/schemas';

export type AuthenticationDocument = HydratedDocument<Authentication>;

@Schema()
export class Authentication {
  @Prop({ type: String, required: true })
  providerUserId: string;

  @Prop({
    type: String,
    enum: AuthenticationProviderType,
    required: true,
  })
  providerType: string;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    autopopulate: true,
  })
  user: UserDocument;
}

export const AuthenticationSchema =
  SchemaFactory.createForClass(Authentication).add(BaseSchema);
