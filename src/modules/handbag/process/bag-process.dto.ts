import { z } from 'zod';
import { bagProcessSchema } from './bag-process.model';

// DTO cho tạo công đoạn mới
export const bagProcessCreateDTOSchema = bagProcessSchema
  .pick({
    code: true,
    name: true,
    description: true,
    orderIndex: true,
    processType: true,
    standardOutput: true,
    cycleDuration: true,
    machineType: true,
  })
  .partial({
    description: true,
    orderIndex: true,
    processType: true,
    standardOutput: true,
    cycleDuration: true,
    machineType: true,
  })
  .required({
    code: true,
    name: true,
  });

export type BagProcessCreateDTO = z.infer<typeof bagProcessCreateDTOSchema>;

// DTO cho cập nhật công đoạn
export const bagProcessUpdateDTOSchema = bagProcessSchema
  .pick({
    name: true,
    description: true,
    orderIndex: true,
    processType: true,
    standardOutput: true,
    cycleDuration: true,
    machineType: true,
  })
  .partial();

export type BagProcessUpdateDTO = z.infer<typeof bagProcessUpdateDTOSchema>;

// DTO cho điều kiện tìm kiếm công đoạn
export const bagProcessCondDTOSchema = bagProcessSchema
  .pick({
    code: true,
    name: true,
    processType: true,
  })
  .extend({
    search: z.string().optional(),
  })
  .partial();

export type BagProcessCondDTO = z.infer<typeof bagProcessCondDTOSchema>;

// DTO cho phân trang (sử dụng lại PaginationDTO từ module khác)
export const paginationDTOSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.string().optional().default('orderIndex'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type PaginationDTO = z.infer<typeof paginationDTOSchema>;
