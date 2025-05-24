import { Module } from '@nestjs/common';
import { ShareModule } from 'src/share/module';
import {
  HandBagHttpController,
  HandBagRpcHttpController,
} from './handbag-http.controller';
import { HANDBAG_REPOSITORY, HANDBAG_SERVICE } from './handbag.di-token';
import { HandBagPrismaRepository } from './handbag-prisma.repo';
import { HandBagService } from './handbag.service';

@Module({
  imports: [ShareModule],
  controllers: [HandBagHttpController, HandBagRpcHttpController],
  providers: [
    {
      provide: HANDBAG_REPOSITORY,
      useClass: HandBagPrismaRepository,
    },
    {
      provide: HANDBAG_SERVICE,
      useClass: HandBagService,
    },
  ],
  exports: [HANDBAG_REPOSITORY, HANDBAG_SERVICE],
})
export class HandBagModule {}
