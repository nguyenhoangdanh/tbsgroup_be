import { z } from 'zod';

// Interface tương ứng với schema để sử dụng trong controller
export interface ExampleItemDto {
  name: string;
  description?: string;
  quantity: number;
  price: number;
  tags: string[];
  status: 'active' | 'inactive' | 'pending';
  createdAt?: Date;
}

// Zod schema cho validation
export const exampleItemSchema = z.object({
  name: z
    .string()
    .min(3, { message: 'Tên phải có ít nhất 3 ký tự' })
    .max(50, { message: 'Tên không được vượt quá 50 ký tự' })
    .describe('Tên của item'),

  description: z
    .string()
    .max(500, { message: 'Mô tả không được vượt quá 500 ký tự' })
    .optional()
    .describe('Mô tả chi tiết về item'),

  quantity: z
    .number()
    .int()
    .positive({ message: 'Số lượng phải là số nguyên dương' })
    .describe('Số lượng item'),

  price: z
    .number()
    .positive({ message: 'Giá phải là số dương' })
    .describe('Giá của item'),

  tags: z.array(z.string()).default([]).describe('Các thẻ gắn với item'),

  status: z
    .enum(['active', 'inactive', 'pending'])
    .default('pending')
    .describe('Trạng thái của item'),

  createdAt: z.date().optional().describe('Thời gian tạo item'),
});
