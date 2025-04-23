// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ZodExceptionFilter } from './lib/zod-exception.filter';
import { setupSwagger } from './common/swagger/swagger.config';
import { AuthExceptionFilter } from './common/exceptions/auth-filter.exception';
import { SwaggerTokenInterceptor } from './common/interceptors/swagger-token.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
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
    ],
    exposedHeaders: ['Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  });
  app.setGlobalPrefix('api/v1');

  // Cấu hình Swagger
  setupSwagger(app);

  // Global filter for ZodError
  app.useGlobalFilters(new ZodExceptionFilter());

  app.useGlobalFilters(new AuthExceptionFilter());

  app.useGlobalInterceptors(new SwaggerTokenInterceptor());

  const port = process.env.PORT ?? 8001;
  await app.listen(process.env.PORT ?? 3000);
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
