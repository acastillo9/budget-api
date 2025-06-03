import { PartialType } from '@nestjs/mapped-types';
import { CreateAuthenticationProviderDto } from './create-authentication-provider.dto';

export class UpdateAuthenticationProviderDto extends PartialType(
  CreateAuthenticationProviderDto,
) {}
