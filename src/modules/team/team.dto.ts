import { z } from 'zod';
import { teamSchema } from './team.model';

// DTO Schema for creating a new team
export const teamCreateDTOSchema = teamSchema
  .pick({
    code: true,
    name: true,
    description: true,
    lineId: true,
  })
  .partial({
    description: true,
  })
  .required({
    code: true,
    name: true,
    lineId: true,
  });

// DTO Class for creating a team - used with CrudController
export class TeamCreateDTO {
  code!: string;
  name!: string;
  lineId!: string;
  description?: string | null;

  // Static validation method
  static validate(data: any): boolean {
    try {
      teamCreateDTOSchema.parse(data);
      return true;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }
}

// DTO Schema for updating a team
export const teamUpdateDTOSchema = teamSchema
  .pick({
    name: true,
    description: true,
    updatedAt: true,
  })
  .partial();

// DTO Class for updating a team - used with CrudController
export class TeamUpdateDTO {
  name?: string;
  description?: string | null;
  updatedAt?: Date;

  // Static validation method
  static validate(data: any): boolean {
    try {
      teamUpdateDTOSchema.parse(data);
      return true;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }
}

// DTO Schema for team search conditions
export const teamCondDTOSchema = teamSchema
  .pick({
    code: true,
    name: true,
    lineId: true,
  })
  .extend({
    search: z.string().optional(),
  })
  .partial();

// DTO Class for team search conditions - used with CrudController
export class TeamCondDTO {
  code?: string;
  name?: string;
  lineId?: string;
  search?: string;

  // Static validation method
  static validate(data: any): boolean {
    try {
      teamCondDTOSchema.parse(data);
      return true;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }
}

// DTO Schema for team leader
export const teamLeaderDTOSchema = z.object({
  userId: z.string().uuid(),
  isPrimary: z.boolean().default(false),
  startDate: z.date(),
  endDate: z.date().nullable().optional(),
});

// DTO Class for team leader
export class TeamLeaderDTO {
  userId!: string;
  isPrimary: boolean = false;
  startDate!: Date;
  endDate?: Date | null;

  // Static validation method
  static validate(data: any): boolean {
    try {
      teamLeaderDTOSchema.parse(data);
      return true;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }
}
