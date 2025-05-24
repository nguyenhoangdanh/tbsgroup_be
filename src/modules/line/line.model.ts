import { z } from 'zod';

// Error constants cho Line
export const ErrLineNotFound = new Error('Dây chuyền không tồn tại');
export const ErrLineCodeExists = new Error('Mã dây chuyền đã tồn tại');
export const ErrLineNameExists = new Error(
  'Tên dây chuyền đã tồn tại trong nhà máy này',
);
export const ErrFactoryNotFound = new Error('Nhà máy không tồn tại');
export const ErrPermissionDenied = new Error(
  'Bạn không có quyền thực hiện thao tác này',
);

// Định nghĩa schema cho Line
export const lineSchema = z.object({
  id: z.string().uuid(),
  code: z
    .string()
    .min(3, 'Mã dây chuyền phải có ít nhất 3 ký tự')
    .max(50, 'Mã dây chuyền không quá 50 ký tự'),
  name: z
    .string()
    .min(3, 'Tên dây chuyền phải có ít nhất 3 ký tự')
    .max(100, 'Tên dây chuyền không quá 100 ký tự'),
  description: z.string().nullable().optional(),
  factoryId: z.string().uuid(),
  capacity: z.number().int().nonnegative().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Model class that can be used with Type<any>
export class Line {
  id!: string;
  code!: string;
  name!: string;
  description: string | null = null;
  factoryId!: string;
  capacity: number = 0;
  createdAt!: Date;
  updatedAt!: Date;

  // Static method to validate with Zod schema
  static validate(data: any): boolean {
    try {
      lineSchema.parse(data);
      return true;
    } catch {
      return false;
    }
  }
}

// Type for inference
export type LineType = z.infer<typeof lineSchema>;

// Line manager schema - mô tả cấu trúc của người quản lý dây chuyền
export const lineManagerSchema = z.object({
  lineId: z.string().uuid(),
  userId: z.string().uuid(),
  isPrimary: z.boolean().default(false),
  startDate: z.date(),
  endDate: z.date().nullable().optional(),
});

// Định nghĩa kiểu LineManager từ schema
export type LineManager = z.infer<typeof lineManagerSchema>;
