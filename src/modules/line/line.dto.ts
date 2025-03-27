import { z } from 'zod';
import { lineSchema } from './line.model';

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
  code!: string;
  name!: string;
  factoryId!: string;
  description?: string | null;
  capacity?: number;
  
  // Static validation method
  static validate(data: any): boolean {
    try {
      lineCreateDTOSchema.parse(data);
      return true;
    } catch (error) {
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
  name?: string;
  description?: string | null;
  capacity?: number;
  updatedAt?: Date;
  
  // Static validation method
  static validate(data: any): boolean {
    try {
      lineUpdateDTOSchema.parse(data);
      return true;
    } catch (error) {
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
  code?: string;
  name?: string;
  factoryId?: string;
  search?: string;
  
  // Static validation method
  static validate(data: any): boolean {
    try {
      lineCondDTOSchema.parse(data);
      return true;
    } catch (error) {
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
  userId!: string;
  isPrimary: boolean = false;
  startDate!: Date;
  endDate?: Date | null;
  
  // Static validation method
  static validate(data: any): boolean {
    try {
      lineManagerDTOSchema.parse(data);
      return true;
    } catch (error) {
      return false;
    }
  }
}