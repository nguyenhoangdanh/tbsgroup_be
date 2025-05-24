import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProductionFormEntry, AttendanceStatus } from '@prisma/client';
import { ProductionGateway } from '../../production/gateways/production.gateway';
import { PrismaService } from 'src/share/prisma.service';
import { UpdateHourlyDataDto } from '../dto/update-hourly-data.dto';
import { CreateIssueDto } from '../dto/create-issue.dto';

@Injectable()
export class FormEntryService {
  constructor(
    private prisma: PrismaService,
    private productionGateway: ProductionGateway,
  ) {}

  /**
   * Find a form entry by ID
   */
  async findOne(id: string): Promise<ProductionFormEntry> {
    const entry = await this.prisma.productionFormEntry.findUnique({
      where: { id },
      include: {
        form: {
          select: {
            id: true,
            formCode: true,
            date: true,
            status: true,
            factoryId: true,
            lineId: true,
            teamId: true,
            groupId: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
          },
        },
        handBag: true,
        bagColor: true,
        process: true,
      },
    });

    if (!entry) {
      throw new NotFoundException(`Form entry with ID ${id} not found`);
    }

    return entry;
  }

  /**
   * Update hourly production data for a form entry
   */
  async updateHourlyData(
    id: string,
    dto: UpdateHourlyDataDto,
  ): Promise<ProductionFormEntry> {
    // Find the form entry
    const entry = await this.prisma.productionFormEntry.findUnique({
      where: { id },
      include: {
        form: true,
      },
    });

    if (!entry) {
      throw new NotFoundException(`Form entry with ID ${id} not found`);
    }

    // Check if the form is in a state that allows updates
    if (entry.form.status === 'CONFIRMED') {
      throw new BadRequestException(
        'Cannot update hourly data for a confirmed form',
      );
    }

    // Validate the hour (1-12, representing hours in a shift)
    if (dto.hour < 1 || dto.hour > 12) {
      throw new BadRequestException('Hour must be between 1 and 12');
    }

    // Get current hourly data
    const currentData = entry.hourlyData as Record<string, any>;

    // Update hourly data for the specific hour
    const updatedHourlyData = {
      ...currentData,
      [dto.hour.toString()]: {
        output: dto.output,
        qualityIssues: dto.qualityIssues || 0,
        notes: dto.notes || '',
      },
    };

    // Calculate total output
    const totalOutput = Object.values(updatedHourlyData).reduce(
      (sum, hourData: any) => sum + (hourData.output || 0),
      0,
    );

    // Update attendance status if provided
    const updateData: any = {
      hourlyData: updatedHourlyData,
      totalOutput,
    };

    if (dto.attendanceStatus) {
      updateData.attendanceStatus = dto.attendanceStatus;
    }

    // Update the form entry
    const updatedEntry = await this.prisma.productionFormEntry.update({
      where: { id },
      data: updateData,
      include: {
        form: {
          select: {
            factoryId: true,
            lineId: true,
            teamId: true,
            groupId: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
          },
        },
        handBag: true,
        bagColor: true,
        process: true,
      },
    });

    // Broadcast the update via WebSockets
    this.broadcastProductionUpdate(updatedEntry, dto.hour);

    return updatedEntry;
  }

  /**
   * Add a production issue to a form entry
   */
  async addIssue(
    id: string,
    dto: CreateIssueDto,
  ): Promise<ProductionFormEntry> {
    // Find the form entry
    const entry = await this.prisma.productionFormEntry.findUnique({
      where: { id },
      include: {
        form: true,
      },
    });

    if (!entry) {
      throw new NotFoundException(`Form entry with ID ${id} not found`);
    }

    // Check if the form is in a state that allows updates
    if (entry.form.status === 'CONFIRMED') {
      throw new BadRequestException('Cannot add issues to a confirmed form');
    }

    // Get current issues
    const currentIssues = (entry.issues || []) as any[];

    // Add new issue
    const updatedIssues = [
      ...currentIssues,
      {
        id: Math.random().toString(36).substring(2, 15), // Simple unique ID
        type: dto.type,
        hour: dto.hour,
        impact: dto.impact || 50, // Default impact percentage
        description: dto.description || '',
        createdAt: new Date().toISOString(),
      },
    ];

    // Update the form entry
    const updatedEntry = await this.prisma.productionFormEntry.update({
      where: { id },
      data: {
        issues: updatedIssues,
      },
      include: {
        form: {
          select: {
            factoryId: true,
            lineId: true,
            teamId: true,
            groupId: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
          },
        },
        handBag: true,
        bagColor: true,
        process: true,
      },
    });

    // Broadcast the update via WebSockets
    this.broadcastIssueUpdate(updatedEntry);

    return updatedEntry;
  }

  /**
   * Remove an issue from a form entry
   */
  async removeIssue(id: string, issueId: string): Promise<ProductionFormEntry> {
    // Find the form entry
    const entry = await this.prisma.productionFormEntry.findUnique({
      where: { id },
      include: {
        form: true,
      },
    });

    if (!entry) {
      throw new NotFoundException(`Form entry with ID ${id} not found`);
    }

    // Check if the form is in a state that allows updates
    if (entry.form.status === 'CONFIRMED') {
      throw new BadRequestException(
        'Cannot remove issues from a confirmed form',
      );
    }

    // Get current issues
    const currentIssues = (entry.issues || []) as any[];

    // Remove the issue
    const updatedIssues = currentIssues.filter((issue) => issue.id !== issueId);

    // Check if the issue was found
    if (updatedIssues.length === currentIssues.length) {
      throw new NotFoundException(
        `Issue with ID ${issueId} not found in form entry`,
      );
    }

    // Update the form entry
    const updatedEntry = await this.prisma.productionFormEntry.update({
      where: { id },
      data: {
        issues: updatedIssues,
      },
      include: {
        form: {
          select: {
            factoryId: true,
            lineId: true,
            teamId: true,
            groupId: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
          },
        },
        handBag: true,
        bagColor: true,
        process: true,
      },
    });

    // Broadcast the update via WebSockets
    this.broadcastIssueUpdate(updatedEntry);

    return updatedEntry;
  }

  /**
   * Update attendance status for a form entry
   */
  async updateAttendanceStatus(
    id: string,
    status: AttendanceStatus,
    note?: string,
  ): Promise<ProductionFormEntry> {
    // Find the form entry
    const entry = await this.prisma.productionFormEntry.findUnique({
      where: { id },
      include: {
        form: true,
      },
    });

    if (!entry) {
      throw new NotFoundException(`Form entry with ID ${id} not found`);
    }

    // Check if the form is in a state that allows updates
    if (entry.form.status === 'CONFIRMED') {
      throw new BadRequestException(
        'Cannot update attendance status for a confirmed form',
      );
    }

    // Update the form entry
    const updatedEntry = await this.prisma.productionFormEntry.update({
      where: { id },
      data: {
        attendanceStatus: status,
        attendanceNote: note,
      },
      include: {
        form: {
          select: {
            factoryId: true,
            lineId: true,
            teamId: true,
            groupId: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
          },
        },
        handBag: true,
        bagColor: true,
        process: true,
      },
    });

    // Broadcast the update via WebSockets
    this.broadcastAttendanceUpdate(updatedEntry);

    return updatedEntry;
  }

  /**
   * Broadcast production hourly data update via WebSocket
   */
  private broadcastProductionUpdate(entry: any, hour: number) {
    const { form } = entry;

    // Prepare data for broadcast
    const updateData = {
      entryId: entry.id,
      userId: entry.userId,
      userName: entry.user.fullName,
      employeeId: entry.user.employeeId,
      handBagId: entry.handBagId,
      handBagName: entry.handBag.name,
      colorId: entry.bagColorId,
      colorName: entry.bagColor.colorName,
      processId: entry.processId,
      processName: entry.process.name,
      hour,
      hourlyData: (entry.hourlyData as any)[hour.toString()],
      totalOutput: entry.totalOutput,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all relevant rooms
    this.productionGateway.broadcastProductionUpdate(
      form.factoryId,
      form.lineId,
      form.teamId,
      form.groupId,
      updateData,
    );
  }

  /**
   * Broadcast issue update via WebSocket
   */
  private broadcastIssueUpdate(entry: any) {
    const { form } = entry;

    // Prepare data for broadcast
    const updateData = {
      entryId: entry.id,
      userId: entry.userId,
      userName: entry.user.fullName,
      employeeId: entry.user.employeeId,
      handBagId: entry.handBagId,
      handBagName: entry.handBag.name,
      colorId: entry.bagColorId,
      colorName: entry.bagColor.colorName,
      processId: entry.processId,
      processName: entry.process.name,
      issues: entry.issues,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all relevant rooms
    this.productionGateway.broadcastDashboardUpdate('group', form.groupId, {
      type: 'issueUpdate',
      data: updateData,
    });

    // Also broadcast to upper levels
    this.productionGateway.broadcastDashboardUpdate('team', form.teamId, {
      type: 'issueUpdate',
      data: updateData,
    });

    this.productionGateway.broadcastDashboardUpdate('line', form.lineId, {
      type: 'issueUpdate',
      data: updateData,
    });
  }

  /**
   * Broadcast attendance status update via WebSocket
   */
  private broadcastAttendanceUpdate(entry: any) {
    const { form } = entry;

    // Prepare data for broadcast
    const updateData = {
      entryId: entry.id,
      userId: entry.userId,
      userName: entry.user.fullName,
      employeeId: entry.user.employeeId,
      attendanceStatus: entry.attendanceStatus,
      attendanceNote: entry.attendanceNote,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all relevant rooms
    this.productionGateway.broadcastDashboardUpdate('group', form.groupId, {
      type: 'attendanceUpdate',
      data: updateData,
    });

    // Also broadcast to upper levels
    this.productionGateway.broadcastDashboardUpdate('team', form.teamId, {
      type: 'attendanceUpdate',
      data: updateData,
    });

    this.productionGateway.broadcastDashboardUpdate('line', form.lineId, {
      type: 'attendanceUpdate',
      data: updateData,
    });
  }
}
