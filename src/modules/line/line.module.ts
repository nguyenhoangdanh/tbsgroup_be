import { Module, Provider } from '@nestjs/common';
import { ShareModule } from 'src/share/module';
import { LINE_REPOSITORY, LINE_SERVICE } from './line.di-token';
import { LinePrismaRepository } from './line-prisma.repo';
import { LineService } from './line.service';
import { LineHttpController } from './line-http.controller';
import { FACTORY_REPOSITORY } from '../factory/factory.di-token';
import { FactoryPrismaRepository } from '../factory/factory-prisma.repo';

const repositories: Provider[] = [
  { provide: LINE_REPOSITORY, useClass: LinePrismaRepository },
  { provide: FACTORY_REPOSITORY, useClass: FactoryPrismaRepository },
];

const services: Provider[] = [{ provide: LINE_SERVICE, useClass: LineService }];

@Module({
  imports: [ShareModule],
  controllers: [LineHttpController],
  providers: [...repositories, ...services],
  exports: [LINE_REPOSITORY],
})
export class LineModule {}
