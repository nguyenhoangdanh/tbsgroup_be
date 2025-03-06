import { z } from 'zod';
import { workInfoSchema } from './work-info.model';

export const workInfoRegistrationDTOSchema = workInfoSchema
  .pick({
    department: true,
    position: true,
    line: true,
    factory: true,
  })
  .required();

// export interface UserRegistrationDTO
//   extends z.infer<typeof userRegistrationDTOSchema> {}
export type WorkInfoRegistrationDTO = z.infer<
  typeof workInfoRegistrationDTOSchema
>;

export const workInfoUpdateDTOSchema = workInfoSchema
  .pick({
    department: true,
    position: true,
    line: true,
    factory: true,
  })
  .partial();

// export interface UserCondDTO extends z.infer<typeof userCondDTOSchema> {}
// export interface UserUpdateProfileDTO
//   extends z.infer<typeof userUpdateProfileDTOSchema> {}

export type WorkInfoCondDTO = z.infer<typeof workInfoRegistrationDTOSchema>;

export type WorkInfoUpdateDTO = z.infer<typeof workInfoUpdateDTOSchema>;
