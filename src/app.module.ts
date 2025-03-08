import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { UploadModule } from './modules/upload/upload.module';
import { UserModule } from './modules/user/user.module';
import { ShareModule } from './share/module';
@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    ShareModule,
    UserModule,
    // UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
