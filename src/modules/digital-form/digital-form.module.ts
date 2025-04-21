import { Module } from '@nestjs/common';
import { ShareModule } from 'src/share/module';
import { DigitalFormHttpController } from './digital-form-http.controller';
import {
  DIGITAL_FORM_REPOSITORY,
  DIGITAL_FORM_SERVICE,
} from './digital-form.di-token';
import { DigitalFormPrismaRepository } from './digital-form-prisma.repo';
import { DigitalFormService } from './digital-form.service';

@Module({
  imports: [ShareModule],
  controllers: [DigitalFormHttpController],
  providers: [
    {
      provide: DIGITAL_FORM_REPOSITORY,
      useClass: DigitalFormPrismaRepository,
    },
    {
      provide: DIGITAL_FORM_SERVICE,
      useClass: DigitalFormService,
    },
  ],
  exports: [DIGITAL_FORM_REPOSITORY, DIGITAL_FORM_SERVICE],
})
export class DigitalFormModule {}
