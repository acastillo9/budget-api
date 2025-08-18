module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    const session = client.startSession();
    await session.withTransaction(async () => {
      await db.collection('accounttypes').insertMany([
        {
          name: 'CHECKING',
          accountCategory: 'ASSET',
        },
        {
          name: 'SAVINGS',
          accountCategory: 'ASSET',
        },
        {
          name: 'CREDIT_CARD',
          accountCategory: 'LIABILITY',
        },
        {
          name: 'LOAN',
          accountCategory: 'LIABILITY',
        },
        {
          name: 'INVESTMENT',
          accountCategory: 'ASSET',
        },
        {
          name: 'MORTGAGE',
          accountCategory: 'LIABILITY',
        },
        {
          name: 'CASH',
          accountCategory: 'ASSET',
        },
      ]);
    });
    session.endSession();
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    const session = client.startSession();
    await session.withTransaction(async () => {
      await db.collection('accounttypes').deleteMany({
        name: {
          $in: [
            'CHECKING',
            'SAVINGS',
            'CREDIT_CARD',
            'LOAN',
            'INVESTMENT',
            'MORTGAGE',
            'CASH',
          ],
        },
      });
    });
    session.endSession();
  },
};
