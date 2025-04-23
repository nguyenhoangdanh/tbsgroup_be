// src/app.module.ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { ShareModule } from './share/module';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './common/redis';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
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
import { DigitalFormModule } from './modules/digital-form/digital-form.module';
import { SwaggerModule } from './common/swagger/swagger.module';
import { SwaggerModelInterceptor } from './common/interceptors/swagger-model.interceptor';
import { SwaggerAuthGuard } from './share/guard/swagger-auth.guard';
import { SwaggerEnhancerMiddleware } from './common/middlewares/swagger-enhancer.middleware';

@Module({
  imports: [
    // Serve static files
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
      exclude: ['/api*'],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
      exclude: ['/api*'],
    }),

    // Config module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env'
          : `.env.${process.env.NODE_ENV || 'development'}`,
    }),

    // Đăng ký module Swagger tùy chỉnh
    SwaggerModule,

    // Core modules
    ShareModule,
    RedisModule,

    // Feature modules
    UserModule,
    RoleModule,
    FactoryModule,
    HandBagModule,
    BagProcessModule,
    GroupModule,
    BagGroupRateModule,
    LineModule,
    TeamModule,
    PermissionModule,
    DigitalFormModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Authentication guards - Sử dụng guard tùy chỉnh cho Swagger
    {
      provide: APP_GUARD,
      useClass: SwaggerAuthGuard,
    },
    // Global filters and interceptors
    {
      provide: APP_FILTER,
      useClass: AppErrorFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SwaggerModelInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply SwaggerEnhancerMiddleware to all routes
    consumer.apply(SwaggerEnhancerMiddleware).forRoutes('*');
  }
}

// import { Module } from '@nestjs/common';
// import { ServeStaticModule } from '@nestjs/serve-static';
// import { join } from 'path';
// import { AppController } from './app.controller';
// import { AppService } from './app.service';
// // import { UploadModule } from './modules/upload/upload.module';
// import { UserModule } from './modules/user/user.module';
// import { ShareModule } from './share/module';
// import { ConfigModule } from '@nestjs/config';
// import { RedisModule } from './common/redis';
// import { APP_FILTER } from '@nestjs/core';
// import { AppErrorFilter } from './common/exceptions/app-error.filter';
// import { RoleModule } from './modules/role/role.module';
// import { FactoryModule } from './modules/factory/factory.module';
// import { HandBagModule } from './modules/handbag/handbag.module';
// import { BagProcessModule } from './modules/handbag/process/bag-process.module';
// import { GroupModule } from './modules/group/group.module';
// import { BagGroupRateModule } from './modules/group/bag-group-rate/bag-group-rate.module';
// import { LineModule } from './modules/line/line.module';
// import { TeamModule } from './modules/team/team.module';
// import { PermissionModule } from './modules/permission/permission.module';
// import { DigitalFormModule } from './modules/digital-form/digital-form.module';
// @Module({
//   imports: [
//     ServeStaticModule.forRoot({
//       rootPath: join(__dirname, '..', 'uploads'),
//       serveRoot: '/uploads',
//     }),

//     // Config module
//     ConfigModule.forRoot({
//       isGlobal: true, // Config khả dụng cho tất cả module
//     }),

//     ShareModule,
//     UserModule,
//     RedisModule,
//     RoleModule,
//     FactoryModule,
//     HandBagModule,
//     BagProcessModule,
//     GroupModule,
//     BagGroupRateModule,
//     LineModule,
//     TeamModule,
//     PermissionModule,
//     DigitalFormModule,
//   ],
//   controllers: [AppController],
//   providers: [
//     AppService,
//     {
//       provide: APP_FILTER,
//       useClass: AppErrorFilter,
//     },
//   ],
// })
// export class AppModule {}
