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

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(
    @Request() req: any,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    createTransactionDto.user = req.user.sub;
    return this.transactionsService.create(createTransactionDto);
  }

  @Get()
  findAll(@Request() req: any, @Query() query: any) {
    const userId = req.user.sub;
    return this.transactionsService.findAllByUserAndMonthAndYear(
      userId,
      query.month,
      query.year,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    updateTransactionDto.user = req.user.sub;
    return this.transactionsService.update(id, updateTransactionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.transactionsService.remove(id);
  }
}
