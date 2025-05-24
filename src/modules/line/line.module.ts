import { Module } from '@nestjs/common';
import { ShareModule } from 'src/share/module';
import { LineRpcHttpController } from './line-rpc-http.controller';
import { LinePrismaRepository } from './line-prisma.repository';
import { LineService } from './line.service';
import { LINE_REPOSITORY, LINE_SERVICE } from './line.di-token';
import { FactoryModule } from '../factory/factory.module';
import { UserModule } from '../user/user.module';
import { createCrudModule } from 'src/CrudModule/crud.module';
import { Line } from './line.model';
import { LineCreateDTO, LineUpdateDTO, LineCondDTO } from './line.dto';
import { CRUD_OPTIONS } from 'src/CrudModule/crud.decorator';
import { LineCrudController } from './line-http.controller';

// Define the endpoints configuration
const crudEndpoints = {
  getAll: true,
  getOne: true,
  create: true,
  update: true,
  delete: true,
};

// Define the providers here for reuse in both places
const lineProviders = [
  {
    provide: LINE_SERVICE,
    useClass: LineService,
  },
  {
    provide: LINE_REPOSITORY,
    useClass: LinePrismaRepository,
  },
];

// Define the CRUD_OPTIONS provider
const crudOptionsProvider = {
  provide: CRUD_OPTIONS,
  useValue: {
    endpoints: crudEndpoints,
    model: Line,
    createDto: LineCreateDTO,
    updateDto: LineUpdateDTO,
    conditionDto: LineCondDTO,
    path: 'lines',
  },
};

// Create the CRUD module with additional providers
const LineCrudModule = createCrudModule({
  moduleName: 'Line',
  path: 'lines',
  modelType: Line,
  createDtoType: LineCreateDTO,
  updateDtoType: LineUpdateDTO,
  filterDtoType: LineCondDTO,
  serviceClass: LineService,
  repositoryClass: LinePrismaRepository,
  serviceToken: LINE_SERVICE,
  repositoryToken: LINE_REPOSITORY,
  imports: [ShareModule, FactoryModule, UserModule],
  providers: [...lineProviders, crudOptionsProvider],
  exports: [LINE_SERVICE, LINE_REPOSITORY, CRUD_OPTIONS],
});

@Module({
  imports: [ShareModule, FactoryModule, UserModule, LineCrudModule],
  controllers: [LineRpcHttpController, LineCrudController],
  providers: [
    ...lineProviders,
    crudOptionsProvider, // Add the CRUD_OPTIONS provider directly to the module
  ],
  exports: [LINE_SERVICE, LINE_REPOSITORY],
})
export class LineModule {}
