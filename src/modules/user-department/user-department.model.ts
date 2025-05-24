import { z } from 'zod';

// Business errors
export const ErrUserDepartmentNotFound = new Error(
  'Không tìm thấy mối quan hệ người dùng-phòng ban',
);
export const ErrUserDepartmentExists = new Error(
  'Mối quan hệ người dùng-phòng ban đã tồn tại',
);
export const ErrPermissionDenied = new Error(
  'Bạn không có quyền thực hiện hành động này',
);

// Data model
export const userDepartmentSchema = z.object({
  userId: z.string().uuid(),
  departmentId: z.string().uuid(),
  roleId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * UserDepartment entity model representing a relationship between User and Department
 * Corresponds to the UserDepartment model in the Prisma schema
 */
export class UserDepartment {
  userId: string;
  departmentId: string;
  roleId: string;
  createdAt: Date;
  updatedAt: Date;

  // Optional related entities for extended data
  user?: any;
  department?: any;
  role?: any;

  constructor(partial: Partial<UserDepartment>) {
    Object.assign(this, partial);
  }

  /**
   * Create a new UserDepartment instance from plain object
   */
  static from(data: any): UserDepartment {
    return new UserDepartment({
      userId: data.userId || data.user_id,
      departmentId: data.departmentId || data.department_id,
      roleId: data.roleId || data.role_id,
      createdAt: data.createdAt || data.created_at,
      updatedAt: data.updatedAt || data.updated_at,
      // Optional related entities
      user: data.user,
      department: data.department,
      role: data.role,
    });
  }

  /**
   * Convert UserDepartment instance to plain object for database operations
   */
  toDb(): any {
    return {
      userId: this.userId,
      departmentId: this.departmentId,
      roleId: this.roleId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
