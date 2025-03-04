import { formSchema } from './form.model';
import { z } from 'zod';
export const formCreateDTOSchema = formSchema
  .pick({
    name: true,
    description: true,
    jsonBlocks: true,
    creatorName: true,
    settingsId: true,
  })
  .merge(
    z.object({
      creatorName: z.string(),
      settingsId: z.number(),
    }),
  )
  .required();

export const formUpdateDTOSchema = formSchema
  .pick({ name: true, description: true, jsonBlocks: true })
  .partial();

export const formDTOSchema = formSchema;

export type FormCondDTO = z.infer<typeof formDTOSchema>;

export type FormCreateDTO = z.infer<typeof formCreateDTOSchema>;

export type FormUpdateDTO = z.infer<typeof formUpdateDTOSchema>;
