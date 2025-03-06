import { z } from 'zod';

export const ErrorLineExists = new Error('Line already exists');
export const ErrorLineNotFound = new Error('Line not found');

export const lineSchema = z.object({
  id: z.string().uuid(),
  lineCode: z.string(),
  name: z.string(),
  description: z.string().optional(),
  factoryId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Line = z.infer<typeof lineSchema>;
