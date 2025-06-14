import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RemoteAuthGuard } from 'src/share/guard';
import { ProductionReportService } from '../services/production-report.service';
import { getErrorMessage, logError } from 'src/share/utils/error.helper';

@Controller('api/reports/production')
@ApiTags('Production-Reports')
@UseGuards(RemoteAuthGuard)
export class ProductionReportController {
  private readonly logger = new Logger(ProductionReportController.name);

  constructor(
    private readonly productionReportService: ProductionReportService,
  ) {}

  @Get('factory/:factoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get production statistics by factory' })
  @ApiParam({
    name: 'factoryId',
    description: 'ID of the factory',
    type: 'string',
    schema: { format: 'uuid' },
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Start date in YYYY-MM-DD format',
    type: 'string',
    required: true,
  })
  @ApiQuery({
    name: 'endDate',
    description: 'End date in YYYY-MM-DD format',
    type: 'string',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Factory production statistics',
  })
  async getFactoryStats(
    @Param('factoryId') factoryId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const stats = await this.productionReportService.getFactoryStats(
        factoryId,
        start,
        end,
      );

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      logError(this.logger, 'Error getting factory stats', error);
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  @Get('line/:lineId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get production statistics by line' })
  @ApiParam({
    name: 'lineId',
    description: 'ID of the production line',
    type: 'string',
    schema: { format: 'uuid' },
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Start date in YYYY-MM-DD format',
    type: 'string',
    required: true,
  })
  @ApiQuery({
    name: 'endDate',
    description: 'End date in YYYY-MM-DD format',
    type: 'string',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Line production statistics',
  })
  async getLineStats(
    @Param('lineId') lineId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const stats = await this.productionReportService.getLineStats(
        lineId,
        start,
        end,
      );

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      logError(this.logger, 'Error getting line stats', error);
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  @Get('team/:teamId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get production statistics by team' })
  @ApiParam({
    name: 'teamId',
    description: 'ID of the team',
    type: 'string',
    schema: { format: 'uuid' },
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Start date in YYYY-MM-DD format',
    type: 'string',
    required: true,
  })
  @ApiQuery({
    name: 'endDate',
    description: 'End date in YYYY-MM-DD format',
    type: 'string',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Team production statistics',
  })
  async getTeamStats(
    @Param('teamId') teamId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const stats = await this.productionReportService.getTeamStats(
        teamId,
        start,
        end,
      );

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      logError(this.logger, 'Error getting team stats', error);
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  @Get('group/:groupId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get production statistics by group' })
  @ApiParam({
    name: 'groupId',
    description: 'ID of the group',
    type: 'string',
    schema: { format: 'uuid' },
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Start date in YYYY-MM-DD format',
    type: 'string',
    required: true,
  })
  @ApiQuery({
    name: 'endDate',
    description: 'End date in YYYY-MM-DD format',
    type: 'string',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Group production statistics',
  })
  async getGroupStats(
    @Param('groupId') groupId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const stats = await this.productionReportService.getGroupStats(
        groupId,
        start,
        end,
      );

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      logError(this.logger, 'Error getting group stats', error);
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get real-time dashboard statistics' })
  @ApiQuery({
    name: 'factoryId',
    description: 'Optional factory ID to filter data',
    type: 'string',
    schema: { format: 'uuid' },
    required: false,
  })
  @ApiQuery({
    name: 'lineId',
    description: 'Optional line ID to filter data',
    type: 'string',
    schema: { format: 'uuid' },
    required: false,
  })
  @ApiQuery({
    name: 'teamId',
    description: 'Optional team ID to filter data',
    type: 'string',
    schema: { format: 'uuid' },
    required: false,
  })
  @ApiQuery({
    name: 'groupId',
    description: 'Optional group ID to filter data',
    type: 'string',
    schema: { format: 'uuid' },
    required: false,
  })
  @ApiQuery({
    name: 'date',
    description: 'Optional date in YYYY-MM-DD format (defaults to today)',
    type: 'string',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics',
  })
  async getDashboardStats(
    @Query('factoryId') factoryId?: string,
    @Query('lineId') lineId?: string,
    @Query('teamId') teamId?: string,
    @Query('groupId') groupId?: string,
    @Query('date') dateStr?: string,
  ) {
    try {
      const date = dateStr ? new Date(dateStr) : undefined;

      const stats = await this.productionReportService.getDashboardStats({
        factoryId,
        lineId,
        teamId,
        groupId,
        date,
      });

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      logError(this.logger, 'Error getting dashboard stats', error);
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  @Get('compare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Compare production statistics between teams or groups',
  })
  @ApiQuery({
    name: 'entityType',
    description: 'Type of entities to compare (team or group)',
    enum: ['team', 'group'],
    required: true,
  })
  @ApiQuery({
    name: 'entityIds',
    description: 'Comma-separated list of entity IDs to compare',
    type: 'string',
    required: true,
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Start date in YYYY-MM-DD format',
    type: 'string',
    required: true,
  })
  @ApiQuery({
    name: 'endDate',
    description: 'End date in YYYY-MM-DD format',
    type: 'string',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Comparison of production statistics',
  })
  async compareStats(
    @Query('entityType') entityType: 'team' | 'group',
    @Query('entityIds') entityIdsString: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      // Parse entity IDs from comma-separated string
      const entityIds = entityIdsString.split(',');

      if (entityIds.length < 2) {
        return {
          success: false,
          error: 'At least two entities must be provided for comparison',
        };
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      const stats = await this.productionReportService.compareStats(
        entityType,
        entityIds,
        start,
        end,
      );

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      logError(this.logger, `Error comparing ${entityType} stats`, error);
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  @Get('export/:reportType')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Export production statistics to Excel, PDF or CSV',
  })
  @ApiParam({
    name: 'reportType',
    description:
      'Type of report to export (factory, line, team, group, comparison)',
    enum: ['factory', 'line', 'team', 'group', 'comparison'],
    required: true,
  })
  @ApiQuery({
    name: 'format',
    description: 'Export format',
    enum: ['excel', 'pdf', 'csv'],
    required: true,
    type: 'string',
  })
  @ApiQuery({
    name: 'id',
    description: 'ID of the entity (factory, line, team, or group)',
    type: 'string',
    required: false,
  })
  @ApiQuery({
    name: 'entityType',
    description:
      'Only for comparison reports: Type of entities to compare (team or group)',
    enum: ['team', 'group'],
    required: false,
  })
  @ApiQuery({
    name: 'entityIds',
    description:
      'Only for comparison reports: Comma-separated list of entity IDs to compare',
    type: 'string',
    required: false,
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Start date in YYYY-MM-DD format',
    type: 'string',
    required: true,
  })
  @ApiQuery({
    name: 'endDate',
    description: 'End date in YYYY-MM-DD format',
    type: 'string',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'URL to the exported file',
  })
  async exportReport(
    @Param('reportType')
    reportType: 'factory' | 'line' | 'team' | 'group' | 'comparison',
    @Query('format') format: 'excel' | 'pdf' | 'csv',
    @Query('id') id: string,
    @Query('entityType') entityType?: 'team' | 'group',
    @Query('entityIds') entityIdsString?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      if (!startDate || !endDate) {
        return {
          success: false,
          error: 'Start date and end date are required',
        };
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      let fileUrl: string;

      if (reportType === 'comparison') {
        if (!entityType || !entityIdsString) {
          return {
            success: false,
            error:
              'Entity type and entity IDs are required for comparison reports',
          };
        }

        const entityIds = entityIdsString.split(',');

        fileUrl = await this.productionReportService.exportComparisonReport(
          entityType,
          entityIds,
          start,
          end,
          format,
        );
      } else {
        if (!id) {
          return {
            success: false,
            error: 'ID is required for this report type',
          };
        }

        fileUrl = await this.productionReportService.exportReport(
          reportType,
          id,
          start,
          end,
          format,
        );
      }

      return {
        success: true,
        data: { fileUrl },
      };
    } catch (error) {
      logError(this.logger, `Error exporting ${reportType} report`, error);
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }
}
