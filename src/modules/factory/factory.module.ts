import { Module, Provider } from '@nestjs/common';
import { FactoryPrismaRepository } from './factory-prisma.repo';
import { FACTORY_REPOSITORY, FACTORY_SERVICE } from './factory.di-token';
import { FactoryService } from './factory.service';
import { ShareModule } from 'src/share/module';
import { FactoryHttpController } from './factory-http.controller';

const repositories: Provider[] = [
  { provide: FACTORY_REPOSITORY, useClass: FactoryPrismaRepository },
];

const services: Provider[] = [
  { provide: FACTORY_SERVICE, useClass: FactoryService },
];

@Module({
  imports: [ShareModule],
  controllers: [FactoryHttpController],
  providers: [...repositories, ...services],
  exports: [FACTORY_REPOSITORY],
})
export class FactoryModule {}
