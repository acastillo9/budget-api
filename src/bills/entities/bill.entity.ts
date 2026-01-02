import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ClientSession, HydratedDocument, SchemaTypes } from 'mongoose';
import { AuditableSchema } from 'src/shared/schemas';
import { BillFrequency } from './bill-frequency.enum';
import { AccountDocument } from 'src/accounts/entities/account.entity';
import { UserDocument } from 'src/users/entities/user.entity';
import { BillInstance } from './bill-instance.entity';
import { BillStatus } from './bill-status.enum';
import {
  BillModificationDocument,
  BillModificationSchema,
} from './bill-modification.entity';
import { CategoryDocument } from 'src/categories/entities/category.entity';

export type BillDocument = HydratedDocument<Bill>;

@Schema()
export class Bill {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: Date, required: true })
  dueDate: Date;

  @Prop({ type: Date })
  endDate?: Date;

  @Prop({ type: String, enum: BillFrequency, required: true })
  frequency: BillFrequency;

  @Prop({
    type: Map,
    of: BillModificationSchema,
    default: {},
  })
  overrides: Map<string, BillModificationDocument>;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Category',
    required: true,
    autopopulate: true,
  })
  category: CategoryDocument;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Account',
    required: true,
    autopopulate: true,
  })
  account: AccountDocument;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    autopopulate: true,
  })
  user: UserDocument;

  getInstances: (rangeStart: Date, rangeEnd: Date) => BillInstance[];
  getInstance: (targetDate: Date) => BillInstance | null;
  updateInstance: (
    targetDate: Date,
    updates,
    applyToFuture: boolean,
    session?: ClientSession,
  ) => Promise<BillInstance>;
}

export const BillSchema =
  SchemaFactory.createForClass(Bill).add(AuditableSchema);

function advanceDate(date: Date, billFrequency: string): void {
  switch (billFrequency) {
    case BillFrequency.DAILY:
      date.setDate(date.getDate() + 1);
      break;
    case BillFrequency.WEEKLY:
      date.setDate(date.getDate() + 7);
      break;
    case BillFrequency.BIWEEKLY:
      date.setDate(date.getDate() + 14);
      break;
    case BillFrequency.MONTHLY:
      date.setMonth(date.getMonth() + 1);
      break;
    case BillFrequency.ANNUALLY:
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
}

function calculateStatus(dueDate: Date): BillStatus {
  const localNow = new Date();
  const today = new Date(
    Date.UTC(localNow.getFullYear(), localNow.getMonth(), localNow.getDate()),
  );

  if (dueDate < today) {
    return BillStatus.OVERDUE;
  }
  if (dueDate.getTime() === today.getTime()) {
    return BillStatus.DUE;
  }
  return BillStatus.UPCOMING;
}

BillSchema.methods.getInstances = function (
  this: BillDocument,
  rangeStart: Date,
  rangeEnd: Date,
): BillInstance[] {
  const overdueInstances: BillInstance[] = [];
  const rangeInstances: BillInstance[] = [];

  let runningState = {
    name: this.name,
    amount: this.amount,
    dueDate: new Date(this.dueDate),
    endDate: this.endDate ? new Date(this.endDate) : null,
    frequency: this.frequency,
    account: this.account.toObject(),
    category: this.category.toObject(),
    isPaid: false,
    isDeleted: false,
  };

  while (
    runningState.dueDate <= rangeEnd &&
    (!runningState.endDate || runningState.dueDate <= runningState.endDate)
  ) {
    const instanceKey = runningState.dueDate.toISOString().split('T')[0];
    const override = this.overrides.get(instanceKey);

    if (override?.applyToFuture) {
      runningState = { ...runningState, ...override.toObject() };
    }

    const isDeleted =
      (override?.isDeleted && !override?.isPaid) ||
      (runningState.isDeleted && !runningState.isPaid);

    if (!isDeleted) {
      const finalDueDate = override?.dueDate
        ? new Date(override.dueDate)
        : new Date(runningState.dueDate);

      const isPaid = !!override?.isPaid;
      const status = isPaid ? BillStatus.PAID : calculateStatus(finalDueDate);
      const isBeforeRange = runningState.dueDate < rangeStart;
      const isOverdueUnpaid = status === BillStatus.OVERDUE && !isPaid;

      // Include instance if it's within the range OR if it's an overdue unpaid bill before the range
      if (!isBeforeRange || isOverdueUnpaid) {
        const instance: BillInstance = {
          id: this.id,
          targetDate: new Date(instanceKey), // The stable, original due date
          name: override?.name || runningState.name,
          amount: override?.amount || runningState.amount,
          dueDate: finalDueDate,
          endDate: override?.endDate || runningState.endDate || undefined,
          status,
          frequency: override?.frequency || runningState.frequency,
          account: override?.account?.toObject() || runningState.account,
          category: override?.category?.toObject() || runningState.category,
          paidDate: override?.paidDate,
          applyToFuture: !!override?.applyToFuture,
        };

        if (isBeforeRange) {
          overdueInstances.push(instance);
        } else {
          rangeInstances.push(instance);
        }
      }
    }

    if (runningState.frequency === BillFrequency.ONCE) {
      return [...overdueInstances, ...rangeInstances];
    }

    advanceDate(runningState.dueDate, runningState.frequency);
  }

  // Return overdue instances first, then range instances (both sorted by dueDate)
  return [...overdueInstances, ...rangeInstances];
};

BillSchema.methods.getInstance = function (
  this: BillDocument,
  targetDate: Date,
): BillInstance | null {
  const override = this.overrides.get(targetDate.toISOString().split('T')[0]);
  const instance: BillInstance = {
    id: this.id,
    targetDate,
    name: override?.name || this.name,
    dueDate: override?.dueDate || targetDate,
    endDate: override?.endDate || this.endDate,
    amount: override?.amount || this.amount,
    status: override?.isPaid
      ? BillStatus.PAID
      : calculateStatus(override?.dueDate || targetDate),
    frequency: override?.frequency || this.frequency,
    account: override?.account?.toObject() || this.account.toObject(),
    category: override?.category?.toObject() || this.category.toObject(),
    paidDate: override?.paidDate,
    transactionId: override?.transactionId,
    applyToFuture: !!override?.applyToFuture,
  };
  return instance;
};

BillSchema.methods.updateInstance = async function (
  this: BillDocument,
  targetDate: Date,
  updates,
  applyToFuture: boolean,
  session?: ClientSession,
): Promise<BillInstance> {
  const targetKey = targetDate.toISOString().split('T')[0];

  const existingOverride = this.overrides.get(targetKey);
  if (applyToFuture && existingOverride?.isPaid) {
    throw new Error(
      'Cannot apply changes to future instances after a paid instance.',
    );
  }

  if (applyToFuture) {
    for (const [key, override] of this.overrides.entries()) {
      const overrideDate = new Date(key);
      if (overrideDate > targetDate && !override.isPaid) {
        this.overrides.delete(key);
      }
    }
  }

  const newOverride = {
    ...(existingOverride
      ? existingOverride.toObject({
          depopulate: true,
        })
      : {}),
    ...updates,
    applyToFuture,
  };
  this.overrides.set(targetKey, newOverride);

  this.markModified('overrides');
  await this.save({ session });
  return this.getInstance(targetDate);
};
