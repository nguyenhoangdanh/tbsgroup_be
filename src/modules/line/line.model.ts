import { z } from 'zod';

// Business errors
export const ErrLineCodeExists = new Error('Mã dây chuyền đã tồn tại');
export const ErrLineNotFound = new Error('Không tìm thấy dây chuyền');
export const ErrLineNameExists = new Error('Tên dây chuyền đã tồn tại');
export const ErrFactoryNotFound = new Error('Không tìm thấy nhà máy');
export const ErrPermissionDenied = new Error('Bạn không có quyền thực hiện hành động này');

// Data model schema for validation
export const lineSchema = z.object({
  id: z.string().uuid(),
  code: z
    .string()
    .min(2, 'Mã dây chuyền phải có ít nhất 2 ký tự')
    .max(50, 'Mã dây chuyền không được quá 50 ký tự'),
  name: z
    .string()
    .min(3, 'Tên dây chuyền phải có ít nhất 3 ký tự')
    .max(100, 'Tên dây chuyền không được quá 100 ký tự'),
  description: z.string().nullable().optional(),
  factoryId: z.string().uuid(),
  capacity: z.number().int().nonnegative().default(0).optional(),
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
    } catch (error) {
      return false;
    }
  }
}

// Type for inference
export type LineType = z.infer<typeof lineSchema>;