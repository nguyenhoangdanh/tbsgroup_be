import { z } from 'zod';
import { lineSchema } from './line.model';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// DTO Schema for creating a new line
export const lineCreateDTOSchema = lineSchema
  .pick({
    code: true,
    name: true,
    description: true,
    factoryId: true,
    capacity: true,
  })
  .partial({
    description: true,
    capacity: true,
  })
  .required({
    code: true,
    name: true,
    factoryId: true,
  });

// DTO Class for creating a line - used with CrudController
export class LineCreateDTO {
  @ApiProperty({ description: 'Line code', example: 'L001' })
  code!: string;

  @ApiProperty({ description: 'Line name', example: 'Assembly Line 1' })
  name!: string;

  @ApiProperty({ description: 'Factory ID', example: 'uuid-string' })
  factoryId!: string;

  @ApiPropertyOptional({ description: 'Line description', nullable: true })
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Line capacity',
    type: Number,
    example: 500,
  })
  capacity?: number;

  // Static validation method
  static validate(data: any): boolean {
    try {
      lineCreateDTOSchema.parse(data);
      return true;
    } catch {
      // Error handling without storing the error variable
      return false;
    }
  }
}

// DTO Schema for updating a line
export const lineUpdateDTOSchema = lineSchema
  .pick({
    name: true,
    description: true,
    capacity: true,
    updatedAt: true,
  })
  .partial();

// DTO Class for updating a line - used with CrudController
export class LineUpdateDTO {
  @ApiPropertyOptional({ description: 'Line name', example: 'Assembly Line 1' })
  name?: string;

  @ApiPropertyOptional({ description: 'Line description', nullable: true })
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Line capacity',
    type: Number,
    example: 500,
  })
  capacity?: number;

  @ApiPropertyOptional({ description: 'Last update timestamp' })
  updatedAt?: Date;

  // Static validation method
  static validate(data: any): boolean {
    try {
      lineUpdateDTOSchema.parse(data);
      return true;
    } catch {
      // Error handling without storing the error variable
      return false;
    }
  }
}

// DTO Schema for line search conditions
export const lineCondDTOSchema = lineSchema
  .pick({
    code: true,
    name: true,
    factoryId: true,
  })
  .extend({
    search: z.string().optional(),
  })
  .partial();

// DTO Class for line search conditions - used with CrudController
export class LineCondDTO {
  @ApiPropertyOptional({ description: 'Line code filter', example: 'L001' })
  code?: string;

  @ApiPropertyOptional({ description: 'Line name filter', example: 'Assembly' })
  name?: string;

  @ApiPropertyOptional({ description: 'Factory ID filter' })
  factoryId?: string;

  @ApiPropertyOptional({ description: 'General search term' })
  search?: string;

  // Static validation method
  static validate(data: any): boolean {
    try {
      lineCondDTOSchema.parse(data);
      return true;
    } catch {
      // Error handling without storing the error variable
      return false;
    }
  }
}

// DTO Schema for line manager
export const lineManagerDTOSchema = z.object({
  userId: z.string().uuid(),
  isPrimary: z.boolean().default(false),
  startDate: z.date(),
  endDate: z.date().nullable().optional(),
});

// DTO Class for line manager
export class LineManagerDTO {
  @ApiProperty({ description: 'User ID', example: 'uuid-string' })
  userId!: string;

  @ApiPropertyOptional({ description: 'Is primary manager', default: false })
  isPrimary: boolean = false;

  @ApiProperty({ description: 'Start date', type: Date })
  startDate!: Date;

  @ApiPropertyOptional({ description: 'End date', nullable: true, type: Date })
  endDate?: Date | null;

  // Static validation method
  static validate(data: any): boolean {
    try {
      lineManagerDTOSchema.parse(data);
      return true;
    } catch {
      // Error handling without storing the error variable
      return false;
    }
  }
}
