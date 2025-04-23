import { Injectable, Logger } from '@nestjs/common';
import { AppError, Requester, UserRole } from 'src/share';
import {
  DigitalForm,
  ErrFormNotFound,
  ErrPermissionDenied,
} from '../digital-form.model';
import { IDigitalFormRepository } from '../digital-form.port';

@Injectable()
export abstract class BaseDigitalFormService {
  protected readonly logger: Logger;

  constructor(
    protected readonly digitalFormRepo: IDigitalFormRepository,
    serviceName: string,
  ) {
    this.logger = new Logger(serviceName);
  }

  /**
   * Permission checking utility
   */
  protected _checkPermission(
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
   * Validate that form exists, throw consistent error if not
   */
  protected async _getAndValidateForm(id: string): Promise<DigitalForm> {
    const form = await this.digitalFormRepo.getDigitalForm(id);
    if (!form) {
      throw AppError.from(ErrFormNotFound, 404);
    }
    return form;
  }

  /**
   * Helper method for grouping arrays
   */
  protected _groupBy<T, K extends keyof T | ((item: T) => string)>(
    array: T[],
    key: K,
  ): Record<string, T[]> {
    return array.reduce(
      (result: Record<string, T[]>, item: T) => {
        const groupKey: string =
          typeof key === 'function'
            ? (key as (item: T) => string)(item)
            : String(item[key as keyof T]);

        if (!result[groupKey]) {
          result[groupKey] = [];
        }
        result[groupKey].push(item);
        return result;
      },
      {} as Record<string, T[]>,
    );
  }
}
