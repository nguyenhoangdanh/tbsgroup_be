import { FormSettingSchema } from './form-settings.model';
import { z } from 'zod';

export const formSettingCreateDTOSchema = FormSettingSchema.pick({
  primaryColor: true,
  backgroundColor: true,
})
  .merge(
    z.object({
      primaryColor: z.string(),
      backgroundColor: z.string(),
    }),
  )
  .required();

export const formSettingUpdateDTOSchema = FormSettingSchema.pick({
  primaryColor: true,
  backgroundColor: true,
}).partial();

export type FormSettingCreateDTO = z.infer<typeof formSettingCreateDTOSchema>;

export const formSettingDTOSchema = FormSettingSchema;
