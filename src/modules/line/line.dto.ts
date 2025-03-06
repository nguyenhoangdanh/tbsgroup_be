import z from 'zod';
import { lineSchema } from './line.model';

export const LineDTOSchema = lineSchema
  .pick({
    lineCode: true,
    name: true,
    description: true,
    factoryId: true,
  })
  .required({
    name: true,
    lineCode: true,
    factoryId: true,
  });

export type LineDTO = z.infer<typeof LineDTOSchema>;
