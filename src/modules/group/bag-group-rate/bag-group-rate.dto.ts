import { z } from 'zod';
import { bagGroupRateSchema } from './bag-group-rate.model';

// DTO cho năng suất túi theo nhóm
export const bagGroupRateCreateDTOSchema = bagGroupRateSchema
  .pick({
    handBagId: true,
    groupId: true,
    outputRate: true,
    notes: true,
    active: true,
  })
  .partial({
    notes: true,
    active: true,
  })
  .required({
    handBagId: true,
    groupId: true,
    outputRate: true,
  });

export type BagGroupRateCreateDTO = z.infer<typeof bagGroupRateCreateDTOSchema>;

export const bagGroupRateUpdateDTOSchema = bagGroupRateSchema
  .pick({
    outputRate: true,
    notes: true,
    active: true,
  })
  .partial();

export type BagGroupRateUpdateDTO = z.infer<typeof bagGroupRateUpdateDTOSchema>;

export const bagGroupRateCondDTOSchema = z.object({
  handBagId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  active: z.boolean().optional(),
});

export type BagGroupRateCondDTO = z.infer<typeof bagGroupRateCondDTOSchema>;

export const paginationDTOSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PaginationDTO = z.infer<typeof paginationDTOSchema>;

// Schema cho item trong batch
export const groupRateItemSchema = z.object({
  groupId: z.string().uuid(),
  outputRate: z.number().min(0, 'Năng suất không thể là số âm'),
  notes: z.string().nullable().optional(),
});

export type GroupRateItem = z.infer<typeof groupRateItemSchema>;

// Schema cho batch create DTO
export const batchCreateBagGroupRateDTOSchema = z.object({
  handBagId: z.string().uuid(),
  groupRates: z.array(groupRateItemSchema).nonempty('Phải có ít nhất một nhóm'),
});

export type BatchCreateBagGroupRateDTO = z.infer<
  typeof batchCreateBagGroupRateDTOSchema
>;

// Validation utility function
export const validateBatchCreateDTO = (
  data: unknown,
): BatchCreateBagGroupRateDTO => {
  return batchCreateBagGroupRateDTOSchema.parse(data);
};
