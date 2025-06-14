import { Module } from '@nestjs/common';
import { ShareModule } from 'src/share/module';
import {
  BagGroupRateHttpController,
  BagGroupRateRpcHttpController,
} from './bag-group-rate-http.controller';
import {
  BAG_GROUP_RATE_REPOSITORY,
  BAG_GROUP_RATE_SERVICE,
} from './bag-group-rate.di-token';
import { BagGroupRatePrismaRepository } from './bag-group-rate-prisma.repo';
import { BagGroupRateService } from './bag-group-rate.service';

@Module({
  imports: [ShareModule],
  controllers: [BagGroupRateHttpController, BagGroupRateRpcHttpController],
  providers: [
    {
      provide: BAG_GROUP_RATE_REPOSITORY,
      useClass: BagGroupRatePrismaRepository,
    },
    {
      provide: BAG_GROUP_RATE_SERVICE,
      useClass: BagGroupRateService,
    },
  ],
  exports: [BAG_GROUP_RATE_REPOSITORY, BAG_GROUP_RATE_SERVICE],
})
export class BagGroupRateModule {}
