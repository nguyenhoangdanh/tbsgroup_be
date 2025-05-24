import { Provider } from '@nestjs/common';
import {
  USER_DEPARTMENT_REPOSITORY,
  USER_DEPARTMENT_SERVICE,
} from './user-department.di-token';
import { UserDepartmentPrismaRepository } from './user-department-prisma.repo';
import { UserDepartmentService } from './user-department.service';

// Các nhà cung cấp phụ thuộc cho module UserDepartment
export const UserDepartmentProviders: Provider[] = [
  {
    provide: USER_DEPARTMENT_REPOSITORY,
    useClass: UserDepartmentPrismaRepository,
  },
  {
    provide: USER_DEPARTMENT_SERVICE,
    useClass: UserDepartmentService,
  },
];
