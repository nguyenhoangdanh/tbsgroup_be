import { z } from 'zod';

export const ErrorFactoryExist = new Error('Factory already exists');
export const ErrorFactoryNotFound = new Error('Factory not found');

export const factorySchema = z.object({
  id: z.string(),
  factoryCode: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Factory = z.infer<typeof factorySchema>;
