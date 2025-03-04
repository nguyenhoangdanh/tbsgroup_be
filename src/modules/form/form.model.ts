import { z } from 'zod';
export const ErrFormName = new Error('Form name is required');
export const ErrFormJsonBlocks = new Error('Form jsonBlocks is required');
export const ErrFormId = new Error('FormId is required');
export const ErrFormNotFound = new Error('Form not found');
export const ErrFormUpdate = new Error(
  'An error occurred while updating the form',
);
export const ErrFormPublish = new Error(
  'An error occurred while updating the form publish status',
);
export const ErrFormDelete = new Error(
  'An error occurred while deleting the form',
);
export const ErrFormCreate = new Error(
  'An error occurred while creating the form',
);
export const ErrFormPublishUnauthorized = new Error(
  'Unauthorized to use this resource',
);
export const ErrFormPublishRequired = new Error('Published is required');
export const ErrFormPublishSuccess = new Error('Form successfully published');
export const ErrFormUnpublishSuccess = new Error(
  'Form successfully unpublished',
);
export const ErrFormDeleteSuccess = new Error('Form successfully deleted');
export const ErrFormCreateSuccess = new Error('Form successfully created');
export const ErrFormListSuccess = new Error('Form list successfully retrieved');
export const ErrFormList = new Error(
  'An error occurred while retrieving the form list',
);
export const ErrFormListEmpty = new Error('Form list is empty');
export const ErrFormListRequired = new Error('Form list is required');
export const ErrFormListByIds = new Error(
  'An error occurred while retrieving the form list by ids',
);
export const ErrFormListByIdsEmpty = new Error('Form list by ids is empty');
export const ErrFormListByIdsRequired = new Error(
  'Form list by ids is required',
);

export const formSchema = z.object({
  formId: z.string().uuid(),
  name: z.string().min(1, ErrFormName.message),
  description: z.string(),
  jsonBlocks: z
    .array(
      z.object({
        type: z.string(),
        data: z.object({
          text: z.string().optional(),
          level: z.number().optional(),
          items: z.array(z.string()).optional(),
          style: z.string().optional(),
          caption: z.string().optional(),
          withBorder: z.boolean().optional(),
          withBackground: z.boolean().optional(),
          stretched: z.boolean().optional(),
          url: z.string().optional(),
          alt: z.string().optional(),
          file: z
            .object({
              url: z.string(),
              name: z.string(),
              size: z.number(),
            })
            .optional(),
          embed: z.string().optional(),
          service: z.string().optional(),
          source: z.string().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
        }),
      }),
    )
    .refine((jsonBlocks) => jsonBlocks.length > 0, {
      message: ErrFormJsonBlocks.message,
    }),
  creatorName: z.string(),
  settingsId: z.number(),
  published: z.boolean().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  settings: z.object({
    primaryColor: z.string().optional(),
    backgroundColor: z.string().optional(),
  }),
});
