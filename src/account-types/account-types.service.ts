import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AccountTypeDto } from './dto/account-type.dto';
import { AccountType } from './entities/account-type.entity';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { plainToClass } from 'class-transformer';

@Injectable()
export class AccountTypesService {
  private readonly logger: Logger = new Logger(AccountTypesService.name);

  constructor(
    @InjectModel(AccountType.name)
    private readonly accountTypeModel: Model<AccountType>,
  ) {}

  /**
   * Find all account types.
   * @return {Promise<AccountTypeDto[]>} A promise that resolves to an array of account type DTOs.
   * @throws {HttpException} If an error occurs while retrieving account types.
   * @async
   */
  async findAll(): Promise<AccountTypeDto[]> {
    try {
      const accountTypes = await this.accountTypeModel.find();
      return accountTypes.map((accountType) =>
        plainToClass(AccountTypeDto, accountType.toObject()),
      );
    } catch (error) {
      this.logger.error(
        `Failed to retrieve account types: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error retrieving account types',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
