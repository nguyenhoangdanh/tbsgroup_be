import { Module, Provider } from '@nestjs/common';
import { ShareModule } from 'src/share/module';
import {
  UserHttpController,
  UserRpcHttpController,
} from './user-http.controller';
import { UserPrismaRepository } from './user-prisma.repo';
import { USER_REPOSITORY, USER_SERVICE } from './user.di-token';
import { UserService } from './user.service';
import { RedisModule } from 'src/common/redis';
import { RoleModule } from '../role/role.module';

const repositories: Provider[] = [
  { provide: USER_REPOSITORY, useClass: UserPrismaRepository },
];

const services: Provider[] = [{ provide: USER_SERVICE, useClass: UserService }];

@Module({
  imports: [ShareModule, RedisModule, RoleModule],
  controllers: [UserHttpController, UserRpcHttpController],
  providers: [...repositories, ...services],
  exports: [USER_SERVICE, USER_REPOSITORY],
})
export class UserModule {}
