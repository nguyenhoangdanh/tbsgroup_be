import { z } from 'zod';

// Business errors
export const ErrDepartmentCodeExists = new Error('Mã phòng ban đã tồn tại');
export const ErrDepartmentNotFound = new Error('Không tìm thấy phòng ban');
export const ErrDepartmentNameExists = new Error('Tên phòng ban đã tồn tại');
export const ErrDepartmentHasUsers = new Error(
  'Phòng ban đang có người dùng, không thể xóa',
);
export const ErrDepartmentHasChildren = new Error(
  'Phòng ban đang có các phòng ban con, không thể xóa',
);
export const ErrPermissionDenied = new Error(
  'Bạn không có quyền thực hiện hành động này',
);

// Data model
export const departmentSchema = z.object({
  id: z.string().uuid(),
  code: z
    .string()
    .min(2, 'Mã phòng ban phải có ít nhất 2 ký tự')
    .max(50, 'Mã phòng ban không được quá 50 ký tự'),
  name: z
    .string()
    .min(3, 'Tên phòng ban phải có ít nhất 3 ký tự')
    .max(100, 'Tên phòng ban không được quá 100 ký tự'),
  description: z.string().nullable().optional(),
  departmentType: z.enum(['HEAD_OFFICE', 'FACTORY_OFFICE']),
  parentId: z.string().uuid().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Department entity model representing a department in the system
 * Corresponds to the Department model in the Prisma schema
 */
export class Department {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  departmentType: 'HEAD_OFFICE' | 'FACTORY_OFFICE';
  parentId?: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Department>) {
    Object.assign(this, partial);
  }

  /**
   * Create a new Department instance from plain object
   */
  static from(data: any): Department {
    return new Department({
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      departmentType: data.departmentType || data.department_type,
      parentId: data.parentId || data.parent_id,
      createdAt: data.createdAt || data.created_at,
      updatedAt: data.updatedAt || data.updated_at,
    });
  }

  /**
   * Convert Department instance to plain object for database operations
   */
  toDb(): any {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      description: this.description,
      departmentType: this.departmentType, // Đã sửa: department_type -> departmentType
      parentId: this.parentId, // Đã sửa: parent_id -> parentId
      createdAt: this.createdAt, // Đã sửa: created_at -> createdAt
      updatedAt: this.updatedAt, // Đã sửa: updated_at -> updatedAt
    };
  }
}
