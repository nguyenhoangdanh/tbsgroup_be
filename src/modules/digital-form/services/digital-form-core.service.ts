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
  ShiftType,
} from '../digital-form.model';
import { DIGITAL_FORM_REPOSITORY } from '../digital-form.di-token';
import {
  IDigitalFormRepository,
  IDigitalFormCoreService,
} from '../digital-form.port';
import { BaseDigitalFormService } from './digital-form-base.service';
import prisma from 'src/share/components/prisma';
import { USER_REPOSITORY } from 'src/modules/user/user.di-token';
import { IUserRepository } from 'src/modules/user/user.port';

@Injectable()
export class DigitalFormCoreService
  extends BaseDigitalFormService
  implements IDigitalFormCoreService
{
  constructor(
    @Inject(DIGITAL_FORM_REPOSITORY)
    protected readonly digitalFormRepo: IDigitalFormRepository,
    @Inject(USER_REPOSITORY)
    protected readonly userRepository: IUserRepository,
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

      // Lấy thông tin công nhân
      const user = await this.userRepository.get(dto.userId);
      if (!user) {
        throw AppError.from(new Error(`User not found: ${dto.userId}`), 404);
      }

      // Kiểm tra công nhân có đầy đủ thông tin cần thiết không
      if (!user.groupId || !user.teamId || !user.lineId || !user.factoryId) {
        throw AppError.from(
          new Error(
            `User ${user.fullName} does not have complete organizational information`,
          ),
          400,
        );
      }

      // Tạo formName và description mặc định nếu không được cung cấp
      const formName = dto.formName || `Phiếu công đoạn - ${user.fullName}`;
      // const description =
      //   dto.description || `Theo dõi sản lượng ${user.fullName}`;

      // Lấy ngày hiện tại nếu không được cung cấp
      const date = dto.date ? new Date(dto.date) : new Date();

      // Tạo form code
      const formCode = await this.generateFormCode(
        user.factoryId,
        user.lineId,
        user.teamId,
        user.groupId,
        date.toISOString(),
        dto.shiftType,
      );

      // Create new form
      const newId = uuidv4();
      const newForm: DigitalForm = {
        id: newId,
        formCode,
        formName,
        description: dto.description || null,
        date: new Date(dto.date),
        shiftType: dto.shiftType,
        factoryId: user.factoryId,
        lineId: user.lineId,
        teamId: user.teamId,
        groupId: user.groupId,
        userId: user.id,
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

  // digital-form-core.service.ts

  /**
   * Tạo digital form cho một công nhân cụ thể
   */
  async createDigitalFormForWorker(
    workerId: string,
    requester: Requester,
  ): Promise<string> {
    try {
      // Fetch worker info with all related data
      const worker = await prisma.user.findUnique({
        where: { id: workerId },
        include: {
          group: true,
          team: true,
          line: true,
          factory: true,
        },
      });

      if (!worker) {
        throw AppError.from(new Error(`Worker not found: ${workerId}`), 404);
      }

      if (
        !worker.factoryId ||
        !worker.lineId ||
        !worker.teamId ||
        !worker.groupId
      ) {
        throw AppError.from(
          new Error(
            `Worker ${worker.fullName} does not have complete organizational information`,
          ),
          400,
        );
      }

      const date = new Date();

      // Form name including worker name, employee ID, and date
      const formName = `Phiếu công đoạn - ${worker.fullName} - ${worker.employeeId} - ${date.toLocaleDateString('vi-VN')}`;
      const description = `Theo dõi sản lượng ${worker.fullName}`;

      // Generate form code
      const formCode = await this.generateFormCode(
        worker.factoryId,
        worker.lineId,
        worker.teamId,
        worker.groupId,
        date.toISOString(),
        ShiftType.REGULAR,
      );

      // Create digital form
      const newId = uuidv4();
      const newForm: DigitalForm = {
        id: newId,
        formCode,
        formName,
        description,
        date: new Date(),
        shiftType: ShiftType.REGULAR,
        factoryId: worker.factoryId,
        lineId: worker.lineId,
        teamId: worker.teamId,
        groupId: worker.groupId,
        userId: worker.id,
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
      this.logger.log(
        `Created digital form for worker ${worker.fullName}: ${formCode} (${newId})`,
      );

      return newId;
    } catch (error) {
      this.logger.error(
        `Error creating digital form for worker: ${error.message}`,
        error.stack,
      );
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.from(
        new Error(`Error creating digital form for worker: ${error.message}`),
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
