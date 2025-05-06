import { Injectable, Logger } from '@nestjs/common';
import {
  DigitalProductionForm as PrismaDigitalForm,
  ProductionFormEntry as PrismaFormEntry,
  // Line as PrismaLine,
  RecordStatus as PrismaRecordStatus,
  AttendanceStatus as PrismaAttendanceStatus,
  ShiftType as PrismaShiftType,
  Prisma,
} from '@prisma/client';
import prisma from 'src/share/components/prisma';
import { DigitalFormCondDTO, PaginationDTO } from './digital-form.dto';
import {
  AttendanceStatus,
  DigitalForm,
  DigitalFormEntry,
  ProductionIssue,
  ProductionIssueType,
  RecordStatus,
  ShiftType,
} from './digital-form.model';
import { IDigitalFormRepository } from './digital-form.port';
import { User } from '../user/user.model';
import { BagColor, HandBag } from '../handbag/handbag.model';
import { BagProcess } from '../handbag/process/bag-process.model';

@Injectable()
export class DigitalFormPrismaRepository implements IDigitalFormRepository {
  private readonly logger = new Logger(DigitalFormPrismaRepository.name);

  // ========== Type Mapping Utils ==========

  /**
   * Map between application types and Prisma types
   * This centralizes the mapping logic in one place
   */
  private readonly typeMap = {
    shiftType: {
      fromDb: {
        [PrismaShiftType.REGULAR]: ShiftType.REGULAR,
        [PrismaShiftType.EXTENDED]: ShiftType.EXTENDED,
        [PrismaShiftType.OVERTIME]: ShiftType.OVERTIME,
      },
      toDb: {
        [ShiftType.REGULAR]: PrismaShiftType.REGULAR,
        [ShiftType.EXTENDED]: PrismaShiftType.EXTENDED,
        [ShiftType.OVERTIME]: PrismaShiftType.OVERTIME,
      },
    },
    recordStatus: {
      fromDb: {
        [PrismaRecordStatus.DRAFT]: RecordStatus.DRAFT,
        [PrismaRecordStatus.PENDING]: RecordStatus.PENDING,
        [PrismaRecordStatus.CONFIRMED]: RecordStatus.CONFIRMED,
        [PrismaRecordStatus.REJECTED]: RecordStatus.REJECTED,
      },
      toDb: {
        [RecordStatus.DRAFT]: PrismaRecordStatus.DRAFT,
        [RecordStatus.PENDING]: PrismaRecordStatus.PENDING,
        [RecordStatus.CONFIRMED]: PrismaRecordStatus.CONFIRMED,
        [RecordStatus.REJECTED]: PrismaRecordStatus.REJECTED,
      },
    },
    attendanceStatus: {
      fromDb: {
        [PrismaAttendanceStatus.PRESENT]: AttendanceStatus.PRESENT,
        [PrismaAttendanceStatus.ABSENT]: AttendanceStatus.ABSENT,
        [PrismaAttendanceStatus.LATE]: AttendanceStatus.LATE,
        [PrismaAttendanceStatus.EARLY_LEAVE]: AttendanceStatus.EARLY_LEAVE,
        [PrismaAttendanceStatus.LEAVE_APPROVED]:
          AttendanceStatus.LEAVE_APPROVED,
      },
      toDb: {
        [AttendanceStatus.PRESENT]: PrismaAttendanceStatus.PRESENT,
        [AttendanceStatus.ABSENT]: PrismaAttendanceStatus.ABSENT,
        [AttendanceStatus.LATE]: PrismaAttendanceStatus.LATE,
        [AttendanceStatus.EARLY_LEAVE]: PrismaAttendanceStatus.EARLY_LEAVE,
        [AttendanceStatus.LEAVE_APPROVED]:
          PrismaAttendanceStatus.LEAVE_APPROVED,
      },
    },
  };

  /**
   * Map Prisma types to application types
   */
  private _mapShiftType(shiftType: PrismaShiftType): ShiftType {
    return this.typeMap.shiftType.fromDb[shiftType] || ShiftType.REGULAR;
  }

  private _mapRecordStatus(status: PrismaRecordStatus): RecordStatus {
    return this.typeMap.recordStatus.fromDb[status] || RecordStatus.DRAFT;
  }

  private _mapAttendanceStatus(
    status: PrismaAttendanceStatus,
  ): AttendanceStatus {
    return (
      this.typeMap.attendanceStatus.fromDb[status] || AttendanceStatus.PRESENT
    );
  }

  /**
   * Map application types to Prisma types
   */
  private _mapToDbShiftType(shiftType: ShiftType): PrismaShiftType {
    return this.typeMap.shiftType.toDb[shiftType] || PrismaShiftType.REGULAR;
  }

  private _mapToDbRecordStatus(status: RecordStatus): PrismaRecordStatus {
    return this.typeMap.recordStatus.toDb[status] || PrismaRecordStatus.DRAFT;
  }

  private _mapToDbAttendanceStatus(
    status: AttendanceStatus,
  ): PrismaAttendanceStatus {
    return (
      this.typeMap.attendanceStatus.toDb[status] ||
      PrismaAttendanceStatus.PRESENT
    );
  }

  /**
   * Safely convert to Prisma.JsonValue
   */
  /**
   * Correctly convert values for Prisma JSON fields
   * This handles the different Prisma JSON types based on the context
   */
  /**
   * Correctly convert values for Prisma JSON fields
   * This handles the different Prisma JSON types based on the context
   */
  private _toJsonValue(
    value: any,
  ): Prisma.InputJsonValue | Prisma.NullTypes.JsonNull {
    // Handle null/undefined case
    if (value === undefined || value === null) {
      return Prisma.JsonNull;
    }

    // Handle empty objects or arrays
    if (
      (typeof value === 'object' && Object.keys(value).length === 0) ||
      (Array.isArray(value) && value.length === 0)
    ) {
      return Prisma.JsonNull;
    }

    // For arrays and objects, use direct conversion
    if (typeof value === 'object') {
      // For objects and arrays, they're already valid JSON values
      // We just need to ensure they're properly serializable
      try {
        // Test if the value is JSON serializable
        JSON.stringify(value);
        return value as Prisma.InputJsonValue;
      } catch (e) {
        this.logger.warn(`Value is not JSON serializable: ${e.message}`);
        return Prisma.JsonNull;
      }
    }

    // For primitive values, return them directly if they're valid JSON primitives
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value as Prisma.InputJsonValue;
    }

    // If we get here, it's a type we can't handle
    this.logger.warn(`Unsupported value type for JSON: ${typeof value}`);
    return Prisma.JsonNull;
  }

  /**
   * Convert DB model to Domain model
   */
  private _toDigitalFormModel(data: PrismaDigitalForm): DigitalForm {
    return {
      id: data.id,
      formCode: data.formCode,
      formName: data.formName,
      description: data.description,
      date: new Date(data.date),
      shiftType: this._mapShiftType(data.shiftType),
      factoryId: data.factoryId,
      lineId: data.lineId,
      teamId: data.teamId,
      groupId: data.groupId,
      status: this._mapRecordStatus(data.status),
      createdById: data.createdById,
      createdAt: new Date(data.createdAt),
      updatedById: data.updatedById,
      updatedAt: new Date(data.updatedAt),
      submitTime: data.submitTime ? new Date(data.submitTime) : null,
      approvalRequestId: data.approvalRequestId,
      approvedAt: data.approvedAt ? new Date(data.approvedAt) : null,
      isExported: data.isExported,
      syncStatus: data.syncStatus,
    };
  }

  /**
   * Convert DB model to Domain model with relations
   * The input parameter type includes the relation properties
   */
  private _toDigitalFormEntryModel(
    data: PrismaFormEntry & {
      user?: any;
      handBag?: any;
      process?: any;
      bagColor?: any;
    },
  ): DigitalFormEntry & {
    user?: User;
    handBag?: HandBag;
    process?: BagProcess;
    bagColor?: BagColor;
  } {
    // Safely parse hourlyData from JSON
    let hourlyData: Record<string, number> = {};
    try {
      hourlyData = (data.hourlyData as any) || {};
    } catch (e) {
      this.logger.warn(
        `Failed to parse hourlyData for entry ${data.id}: ${e.message}`,
      );
    }

    // Safely parse issues from JSON
    let issues: ProductionIssue[] | undefined = undefined;
    try {
      if (data.issues) {
        const rawIssues = data.issues as any;
        if (Array.isArray(rawIssues)) {
          issues = rawIssues.map((issue) => ({
            type: this._mapProductionIssueType(issue.type), // Use a mapper function
            hour: issue.hour,
            impact: issue.impact,
            description: issue.description,
          }));
        }
      }
    } catch (e) {
      this.logger.warn(
        `Failed to parse issues for entry ${data.id}: ${e.message}`,
      );
    }

    // Create an instance of DigitalFormEntry with relations
    return {
      id: data.id,
      formId: data.formId,
      userId: data.userId,
      handBagId: data.handBagId,
      bagColorId: data.bagColorId,
      processId: data.processId,
      hourlyData,
      totalOutput: data.totalOutput,
      attendanceStatus: this._mapAttendanceStatus(data.attendanceStatus),
      shiftType: this._mapShiftType(data.shiftType),
      checkInTime: data.checkInTime ? new Date(data.checkInTime) : null,
      checkOutTime: data.checkOutTime ? new Date(data.checkOutTime) : null,
      attendanceNote: data.attendanceNote,
      issues,
      qualityScore: data.qualityScore || 100,
      qualityNotes: data.qualityNotes,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),

      // Include related entities if they exist
      user: data.user || undefined,
      handBag: data.handBag || undefined,
      process: data.process || undefined,
      bagColor: data.bagColor || undefined,
    };
  }

  // In digital-form-prisma.repo.ts
  async getTeamCode(teamId: string): Promise<string> {
    try {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { code: true },
      });

      if (!team) {
        throw new Error(`Team not found: ${teamId}`);
      }

      return team.code;
    } catch (error) {
      this.logger.error(
        `Error getting team code for ${teamId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getGroupCode(groupId: string): Promise<string> {
    try {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: { code: true },
      });

      if (!group) {
        throw new Error(`Group not found: ${groupId}`);
      }

      return group.code;
    } catch (error) {
      this.logger.error(
        `Error getting group code for ${groupId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private _mapProductionIssueType(type: any): ProductionIssueType {
    // Handle both string and enum cases to be safe
    if (typeof type === 'string') {
      return (
        ProductionIssueType[type as keyof typeof ProductionIssueType] ||
        ProductionIssueType.OTHER
      );
    }
    return type || ProductionIssueType.OTHER;
  }

  /**
   * Convert search conditions to Prisma where clause
   */
  private _formConditionsToWhereClause(
    conditions: DigitalFormCondDTO,
  ): Prisma.DigitalProductionFormWhereInput {
    const whereClause: Prisma.DigitalProductionFormWhereInput = {};

    if (conditions.lineId) {
      whereClause.lineId = conditions.lineId;
    }

    if (conditions.teamId) {
      whereClause.teamId = conditions.teamId;
    }

    if (conditions.groupId) {
      whereClause.groupId = conditions.groupId;
    }

    if (conditions.createdById) {
      whereClause.createdById = conditions.createdById;
    }

    if (conditions.status) {
      // Map the status to PrismaRecordStatus safely
      try {
        const recordStatus = conditions.status as RecordStatus;
        whereClause.status = this._mapToDbRecordStatus(recordStatus);
      } catch (error) {
        this.logger.warn(`Invalid status value: ${conditions.status}`, error);
        whereClause.status = PrismaRecordStatus.DRAFT;
      }
    }

    if (conditions.shiftType) {
      // Map the shiftType to PrismaShiftType safely
      try {
        const shiftType = conditions.shiftType as ShiftType;
        whereClause.shiftType = this._mapToDbShiftType(shiftType);
      } catch (error) {
        this.logger.warn(
          `Invalid shiftType value: ${conditions.shiftType}`,
          error,
        );
        whereClause.shiftType = PrismaShiftType.REGULAR;
      }
    }

    // Date range filtering
    if (conditions.dateFrom && conditions.dateTo) {
      whereClause.date = {
        gte: new Date(conditions.dateFrom),
        lte: new Date(conditions.dateTo),
      };
    } else if (conditions.dateFrom) {
      whereClause.date = {
        gte: new Date(conditions.dateFrom),
      };
    } else if (conditions.dateTo) {
      whereClause.date = {
        lte: new Date(conditions.dateTo),
      };
    }

    // Search by form code or form name
    if (conditions.search) {
      whereClause.OR = [
        {
          formCode: {
            contains: conditions.search,
            mode: 'insensitive',
          },
        },
        {
          formName: {
            contains: conditions.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return whereClause;
  }

  // ========== Form Methods ==========

  async getDigitalForm(id: string): Promise<DigitalForm | null> {
    try {
      const data = await prisma.digitalProductionForm.findUnique({
        where: { id },
      });

      return data ? this._toDigitalFormModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error fetching digital form ${id}: ${error.message}`,
        error.stack,
      );
      throw error; // Preserve original error for better debugging
    }
  }

  async insertDigitalForm(form: DigitalForm): Promise<void> {
    try {
      await prisma.digitalProductionForm.create({
        data: {
          id: form.id,
          formCode: form.formCode,
          formName: form.formName,
          description: form.description,
          date: form.date,
          shiftType: this._mapToDbShiftType(form.shiftType),
          factoryId: form.factoryId,
          lineId: form.lineId,
          teamId: form.teamId,
          groupId: form.groupId,
          status: this._mapToDbRecordStatus(form.status),
          createdById: form.createdById,
          updatedById: form.updatedById,
          submitTime: form.submitTime,
          approvalRequestId: form.approvalRequestId,
          approvedAt: form.approvedAt,
          isExported: form.isExported,
          syncStatus: form.syncStatus,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error inserting digital form: ${error.message}`,
        error.stack,
      );
      throw error; // Preserve original error
    }
  }

  async updateDigitalForm(
    id: string,
    dto: Partial<DigitalForm>,
  ): Promise<void> {
    try {
      // Filter out undefined values to avoid unintended updates
      const updateData: Prisma.DigitalProductionFormUpdateInput = {};

      if (dto.formName !== undefined) updateData.formName = dto.formName;
      if (dto.description !== undefined)
        updateData.description = dto.description;
      if (dto.date !== undefined) updateData.date = dto.date;
      if (dto.shiftType !== undefined)
        updateData.shiftType = this._mapToDbShiftType(dto.shiftType);
      if (dto.status !== undefined)
        updateData.status = this._mapToDbRecordStatus(dto.status);

      // Handle updatedById properly with relation syntax based on Prisma schema
      if (dto.updatedById !== undefined) {
        if (dto.updatedById === null) {
          updateData.updater = { disconnect: true };
        } else {
          updateData.updater = { connect: { id: dto.updatedById } };
        }
      }

      if (dto.updatedAt !== undefined) updateData.updatedAt = dto.updatedAt;
      if (dto.submitTime !== undefined) updateData.submitTime = dto.submitTime;

      // Handle approvalRequestId properly
      if (dto.approvalRequestId !== undefined) {
        updateData.approvalRequestId = dto.approvalRequestId;
      }

      if (dto.approvedAt !== undefined) updateData.approvedAt = dto.approvedAt;
      if (dto.isExported !== undefined) updateData.isExported = dto.isExported;
      if (dto.syncStatus !== undefined) updateData.syncStatus = dto.syncStatus;

      await prisma.digitalProductionForm.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      this.logger.error(
        `Error updating digital form ${id}: ${error.message}`,
        error.stack,
      );
      throw error; // Preserve original error
    }
  }

  async deleteDigitalForm(id: string): Promise<void> {
    try {
      // Use transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
        // First delete all entries
        await tx.productionFormEntry.deleteMany({
          where: { formId: id },
        });

        // Then delete the form
        await tx.digitalProductionForm.delete({
          where: { id },
        });
      });
    } catch (error) {
      this.logger.error(
        `Error deleting digital form ${id}: ${error.message}`,
        error.stack,
      );
      throw error; // Preserve original error
    }
  }

  async listDigitalForms(
    conditions: DigitalFormCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: DigitalForm[];
    total: number;
  }> {
    try {
      // Validate pagination parameters
      const page = Math.max(1, pagination.page || 1);
      const limit = Math.min(100, Math.max(1, pagination.limit || 10));
      const sortBy = pagination.sortBy || 'createdAt';
      const sortOrder = pagination.sortOrder || 'desc';

      const whereClause = this._formConditionsToWhereClause(conditions);

      // Run count and data queries in parallel for efficiency
      const [total, data] = await Promise.all([
        prisma.digitalProductionForm.count({ where: whereClause }),
        prisma.digitalProductionForm.findMany({
          where: whereClause,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      return {
        data: data.map((item) => this._toDigitalFormModel(item)),
        total,
      };
    } catch (error) {
      this.logger.error(
        `Error listing digital forms: ${error.message}`,
        error.stack,
      );
      throw error; // Preserve original error
    }
  }

  // ========== Form Entry Methods ==========

  async listDigitalFormEntries(formId: string): Promise<DigitalFormEntry[]> {
    try {
      const entries = await prisma.productionFormEntry.findMany({
        where: { formId },
        include: {
          user: true,
          handBag: true,
          process: true,
          bagColor: true,
        },
        orderBy: [{ userId: 'asc' }, { processId: 'asc' }],
      });

      return entries.map((entry) => this._toDigitalFormEntryModel(entry));
    } catch (error) {
      this.logger.error(
        `Error listing form entries for form ${formId}: ${error.message}`,
        error.stack,
      );
      throw error; // Preserve original error
    }
  }

  async findFormEntry(
    formId: string,
    userId: string,
    handBagId: string,
    bagColorId: string,
    processId: string,
  ): Promise<DigitalFormEntry | null> {
    try {
      const entry = await prisma.productionFormEntry.findFirst({
        where: {
          formId,
          userId,
          handBagId,
          bagColorId,
          processId,
        },
      });

      return entry ? this._toDigitalFormEntryModel(entry) : null;
    } catch (error) {
      this.logger.error(
        `Error finding form entry: ${error.message}`,
        error.stack,
      );
      throw error; // Preserve original error
    }
  }

  async insertFormEntry(entry: DigitalFormEntry): Promise<void> {
    try {
      // Safely prepare issues for JSON storage
      let issuesData: Prisma.InputJsonValue | Prisma.NullTypes.JsonNull;
      if (
        entry.issues &&
        Array.isArray(entry.issues) &&
        entry.issues.length > 0
      ) {
        // Convert enum values to strings
        issuesData = entry.issues.map((issue) => ({
          type: ProductionIssueType[issue.type], // Convert enum to string
          hour: issue.hour,
          impact: issue.impact,
          description: issue.description,
        })) as Prisma.InputJsonValue;
      } else {
        // Use JsonNull for empty arrays or null values
        issuesData = Prisma.JsonNull;
      }

      // Prepare hourly data
      let hourlyData: Prisma.InputJsonValue | Prisma.NullTypes.JsonNull;
      if (entry.hourlyData && Object.keys(entry.hourlyData).length > 0) {
        hourlyData = entry.hourlyData as Prisma.InputJsonValue;
      } else {
        hourlyData = Prisma.JsonNull;
      }

      await prisma.productionFormEntry.create({
        data: {
          id: entry.id,
          formId: entry.formId,
          userId: entry.userId,
          handBagId: entry.handBagId,
          bagColorId: entry.bagColorId,
          processId: entry.processId,
          hourlyData: hourlyData,
          totalOutput: entry.totalOutput,
          attendanceStatus: this._mapToDbAttendanceStatus(
            entry.attendanceStatus,
          ),
          checkInTime: entry.checkInTime,
          checkOutTime: entry.checkOutTime,
          attendanceNote: entry.attendanceNote,
          issues: issuesData,
          qualityScore: entry.qualityScore,
          qualityNotes: entry.qualityNotes,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error inserting form entry: ${error.message}`,
        error.stack,
      );
      throw error; // Preserve original error
    }
  }

  async updateFormEntry(
    id: string,
    dto: Partial<DigitalFormEntry>,
  ): Promise<void> {
    try {
      // Filter out undefined values to avoid unintended updates
      const updateData: Prisma.ProductionFormEntryUpdateInput = {};

      // if (dto.hourlyData !== undefined) {
      //   if (Object.keys(dto.hourlyData).length === 0) {
      //     // For empty objects, use JsonNull
      //     updateData.hourlyData = Prisma.JsonNull;
      //   } else {
      //     // For non-empty objects, use explicit type assertion
      //     updateData.hourlyData = dto.hourlyData as Prisma.InputJsonValue;
      //   }
      // }

      if (dto.hourlyData !== undefined) {
        // First, get the current entry to access existing hourlyData
        const currentEntry = await prisma.productionFormEntry.findUnique({
          where: { id },
        });

        if (currentEntry) {
          // Get existing hourly data - ensure it's a valid object or default to empty object
          const existingHourlyData =
            (currentEntry.hourlyData as Record<string, number>) || {};
          // Create a copy to update
          const updatedHourlyData: Record<string, number> = {
            ...existingHourlyData,
          };

          // Only update values for time slots that already exist
          Object.keys(dto.hourlyData || {}).forEach((timeSlot) => {
            if (timeSlot in existingHourlyData && dto.hourlyData) {
              updatedHourlyData[timeSlot] = dto.hourlyData[timeSlot];
            }
          });

          // Use the filtered hourlyData for update
          if (Object.keys(updatedHourlyData).length === 0) {
            // For empty objects, use JsonNull
            updateData.hourlyData = Prisma.JsonNull;
          } else {
            // For non-empty objects, use the filtered data
            updateData.hourlyData = updatedHourlyData as Prisma.InputJsonValue;
          }
        } else {
          // Fallback to original behavior if entry not found
          if (dto.hourlyData && Object.keys(dto.hourlyData).length === 0) {
            updateData.hourlyData = Prisma.JsonNull;
          } else {
            updateData.hourlyData = dto.hourlyData as Prisma.InputJsonValue;
          }
        }
      }

      if (dto.totalOutput !== undefined)
        updateData.totalOutput = dto.totalOutput;
      if (dto.attendanceStatus !== undefined)
        updateData.attendanceStatus = this._mapToDbAttendanceStatus(
          dto.attendanceStatus,
        );
      if (dto.checkInTime !== undefined)
        updateData.checkInTime = dto.checkInTime;
      if (dto.checkOutTime !== undefined)
        updateData.checkOutTime = dto.checkOutTime;
      if (dto.attendanceNote !== undefined)
        updateData.attendanceNote = dto.attendanceNote;

      // Handle issues specially to convert enum values to strings
      if (dto.issues !== undefined) {
        if (dto.issues && Array.isArray(dto.issues) && dto.issues.length > 0) {
          const issuesJson = dto.issues.map((issue) => ({
            type: ProductionIssueType[issue.type], // Convert enum to string
            hour: issue.hour,
            impact: issue.impact,
            description: issue.description,
          }));
          updateData.issues = issuesJson as Prisma.InputJsonValue;
        } else {
          // For empty arrays or null/undefined, use JsonNull
          updateData.issues = Prisma.JsonNull;
        }
      }

      if (dto.qualityScore !== undefined)
        updateData.qualityScore = dto.qualityScore;
      if (dto.qualityNotes !== undefined)
        updateData.qualityNotes = dto.qualityNotes;
      if (dto.updatedAt !== undefined) updateData.updatedAt = dto.updatedAt;

      await prisma.productionFormEntry.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      this.logger.error(
        `Error updating form entry ${id}: ${error.message}`,
        error.stack,
      );
      throw error; // Preserve original error
    }
  }

  async updateEntryShiftType(id: string, shiftType: ShiftType): Promise<void> {
    try {
      // First, get the current entry to access existing hourlyData
      const currentEntry = await prisma.productionFormEntry.findUnique({
        where: { id }
      });
  
      if (!currentEntry) {
        throw new Error(`Form entry not found: ${id}`);
      }
  
      // Map the ShiftType enum to Prisma ShiftType
      const dbShiftType = this._mapToDbShiftType(shiftType);
  
      // Get existing hourly data - ensure it's a valid object or default to empty object
      const existingHourlyData = (currentEntry.hourlyData as Record<string, number>) || {};
      
      // Create a copy to update - we'll rebuild this based on the new shift type
      const updatedHourlyData: Record<string, number> = {};
      
      // Regular shift time slots (standard for all shift types)
      const regularTimeSlots = [
        '07:30-08:30', '08:30-09:30', '09:30-10:30', '10:30-11:30', 
        '12:30-13:30', '13:30-14:30', '14:30-15:30', '15:30-16:30'
      ];
      
      // Extended shift adds these time slots
      const extendedTimeSlots = ['16:30-17:30', '17:30-18:00'];
      
      // Overtime shift adds these time slots
      const overtimeTimeSlots = ['18:00-19:00', '19:00-20:00'];
      
      // First, copy all regular time slots that exist in the current hourlyData
      regularTimeSlots.forEach(timeSlot => {
        if (timeSlot in existingHourlyData) {
          updatedHourlyData[timeSlot] = existingHourlyData[timeSlot];
        } else {
          // Add any missing regular time slots with default value 0
          updatedHourlyData[timeSlot] = 0;
        }
      });
      
      // If extended or overtime shift, add extended time slots
      if (shiftType === ShiftType.EXTENDED || shiftType === ShiftType.OVERTIME) {
        extendedTimeSlots.forEach(timeSlot => {
          // If the time slot already exists, keep its value, otherwise set to 0
          updatedHourlyData[timeSlot] = timeSlot in existingHourlyData 
            ? existingHourlyData[timeSlot] 
            : 0;
        });
      }
      
      // If overtime shift, add overtime time slots
      if (shiftType === ShiftType.OVERTIME) {
        overtimeTimeSlots.forEach(timeSlot => {
          // If the time slot already exists, keep its value, otherwise set to 0
          updatedHourlyData[timeSlot] = timeSlot in existingHourlyData 
            ? existingHourlyData[timeSlot] 
            : 0;
        });
      }
      
      // Update the entry with the new shift type and hourly data
      await prisma.productionFormEntry.update({
        where: { id },
        data: {
          shiftType: dbShiftType,
          hourlyData: updatedHourlyData as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
  
      this.logger.log(`Updated entry ${id} shift type to ${shiftType} with adjusted hourly data`);
    } catch (error) {
      this.logger.error(
        `Error updating entry shift type for ${id}: ${error.message}`,
        error.stack,
      );
      throw error; // Preserve original error
    }
  }

  async deleteFormEntry(id: string): Promise<void> {
    try {
      await prisma.productionFormEntry.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(
        `Error deleting form entry ${id}: ${error.message}`,
        error.stack,
      );
      throw error; // Preserve original error
    }
  }

  // ========== Utility Methods ==========

  async getLineCode(lineId: string): Promise<string> {
    try {
      const line = await prisma.line.findUnique({
        where: { id: lineId },
        select: { code: true },
      });

      if (!line) {
        throw new Error(`Line not found: ${lineId}`);
      }

      return line.code;
    } catch (error) {
      this.logger.error(
        `Error getting line code for ${lineId}: ${error.message}`,
        error.stack,
      );
      throw error; // Preserve original error
    }
  }

  // In digital-form-prisma.repo.ts

  async getTeamInfo(teamId: string): Promise<{
    id: string;
    name: string;
    code: string;
    lineId: string;
    lineName: string;
  }> {
    try {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          line: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!team) {
        throw new Error(`Team not found: ${teamId}`);
      }

      return {
        id: team.id,
        name: team.name,
        code: team.code,
        lineId: team.lineId,
        lineName: team.line.name,
      };
    } catch (error) {
      this.logger.error(
        `Error getting team info for ${teamId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getTeamForms(
    teamId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DigitalForm[]> {
    try {
      // First, get all forms that match the team and date range
      const prismaForms = await prisma.digitalProductionForm.findMany({
        where: {
          teamId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          date: 'asc',
        },
      });

      // Map to domain model
      return prismaForms.map((form) => this._toDigitalFormModel(form));
    } catch (error) {
      this.logger.error(
        `Error getting team forms: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getFormEntriesByFormIds(
    formIds: string[],
  ): Promise<DigitalFormEntry[]> {
    try {
      if (formIds.length === 0) {
        return [];
      }

      const entries = await prisma.productionFormEntry.findMany({
        where: {
          formId: {
            in: formIds,
          },
        },
      });

      return entries.map((entry) => this._toDigitalFormEntryModel(entry));
    } catch (error) {
      this.logger.error(
        `Error getting form entries: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getHandBagDetails(
    handBagIds: string[],
  ): Promise<{ id: string; code: string; name: string }[]> {
    try {
      if (handBagIds.length === 0) {
        return [];
      }

      const bags = await prisma.handBag.findMany({
        where: {
          id: {
            in: handBagIds,
          },
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      });

      return bags;
    } catch (error) {
      this.logger.error(
        `Error getting hand bag details: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getBagProcessDetails(
    processIds: string[],
  ): Promise<{ id: string; code: string; name: string }[]> {
    try {
      if (processIds.length === 0) {
        return [];
      }

      const processes = await prisma.bagProcess.findMany({
        where: {
          id: {
            in: processIds,
          },
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      });

      return processes;
    } catch (error) {
      this.logger.error(
        `Error getting bag process details: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // 2. Add missing method implementation: getTeamGroups
  async getTeamGroups(
    teamId: string,
  ): Promise<{ id: string; name: string; code: string }[]> {
    try {
      const groups = await prisma.group.findMany({
        where: {
          teamId,
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
      });

      return groups;
    } catch (error) {
      this.logger.error(
        `Error getting team groups for ${teamId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // 3. Add missing method implementation: getGroupEntries
  async getGroupEntries(
    groupId: string,
    formIds: string[],
  ): Promise<DigitalFormEntry[]> {
    try {
      if (formIds.length === 0) {
        return [];
      }

      // First, get users in the group
      const groupUsers = await prisma.user.findMany({
        where: {
          groupId,
        },
        select: {
          id: true,
        },
      });

      const userIds = groupUsers.map((user) => user.id);

      if (userIds.length === 0) {
        return [];
      }

      // Then, get entries for these users in the specified forms
      const entries = await prisma.productionFormEntry.findMany({
        where: {
          formId: {
            in: formIds,
          },
          userId: {
            in: userIds,
          },
        },
      });

      return entries.map((entry) => this._toDigitalFormEntryModel(entry));
    } catch (error) {
      this.logger.error(
        `Error getting group entries: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getFactoryCode(factoryId: string): Promise<string> {
    try {
      const factory = await prisma.factory.findUnique({
        where: { id: factoryId },
        select: { code: true },
      });

      if (!factory) {
        throw new Error(`Factory not found: ${factoryId}`);
      }

      return factory.code;
    } catch (error) {
      this.logger.error(
        `Error getting factory code for ${factoryId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getFactoryInfo(factoryId: string): Promise<{
    id: string;
    name: string;
    code: string;
  }> {
    try {
      const factory = await prisma.factory.findUnique({
        where: { id: factoryId },
        select: {
          id: true,
          name: true,
          code: true,
        },
      });
      if (!factory) {
        throw new Error(`Factory not found: ${factoryId}`);
      }
      return factory;
    } catch (error) {
      this.logger.error(
        `Error getting factory info for ${factoryId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getFactoryLines(
    factoryId: string,
  ): Promise<{ id: string; name: string; code: string }[]> {
    try {
      const lines = await prisma.line.findMany({
        where: {
          factoryId,
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
      });

      return lines;
    } catch (error) {
      this.logger.error(
        `Error getting factory lines for ${factoryId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getFactoryForms(
    factoryId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DigitalForm[]> {
    try {
      // Lấy tất cả các forms của factory trong khoảng thời gian
      const prismaForms = await prisma.digitalProductionForm.findMany({
        where: {
          factoryId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          date: 'asc',
        },
      });

      // Map sang domain model
      return prismaForms.map((form) => this._toDigitalFormModel(form));
    } catch (error) {
      this.logger.error(
        `Error getting factory forms: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getLineForms(
    lineId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DigitalForm[]> {
    try {
      // Lấy tất cả các forms của line trong khoảng thời gian
      const prismaForms = await prisma.digitalProductionForm.findMany({
        where: {
          lineId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          date: 'asc',
        },
      });

      // Map sang domain model
      return prismaForms.map((form) => this._toDigitalFormModel(form));
    } catch (error) {
      this.logger.error(
        `Error getting line forms: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getLineFactory(
    lineId: string,
  ): Promise<{ id: string; name: string; code: string }> {
    try {
      const line = await prisma.line.findUnique({
        where: { id: lineId },
        include: {
          factory: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      if (!line || !line.factory) {
        throw new Error(`Factory not found for line: ${lineId}`);
      }

      return line.factory;
    } catch (error) {
      this.logger.error(
        `Error getting line factory for ${lineId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // 4. Add missing method implementation: getGroupInfo
  async getGroupInfo(groupId: string): Promise<{
    id: string;
    name: string;
    code: string;
    teamId: string;
    teamName: string;
    lineId: string;
    lineName: string;
  }> {
    try {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          team: {
            include: {
              line: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!group) {
        throw new Error(`Group not found: ${groupId}`);
      }

      return {
        id: group.id,
        name: group.name,
        code: group.code,
        teamId: group.teamId,
        teamName: group.team.name,
        lineId: group.team.lineId,
        lineName: group.team.line.name,
      };
    } catch (error) {
      this.logger.error(
        `Error getting group info for ${groupId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // 5. Add missing method implementation: getGroupForms
  async getGroupForms(
    groupId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DigitalForm[]> {
    try {
      // Get forms for this group within the date range
      const prismaForms = await prisma.digitalProductionForm.findMany({
        where: {
          groupId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          date: 'asc',
        },
      });

      // Map to domain model
      return prismaForms.map((form) => this._toDigitalFormModel(form));
    } catch (error) {
      this.logger.error(
        `Error getting group forms: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // 6. Add missing method implementation: getGroupWorkers
  async getGroupWorkers(
    groupId: string,
  ): Promise<{ id: string; employeeId: string; fullName: string }[]> {
    try {
      const workers = await prisma.user.findMany({
        where: {
          groupId,
        },
        select: {
          id: true,
          employeeId: true,
          fullName: true,
        },
      });

      return workers;
    } catch (error) {
      this.logger.error(
        `Error getting group workers: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // 7. Add missing method implementation: getWorkerEntries
  async getWorkerEntries(
    userId: string,
    formIds: string[],
  ): Promise<DigitalFormEntry[]> {
    try {
      if (formIds.length === 0) {
        return [];
      }

      const entries = await prisma.productionFormEntry.findMany({
        where: {
          formId: {
            in: formIds,
          },
          userId,
        },
      });

      return entries.map((entry) => this._toDigitalFormEntryModel(entry));
    } catch (error) {
      this.logger.error(
        `Error getting worker entries: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // 8. Add missing method implementation: getLineInfo
  async getLineInfo(
    lineId: string,
  ): Promise<{ id: string; name: string; code: string }> {
    try {
      const line = await prisma.line.findUnique({
        where: { id: lineId },
        select: {
          id: true,
          name: true,
          code: true,
        },
      });

      if (!line) {
        throw new Error(`Line not found: ${lineId}`);
      }

      return line;
    } catch (error) {
      this.logger.error(
        `Error getting line info for ${lineId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // 9. Add missing method implementation: getLineTeams
  async getLineTeams(
    lineId: string,
  ): Promise<{ id: string; name: string; code: string }[]> {
    try {
      const teams = await prisma.team.findMany({
        where: {
          lineId,
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
      });

      return teams;
    } catch (error) {
      this.logger.error(
        `Error getting line teams: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // 10. Add missing method implementation: getLineGroups
  async getLineGroups(lineId: string): Promise<
    {
      id: string;
      name: string;
      code: string;
      teamId: string;
      teamName: string;
    }[]
  > {
    try {
      // First, get all teams in the line
      const teams = await prisma.team.findMany({
        where: {
          lineId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (teams.length === 0) {
        return [];
      }

      const teamIds = teams.map((team) => team.id);

      // Then, get all groups in these teams
      const groups = await prisma.group.findMany({
        where: {
          teamId: {
            in: teamIds,
          },
        },
        select: {
          id: true,
          name: true,
          code: true,
          teamId: true,
        },
      });

      // Build result with team names
      return groups.map((group) => {
        const team = teams.find((t) => t.id === group.teamId);
        return {
          id: group.id,
          name: group.name,
          code: group.code,
          teamId: group.teamId,
          teamName: team ? team.name : 'Unknow',
        };
      });
    } catch (error) {
      this.logger.error(
        `Error getting line groups: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
