import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountDto } from './dto/account.dto';
import { AuthenticatedRequest } from 'src/shared/types';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  /**
   * Create a new account.
   * @param req The request object.
   * @param createAccountDto The data to create the account.
   * @returns The account created.
   * @async
   */
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createAccountDto: CreateAccountDto,
  ): Promise<AccountDto> {
    return this.accountsService.create(createAccountDto, req.user.userId);
  }

  /**
   * Find all accounts of a user.
   * @param req The request object.
   * @returns The accounts found.
   * @async
   */
  @Get()
  findAll(@Request() req: AuthenticatedRequest): Promise<AccountDto[]> {
    return this.accountsService.findAll(req.user.userId);
  }

  /**
   * Update an account.
   * @param id The id of the account to update.
   * @param req The request object.
   * @param updateAccountDto The data to update the account.
   * @returns The account updated.
   * @async
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() updateAccountDto: UpdateAccountDto,
  ): Promise<AccountDto> {
    return this.accountsService.update(id, updateAccountDto, req.user.userId);
  }

  /**
   * Remove an account.
   * @param id The id of the account to remove.
   * @param req The request object.
   * @returns The account removed.
   * @async
   */
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<AccountDto> {
    return this.accountsService.remove(id, req.user.userId);
  }
}
