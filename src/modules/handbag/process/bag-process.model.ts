import { z } from 'zod';

// Business errors
export const ErrBagProcessCodeExists = new Error('Mã công đoạn đã tồn tại');
export const ErrBagProcessNotFound = new Error('Không tìm thấy công đoạn');
export const ErrBagProcessNameExists = new Error('Tên công đoạn đã tồn tại');
export const ErrBagProcessHasProduction = new Error('Công đoạn đang được sử dụng trong sản xuất, không thể xóa');
export const ErrBagProcessHasPositions = new Error('Công đoạn đang liên kết với vị trí công việc, không thể xóa');
export const ErrPermissionDenied = new Error('Bạn không có quyền thực hiện hành động này');

// Data model
export const bagProcessSchema = z.object({
  id: z.string().uuid(),
  code: z
    .string()
    .min(2, 'Mã công đoạn phải có ít nhất 2 ký tự')
    .max(50, 'Mã công đoạn không được quá 50 ký tự'),
  name: z
    .string()
    .min(3, 'Tên công đoạn phải có ít nhất 3 ký tự')
    .max(100, 'Tên công đoạn không được quá 100 ký tự'),
  description: z.string().nullable().optional(),
  orderIndex: z.number().int().default(0),
  processType: z.string().nullable().optional(),
  standardOutput: z.coerce.number()
  .nonnegative({ message: "Sản lượng tiêu chuẩn phải là số dương" })
  .refine(n => String(n).split('.')[1]?.length <= 2, {
    message: "Sản lượng tiêu chuẩn chỉ được phép có tối đa 2 chữ số thập phân"
  }),
  cycleDuration: z.number().int().nullable().optional(),
  machineType: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type BagProcess = z.infer<typeof bagProcessSchema>;