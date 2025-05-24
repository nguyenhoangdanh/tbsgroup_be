import { UserRole } from 'src/share';
import { z } from 'zod';
import {
  baseUserSchema,
  UserStatus,
  ErrUsernameAtLeast3Chars,
  ErrUsernameAtMost25Chars,
  ErrUsernameInvalid,
  ErrPasswordAtLeast6Chars,
  ErrUsernameExisted,
  ErrInvalidUsernameAndPassword,
  ErrUserInactivated,
  ErrInvalidToken,
  ErrInvalidCardIdAndEmployeeId,
  ErrExistsPassword,
  ErrMissingResetCredentials,
  ErrInvalidResetToken,
} from 'src/share/models/user.shared-model';

// Xuất UserStatus để tiện sử dụng
export { UserStatus };

// Xuất các error constants để tiện sử dụng
export {
  ErrUsernameAtLeast3Chars,
  ErrUsernameAtMost25Chars,
  ErrUsernameInvalid,
  ErrPasswordAtLeast6Chars,
  ErrUsernameExisted,
  ErrInvalidUsernameAndPassword,
  ErrUserInactivated,
  ErrInvalidToken,
  ErrInvalidCardIdAndEmployeeId,
  ErrExistsPassword,
  ErrMissingResetCredentials,
  ErrInvalidResetToken,
};

// Sử dụng schema giống như trong user.model.ts
export const authSchema = baseUserSchema.extend({
  role: z.nativeEnum(UserRole).optional(),
});

export type Auth = z.infer<typeof authSchema>;
