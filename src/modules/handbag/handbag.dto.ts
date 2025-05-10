import { z } from 'zod';
import {
  bagColorProcessSchema,
  bagColorSchema,
  handBagSchema,
} from './handbag.model';

// DTO cho túi xách
export const handBagCreateDTOSchema = handBagSchema
  .pick({
    code: true,
    name: true,
    description: true,
    imageUrl: true,
    active: true,
    category: true,
    dimensions: true,
    material: true,
    weight: true,
  })
  .partial({
    description: true,
    imageUrl: true,
    active: true,
    category: true,
    dimensions: true,
    material: true,
    weight: true,
  })
  .required({
    code: true,
    name: true,
  });

export type HandBagCreateDTO = z.infer<typeof handBagCreateDTOSchema>;

export const handBagUpdateDTOSchema = handBagSchema
  .pick({
    name: true,
    description: true,
    imageUrl: true,
    active: true,
    category: true,
    dimensions: true,
    material: true,
    weight: true,
  })
  .partial();

export type HandBagUpdateDTO = z.infer<typeof handBagUpdateDTOSchema>;

export const handBagCondDTOSchema = handBagSchema
  .pick({
    code: true,
    name: true,
    category: true,
    active: true,
  })
  .extend({
    search: z.string().optional(),
  })
  .partial();

export type HandBagCondDTO = z.infer<typeof handBagCondDTOSchema>;

// DTO cho màu túi
export const bagColorCreateDTOSchema = bagColorSchema
  .pick({
    handBagId: true,
    colorCode: true,
    colorName: true,
    hexCode: true,
    active: true,
    imageUrl: true,
    notes: true,
  })
  .partial({
    hexCode: true,
    active: true,
    imageUrl: true,
    notes: true,
  })
  .required({
    handBagId: true,
    colorCode: true,
    colorName: true,
  });

export type BagColorCreateDTO = z.infer<typeof bagColorCreateDTOSchema>;

export const bagColorUpdateDTOSchema = bagColorSchema
  .pick({
    colorName: true,
    hexCode: true,
    active: true,
    imageUrl: true,
    notes: true,
  })
  .partial();

export type BagColorUpdateDTO = z.infer<typeof bagColorUpdateDTOSchema>;

export const bagColorCondDTOSchema = bagColorSchema
  .pick({
    handBagId: true,
    colorCode: true,
    colorName: true,
    active: true,
  })
  .extend({
    search: z.string().optional(),
  })
  .partial();

export type BagColorCondDTO = z.infer<typeof bagColorCondDTOSchema>;

// DTO cho công đoạn của màu túi
export const bagColorProcessCreateDTOSchema = bagColorProcessSchema
  .pick({
    bagColorId: true,
    bagProcessId: true,
    standardOutput: true,
    difficulty: true,
    timeEstimate: true,
    materialUsage: true,
    qualityNotes: true,
    specialTools: true,
    productivity: true,
  })
  .partial({
    difficulty: true,
    timeEstimate: true,
    materialUsage: true,
    qualityNotes: true,
    specialTools: true,
  })
  .required({
    bagColorId: true,
    bagProcessId: true,
    standardOutput: true,
  });

export type BagColorProcessCreateDTO = z.infer<
  typeof bagColorProcessCreateDTOSchema
>;

export const bagColorProcessUpdateDTOSchema = bagColorProcessSchema
  .pick({
    standardOutput: true,
    difficulty: true,
    timeEstimate: true,
    materialUsage: true,
    qualityNotes: true,
    specialTools: true,
  })
  .partial();

export type BagColorProcessUpdateDTO = z.infer<
  typeof bagColorProcessUpdateDTOSchema
>;

export const bagColorProcessCondDTOSchema = bagColorProcessSchema
  .pick({
    bagColorId: true,
    bagProcessId: true,
  })
  .partial();

export type BagColorProcessCondDTO = z.infer<
  typeof bagColorProcessCondDTOSchema
>;

// DTO cho phân trang và sắp xếp
export const paginationDTOSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PaginationDTO = z.infer<typeof paginationDTOSchema>;
