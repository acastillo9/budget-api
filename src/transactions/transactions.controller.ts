import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  Query,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsQueryDto } from './dto/transactions-query.dto';
import { AuthenticatedRequest } from 'src/core/types';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * Create a new transaction.
   * @param req The request object.
   * @param createTransactionDto The data to create the transaction.
   * @returns The transaction created.
   * @async
   */
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(createTransactionDto, req.user.id);
  }

  /**
   * Find all transactions of an user. Optionally filter by account, month and year.
   * @param req The request object.
   * @param query The query parameters to filter the transactions.
   * @returns The transactions found.
   * @async
   */
  @Get()
  findAllByAccount(
    @Request() req: AuthenticatedRequest,
    @Query() query: TransactionsQueryDto,
  ) {
    return this.transactionsService.findAll(query, req.user.id);
  }

  /**
   * Find a transaction by id.
   * @param req The request object.
   * @param id The id of the transaction to find.
   * @returns The transaction found.
   * @async
   */
  @Get(':id')
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.transactionsService.findOne(id, req.user.id);
  }

  /**
   * Update a transaction by id.
   * @param req The request object.
   * @param id The id of the transaction to update.
   * @param updateTransactionDto The data to update the transaction.
   * @returns The transaction updated.
   * @async
   */
  @Patch(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(
      id,
      updateTransactionDto,
      req.user.id,
    );
  }

  /**
   * Remove a transaction by id.
   * @param req The request object.
   * @param id The id of the transaction to remove.
   * @async
   */
  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.transactionsService.remove(id, req.user.id);
  }
}
