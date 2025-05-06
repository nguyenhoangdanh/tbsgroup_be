// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ZodExceptionFilter } from './lib/zod-exception.filter';
import { setupSwagger } from './common/swagger/swagger.config';
import { AuthExceptionFilter } from './common/exceptions/auth-filter.exception';
import { SwaggerTokenInterceptor } from './common/interceptors/swagger-token.interceptor';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Đăng ký cookie parser middleware
  app.use(cookieParser());

  // Cấu hình CORS
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://nmtxts-daily-performance.vercel.app',
    ],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Requested-With',
      'Accept',
      'x-from-swagger',
    ],
    exposedHeaders: ['Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  });

  // Đảm bảo ứng dụng trust proxy
  app.set('trust proxy', 1);

  // Đặt prefix cho tất cả API
  app.setGlobalPrefix('api/v1');

  // Thêm thư mục tĩnh cho custom CSS (nếu cần)
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Đăng ký global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Đăng ký global filters
  app.useGlobalFilters(new ZodExceptionFilter(), new AuthExceptionFilter());

  // Đăng ký global interceptors
  app.useGlobalInterceptors(new SwaggerTokenInterceptor());

  // Cấu hình Swagger
  setupSwagger(app);

  // Khởi động server
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Application running on: http://localhost:${port}`);
  console.log(
    `Swagger documentation available at: http://localhost:${port}/api-docs`,
  );
}

bootstrap();
// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import cookieParser from 'cookie-parser';
// import { ZodExceptionFilter } from './lib/zod-exception.filter';
// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   app.use(cookieParser());
//   app.enableCors({
//     origin: [
//       'http://localhost:3000',
//       'https://nmtxts-daily-performance.vercel.app',
//     ],
//     credentials: true, // Cho phép gửi cookies hoặc token qua request
//     allowedHeaders: [
//       'Content-Type',
//       'Authorization',
//       'X-CSRF-Token',
//       'X-Requested-With',
//       'Accept',
//     ],
//     exposedHeaders: ['Authorization'], // ⚠️ Phải thêm dòng này để client đọc được
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
//   });
//   app.setGlobalPrefix('api/v1');
//   // Global filter cho ZodError
//   app.useGlobalFilters(new ZodExceptionFilter());
//   await app.listen(process.env.PORT ?? 3000);
// }
// bootstrap();
