import { Module } from '@nestjs/common';
import { ShareModule } from 'src/share/module';
import { TeamRpcHttpController } from './team-rpc-http.controller';
import { TeamPrismaRepository } from './team-prisma.repository';
import { TeamService } from './team.service';
import { TEAM_REPOSITORY, TEAM_SERVICE } from './team.di-token';
import { LineModule } from '../line/line.module';
import { UserModule } from '../user/user.module';
import { CRUD_OPTIONS } from 'src/CrudModule/crud.decorator';
import { TeamCrudController } from './team-http.controller';

@Module({
  imports: [
    ShareModule,
    LineModule, // Make sure LineModule is properly imported
    UserModule,
  ],
  controllers: [TeamRpcHttpController, TeamCrudController],
  providers: [
    {
      provide: TEAM_SERVICE,
      useClass: TeamService,
    },
    {
      provide: TEAM_REPOSITORY,
      useClass: TeamPrismaRepository,
    },
    {
      provide: CRUD_OPTIONS,
      useValue: {
        endpoints: {
          getAll: true,
          getOne: true,
          create: true,
          update: true,
          delete: true,
        },
        model: 'Team', // Change to string to match the pattern in other modules
        createDto: 'TeamCreateDTO', // Change to string
        updateDto: 'TeamUpdateDTO', // Change to string
        conditionDto: 'TeamCondDTO', // Change to string
        path: 'teams',
      },
    },
  ],
  exports: [TEAM_SERVICE, TEAM_REPOSITORY],
})
export class TeamModule {}
