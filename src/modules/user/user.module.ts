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
import { ROLE_REPOSITORY, ROLE_SERVICE } from '../role/role.di-token';
import { RoleService } from '../role/role.service';
import { RolePrismaRepository } from '../role/role-prisma.repo';

const repositories: Provider[] = [
  { provide: USER_REPOSITORY, useClass: UserPrismaRepository },
  { provide: ROLE_REPOSITORY, useClass: RolePrismaRepository },
];

const services: Provider[] = [
  { provide: USER_SERVICE, useClass: UserService },
  { provide: ROLE_SERVICE, useClass: RoleService },
];

@Module({
  imports: [ShareModule, RedisModule],
  controllers: [UserHttpController, UserRpcHttpController],
  providers: [...repositories, ...services],
  exports: [USER_SERVICE, USER_REPOSITORY],
})
export class UserModule {}
