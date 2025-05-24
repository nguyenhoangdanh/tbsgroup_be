import { z } from 'zod';

// Business errors
export const ErrTeamCodeExists = new Error('Mã tổ đã tồn tại');
export const ErrTeamNotFound = new Error('Không tìm thấy tổ');
export const ErrTeamNameExists = new Error('Tên tổ đã tồn tại');
export const ErrLineNotFound = new Error('Không tìm thấy dây chuyền');
export const ErrPermissionDenied = new Error(
  'Bạn không có quyền thực hiện hành động này',
);

// Data model schema for validation
export const teamSchema = z.object({
  id: z.string().uuid(),
  code: z
    .string()
    .min(2, 'Mã tổ phải có ít nhất 2 ký tự')
    .max(50, 'Mã tổ không được quá 50 ký tự'),
  name: z
    .string()
    .min(3, 'Tên tổ phải có ít nhất 3 ký tự')
    .max(100, 'Tên tổ không được quá 100 ký tự'),
  description: z.string().nullable().optional(),
  lineId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Model class that can be used with Type<any>
export class Team {
  id!: string;
  code!: string;
  name!: string;
  description: string | null = null;
  lineId!: string;
  createdAt!: Date;
  updatedAt!: Date;

  // Static method to validate with Zod schema
  static validate(data: any): boolean {
    try {
      teamSchema.parse(data);
      return true;
    } catch (error) {
      console.error('Validation error:', error.errors);
      return false;
    }
  }
}

// Type for inference
export type TeamType = z.infer<typeof teamSchema>;
