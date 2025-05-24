import { Provider } from '@nestjs/common';
import {
  DEPARTMENT_REPOSITORY,
  DEPARTMENT_SERVICE,
} from './department.di-token';
import { DepartmentPrismaRepository } from './department-prisma.repo';
import { DepartmentService } from './department.service';

// Các nhà cung cấp phụ thuộc cho module Department
export const DepartmentProviders: Provider[] = [
  {
    provide: DEPARTMENT_REPOSITORY,
    useClass: DepartmentPrismaRepository,
  },
  {
    provide: DEPARTMENT_SERVICE,
    useClass: DepartmentService,
  },
];
