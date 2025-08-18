import { Controller, Get } from '@nestjs/common';
import { AccountTypeDto } from './dto/account-type.dto';
import { AccountTypesService } from './account-types.service';

@Controller('account-types')
export class AccountTypesController {
  constructor(private readonly accountTypesService: AccountTypesService) {}

  /**
   * Find all account types.
   * @return {Promise<AccountTypeDto[]>} The account types found.
   * @async
   */
  @Get()
  findAll(): Promise<AccountTypeDto[]> {
    return this.accountTypesService.findAll();
  }
}
