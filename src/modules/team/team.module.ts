import { Module } from '@nestjs/common';
import { ShareModule } from 'src/share/module';
import { TeamRpcHttpController } from './team-rpc-http.controller';
import { TeamPrismaRepository } from './team-prisma.repository';
import { TeamService } from './team.service';
import { TEAM_REPOSITORY, TEAM_SERVICE } from './team.di-token';
import { LineModule } from '../line/line.module';
import { UserModule } from '../user/user.module';
import { createCrudModule } from 'src/CrudModule/crud.module';
import { Team } from './team.model';
import { TeamCreateDTO, TeamUpdateDTO, TeamCondDTO } from './team.dto';
import { CRUD_OPTIONS } from 'src/CrudModule/crud.decorator';
import { TeamCrudController } from './team-http.controller';

// Define the endpoints configuration
const crudEndpoints = {
  getAll: true,
  getOne: true,
  create: true,
  update: true,
  delete: true
};

// Create the CRUD module with additional providers
const TeamCrudModule = createCrudModule({
  moduleName: 'Team',
  path: 'teams',
  modelType: Team,
  createDtoType: TeamCreateDTO,
  updateDtoType: TeamUpdateDTO,
  filterDtoType: TeamCondDTO,
  serviceClass: TeamService,
  repositoryClass: TeamPrismaRepository,
  serviceToken: TEAM_SERVICE,
  repositoryToken: TEAM_REPOSITORY,
  imports: [ShareModule, LineModule, UserModule],
  providers: [
    {
      provide: CRUD_OPTIONS,
      useValue: {
        endpoints: crudEndpoints,
        model: Team,
        createDto: TeamCreateDTO,
        updateDto: TeamUpdateDTO,
        conditionDto: TeamCondDTO,
        path: 'teams'
      }
    }
  ]
});

@Module({
  imports: [
    ShareModule,
    LineModule,
    UserModule,
    TeamCrudModule,
  ],
  controllers: [
    TeamRpcHttpController,
  ],
  // Add the service provider directly to the module
  providers: [
    {
      provide: TEAM_SERVICE,
      useClass: TeamService
    },
    {
      provide: TEAM_REPOSITORY,
      useClass: TeamPrismaRepository
    }
  ],
  exports: [TEAM_SERVICE, TEAM_REPOSITORY],
})
export class TeamModule {}