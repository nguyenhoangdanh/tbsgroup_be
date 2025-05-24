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
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Tắt bodyParser mặc định để cấu hình thủ công
    bodyParser: false,
  });

  // Cấu hình express body parsers thủ công với giới hạn kích thước lớn hơn
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

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

  // Đăng ký global pipes - Cấu hình lại để xử lý dữ liệu đầu vào tốt hơn
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true, // Bật chuyển đổi ngầm định
        exposeDefaultValues: true,
      },
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
