import { Inject, Injectable } from '@nestjs/common';
import { AppError } from 'src/share';
import { DIGITAL_FORM_REPOSITORY } from '../digital-form.di-token';
import {
  IDigitalFormRepository,
  IDigitalFormExportService,
} from '../digital-form.port';
import { BaseDigitalFormService } from './digital-form-base.service';

@Injectable()
export class DigitalFormExportService
  extends BaseDigitalFormService
  implements IDigitalFormExportService
{
  constructor(
    @Inject(DIGITAL_FORM_REPOSITORY)
    protected readonly digitalFormRepo: IDigitalFormRepository,
  ) {
    super(digitalFormRepo, DigitalFormExportService.name);
  }

  async exportProductionReport(
    reportType: 'team' | 'group' | 'comparison',
    parameters: any,
    format: 'pdf' | 'excel' | 'csv',
  ): Promise<{ fileUrl: string }> {
    try {
      // Validate parameters
      if (!parameters) {
        throw new Error('Export parameters are required');
      }

      // Create a unique filename with timestamp
      let fileName = '';

      if (reportType === 'team') {
        // Validate team parameters
        if (!parameters.teamId || !parameters.dateFrom || !parameters.dateTo) {
          throw new Error(
            'Missing required parameters for team report: teamId, dateFrom, dateTo',
          );
        }

        // Get team info for filename
        const teamInfo = await this.digitalFormRepo.getTeamInfo(
          parameters.teamId,
        );
        fileName = `team_${teamInfo.code}_${parameters.dateFrom}_${parameters.dateTo}`;
      } else if (reportType === 'group') {
        // Validate group parameters
        if (!parameters.groupId || !parameters.dateFrom || !parameters.dateTo) {
          throw new Error(
            'Missing required parameters for group report: groupId, dateFrom, dateTo',
          );
        }

        // Get group info for filename
        const groupInfo = await this.digitalFormRepo.getGroupInfo(
          parameters.groupId,
        );
        fileName = `group_${groupInfo.code}_${parameters.dateFrom}_${parameters.dateTo}`;
      } else if (reportType === 'comparison') {
        // Validate comparison parameters
        if (
          !parameters.lineId ||
          !parameters.entityIds ||
          !parameters.compareBy ||
          !parameters.dateFrom ||
          !parameters.dateTo
        ) {
          throw new Error('Missing required parameters for comparison report');
        }

        // Get line info for filename
        const lineInfo = await this.digitalFormRepo.getLineInfo(
          parameters.lineId,
        );
        fileName = `comparison_${lineInfo.code}_${parameters.compareBy}_${parameters.dateFrom}_${parameters.dateTo}`;
      } else {
        throw new Error(`Unsupported report type: ${reportType}`);
      }

      // Add timestamp and format extension
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      fileName = `${fileName}_${timestamp}.${format}`;

      // In an actual implementation, this would:
      // 1. Generate the appropriate report
      // 2. Format it according to the requested format (PDF, Excel, CSV)
      // 3. Save it to a file storage system
      // 4. Return the URL to access the file

      // For this example, we're simulating the process
      const simulatedFileUrl = `/exports/${fileName}`;

      this.logger.log(`Generated export: ${fileName} for ${reportType} report`);

      return { fileUrl: simulatedFileUrl };
    } catch (error) {
      this.logger.error(
        `Error exporting production report: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error exporting report: ${error.message}`),
        500,
      );
    }
  }
}
