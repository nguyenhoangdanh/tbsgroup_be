import { Module } from '@nestjs/common';
import { ShareModule } from 'src/share/module';
import {
  DigitalFormHttpController,
  DigitalFormReportsController,
} from './digital-form-http.controller';
import {
  DIGITAL_FORM_REPOSITORY,
  DIGITAL_FORM_SERVICE,
  DIGITAL_FORM_CORE_SERVICE,
  DIGITAL_FORM_ENTRY_SERVICE,
  DIGITAL_FORM_WORKFLOW_SERVICE,
  DIGITAL_FORM_REPORT_SERVICE,
  DIGITAL_FORM_EXPORT_SERVICE,
} from './digital-form.di-token';
import { DigitalFormPrismaRepository } from './digital-form-prisma.repo';
import { DigitalFormService } from './digital-form.service';
import { DigitalFormCoreService } from './services/digital-form-core.service';
import { DigitalFormEntryService } from './services/digital-form-entry.service';
import { DigitalFormWorkflowService } from './services/digital-form-workflow.service';
import { DigitalFormReportService } from './services/digital-form-report.service';
import { DigitalFormExportService } from './services/digital-form-export.service';
import { BaseDigitalFormService } from './services/digital-form-base.service';

@Module({
  imports: [ShareModule],
  controllers: [DigitalFormHttpController, DigitalFormReportsController],
  providers: [
    // Repository
    {
      provide: DIGITAL_FORM_REPOSITORY,
      useClass: DigitalFormPrismaRepository,
    },

    // Specialized services
    {
      provide: DIGITAL_FORM_CORE_SERVICE,
      useClass: DigitalFormCoreService,
    },
    {
      provide: DIGITAL_FORM_ENTRY_SERVICE,
      useClass: DigitalFormEntryService,
    },
    {
      provide: DIGITAL_FORM_WORKFLOW_SERVICE,
      useClass: DigitalFormWorkflowService,
    },
    {
      provide: DIGITAL_FORM_REPORT_SERVICE,
      useClass: DigitalFormReportService,
    },
    {
      provide: DIGITAL_FORM_EXPORT_SERVICE,
      useClass: DigitalFormExportService,
    },

    // Facade service
    {
      provide: DIGITAL_FORM_SERVICE,
      useClass: DigitalFormService,
    },
  ],
  exports: [
    DIGITAL_FORM_REPOSITORY,
    DIGITAL_FORM_SERVICE,
    DIGITAL_FORM_CORE_SERVICE,
    DIGITAL_FORM_ENTRY_SERVICE,
    DIGITAL_FORM_WORKFLOW_SERVICE,
    DIGITAL_FORM_REPORT_SERVICE,
    DIGITAL_FORM_EXPORT_SERVICE,
  ],
})
export class DigitalFormModule {}

// import { Module } from '@nestjs/common';
// import { ShareModule } from 'src/share/module';
// import { DigitalFormHttpController } from './digital-form-http.controller';
// import {
//   DIGITAL_FORM_REPOSITORY,
//   DIGITAL_FORM_SERVICE,
// } from './digital-form.di-token';
// import { DigitalFormPrismaRepository } from './digital-form-prisma.repo';
// import { DigitalFormService } from './digital-form.service';

// @Module({
//   imports: [ShareModule],
//   controllers: [DigitalFormHttpController],
//   providers: [
//     {
//       provide: DIGITAL_FORM_REPOSITORY,
//       useClass: DigitalFormPrismaRepository,
//     },
//     {
//       provide: DIGITAL_FORM_SERVICE,
//       useClass: DigitalFormService,
//     },
//   ],
//   exports: [DIGITAL_FORM_REPOSITORY, DIGITAL_FORM_SERVICE],
// })
// export class DigitalFormModule {}
