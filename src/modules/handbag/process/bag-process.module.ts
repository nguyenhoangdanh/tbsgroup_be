import { Module } from '@nestjs/common';
import { ShareModule } from 'src/share/module';
import { BagProcessHttpController, BagProcessRpcHttpController } from './bag-process-http.controller';
import { BAG_PROCESS_REPOSITORY, BAG_PROCESS_SERVICE } from './bag-process.di-token';
import { BagProcessPrismaRepository } from './bag-process-prisma.repo';
import { BagProcessService } from './bag-process.service';

@Module({
  imports: [ShareModule],
  controllers: [BagProcessHttpController, BagProcessRpcHttpController],
  providers: [
    {
      provide: BAG_PROCESS_REPOSITORY,
      useClass: BagProcessPrismaRepository,
    },
    {
      provide: BAG_PROCESS_SERVICE,
      useClass: BagProcessService,
    },
  ],
  exports: [BAG_PROCESS_REPOSITORY, BAG_PROCESS_SERVICE],
})
export class BagProcessModule {}