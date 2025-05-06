import { Inject, Injectable } from '@nestjs/common';
import { AppError, Requester } from 'src/share';
import { v4 as uuidv4 } from 'uuid';
import { DigitalFormEntryDTO, UpdateFormEntryDTO } from '../digital-form.dto';
import {
  AttendanceStatus,
  DigitalFormEntry,
  ProductionIssueType,
  RecordStatus,
  ShiftType,
} from '../digital-form.model';
import { DIGITAL_FORM_REPOSITORY } from '../digital-form.di-token';
import {
  IDigitalFormRepository,
  IDigitalFormEntryService,
} from '../digital-form.port';
import { BaseDigitalFormService } from './digital-form-base.service';

@Injectable()
export class DigitalFormEntryService
  extends BaseDigitalFormService
  implements IDigitalFormEntryService
{
  constructor(
    @Inject(DIGITAL_FORM_REPOSITORY)
    protected readonly digitalFormRepo: IDigitalFormRepository,
  ) {
    super(digitalFormRepo, DigitalFormEntryService.name);
  }

  async addFormEntry(
    requester: Requester,
    formId: string,
    dto: DigitalFormEntryDTO,
  ): Promise<string> {
    try {
      const form = await this._getAndValidateForm(formId);

      // Check permissions
      this._checkPermission(requester, form);

      // Check if form is editable
      if (form.status !== 'DRAFT') {
        throw AppError.from(new Error('Form is not in draft status'), 400);
      }

      // Check if entry already exists
      const existingEntry = await this.digitalFormRepo.findFormEntry(
        formId,
        dto.userId,
        dto.handBagId,
        dto.bagColorId,
        dto.processId,
      );

      // Convert string attendance status to enum
      const attendanceStatus = dto.attendanceStatus as AttendanceStatus;
      const shiftType = dto.shiftType as ShiftType;

      // Convert issues array if it exists
      const issues = dto.issues
        ? dto.issues.map((issue) => ({
            type: issue.type as ProductionIssueType,
            hour: issue.hour,
            impact: issue.impact,
            description: issue.description,
          }))
        : undefined;

      if (existingEntry) {
        // Update existing entry
        await this.digitalFormRepo.updateFormEntry(existingEntry.id, {
          hourlyData: dto.hourlyData,
          totalOutput: dto.totalOutput,
          attendanceStatus,
          checkInTime: dto.checkInTime ? new Date(dto.checkInTime) : null,
          checkOutTime: dto.checkOutTime ? new Date(dto.checkOutTime) : null,
          attendanceNote: dto.attendanceNote,
          issues,
          qualityScore: dto.qualityScore,
          qualityNotes: dto.qualityNotes,
          updatedAt: new Date(),
        });

        return existingEntry.id;
      }

      // Create new entry
      const newId = uuidv4();
      const newEntry: DigitalFormEntry = {
        id: newId,
        formId,
        userId: dto.userId,
        handBagId: dto.handBagId,
        bagColorId: dto.bagColorId,
        processId: dto.processId,
        hourlyData: dto.hourlyData,
        totalOutput: dto.totalOutput,
        attendanceStatus,
        shiftType,
        checkInTime: dto.checkInTime ? new Date(dto.checkInTime) : null,
        checkOutTime: dto.checkOutTime ? new Date(dto.checkOutTime) : null,
        attendanceNote: dto.attendanceNote || null,
        issues,
        qualityScore: dto.qualityScore || 0,
        qualityNotes: dto.qualityNotes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.digitalFormRepo.insertFormEntry(newEntry);
      this.logger.log(`New form entry created: ${newId}`);

      return newId;
    } catch (error) {
      this.logger.error(
        `Error adding form entry: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error adding form entry: ${error.message}`),
        400,
      );
    }
  }

  async updateEntry(
    requester: Requester,
    formId: string,
    entryId: string,
    dto: UpdateFormEntryDTO,
  ): Promise<void> {
    try {
      const form = await this._getAndValidateForm(formId);

      // Kiểm tra quyền
      this._checkPermission(requester, form);

      // Kiểm tra form có ở trạng thái draft không
      if (form.status !== RecordStatus.DRAFT) {
        throw AppError.from(new Error('Form is not in draft status'), 400);
      }

      // Lấy entry để kiểm tra
      const entries = await this.digitalFormRepo.listDigitalFormEntries(formId);
      const entry = entries.find((e) => e.id === entryId);

      if (!entry) {
        throw AppError.from(new Error(`Entry not found: ${entryId}`), 404);
      }

      // Chuẩn bị dữ liệu cập nhật
      const updateData: Partial<DigitalFormEntry> = {};

      // Cập nhật hourlyData nếu được cung cấp
      if (dto.hourlyData !== undefined) {
        updateData.hourlyData = dto.hourlyData;

        // Tự động tính toán totalOutput từ hourlyData nếu không cung cấp totalOutput
        if (dto.totalOutput === undefined) {
          updateData.totalOutput = Object.values(dto.hourlyData).reduce(
            (sum, value) => sum + value,
            0,
          );
        }
      }

      // Cập nhật các trường khác nếu được cung cấp
      if (dto.totalOutput !== undefined)
        updateData.totalOutput = dto.totalOutput;
      if (dto.attendanceStatus !== undefined) {
        // Chuyển đổi từ chuỗi sang enum
        updateData.attendanceStatus =
          AttendanceStatus[
            dto.attendanceStatus as keyof typeof AttendanceStatus
          ];
      }

      if (dto.checkInTime !== undefined) {
        updateData.checkInTime = dto.checkInTime
          ? new Date(dto.checkInTime)
          : null;
      }

      if (dto.checkOutTime !== undefined) {
        updateData.checkOutTime = dto.checkOutTime
          ? new Date(dto.checkOutTime)
          : null;
      }

      if (dto.attendanceNote !== undefined)
        updateData.attendanceNote = dto.attendanceNote;

      if (dto.issues !== undefined) {
        updateData.issues = dto.issues.map((issue) => ({
          type: ProductionIssueType[
            issue.type as keyof typeof ProductionIssueType
          ],
          hour: issue.hour,
          impact: issue.impact,
          description: issue.description,
        }));
      }

      if (dto.qualityScore !== undefined)
        updateData.qualityScore = dto.qualityScore;
      if (dto.qualityNotes !== undefined)
        updateData.qualityNotes = dto.qualityNotes;

      // Luôn cập nhật thời gian
      updateData.updatedAt = new Date();

      // Cập nhật entry
      await this.digitalFormRepo.updateFormEntry(entryId, updateData);

      this.logger.log(`Updated entry: ${entryId}`);
    } catch (error) {
      this.logger.error(`Error updating entry: ${error.message}`, error.stack);

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error updating entry: ${error.message}`),
        400,
      );
    }
  }

  async updateEntryShiftType(
    requester: Requester,
    formId: string,
    entryId: string,
    shiftType: ShiftType,
  ): Promise<void> {
    try {
      const form = await this._getAndValidateForm(formId);

      // Check permissions
      this._checkPermission(requester, form);

      // Check if form is editable
      if (form.status !== RecordStatus.DRAFT) {
        throw AppError.from(new Error('Form is not in draft status'), 400);
      }

      // Get the entry to verify it exists and belongs to this form
      const entries = await this.digitalFormRepo.listDigitalFormEntries(formId);
      const entry = entries.find((e) => e.id === entryId);

      if (!entry) {
        throw AppError.from(new Error(`Entry not found: ${entryId}`), 404);
      }

      // Update the entry's shift type and adjust hourly data via repository
      await this.digitalFormRepo.updateEntryShiftType(entryId, shiftType);

      this.logger.log(`Updated entry ${entryId} shift type to ${shiftType}`);
    } catch (error) {
      this.logger.error(
        `Error updating entry shift type: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error updating entry shift type: ${error.message}`),
        400,
      );
    }
  }

  async deleteFormEntry(
    requester: Requester,
    formId: string,
    entryId: string,
  ): Promise<void> {
    try {
      const form = await this._getAndValidateForm(formId);

      // Check permissions
      this._checkPermission(requester, form);

      // Check if form is editable
      if (form.status !== 'DRAFT') {
        throw AppError.from(new Error('Form is not in draft status'), 400);
      }

      // Delete entry
      await this.digitalFormRepo.deleteFormEntry(entryId);
      this.logger.log(`Form entry deleted: ${entryId}`);
    } catch (error) {
      this.logger.error(
        `Error deleting form entry: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error deleting form entry: ${error.message}`),
        400,
      );
    }
  }
}
