import { z } from 'zod';
import {
  ShiftType,
  AttendanceStatus,
  RecordStatus,
  ProductionIssueType,
} from './digital-form.model';

// Base pagination DTO
export const paginationDTOSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PaginationDTO = z.infer<typeof paginationDTOSchema>;

// Digital Form Create DTO
export const digitalFormCreateDTOSchema = z.object({
  formName: z.string().optional(),
  description: z.string().optional(),
  date: z.string(), // ISO date string
  shiftType: z.nativeEnum(ShiftType),
  lineId: z.string().uuid(),
});

export type DigitalFormCreateDTO = z.infer<typeof digitalFormCreateDTOSchema>;

// Digital Form Update DTO
export const digitalFormUpdateDTOSchema = z.object({
  formName: z.string().optional(),
  description: z.string().optional(),
});

export type DigitalFormUpdateDTO = z.infer<typeof digitalFormUpdateDTOSchema>;

// Digital Form Submit DTO
export const digitalFormSubmitDTOSchema = z.object({
  approvalRequestId: z.string().uuid().optional(),
});

export type DigitalFormSubmitDTO = z.infer<typeof digitalFormSubmitDTOSchema>;

// Digital Form Condition DTO for filtering
export const digitalFormCondDTOSchema = z.object({
  lineId: z.string().uuid().optional(),
  createdById: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'CONFIRMED', 'REJECTED']).optional(),
  dateFrom: z.string().optional(), // ISO date string
  dateTo: z.string().optional(), // ISO date string
  shiftType: z.enum(['REGULAR', 'EXTENDED', 'OVERTIME']).optional(),
  search: z.string().optional(),
});

export type DigitalFormCondDTO = z.infer<typeof digitalFormCondDTOSchema>;

// Form Entry DTO
export const digitalFormEntryDTOSchema = z.object({
  userId: z.string().uuid(),
  handBagId: z.string().uuid(),
  bagColorId: z.string().uuid(),
  processId: z.string().uuid(),

  // Hourly data as a record of hour -> output
  hourlyData: z.record(z.string(), z.number()).default({}),

  // Total output calculated from hourly data
  totalOutput: z.number().int().default(0),

  // Attendance information
  attendanceStatus: z
    .enum(['PRESENT', 'ABSENT', 'LATE', 'EARLY_LEAVE', 'LEAVE_APPROVED'])
    .transform((val) => AttendanceStatus[val as keyof typeof AttendanceStatus])
    .default('PRESENT'),

  checkInTime: z.string().optional(), // ISO datetime string
  checkOutTime: z.string().optional(), // ISO datetime string
  attendanceNote: z.string().optional(),

  // Issues tracking
  issues: z
    .array(
      z.object({
        type: z
          .enum([
            'ABSENT',
            'LATE',
            'WAITING_MATERIALS',
            'QUALITY_ISSUES',
            'LOST_MATERIALS',
            'OTHER',
          ])
          .transform(
            (val) =>
              ProductionIssueType[val as keyof typeof ProductionIssueType],
          ),
        hour: z.number().int(),
        impact: z.number().int().min(0).max(100),
        description: z.string().optional(),
      }),
    )
    .optional(),

  // Quality information
  qualityScore: z.number().int().min(0).max(100).default(100),
  qualityNotes: z.string().optional(),
});

export type DigitalFormEntryDTO = z.infer<typeof digitalFormEntryDTOSchema>;

// Update Form Entry DTO
export const updateFormEntryDTOSchema = z.object({
  hourlyData: z.record(z.string(), z.number()).optional(),
  totalOutput: z.number().int().optional(),
  attendanceStatus: z
    .enum(['PRESENT', 'ABSENT', 'LATE', 'EARLY_LEAVE', 'LEAVE_APPROVED'])
    .transform((val) => AttendanceStatus[val as keyof typeof AttendanceStatus])
    .optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  attendanceNote: z.string().optional(),
  issues: z
    .array(
      z.object({
        type: z
          .enum([
            'ABSENT',
            'LATE',
            'WAITING_MATERIALS',
            'QUALITY_ISSUES',
            'LOST_MATERIALS',
            'OTHER',
          ])
          .transform(
            (val) =>
              ProductionIssueType[val as keyof typeof ProductionIssueType],
          ),
        hour: z.number().int(),
        impact: z.number().int().min(0).max(100),
        description: z.string().optional(),
      }),
    )
    .optional(),
  qualityScore: z.number().int().min(0).max(100).optional(),
  qualityNotes: z.string().optional(),
});

export type UpdateFormEntryDTO = z.infer<typeof updateFormEntryDTOSchema>;
