import { UserRole } from 'src/share';
import { z } from 'zod';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  UNKNOWN = 'unknown',
}

export enum Status {
  FIRST_LOGIN = 'first_login',
  ACTIVE = 'active',
  PENDING = 'pending',
  INACTIVE = 'inactive',
  BANNED = 'banned',
  DELETED = 'deleted',
}

// business errors
export const ErrFirstNameAtLeast2Chars = new Error(
  'First name must be at least 2 characters',
);
export const ErrLastNameAtLeast2Chars = new Error(
  'Last name must be at least 2 characters',
);
export const ErrUsernameAtLeast3Chars = new Error(
  // 'Username must be at least 3 characters',
  'Username phải có ít nhất 3 ký tự',
);
export const ErrUsernameAtMost25Chars = new Error(
  // 'Username must be at most 25 characters',
  'Username không được quá 25 ký tự',
);
export const ErrUsernameInvalid = new Error(
  // 'Username must contain only letters, numbers and underscore (_)',
  'Username không hợp lệ, chỉ chứa chữ cái, số và dấu gạch dưới (_)',
);
export const ErrPasswordAtLeast6Chars = new Error(
  'Password bắt buộc phải có ít nhất 6 ký tự',
);
export const ErrBirthdayInvalid = new Error('Birthday is invalid');
export const ErrGenderInvalid = new Error('Gender is invalid');
export const ErrRoleInvalid = new Error('Role is invalid');
export const ErrUsernameExisted = new Error('Username đã tồn tại');
export const ErrInvalidUsernameAndPassword = new Error(
  'Tên đăng nhập hoặc mật khẩu không đúng',
);
export const ErrUserInactivated = new Error('User đã bị vô hiệu hóa');
export const ErrInvalidToken = new Error('Invalid token');

export const ErrInvalidCardIdAndEmployeeId = new Error(
  'CCCD Hoặc Mã nhân viên không đúng',
);

export const ErrExistsPassword = new Error(
  'Mật khẩu đã tồn tại, vui lòng chọn mật khẩu khác',
);

// data model
export const userSchema = z.object({
  id: z.string().uuid(),
  avatar: z.string().nullable().optional(),
  cover: z.string().nullable().optional(),
  fullName: z.string().min(5),
  // position: z.string().nonempty(),
  // department: z.string().nonempty(),
  employeeId: z.string().nonempty(),
  cardId: z.string().nonempty(),
  username: z
    .string()
    .min(3, ErrUsernameAtLeast3Chars.message)
    .max(25, ErrUsernameAtMost25Chars.message)
    .regex(/^[a-zA-Z0-9_]+$/, ErrUsernameInvalid.message),
  // password: z.string().min(6, ErrPasswordAtLeast6Chars.message),
  password: z
    .string()
    .min(6, ErrPasswordAtLeast6Chars.message)
    .regex(/^\S*$/, { message: 'Mật khẩu không được chứa khoảng trắng' }), // 🚀 Thêm điều kiện này
  salt: z.string().min(8),
  bio: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  followerCount: z.number().default(0),
  postCount: z.number().default(0),
  role: z.nativeEnum(UserRole, ErrRoleInvalid),
  status: z.nativeEnum(Status).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  workInfoId: z.string(),
});

// export interface User extends z.infer<typeof userSchema> {}
export type User = z.infer<typeof userSchema>;
