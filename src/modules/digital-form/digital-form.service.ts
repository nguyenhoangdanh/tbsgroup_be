import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppError, Requester, UserRole } from 'src/share';
import { v4 as uuidv4 } from 'uuid';
import {
  DigitalFormCreateDTO,
  DigitalFormEntryDTO,
  DigitalFormCondDTO,
  PaginationDTO,
  DigitalFormUpdateDTO,
  DigitalFormSubmitDTO,
} from './digital-form.dto';
import {
  DigitalForm,
  DigitalFormEntry,
  ErrFormNotFound,
  ErrPermissionDenied,
  ErrFormAlreadySubmitted,
  RecordStatus,
  AttendanceStatus,
  ProductionIssueType,
} from './digital-form.model';
import { DIGITAL_FORM_REPOSITORY } from './digital-form.di-token';
import {
  IDigitalFormRepository,
  IDigitalFormService,
} from './digital-form.port';

@Injectable()
export class DigitalFormService implements IDigitalFormService {
  private readonly logger = new Logger(DigitalFormService.name);

  constructor(
    @Inject(DIGITAL_FORM_REPOSITORY)
    private readonly digitalFormRepo: IDigitalFormRepository,
  ) {}

  /**
   * Permission checking utility
   */
  private _checkPermission(
    requester: Requester,
    form: DigitalForm,
    allowAdmins = true,
  ): void {
    const isCreator = form.createdById === requester.sub;
    const isAdmin =
      requester.role === UserRole.ADMIN ||
      requester.role === UserRole.SUPER_ADMIN;

    if (!isCreator && !(allowAdmins && isAdmin)) {
      throw AppError.from(ErrPermissionDenied, 403);
    }
  }

  /**
   * Check if the form is editable (draft status)
   */
  private _checkFormEditable(form: DigitalForm): void {
    if (form.status !== RecordStatus.DRAFT) {
      throw AppError.from(ErrFormAlreadySubmitted, 400);
    }
  }

  /**
   * Validate that form exists, throw consistent error if not
   */
  private async _getAndValidateForm(id: string): Promise<DigitalForm> {
    const form = await this.digitalFormRepo.getDigitalForm(id);
    if (!form) {
      throw AppError.from(ErrFormNotFound, 404);
    }
    return form;
  }

  /**
   * Generate form code
   */
  private async generateFormCode(
    lineId: string,
    date: string,
    shiftType: string,
  ): Promise<string> {
    try {
      // Format: PCD-YYMMDD-LINE-SHIFT
      const dateObj = new Date(date);
      const year = dateObj.getFullYear().toString().slice(-2);
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const day = dateObj.getDate().toString().padStart(2, '0');

      // Get line code from repository
      const lineCode = await this.digitalFormRepo.getLineCode(lineId);

      // Convert shift type to code
      const shiftCode =
        shiftType === 'REGULAR' ? 'R' : shiftType === 'EXTENDED' ? 'E' : 'O';

      return `PCD-${year}${month}${day}-${lineCode}-${shiftCode}`;
    } catch (error) {
      this.logger.error(
        `Error generating form code: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to generate form code: ${error.message}`);
    }
  }

  async createDigitalForm(
    requester: Requester,
    dto: DigitalFormCreateDTO,
  ): Promise<string> {
    try {
      // Check authorization - only team leaders, line managers, admins can create forms
      const allowedRoles = [
        UserRole.TEAM_LEADER,
        UserRole.LINE_MANAGER,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
      ];

      if (!requester.role) {
        throw AppError.from(new Error(' Can not found user role'), 404);
      }

      if (!allowedRoles.includes(requester.role)) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Generate form code
      const formCode = await this.generateFormCode(
        dto.lineId,
        dto.date,
        dto.shiftType,
      );

      // Create new form
      const newId = uuidv4();
      const newForm: DigitalForm = {
        id: newId,
        formCode,
        formName: dto.formName || `Phiếu công đoạn ${formCode}`,
        description: dto.description || null,
        date: new Date(dto.date),
        shiftType: dto.shiftType,
        lineId: dto.lineId,
        status: RecordStatus.DRAFT,
        createdById: requester.sub,
        createdAt: new Date(),
        updatedById: requester.sub,
        updatedAt: new Date(),
        submitTime: null,
        approvalRequestId: null,
        approvedAt: null,
        isExported: false,
        syncStatus: null,
      };

      await this.digitalFormRepo.insertDigitalForm(newForm);
      this.logger.log(`New digital form created: ${formCode} (${newId})`);

      return newId;
    } catch (error) {
      this.logger.error(
        `Error during digital form creation: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error creating digital form: ${error.message}`),
        400,
      );
    }
  }

  async getDigitalForm(id: string): Promise<DigitalForm> {
    try {
      const form = await this._getAndValidateForm(id);
      return form;
    } catch (error) {
      this.logger.error(
        `Error getting digital form ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error getting digital form: ${error.message}`),
        400,
      );
    }
  }

  async getDigitalFormWithEntries(id: string): Promise<{
    form: DigitalForm;
    entries: DigitalFormEntry[];
  }> {
    try {
      const form = await this._getAndValidateForm(id);
      const entries = await this.digitalFormRepo.listDigitalFormEntries(id);

      return {
        form,
        entries,
      };
    } catch (error) {
      this.logger.error(
        `Error getting digital form with entries ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error getting digital form with entries: ${error.message}`),
        400,
      );
    }
  }

  async updateDigitalForm(
    requester: Requester,
    id: string,
    dto: DigitalFormUpdateDTO,
  ): Promise<void> {
    try {
      const form = await this._getAndValidateForm(id);

      // Check permissions
      this._checkPermission(requester, form);

      // Check if form is editable
      this._checkFormEditable(form);

      // Update form
      await this.digitalFormRepo.updateDigitalForm(id, {
        ...dto,
        updatedById: requester.sub,
        updatedAt: new Date(),
      });

      this.logger.log(`Digital form updated: ${id} by ${requester.sub}`);
    } catch (error) {
      this.logger.error(
        `Error updating digital form ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error updating digital form: ${error.message}`),
        400,
      );
    }
  }

  async deleteDigitalForm(requester: Requester, id: string): Promise<void> {
    try {
      const form = await this._getAndValidateForm(id);

      // Check permissions
      this._checkPermission(requester, form);

      // Check if form is editable
      this._checkFormEditable(form);

      // Delete form (will cascade delete entries in the repository)
      await this.digitalFormRepo.deleteDigitalForm(id);

      this.logger.log(`Digital form deleted: ${id} by ${requester.sub}`);
    } catch (error) {
      this.logger.error(
        `Error deleting digital form ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error deleting digital form: ${error.message}`),
        400,
      );
    }
  }

  async listDigitalForms(
    conditions: DigitalFormCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: DigitalForm[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const { data, total } = await this.digitalFormRepo.listDigitalForms(
        conditions,
        pagination,
      );

      return {
        data,
        total,
        page: pagination.page,
        limit: pagination.limit,
      };
    } catch (error) {
      this.logger.error(
        `Error listing digital forms: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error listing digital forms: ${error.message}`),
        400,
      );
    }
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
      this._checkFormEditable(form);

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
        qualityScore: dto.qualityScore,
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
      this._checkFormEditable(form);

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

  async submitDigitalForm(
    requester: Requester,
    id: string,
    dto: DigitalFormSubmitDTO,
  ): Promise<void> {
    try {
      const form = await this._getAndValidateForm(id);

      // Check permissions
      this._checkPermission(requester, form);

      // Check if form is editable
      this._checkFormEditable(form);

      // Check if form has entries
      const entries = await this.digitalFormRepo.listDigitalFormEntries(id);
      if (entries.length === 0) {
        throw AppError.from(
          new Error('Cannot submit form without entries'),
          400,
        );
      }

      // Update form status to PENDING
      await this.digitalFormRepo.updateDigitalForm(id, {
        status: RecordStatus.PENDING,
        submitTime: new Date(),
        updatedById: requester.sub,
        updatedAt: new Date(),
        approvalRequestId: dto.approvalRequestId || null,
      });

      this.logger.log(`Digital form submitted: ${id} by ${requester.sub}`);
    } catch (error) {
      this.logger.error(
        `Error submitting digital form ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error submitting digital form: ${error.message}`),
        400,
      );
    }
  }

  async approveDigitalForm(requester: Requester, id: string): Promise<void> {
    try {
      const form = await this._getAndValidateForm(id);

      // Only admin can approve forms
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Check if form is pending
      if (form.status !== RecordStatus.PENDING) {
        throw AppError.from(
          new Error('Only pending forms can be approved'),
          400,
        );
      }

      // Update form status to CONFIRMED
      await this.digitalFormRepo.updateDigitalForm(id, {
        status: RecordStatus.CONFIRMED,
        approvedAt: new Date(),
        updatedById: requester.sub,
        updatedAt: new Date(),
      });

      this.logger.log(`Digital form approved: ${id} by ${requester.sub}`);
    } catch (error) {
      this.logger.error(
        `Error approving digital form ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error approving digital form: ${error.message}`),
        400,
      );
    }
  }

  async rejectDigitalForm(requester: Requester, id: string): Promise<void> {
    try {
      const form = await this._getAndValidateForm(id);

      // Only admin can reject forms
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Check if form is pending
      if (form.status !== RecordStatus.PENDING) {
        throw AppError.from(
          new Error('Only pending forms can be rejected'),
          400,
        );
      }

      // Update form status to REJECTED
      await this.digitalFormRepo.updateDigitalForm(id, {
        status: RecordStatus.REJECTED,
        updatedById: requester.sub,
        updatedAt: new Date(),
      });

      this.logger.log(`Digital form rejected: ${id} by ${requester.sub}`);
    } catch (error) {
      this.logger.error(
        `Error rejecting digital form ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Error rejecting digital form: ${error.message}`),
        400,
      );
    }
  }
}
