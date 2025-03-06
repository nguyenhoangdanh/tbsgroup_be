import z from 'zod';
import { factorySchema } from './factory.model';

export const FactoryDTOSchema = factorySchema
  .pick({
    factoryCode: true,
    name: true,
    description: true,
  })
  .required({
    name: true,
    factoryCode: true,
  });

export type FactoryDTO = z.infer<typeof FactoryDTOSchema>;
