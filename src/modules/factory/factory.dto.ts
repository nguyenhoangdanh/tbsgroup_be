import { z } from 'zod';
import { factorySchema } from './factory.model';
import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

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

export type FactoryCreateDTOSchema = z.infer<typeof factoryCreateDTOSchema>;

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

export type FactoryUpdateDTOSchema = z.infer<typeof factoryUpdateDTOSchema>;

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

export type FactoryCondDTOSchema = z.infer<typeof factoryCondDTOSchema>;

// DTO cho phân trang và sắp xếp
export const paginationDTOSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PaginationDTOSchema = z.infer<typeof paginationDTOSchema>;

// DTO cho quản lý nhà máy
export const factoryManagerDTOSchema = z.object({
  userId: z.string().uuid(),
  isPrimary: z.boolean().default(false),
  startDate: z.date(),
  endDate: z.date().nullable().optional(),
});

export type FactoryManagerDTOSchema = z.infer<typeof factoryManagerDTOSchema>;

// New DTOs
/**
 * Base DTO for Factory creation
 */
export class FactoryCreateDTO {
  @ApiProperty({ description: 'Factory code', example: 'F001' })
  @IsNotEmpty({ message: 'Factory code is required' })
  @IsString({ message: 'Factory code must be a string' })
  @MinLength(2, { message: 'Factory code must be at least 2 characters' })
  @MaxLength(50, { message: 'Factory code must not exceed 50 characters' })
  code: string;

  @ApiProperty({ description: 'Factory name', example: 'Main Factory' })
  @IsNotEmpty({ message: 'Factory name is required' })
  @IsString({ message: 'Factory name must be a string' })
  @MinLength(3, { message: 'Factory name must be at least 3 characters' })
  @MaxLength(100, { message: 'Factory name must not exceed 100 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'Factory description',
    example: 'Main production factory',
  })
  @IsOptional()
  @IsString({ message: 'Factory description must be a string' })
  @MaxLength(255, {
    message: 'Factory description must not exceed 255 characters',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Factory address',
    example: '123 Main St, City',
  })
  @IsOptional()
  @IsString({ message: 'Factory address must be a string' })
  @MaxLength(255, { message: 'Factory address must not exceed 255 characters' })
  address?: string;

  @ApiPropertyOptional({
    description: 'Department ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID(4, { message: 'Department ID must be a valid UUID' })
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Managing department ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID(4, { message: 'Managing department ID must be a valid UUID' })
  managingDepartmentId?: string;
}

/**
 * DTO for updating a factory
 */
export class FactoryUpdateDTO extends PartialType(
  OmitType(FactoryCreateDTO, ['code'] as const),
) {}

/**
 * DTO for adding a manager to a factory
 */
export class FactoryManagerDTO {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  userId: string;

  @ApiProperty({ description: 'Is primary manager', example: true })
  @IsNotEmpty({ message: 'isPrimary is required' })
  @IsBoolean({ message: 'isPrimary must be a boolean' })
  isPrimary: boolean;

  @ApiProperty({ description: 'Start date', example: '2023-01-01' })
  @IsNotEmpty({ message: 'Start date is required' })
  @Type(() => Date)
  @IsDate({ message: 'Start date must be a valid date' })
  startDate: Date;

  @ApiPropertyOptional({ description: 'End date', example: '2023-12-31' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'End date must be a valid date' })
  endDate?: Date;
}

/**
 * DTO for pagination
 */
export class PaginationDTO {
  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Sort by field', example: 'name' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'asc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}

/**
 * DTO for filtering factories
 */
export class FactoryCondDTO {
  @ApiPropertyOptional({
    description: 'Factory code',
    example: 'F001',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description: 'Factory name',
    example: 'Main Factory',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Department ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID(4, { message: 'Department ID must be a valid UUID' })
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Managing department ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID(4, { message: 'Managing department ID must be a valid UUID' })
  managingDepartmentId?: string;

  @ApiPropertyOptional({
    description: 'Search term for code or name',
    example: 'Main',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Department type filter',
    example: 'FACTORY_OFFICE',
    enum: ['HEAD_OFFICE', 'FACTORY_OFFICE'],
  })
  @IsOptional()
  @IsString()
  departmentType?: 'HEAD_OFFICE' | 'FACTORY_OFFICE';
}

/**
 * DTO for switching repository types at runtime
 */
export class SwitchRepositoryDTO {
  @ApiProperty({
    description: 'Repository type to switch to',
    example: 'prisma',
  })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiPropertyOptional({
    description: 'Optional configuration for the repository',
    example: {
      connectionString: 'postgresql://user:password@localhost:5432/database',
    },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
