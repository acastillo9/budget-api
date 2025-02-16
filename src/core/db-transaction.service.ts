import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection } from 'mongoose';

/**
 * Service to handle database transactions.
 * @class
 */
@Injectable()
export class DbTransactionService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * Run a transaction.
   * @param fn The function to run in the transaction.
   * @returns The result of the transaction.
   * @async
   */
  async runTransaction<T>(
    fn: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
