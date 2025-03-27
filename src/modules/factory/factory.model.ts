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

export type Factory = z.infer<typeof factorySchema>;
