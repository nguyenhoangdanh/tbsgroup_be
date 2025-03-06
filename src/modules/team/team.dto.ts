import z from 'zod';
import { teamSchema } from './team.model';

export const teamDTOSchema = teamSchema
  .pick({
    teamCode: true,
    name: true,
    description: true,
    lineId: true,
  })
  .required({
    name: true,
    teamCode: true,
    lineId: true,
  });

export type TeamDTO = z.infer<typeof teamDTOSchema>;
