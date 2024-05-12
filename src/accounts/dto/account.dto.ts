import { AccountDocument } from '../entities/account.entity';

export class AccountDto {
  id: string;
  balance: number;
  monthBalance: number;

  static fromAccount(account: AccountDocument): AccountDto {
    const sourceResponseDTO = new AccountDto();
    sourceResponseDTO.id = account._id.toHexString();
    sourceResponseDTO.balance = account.balance;
    sourceResponseDTO.monthBalance = account.monthBalance;
    return sourceResponseDTO;
  }
}
