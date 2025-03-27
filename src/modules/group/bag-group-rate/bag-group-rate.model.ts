import { z } from 'zod';

// Business errors
export const ErrBagGroupRateNotFound = new Error('Không tìm thấy năng suất nhóm cho túi này');
export const ErrBagGroupRateExists = new Error('Năng suất nhóm cho túi này đã tồn tại');
export const ErrPermissionDenied = new Error('Bạn không có quyền thực hiện hành động này');
export const ErrGroupNotFound = new Error('Không tìm thấy nhóm');
export const ErrHandBagNotFound = new Error('Không tìm thấy túi xách');

// Data model
export const bagGroupRateSchema = z.object({
  id: z.string().uuid(),
  handBagId: z.string().uuid(),
  groupId: z.string().uuid(),
  outputRate: z.number().min(0, 'Năng suất không thể là số âm'),
  notes: z.string().nullable().optional(),
  active: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type BagGroupRate = z.infer<typeof bagGroupRateSchema>;