import { Inject, Injectable } from '@nestjs/common';
import { AppError, Requester } from 'src/share';
import { v4 as uuidv4 } from 'uuid';
import { DigitalFormEntryDTO } from '../digital-form.dto';
import {
  AttendanceStatus,
  DigitalFormEntry,
  ProductionIssueType,
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
