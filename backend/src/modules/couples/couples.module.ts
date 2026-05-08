import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Couple, CoupleSchema } from '../../common/schemas/couple.schema';
import { CouplesController } from './couples.controller';
import { CouplesService } from './couples.service';
import { User, UserSchema } from '../../common/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Couple.name, schema: CoupleSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [CouplesController],
  providers: [CouplesService],
})
export class CouplesModule {}
