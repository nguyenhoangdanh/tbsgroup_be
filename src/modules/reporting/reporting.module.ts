import { Module } from '@nestjs/common';
import { PrismaService } from 'src/share/prisma.service';
import { ProductionReportService } from './services/production-report.service';
import { ProductionReportController } from './controllers/production-report.controller';
import { ReportExportService } from './services/report-export.service';
import { ShareModule } from 'src/share/module';

@Module({
  imports: [ShareModule],
  controllers: [ProductionReportController],
  providers: [PrismaService, ProductionReportService, ReportExportService],
  exports: [ProductionReportService],
})
export class ReportingModule {}
