import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Bill } from './entities/bill.entity';
import { Model } from 'mongoose';
import { CreateBillDto } from './dto/create-bill.dto';
import { BillDto } from './dto/bill.dto';
import { plainToClass, plainToInstance } from 'class-transformer';
import { DbTransactionService } from 'src/shared/db-transaction.service';
import { BillInstanceDto } from './dto/bill-instance.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { TransactionsService } from 'src/transactions/transactions.service';
import { BillModificationDocument } from './entities/bill-modification.entity';
import { PayBillDto } from './dto/pay-bill.dto';
import { BillInstance } from './entities/bill-instance.entity';
import { BillStatus } from './entities/bill-status.enum';

@Injectable()
export class BillsService {
  private readonly logger: Logger = new Logger(BillsService.name);

  constructor(
    private readonly dbTransactionService: DbTransactionService,
    @InjectModel(Bill.name)
    private readonly billModel: Model<Bill>,
    private readonly transactionsService: TransactionsService,
  ) {}

  /**
   * Create a new bill.
   * @param createBillDto The data to create the bill.
   * @param userId The id of the user to create the bill.
   * @return The bill created.
   * @async
   */
  async create(createBillDto: CreateBillDto, userId: string): Promise<BillDto> {
    const newBill = {
      ...createBillDto,
      user: userId,
    };

    try {
      const billModel = new this.billModel(newBill);
      const savedBill = await billModel.save();
      return plainToClass(BillDto, savedBill.toObject());
    } catch (error) {
      this.logger.error(`Failed to create bill: ${error.message}`, error.stack);
      throw new HttpException(
        'Error creating the bill',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Fetch all bills.
   * @return An array of bills.
   * @async
   */
  async findAll(
    userId: string,
    dateStart: Date,
    dateEnd: Date,
  ): Promise<BillInstanceDto[]> {
    try {
      const bills = await this.billModel.find({
        user: userId,
        $or: [
          { endDate: { $exists: false } },
          { endDate: { $gte: dateStart } },
        ],
      });

      return bills
        .flatMap((bill) => bill.getInstances(dateStart, dateEnd))
        .map((billInstance: BillInstance) =>
          plainToClass(BillInstanceDto, billInstance),
        );
    } catch (error) {
      this.logger.error(`Failed to fetch bills: ${error.message}`, error.stack);
      throw new HttpException(
        'Error fetching bills',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Pay a bill for a specific date.
   * @param id The id of the bill to pay.
   * @param targetDate The date of the bill instance to pay.
   * @param payBillDto The data to pay the bill.
   * @param userId The id of the user paying the bill.
   * @return The updated bill instance.
   * @async
   */
  async payBill(
    id: string,
    targetDate: Date,
    payBillDto: PayBillDto,
    userId: string,
  ): Promise<BillInstanceDto> {
    const bill = await this.billModel.findOne({ _id: id, user: userId });

    if (!bill) {
      throw new HttpException('Bill not found', HttpStatus.NOT_FOUND);
    }

    const overrides = bill.get('overrides');
    const overrideDate = targetDate.toISOString().split('T')[0];
    const override: BillModificationDocument = overrides.get(overrideDate);

    if (override?.isPaid) {
      throw new HttpException('Bill already paid', HttpStatus.BAD_REQUEST);
    }

    try {
      return this.dbTransactionService.runTransaction(async (session) => {
        const newTransaction = await this.transactionsService.create(
          {
            amount: override?.amount || bill.amount,
            date: payBillDto.paidDate,
            description: override?.name || bill.name,
            account: override?.account?.id || bill.account.id,
            category: override?.category?.id || bill.category.id,
            bill: bill.id,
          },
          userId,
          session,
        );

        let newOverride;
        if (!override) {
          newOverride = {
            isPaid: true,
            paidDate: newTransaction.date,
            transactionId: newTransaction.id,
          };
        } else {
          newOverride = {
            ...override.toObject(),
            isPaid: true,
            paidDate: newTransaction.date,
            transactionId: newTransaction.id,
          };
        }

        bill.overrides.set(overrideDate, newOverride);
        await bill.save({ session });
        return plainToInstance(BillInstanceDto, bill.getInstance(targetDate));
      });
    } catch (error) {
      this.logger.error(`Failed to update bill: ${error.message}`, error.stack);
      throw new HttpException(
        'Error updating the bill',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Cancel a bill payment for a specific date.
   * @param id The id of the bill to cancel payment.
   * @param targetDate The date of the bill instance to cancel payment.
   * @param userId The id of the user cancelling the payment.
   * @return The updated bill instance.
   * @async
   */
  async cancelPayment(
    id: string,
    targetDate: Date,
    userId: string,
  ): Promise<BillInstanceDto> {
    const bill = await this.billModel.findOne({ _id: id, user: userId });

    if (!bill) {
      throw new HttpException('Bill not found', HttpStatus.NOT_FOUND);
    }

    const overrides = bill.get('overrides');
    const overrideDate = targetDate.toISOString().split('T')[0];
    const override = overrides.get(overrideDate);

    if (!override?.isPaid) {
      throw new HttpException('Bill is not paid', HttpStatus.BAD_REQUEST);
    }

    try {
      return this.dbTransactionService.runTransaction(async (session) => {
        await this.transactionsService.remove(
          override.transactionId,
          userId,
          session,
        );

        override.isPaid = false;
        override.paidDate = undefined;
        override.transactionId = undefined;

        bill.overrides.set(overrideDate, override);
        await bill.save({ session });
        return plainToInstance(BillInstanceDto, bill.getInstance(targetDate));
      });
    } catch (error) {
      this.logger.error(
        `Failed to cancel bill payment: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error cancelling the bill payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    id: string,

    targetDate: Date,
    updateBillDto: UpdateBillDto,
    userId: string,
  ): Promise<BillInstanceDto> {
    const bill = await this.billModel.findOne({ _id: id, user: userId });

    if (!bill) {
      throw new HttpException('Bill not found', HttpStatus.NOT_FOUND);
    }

    if (
      updateBillDto.applyToFuture &&
      (updateBillDto.endDate || updateBillDto.frequency)
    ) {
      throw new HttpException(
        'Cannot change endDate or frequency when applying to future instances',
        HttpStatus.BAD_REQUEST,
      );
    }

    const modification = {
      name: updateBillDto.name,
      amount: updateBillDto.amount,
      dueDate: updateBillDto.dueDate,
      endDate: updateBillDto.endDate,
      frequency: updateBillDto.frequency,
      category: updateBillDto.category,
      account: updateBillDto.account,
      applyToFuture: updateBillDto.applyToFuture,
    };

    try {
      return this.dbTransactionService.runTransaction(async (session) => {
        const updatedInstance = await bill.updateInstance(
          targetDate,
          modification,
          updateBillDto.applyToFuture,
          session,
        );

        if (
          updatedInstance.status === BillStatus.PAID &&
          (modification.amount || modification.account || modification.category)
        ) {
          await this.transactionsService.update(
            updatedInstance.transactionId,
            {
              ...(modification.amount ? { amount: modification.amount } : {}),
              ...(modification.account
                ? { account: modification.account }
                : {}),
              ...(modification.category
                ? { category: modification.category }
                : {}),
            },
            userId,
            session,
          );
        }

        return plainToInstance(BillInstanceDto, bill.getInstance(targetDate));
      });
    } catch (error) {
      this.logger.error(`Failed to update bill: ${error.message}`, error.stack);
      throw new HttpException(
        'Error updating the bill',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
