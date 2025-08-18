import { Module } from '@nestjs/common';
import { AccountTypesController } from './account-types.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountType, AccountTypeSchema } from './entities/account-type.entity';
import { AccountTypesService } from './account-types.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AccountType.name, schema: AccountTypeSchema },
    ]),
  ],
  controllers: [AccountTypesController],
  providers: [AccountTypesService],
})
export class AccountTypesModule {}
