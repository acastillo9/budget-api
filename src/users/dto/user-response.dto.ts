import { AccountDto } from 'src/accounts/dto/account.dto';
import { UserDocument } from '../entities/user.entity';

export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  account: AccountDto;

  static fromUser(user: UserDocument): UserResponseDto {
    const sourceResponseDTO = new UserResponseDto();
    sourceResponseDTO.id = user._id.toHexString();
    sourceResponseDTO.name = user.name;
    sourceResponseDTO.email = user.email;
    sourceResponseDTO.account = AccountDto.fromAccount(user.account);
    return sourceResponseDTO;
  }
}
