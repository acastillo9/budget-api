import { UserResponseDto } from 'src/users/dto/user-response.dto';
import { AccountDocument } from '../entities/account.entity';

export class AccountResponseDto {
  id: string;
  name: string;
  balance: number;
  currencyCode: string;
  user: UserResponseDto;

  static fromAccount(account: AccountDocument): AccountResponseDto {
    if (!account) return null;
    const accountResponseDto = new AccountResponseDto();
    accountResponseDto.id = account._id.toHexString();
    accountResponseDto.name = account.name;
    accountResponseDto.balance = account.balance;
    accountResponseDto.currencyCode = account.currencyCode;
    accountResponseDto.user = UserResponseDto.fromUser(account.user);
    return accountResponseDto;
  }
}
