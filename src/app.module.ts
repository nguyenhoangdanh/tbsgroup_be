import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { UploadModule } from './modules/upload/upload.module';
import { UserModule } from './modules/user/user.module';
import { ShareModule } from './share/module';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './common/redis';
import { APP_FILTER } from '@nestjs/core';
import { AppErrorFilter } from './common/exceptions/app-error.filter';
import { RoleModule } from './modules/role/role.module';
import { FactoryModule } from './modules/factory/factory.module';
import { HandBagModule } from './modules/handbag/handbag.module';
import { BagProcessModule } from './modules/handbag/process/bag-process.module';
import { GroupModule } from './modules/group/group.module';
import { BagGroupRateModule } from './modules/group/bag-group-rate/bag-group-rate.module';
import { LineModule } from './modules/line/line.module';
import { TeamModule } from './modules/team/team.module';
import { PermissionModule } from './modules/permission/permission.module';
@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    // Config module
    ConfigModule.forRoot({
      isGlobal: true, // Config khả dụng cho tất cả module
    }),

    ShareModule,
    UserModule,
    RedisModule,
    RoleModule,
    FactoryModule,
    HandBagModule,
    BagProcessModule,
    GroupModule,
    BagGroupRateModule,
    LineModule,
    TeamModule,
    PermissionModule,
    // UploadModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AppErrorFilter,
    },
  ],
})
export class AppModule {}
