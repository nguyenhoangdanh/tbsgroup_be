import { z } from 'zod';
import { factorySchema } from './factory.model';

// DTO cho tạo nhà máy mới
export const factoryCreateDTOSchema = factorySchema
  .pick({
    code: true,
    name: true,
    description: true,
    address: true,
    departmentId: true,
    managingDepartmentId: true, // Thêm trường này
  })
  .partial({
    description: true,
    address: true,
    departmentId: true,
    managingDepartmentId: true, // Thêm trường này
  })
  .required({
    code: true,
    name: true,
  });

export type FactoryCreateDTO = z.infer<typeof factoryCreateDTOSchema>;

// DTO cho cập nhật nhà máy
export const factoryUpdateDTOSchema = factorySchema
  .pick({
    name: true,
    description: true,
    address: true,
    departmentId: true,
    managingDepartmentId: true, // Thêm trường này
  })
  .partial();

export type FactoryUpdateDTO = z.infer<typeof factoryUpdateDTOSchema>;

// DTO cho điều kiện tìm kiếm nhà máy
export const factoryCondDTOSchema = factorySchema
  .pick({
    code: true,
    name: true,
    departmentId: true,
    managingDepartmentId: true,
  })
  .extend({
    search: z.string().optional(),
    departmentType: z.enum(['HEAD_OFFICE', 'FACTORY_OFFICE']).optional(),
  })
  .partial();

export type FactoryCondDTO = z.infer<typeof factoryCondDTOSchema>;

// DTO cho phân trang và sắp xếp
export const paginationDTOSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PaginationDTO = z.infer<typeof paginationDTOSchema>;

// DTO cho quản lý nhà máy
export const factoryManagerDTOSchema = z.object({
  userId: z.string().uuid(),
  isPrimary: z.boolean().default(false),
  startDate: z.date(),
  endDate: z.date().nullable().optional(),
});

export type FactoryManagerDTO = z.infer<typeof factoryManagerDTOSchema>;
