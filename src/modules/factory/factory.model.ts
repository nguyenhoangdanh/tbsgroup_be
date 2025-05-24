import { z } from 'zod';

// Business errors
export const ErrFactoryCodeExists = new Error('Mã nhà máy đã tồn tại');
export const ErrFactoryNotFound = new Error('Không tìm thấy nhà máy');
export const ErrFactoryNameExists = new Error('Tên nhà máy đã tồn tại');
export const ErrFactoryHasLines = new Error(
  'Nhà máy đang có các dây chuyền sản xuất, không thể xóa',
);
export const ErrFactoryHasManagers = new Error(
  'Nhà máy đang có người quản lý, không thể xóa',
);
export const ErrPermissionDenied = new Error(
  'Bạn không có quyền thực hiện hành động này',
);

// Data model
export const factorySchema = z.object({
  id: z.string().uuid(),
  code: z
    .string()
    .min(2, 'Mã nhà máy phải có ít nhất 2 ký tự')
    .max(50, 'Mã nhà máy không được quá 50 ký tự'),
  name: z
    .string()
    .min(3, 'Tên nhà máy phải có ít nhất 3 ký tự')
    .max(100, 'Tên nhà máy không được quá 100 ký tự'),
  description: z.string().nullable().optional(),
  address: z.string().nullable().optional(),

  // Thay đổi để phù hợp với schema mới
  departmentId: z.string().uuid().nullable().optional(),
  managingDepartmentId: z.string().uuid().nullable().optional(),

  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Factory entity model representing a factory in the system
 * Corresponds to the Factory model in the Prisma schema
 */
export class Factory {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  address?: string | null;
  departmentId?: string | null;
  managingDepartmentId?: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Factory>) {
    Object.assign(this, partial);
  }

  /**
   * Create a new Factory instance from plain object
   */
  static from(data: any): Factory {
    return new Factory({
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      address: data.address,
      departmentId: data.departmentId || data.department_id,
      managingDepartmentId:
        data.managingDepartmentId || data.managing_department_id,
      createdAt: data.createdAt || data.created_at,
      updatedAt: data.updatedAt || data.updated_at,
    });
  }

  /**
   * Convert Factory instance to plain object for database operations
   */
  toDb(): any {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      description: this.description,
      address: this.address,
      departmentId: this.departmentId,
      managingDepartmentId: this.managingDepartmentId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
