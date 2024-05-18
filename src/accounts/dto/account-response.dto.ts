import { AccountDocument } from '../entities/account.entity';

export class AccountResponseDto {
  id: string;
  name: string;
  balance: number;
  currencyCode: string;

  static fromAccount(account: AccountDocument): AccountResponseDto {
    const accountResponseDto = new AccountResponseDto();
    accountResponseDto.id = account._id.toHexString();
    accountResponseDto.name = account.name;
    accountResponseDto.balance = account.balance;
    accountResponseDto.currencyCode = account.currencyCode;
    return accountResponseDto;
  }
}
