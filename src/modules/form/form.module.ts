import { Module } from '@nestjs/common';
import { FORM_REPOSITORY, FORM_SERVICE } from './form.id-token';
import { FormRepository } from './form.repository';
import { FormService } from './form.service';
import { FormHttpController } from './form-http.controller';
import { ShareModule } from 'src/share/module';
import { FormSettingsModule } from '../formSettings/form-settings-module';
import {
  FORM_SETTINGS_REPOSITORY,
  FORM_SETTINGS_SERVICE,
} from '../formSettings/form-settings.id-token';
import { FormSettingsRepository } from '../formSettings/form-settings-prisma.repo';
import { FormSettingsService } from '../formSettings/form-settings.service';

const dependencies = [
  { provide: FORM_REPOSITORY, useClass: FormRepository },
  { provide: FORM_SERVICE, useClass: FormService },
  { provide: FORM_SETTINGS_REPOSITORY, useClass: FormSettingsRepository },
  { provide: FORM_SETTINGS_SERVICE, useClass: FormSettingsService },
];

@Module({
  imports: [ShareModule, FormSettingsModule],
  providers: [...dependencies],
  controllers: [FormHttpController],
  exports: [...dependencies],
})
export class FormModule {}
