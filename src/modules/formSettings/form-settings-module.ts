import { Module } from '@nestjs/common';
import { FormSettingsRepository } from './form-settings-prisma.repo';
import {
  FORM_SETTINGS_REPOSITORY,
  FORM_SETTINGS_SERVICE,
} from './form-settings.id-token';
import { FormSettingsService } from './form-settings.service';
import { ShareModule } from 'src/share/module';
import { FormSettingsHttpController } from './form-settings-http-controller';

const dependencies = [
  { provide: FORM_SETTINGS_REPOSITORY, useClass: FormSettingsRepository },
  { provide: FORM_SETTINGS_SERVICE, useClass: FormSettingsService },
];

@Module({
  imports: [ShareModule],
  providers: [...dependencies],
  controllers: [FormSettingsHttpController],
  exports: [FORM_SETTINGS_REPOSITORY],
})
export class FormSettingsModule {}
