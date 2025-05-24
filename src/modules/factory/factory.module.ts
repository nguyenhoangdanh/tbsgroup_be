import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ShareModule } from 'src/share/module';
import {
  FactoryHttpController,
  FactoryRpcHttpController,
} from './factory-http.controller';
import {
  FACTORY_REPOSITORY,
  FACTORY_SERVICE,
  FACTORY_ADAPTER_FACTORY,
} from './factory.di-token';
import { FactoryPrismaRepository } from './factory-prisma.repo';
import { FactoryService } from './factory.service';
import { UserModule } from '../user/user.module';
import { FactoryRepositoryAdapterFactory } from './factory-adapter';
import { AbstractServiceFactory } from 'src/share/patterns/abstract-factory';
import { IFactoryRepositoryAdapter } from './factory-adapter';

@Module({
  imports: [ShareModule, UserModule, ConfigModule],
  controllers: [FactoryHttpController, FactoryRpcHttpController],
  providers: [
    // Repository implementation
    {
      provide: FACTORY_REPOSITORY,
      useClass: FactoryPrismaRepository,
    },
    // Factory service
    {
      provide: FACTORY_SERVICE,
      useClass: FactoryService,
    },
    // Factory Adapter Factory
    {
      provide: FACTORY_ADAPTER_FACTORY,
      useClass: FactoryRepositoryAdapterFactory,
    },
    // Abstract Service Factory for Factory Repository Adapters
    {
      provide: 'FACTORY_ABSTRACT_FACTORY',
      useFactory: (adapterFactory: FactoryRepositoryAdapterFactory) => {
        const abstractFactory =
          new AbstractServiceFactory<IFactoryRepositoryAdapter>();
        abstractFactory.registerFactory(adapterFactory);
        return abstractFactory;
      },
      inject: [FACTORY_ADAPTER_FACTORY],
    },
  ],
  exports: [
    FACTORY_REPOSITORY,
    FACTORY_ADAPTER_FACTORY,
    'FACTORY_ABSTRACT_FACTORY',
    FACTORY_SERVICE,
  ],
})
export class FactoryModule {}
