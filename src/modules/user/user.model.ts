import { z } from 'zod';
import {
  baseUserSchema,
  UserStatus,
  ErrPermissionDenied,
  ErrRoleAlreadyAssigned,
  ErrEntityTypeInvalid,
} from 'src/share/models/user.shared-model';

// Xuất UserStatus để tiện sử dụng
export { UserStatus };

// Xuất các error constants để tiện sử dụng
export { ErrPermissionDenied, ErrRoleAlreadyAssigned, ErrEntityTypeInvalid };

// Mở rộng từ base schema và thêm trường role nếu cần
export const userSchema = baseUserSchema.extend({
  role: z.string().optional(),
});

export type User = z.infer<typeof userSchema>;
