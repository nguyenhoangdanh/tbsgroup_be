import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';
import { userDepartmentSchema } from './user-department.model';
import { createDtoFromZodSchema } from 'src/common/transformers/custom-zod-dto.transformer';

// Định nghĩa Schema tạo mới quan hệ user-department
export const createUserDepartmentSchema = userDepartmentSchema.omit({
  createdAt: true,
  updatedAt: true,
});

// Định nghĩa Schema cập nhật quan hệ user-department
export const updateUserDepartmentSchema = userDepartmentSchema
  .omit({ userId: true, departmentId: true, createdAt: true, updatedAt: true })
  .partial();

// Định nghĩa Schema filter quan hệ user-department
export const filterUserDepartmentSchema = z.object({
  userId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  roleId: z.string().uuid().optional(),
  includeUser: z.boolean().optional(),
  includeDepartment: z.boolean().optional(),
  includeRole: z.boolean().optional(),
});

// Create DTO classes with Swagger decorators
export class CreateUserDepartmentDto {
  @ApiProperty({ required: true, type: 'string' })
  userId!: string;

  @ApiProperty({ required: true, type: 'string' })
  departmentId!: string;

  @ApiProperty({ required: true, type: 'string' })
  roleId!: string;
}
// Apply Swagger decorators from Zod schema
createDtoFromZodSchema(createUserDepartmentSchema, CreateUserDepartmentDto);

export class UpdateUserDepartmentDto {
  @ApiProperty({ required: false, type: 'string' })
  roleId?: string;
}
createDtoFromZodSchema(updateUserDepartmentSchema, UpdateUserDepartmentDto);

export class FilterUserDepartmentDto {
  @ApiProperty({ required: false, type: 'string' })
  userId?: string;

  @ApiProperty({ required: false, type: 'string' })
  departmentId?: string;

  @ApiProperty({ required: false, type: 'string' })
  roleId?: string;

  @ApiProperty({ required: false, type: 'boolean' })
  includeUser?: boolean;

  @ApiProperty({ required: false, type: 'boolean' })
  includeDepartment?: boolean;

  @ApiProperty({ required: false, type: 'boolean' })
  includeRole?: boolean;
}
createDtoFromZodSchema(filterUserDepartmentSchema, FilterUserDepartmentDto);
