// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ZodExceptionFilter } from './lib/zod-exception.filter';
import { setupSwagger } from './common/swagger/swagger.config';
import { AuthExceptionFilter } from './common/exceptions/auth-filter.exception';
import { SwaggerTokenInterceptor } from './common/interceptors/swagger-token.interceptor';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { EnvironmentConfig } from './config/environment.config';

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Đăng ký cookie parser middleware
    app.use(cookieParser());

    // Get environment configuration for CORS setup
    const envConfig = app.get(EnvironmentConfig);
    const corsConfig = envConfig.getCorsConfig();

    // Enable CORS with environment-specific configuration
    app.enableCors(corsConfig);

    // Đảm bảo ứng dụng trust proxy
    app.set('trust proxy', 1);

    // Đặt prefix cho tất cả API
    app.setGlobalPrefix('api/v1');

    // Đăng ký global pipes
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
        transformOptions: {
          enableImplicitConversion: true,
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
    const port = envConfig.port;
    await app.listen(port, '0.0.0.0');

    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Environment: ${envConfig.nodeEnv}`);
    console.log(`Frontend URL: ${envConfig.frontendUrl}`);
    console.log(`Cookie Domain: ${envConfig.cookieDomain || 'not set'}`);
  } catch (error) {
    console.error('Error starting the application:', error);
    process.exit(1);
  }
}

bootstrap();
