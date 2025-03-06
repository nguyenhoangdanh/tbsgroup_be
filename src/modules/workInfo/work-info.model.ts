import { z } from 'zod';

export const ErrorWorkInfoExist = new Error('WorkInfo already exists');
export const ErrorWorkInfoNotFound = new Error('WorkInfo not found');

// data model
export const workInfoSchema = z.object({
  id: z.string(),
  department: z.string(),
  position: z.string(),
  line: z.string(),
  factory: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type WorkInfo = z.infer<typeof workInfoSchema>;
