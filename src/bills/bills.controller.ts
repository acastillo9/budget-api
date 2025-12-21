import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  ParseDatePipe,
} from '@nestjs/common';
import { BillsService } from './bills.service';
import { BillDto } from './dto/bill.dto';
import { AuthenticatedRequest } from 'src/shared/types';
import { CreateBillDto } from './dto/create-bill.dto';
import { DateRangeDto } from 'src/shared/dto/date-range.dto';
import { BillInstanceDto } from './dto/bill-instance.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { PayBillDto } from './dto/pay-bill.dto';

@Controller('bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  /**
   * Create a new bill.
   * @param req The request object.
   * @param createBillDto The data to create the bill.
   * @returns The bill created.
   * @async
   */
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createBillDto: CreateBillDto,
  ): Promise<BillDto> {
    return this.billsService.create(createBillDto, req.user.userId);
  }

  /**
   * Fetch all bills.
   * @returns An array of bills.
   * @async
   */
  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query() dateRange: DateRangeDto,
  ): Promise<BillInstanceDto[]> {
    return this.billsService.findAll(
      req.user.userId,
      dateRange.dateStart,
      dateRange.dateEnd,
    );
  }

  /**
   * Pay a bill.
   * @param id The id of the bill to pay.
   * @param targetDate The date of the bill to pay.
   * @param req The request object.
   * @param payBillDto The data to pay the bill.
   * @returns The bill paid.
   * @async
   */
  @Post(':id/:targetDate/pay')
  payBill(
    @Param('id') id: string,
    @Param('targetDate', new ParseDatePipe({ optional: false }))
    targetDate: Date,
    @Request() req: AuthenticatedRequest,
    @Body() payBillDto: PayBillDto,
  ): Promise<BillInstanceDto> {
    return this.billsService.payBill(
      id,
      targetDate,
      payBillDto,
      req.user.userId,
    );
  }

  /**
   * Cancel a payment for a bill.
   * @param id The id of the bill to cancel the payment.
   * @param targetDate The date of the bill instance to cancel the payment.
   * @param req The request object.
   * @return The bill instance with the payment canceled.
   * @async
   */
  @Post(':id/:targetDate/unpay')
  cancelPayment(
    @Param('id') id: string,
    @Param('targetDate', new ParseDatePipe({ optional: false }))
    targetDate: Date,
    @Request() req: AuthenticatedRequest,
  ): Promise<BillInstanceDto> {
    return this.billsService.cancelPayment(id, targetDate, req.user.userId);
  }

  @Patch(':id/:targetDate')
  update(
    @Param('id') id: string,
    @Param('targetDate', new ParseDatePipe({ optional: false }))
    targetDate: Date,
    @Request() req: AuthenticatedRequest,
    @Body() updateBillDto: UpdateBillDto,
  ): Promise<BillInstanceDto> {
    return this.billsService.update(
      id,
      targetDate,
      updateBillDto,
      req.user.userId,
    );
  }
}
