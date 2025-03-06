import { z } from 'zod';

export const ErrorTeamOfLineExists = new Error(`Team of line already exists`);

export const ErrorTeamOfLineNotFound = new Error(`Team of line not found`);

export const teamSchema = z.object({
  id: z.string().uuid(),
  teamCode: z.string(),
  name: z.string(),
  description: z.string().optional(),
  lineId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Team = z.infer<typeof teamSchema>;
