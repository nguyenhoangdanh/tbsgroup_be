import { z } from 'zod';

// Business errors
export const ErrFormNotFound = new Error('Digital form not found');
export const ErrPermissionDenied = new Error(
  'You do not have permission to perform this action',
);
export const ErrFormAlreadySubmitted = new Error(
  'Form has already been submitted',
);

// Enums
export enum ShiftType {
  REGULAR = 'REGULAR', // 7h30 - 16h30
  EXTENDED = 'EXTENDED', // 16h30 - 18h
  OVERTIME = 'OVERTIME', // 18h - 20h
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EARLY_LEAVE = 'EARLY_LEAVE',
  LEAVE_APPROVED = 'LEAVE_APPROVED',
}

export enum RecordStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

export enum ProductionIssueType {
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  WAITING_MATERIALS = 'WAITING_MATERIALS',
  QUALITY_ISSUES = 'QUALITY_ISSUES',
  LOST_MATERIALS = 'LOST_MATERIALS',
  OTHER = 'OTHER',
}

// Interface for production issue
export interface ProductionIssue {
  type: ProductionIssueType;
  hour: number;
  impact: number; // percentage impact 0-100
  description?: string;
}

// Digital Form model
export const digitalFormSchema = z.object({
  id: z.string().uuid(),
  formCode: z.string(),
  formName: z.string(),
  description: z.string().nullable(),
  date: z.date(),
  shiftType: z.nativeEnum(ShiftType),
  lineId: z.string().uuid(),
  status: z.nativeEnum(RecordStatus).default(RecordStatus.DRAFT),

  // User and timestamp fields
  createdById: z.string().uuid(),
  createdAt: z.date(),
  updatedById: z.string().uuid().nullable(),
  updatedAt: z.date(),
  submitTime: z.date().nullable(),

  // Approval workflow
  approvalRequestId: z.string().uuid().nullable(),
  approvedAt: z.date().nullable(),

  // Sync status
  isExported: z.boolean().default(false),
  syncStatus: z.string().nullable(),
});

export type DigitalForm = z.infer<typeof digitalFormSchema>;

// Digital Form Entry model
export const digitalFormEntrySchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  userId: z.string().uuid(),
  handBagId: z.string().uuid(),
  bagColorId: z.string().uuid(),
  processId: z.string().uuid(),

  // Production data
  hourlyData: z.record(z.string(), z.number()).default({}),
  totalOutput: z.number().int().default(0),

  // Attendance data
  attendanceStatus: z
    .nativeEnum(AttendanceStatus)
    .default(AttendanceStatus.PRESENT),
  checkInTime: z.date().nullable(),
  checkOutTime: z.date().nullable(),
  attendanceNote: z.string().nullable(),

  // Issues
  issues: z
    .array(
      z.object({
        type: z.nativeEnum(ProductionIssueType),
        hour: z.number().int(),
        impact: z.number().int().min(0).max(100),
        description: z.string().optional(),
      }),
    )
    .optional(),

  // Quality data
  qualityScore: z.number().int().min(0).max(100).default(100),
  qualityNotes: z.string().nullable(),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DigitalFormEntry = z.infer<typeof digitalFormEntrySchema>;

// Summary data model for reports
export interface ProductionSummary {
  userId: string;
  userName: string;
  totalOutput: number;
  averageQuality: number;
  attendanceStatus: AttendanceStatus;
  attendanceHours: number;
  issues: ProductionIssue[];
}

// Time interval definition for the form
export interface TimeInterval {
  start: string; // e.g., "07:30"
  end: string; // e.g., "08:30"
  label: string; // e.g., "07:30-08:30"
}

// Standard time intervals for the form
export const STANDARD_TIME_INTERVALS: TimeInterval[] = [
  { start: '07:30', end: '08:30', label: '07:30-08:30' },
  { start: '08:30', end: '09:30', label: '08:30-09:30' },
  { start: '09:30', end: '10:30', label: '09:30-10:30' },
  { start: '10:30', end: '11:30', label: '10:30-11:30' },
  { start: '12:30', end: '13:30', label: '12:30-13:30' },
  { start: '13:30', end: '14:30', label: '13:30-14:30' },
  { start: '14:30', end: '15:30', label: '14:30-15:30' },
  { start: '15:30', end: '16:30', label: '15:30-16:30' },
  { start: '16:30', end: '17:30', label: '16:30-17:30' },
  { start: '17:30', end: '18:00', label: '17:30-18:00' },
  { start: '18:00', end: '19:00', label: '18:00-19:00' },
  { start: '19:00', end: '20:00', label: '19:00-20:00' },
];
