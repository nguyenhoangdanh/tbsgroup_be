import { Module, Provider } from '@nestjs/common';
import { ShareModule } from 'src/share/module';
import { LINE_REPOSITORY } from '../line/line.di-token';
import { LinePrismaRepository } from '../line/line-prisma.repo';
import { TEAM_REPOSITORY, TEAM_SERVICE } from './team.di-token';
import { TeamPrismaRepository } from './team-prisma.repo';
import { TeamService } from './team.service';
import { TeamHttpController } from './team-http.controller';

const repositories: Provider[] = [
  { provide: LINE_REPOSITORY, useClass: LinePrismaRepository },
  { provide: TEAM_REPOSITORY, useClass: TeamPrismaRepository },
];

const services: Provider[] = [{ provide: TEAM_SERVICE, useClass: TeamService }];

@Module({
  imports: [ShareModule],
  controllers: [TeamHttpController],
  providers: [...repositories, ...services],
})
export class TeamModule {}
