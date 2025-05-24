import { Inject, Injectable } from '@nestjs/common';
import { AppError, Requester, UserRole } from 'src/share';
import { DigitalFormSubmitDTO } from '../digital-form.dto';
import { ErrPermissionDenied, RecordStatus } from '../digital-form.model';
import { DIGITAL_FORM_REPOSITORY } from '../digital-form.di-token';
import {
  IDigitalFormRepository,
  IDigitalFormWorkflowService,
} from '../digital-form.port';
import { BaseDigitalFormService } from './digital-form-base.service';

@Injectable()
export class DigitalFormWorkflowService
  extends BaseDigitalFormService
  implements IDigitalFormWorkflowService
{
  constructor(
    @Inject(DIGITAL_FORM_REPOSITORY)
    protected readonly digitalFormRepo: IDigitalFormRepository,
  ) {
    super(digitalFormRepo, DigitalFormWorkflowService.name);
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
      if (form.status !== RecordStatus.DRAFT) {
        throw AppError.from(
          new Error('Only draft forms can be submitted'),
          400,
        );
      }

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

  async rejectDigitalForm(
    requester: Requester,
    id: string,
    reason: string,
  ): Promise<void> {
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
        // Store rejection reason if needed in a field like 'rejectionReason'
        // rejectionReason: reason,
      });

      this.logger.log(
        `Digital form rejected: ${id} by ${requester.sub}. Reason: ${reason}`,
      );
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
