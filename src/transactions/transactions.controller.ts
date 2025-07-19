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
import { AuthenticatedRequest } from 'src/shared/types';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';

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
    return this.transactionsService.create(
      createTransactionDto,
      req.user.userId,
    );
  }

  /**
   * Create a new transfer transaction.
   * @param req The request object.
   * @param createTransferDto The data to create the transfer transaction.
   * @returns The transfer transaction created.
   * @async
   */
  @Post('transfer')
  createTransfer(
    @Request() req: AuthenticatedRequest,
    @Body() createTransferDto: CreateTransferDto,
  ) {
    return this.transactionsService.createTransfer(
      createTransferDto,
      req.user.userId,
    );
  }

  /**
   * Find all transactions of an user with pagination.
   * @param req The request object.
   * @param paginationDto The pagination parameters.
   * @returns The transactions found.
   * @async
   */
  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.transactionsService.findAll(req.user.userId, paginationDto);
  }

  /**
   * update a transaction by id.
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
      req.user.userId,
    );
  }

  /**
   * Update a transfer transaction by id.
   * @param req The request object.
   * @param id The id of the transfer transaction to update.
   * @param updateTransferDto The data to update the transfer transaction.
   * @returns The transfer transaction updated.
   * @async
   */
  @Patch('transfer/:id')
  updateTransfer(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateTransferDto: UpdateTransferDto,
  ) {
    return this.transactionsService.updateTransfer(
      id,
      updateTransferDto,
      req.user.userId,
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
    return this.transactionsService.remove(id, req.user.userId);
  }

  /**
   * Remove a transfer transaction by id.
   * @param req The request object.
   * @param id The id of the transfer transaction to remove.
   * @async
   */
  @Delete('transfer/:id')
  removeTransfer(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.transactionsService.removeTransfer(id, req.user.userId);
  }
}
