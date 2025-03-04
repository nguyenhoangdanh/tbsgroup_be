import { z } from 'zod';

export const FormSettingSchema = z.object({
  primaryColor: z.string(),
  backgroundColor: z.string(),
});
