import { z } from 'zod';

// Business errors
export const ErrGroupNotFound = new Error('Không tìm thấy nhóm');
export const ErrGroupCodeExists = new Error('Mã nhóm đã tồn tại');
export const ErrGroupNameExists = new Error('Tên nhóm đã tồn tại');
export const ErrPermissionDenied = new Error('Bạn không có quyền thực hiện hành động này');
export const ErrTeamNotFound = new Error('Không tìm thấy tổ');
export const ErrGroupHasUsers = new Error('Nhóm đang có thành viên, không thể xóa');
export const ErrGroupHasProductionData = new Error('Nhóm đang có dữ liệu sản xuất, không thể xóa');

// Data model
export const groupSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(2, 'Mã nhóm phải có ít nhất 2 ký tự').max(50, 'Mã nhóm không được quá 50 ký tự'),
  name: z.string().min(3, 'Tên nhóm phải có ít nhất 3 ký tự').max(100, 'Tên nhóm không được quá 100 ký tự'),
  description: z.string().nullable().optional(),
  teamId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Group = z.infer<typeof groupSchema>;

// Model for GroupLeader
export const groupLeaderSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
  isPrimary: z.boolean().default(false),
  startDate: z.date(),
  endDate: z.date().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type GroupLeader = z.infer<typeof groupLeaderSchema>;