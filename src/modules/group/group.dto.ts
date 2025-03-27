import { z } from 'zod';
import { groupSchema, groupLeaderSchema } from './group.model';

// DTO cho nhóm
export const groupCreateDTOSchema = groupSchema
  .pick({
    code: true,
    name: true,
    description: true,
    teamId: true,
  })
  .partial({
    description: true,
  })
  .required({
    code: true,
    name: true,
    teamId: true,
  });

export type GroupCreateDTO = z.infer<typeof groupCreateDTOSchema>;

export const groupUpdateDTOSchema = groupSchema
  .pick({
    name: true,
    description: true,
    teamId: true,
  })
  .partial();

export type GroupUpdateDTO = z.infer<typeof groupUpdateDTOSchema>;

export const groupCondDTOSchema = groupSchema
  .pick({
    code: true,
    name: true,
    teamId: true,
  })
  .extend({
    search: z.string().optional(),
  })
  .partial();

export type GroupCondDTO = z.infer<typeof groupCondDTOSchema>;

// DTO cho nhóm trưởng
export const groupLeaderCreateDTOSchema = groupLeaderSchema
  .pick({
    groupId: true,
    userId: true,
    isPrimary: true,
    startDate: true,
    endDate: true,
  })
  .partial({
    isPrimary: true,
    endDate: true,
  })
  .required({
    groupId: true,
    userId: true,
    startDate: true,
  });

export type GroupLeaderCreateDTO = z.infer<typeof groupLeaderCreateDTOSchema>;

export const groupLeaderUpdateDTOSchema = groupLeaderSchema
  .pick({
    isPrimary: true,
    endDate: true,
  })
  .partial();

export type GroupLeaderUpdateDTO = z.infer<typeof groupLeaderUpdateDTOSchema>;

export const paginationDTOSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PaginationDTO = z.infer<typeof paginationDTOSchema>;