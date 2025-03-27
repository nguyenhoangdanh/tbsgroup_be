import { Module } from '@nestjs/common';
import { ShareModule } from 'src/share/module';
import { GroupHttpController, GroupRpcHttpController } from './group-http.controller';
import { GROUP_REPOSITORY, GROUP_SERVICE } from './group.di-token';
import { GroupPrismaRepository } from './group-prisma.repo';
import { GroupService } from './group.service';

@Module({
  imports: [ShareModule],
  controllers: [GroupHttpController, GroupRpcHttpController],
  providers: [
    {
      provide: GROUP_REPOSITORY,
      useClass: GroupPrismaRepository,
    },
    {
      provide: GROUP_SERVICE,
      useClass: GroupService,
    },
  ],
  exports: [GROUP_REPOSITORY, GROUP_SERVICE],
})
export class GroupModule {}