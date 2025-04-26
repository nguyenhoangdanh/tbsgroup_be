import { Inject, Injectable } from '@nestjs/common';
import { AppError, Requester, UserRole } from 'src/share';
import { v4 as uuidv4 } from 'uuid';
import {
  DigitalFormCreateDTO,
  DigitalFormCondDTO,
  PaginationDTO,
  DigitalFormUpdateDTO,
} from '../digital-form.dto';
import {
  DigitalForm,
  DigitalFormEntry,
  ErrFormAlreadySubmitted,
  RecordStatus,
} from '../digital-form.model';
import { DIGITAL_FORM_REPOSITORY } from '../digital-form.di-token';
import {
  IDigitalFormRepository,
  IDigitalFormCoreService,
} from '../digital-form.port';
import { BaseDigitalFormService } from './digital-form-base.service';

@Injectable()
export class DigitalFormCoreService
  extends BaseDigitalFormService
  implements IDigitalFormCoreService
{
  constructor(
    @Inject(DIGITAL_FORM_REPOSITORY)
    protected readonly digitalFormRepo: IDigitalFormRepository,
  ) {
    super(digitalFormRepo, DigitalFormCoreService.name);
  }

  /**
   * Check if the form is editable (draft status)
   */
  protected _checkFormEditable(form: DigitalForm): void {
    if (form.status !== RecordStatus.DRAFT) {
      throw AppError.from(ErrFormAlreadySubmitted, 400);
    }
  }

  /**
   * Generate form code
   */
  private async generateFormCode(
    factoryId: string,
    lineId: string,
    teamId: string,
    groupId: string,
    date: string,
    shiftType: string,
  ): Promise<string> {
    try {
      // Format: PCD-YYMMDD-LINE-TEAM-GROUP-SHIFT
      const dateObj = new Date(date);
      const year = dateObj.getFullYear().toString().slice(-2);
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const day = dateObj.getDate().toString().padStart(2, '0');

      // Get codes from repository
      const factoryCode = await this.digitalFormRepo.getFactoryCode(factoryId);
      const lineCode = await this.digitalFormRepo.getLineCode(lineId);
      const teamCode = await this.digitalFormRepo.getTeamCode(teamId);
      const groupCode = await this.digitalFormRepo.getGroupCode(groupId);

      // Convert shift type to code
      const shiftCode =
        shiftType === 'REGULAR' ? 'R' : shiftType === 'EXTENDED' ? 'E' : 'O';

      // Add a random suffix to ensure uniqueness
      const randomSuffix = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0');

      return `PCD-${year}${month}${day}-${factoryCode}-${lineCode}-${teamCode}-${groupCode}-${shiftCode}-${randomSuffix}`;
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
        throw AppError.from(new Error('Cannot found user role'), 404);
      }

      if (!allowedRoles.includes(requester.role)) {
        throw AppError.from(ErrFormAlreadySubmitted, 403);
      }

      // Generate form code
      const formCode = await this.generateFormCode(
        dto.factoryId,
        dto.lineId,
        dto.teamId,
        dto.groupId,
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
        factoryId: dto.factoryId,
        lineId: dto.lineId,
        teamId: dto.teamId,
        groupId: dto.groupId,
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
        page: pagination.page || 0,
        limit: pagination.limit || 10,
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
}
