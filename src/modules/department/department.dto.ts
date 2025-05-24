import { z } from 'zod';
import { departmentSchema } from './department.model';
import { createDtoFromZodSchema } from 'src/common/transformers/custom-zod-dto.transformer';

// Định nghĩa Schema tạo mới phòng ban
export const createDepartmentSchema = departmentSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    parentId: z.string().uuid().nullable().optional(),
  });

// Định nghĩa Schema cập nhật phòng ban
export const updateDepartmentSchema = departmentSchema
  .omit({ id: true, code: true, createdAt: true, updatedAt: true })
  .partial();

// Định nghĩa Schema filter phòng ban
export const filterDepartmentSchema = z.object({
  code: z.string().optional(),
  name: z.string().optional(),
  departmentType: z.enum(['HEAD_OFFICE', 'FACTORY_OFFICE']).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

// Define DTOs using classes for Swagger decoration
export class CreateDepartmentDto {
  code!: string;
  name!: string;
  description?: string | null;
  departmentType!: 'HEAD_OFFICE' | 'FACTORY_OFFICE';
  parentId?: string | null;
}

// Apply API decorators from Zod schema
createDtoFromZodSchema(createDepartmentSchema, CreateDepartmentDto);

export class UpdateDepartmentDto {
  name?: string;
  description?: string | null;
  departmentType?: 'HEAD_OFFICE' | 'FACTORY_OFFICE';
  parentId?: string | null;
}
createDtoFromZodSchema(updateDepartmentSchema, UpdateDepartmentDto);

export class FilterDepartmentDto {
  code?: string;
  name?: string;
  departmentType?: 'HEAD_OFFICE' | 'FACTORY_OFFICE';
  parentId?: string | null;
}
createDtoFromZodSchema(filterDepartmentSchema, FilterDepartmentDto);
