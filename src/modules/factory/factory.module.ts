import { Module } from '@nestjs/common';
import { ShareModule } from 'src/share/module';
import { FactoryHttpController } from './factory-http.controller';
import { FACTORY_REPOSITORY, FACTORY_SERVICE } from './factory.di-token';
import { FactoryPrismaRepository } from './factory-prisma.repo';
import { FactoryService } from './factory.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [ShareModule, UserModule],
  controllers: [FactoryHttpController],
  providers: [
    {
      provide: FACTORY_REPOSITORY,
      useClass: FactoryPrismaRepository,
    },
    {
      provide: FACTORY_SERVICE,
      useClass: FactoryService,
    },
  ],
  exports: [FACTORY_REPOSITORY],
})
export class FactoryModule {}
