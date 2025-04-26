import { z } from 'zod';
import { userSchema } from './user.model';

// DTO for user update
export const userUpdateDTOSchema = userSchema
  .pick({
    username: true,
    avatar: true,
    fullName: true,
    email: true,
    phone: true,
    cardId: true,
    employeeId: true,
    status: true,
    factoryId: true,
    lineId: true,
    teamId: true,
    groupId: true,
    positionId: true,
    roleId: true,
  })
  .extend({
    defaultRoleId: z.string().uuid().optional(),
  })
  .partial();

export type UserUpdateDTO = z.infer<typeof userUpdateDTOSchema>;

// DTO for profile update - limit fields that users can update themselves
export const userUpdateProfileDTOSchema = userSchema
  .pick({
    avatar: true,
    fullName: true,
    email: true,
    phone: true,
  })
  .partial();

export type UserUpdateProfileDTO = z.infer<typeof userUpdateProfileDTOSchema>;

// DTO for user search conditions
export const userCondDTOSchema = userSchema
  .pick({
    fullName: true,
    username: true,
    status: true,
    factoryId: true,
    lineId: true,
    teamId: true,
    groupId: true,
    positionId: true,
  })
  .extend({
    roleId: z.string().uuid().optional(),
    roleCode: z.string().optional(),
  })
  .partial();

export type UserCondDTO = z.infer<typeof userCondDTOSchema>;

// DTO for role assignment
export const userRoleAssignmentDTOSchema = z.object({
  roleId: z.string().uuid(),
  scope: z.string().optional(),
  expiryDate: z.date().optional(), // Role expiration date (if temporary)
});

export type UserRoleAssignmentDTO = z.infer<typeof userRoleAssignmentDTOSchema>;

// DTO for pagination and sorting
export const paginationDTOSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PaginationDTO = z.infer<typeof paginationDTOSchema>;
