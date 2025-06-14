import { z } from 'zod';

// Business errors
export const ErrHandBagCodeExists = new Error('Mã túi xách đã tồn tại');
export const ErrHandBagNotFound = new Error('Không tìm thấy túi xách');
export const ErrHandBagNameExists = new Error('Tên túi xách đã tồn tại');
export const ErrBagColorCodeExists = new Error(
  'Mã màu túi đã tồn tại cho túi này',
);
export const ErrBagColorNotFound = new Error('Không tìm thấy màu túi');
export const ErrBagProcessNotFound = new Error('Không tìm thấy công đoạn');
export const ErrBagColorProcessExists = new Error(
  'Công đoạn đã tồn tại cho màu túi này',
);
export const ErrBagColorProcessNotFound = new Error(
  'Không tìm thấy công đoạn của màu túi',
);
export const ErrPermissionDenied = new Error(
  'Bạn không có quyền thực hiện hành động này',
);
export const ErrHandBagHasProduction = new Error(
  'Túi xách đang được sử dụng trong sản xuất, không thể xóa',
);

// Data models
export const handBagSchema = z.object({
  id: z.string().uuid(),
  code: z
    .string()
    .min(2, 'Mã túi phải có ít nhất 2 ký tự')
    .max(50, 'Mã túi không được quá 50 ký tự'),
  name: z
    .string()
    .min(3, 'Tên túi phải có ít nhất 3 ký tự')
    .max(150, 'Tên túi không được quá 150 ký tự'),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  active: z.boolean().default(true),
  category: z.string().nullable().optional(),
  dimensions: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  weight: z.number().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const bagColorSchema = z.object({
  id: z.string().uuid(),
  handBagId: z.string().uuid(),
  colorCode: z
    .string()
    .min(2, 'Mã màu phải có ít nhất 2 ký tự')
    .max(50, 'Mã màu không được quá 50 ký tự'),
  colorName: z
    .string()
    .min(2, 'Tên màu phải có ít nhất 2 ký tự')
    .max(100, 'Tên màu không được quá 100 ký tự'),
  hexCode: z.string().nullable().optional(),
  active: z.boolean().default(true),
  imageUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const bagColorProcessSchema = z.object({
  id: z.string().uuid(),
  bagColorId: z.string().uuid(),
  bagProcessId: z.string().uuid(),
  standardOutput: z.number().int().min(0),
  difficulty: z.number().int().min(1).max(5).nullable().optional(),
  timeEstimate: z.number().int().nullable().optional(),
  materialUsage: z.any().nullable().optional(),
  qualityNotes: z.string().nullable().optional(),
  specialTools: z.string().nullable().optional(),
  productivity: z.number({
    invalid_type_error:
      'Năng suất phải là một số nguyên hoặc số thập phân (vd: 123 hoặc 123.45)',
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type HandBag = z.infer<typeof handBagSchema>;
export type BagColor = z.infer<typeof bagColorSchema>;
export type BagColorProcess = z.infer<typeof bagColorProcessSchema>;
