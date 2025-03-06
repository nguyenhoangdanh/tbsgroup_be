import { z } from 'zod';
import { userSchema } from './user.model';
import { workInfoSchema } from '../workInfo/work-info.model';

// export const userRegistrationDTOSchema = userSchema
//   .pick({
//     username: true,
//     password: true,
//     fullName: true,
//     employeeId: true,
//     cardId: true,
//   })
//   .required();

export const userRegistrationDTOSchema = z.object({
  user: userSchema
    .pick({
      username: true,
      password: true,
      fullName: true,
      employeeId: true,
      cardId: true,
    })
    .required(),
  workInfo: workInfoSchema
    .pick({
      department: true,
      position: true,
      line: true,
      factory: true,
    })
    .required(),
});

export const userLoginDTOSchema = userSchema
  .pick({
    username: true,
    password: true,
  })
  .required();

// export interface UserRegistrationDTO
//   extends z.infer<typeof userRegistrationDTOSchema> {}
export type UserRegistrationDTO = z.infer<typeof userRegistrationDTOSchema>;

// export interface UserLoginDTO extends z.infer<typeof userLoginDTOSchema> {}
export type UserLoginDTO = z.infer<typeof userLoginDTOSchema>;

export const userUpdateDTOSchema = userSchema
  .pick({
    avatar: true,
    cover: true,
    fullName: true,
    password: true,
    employeeId: true,
    bio: true,
    websiteUrl: true,
    salt: true,
    role: true,
    status: true,
  })
  .partial();

// export interface UserUpdateDTO extends z.infer<typeof userUpdateDTOSchema> {}
export type UserUpdateDTO = z.infer<typeof userUpdateDTOSchema>;
// 200Lab TODO: Don't allow update role and status
// but allow update role and status for admin only
export const userUpdateProfileDTOSchema = userUpdateDTOSchema
  .omit({
    role: true,
    status: true,
  })
  .partial();

export const userCondDTOSchema = userSchema
  .pick({
    fullName: true,
    username: true,
    role: true,
    status: true,
  })
  .partial();

export const userResetPasswordDTOSchema = userSchema
  .pick({
    password: true,
    username: true,
    cardId: true,
    employeeId: true,
  })
  .partial();

export type UserResetPasswordDTO = z.infer<typeof userResetPasswordDTOSchema>;

// export interface UserCondDTO extends z.infer<typeof userCondDTOSchema> {}
// export interface UserUpdateProfileDTO
//   extends z.infer<typeof userUpdateProfileDTOSchema> {}

export type UserCondDTO = z.infer<typeof userCondDTOSchema>;
export type UserUpdateProfileDTO = z.infer<typeof userUpdateProfileDTOSchema>;
