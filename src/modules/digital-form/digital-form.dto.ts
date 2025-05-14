import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';
import {
  ShiftType,
  AttendanceStatus,
  ProductionIssueType,
  ProductionIssue,
  RecordStatus,
} from './digital-form.model';

// Helper function to add Swagger ApiProperty to class properties
// function ApiPropertyFromZod(
//   zodSchema: z.ZodTypeAny,
//   options: ApiPropertyOptions = {},
// ) {
//   return ApiProperty({
//     required: !zodSchema.isOptional(),
//     ...options,
//   });
// }

// Base pagination DTO
export const paginationDTOSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export class PaginationDTO {
  @ApiProperty({
    description: 'Page number',
    default: 1,
    minimum: 1,
    type: Number,
    required: false,
  })
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    default: 10,
    minimum: 1,
    maximum: 100,
    type: Number,
    required: false,
  })
  limit?: number;

  @ApiProperty({
    description: 'Field to sort by',
    default: 'createdAt',
    required: false,
  })
  sortBy?: string;

  @ApiProperty({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
    required: false,
  })
  sortOrder?: 'asc' | 'desc';
}

// Digital Form Create DTO
export const digitalFormCreateDTOSchema = z.object({
  userId: z.string().uuid(),
  formName: z.string().optional(),
  description: z.string().optional(),
  date: z.string(), // ISO date string
  shiftType: z.nativeEnum(ShiftType),
  // factoryId: z.string().uuid(),
  // lineId: z.string().uuid(),
  // teamId: z.string().uuid(),
  // groupId: z.string().uuid(),
});

export class DigitalFormCreateDTO {
  @ApiProperty({
    description: 'ID of the worker',
    format: 'uuid',
    required: true,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Name of the digital form',
    required: false,
    example: 'Daily Production Form - Team A',
  })
  formName?: string;

  @ApiProperty({
    description: 'Description of the digital form',
    required: false,
    example: 'Production tracking for Team A',
  })
  description?: string;

  @ApiProperty({
    description: 'Date for the form (ISO date string)',
    required: true,
    example: '2023-04-15',
  })
  date: string;

  @ApiProperty({
    description: 'Type of shift',
    enum: ShiftType,
    required: true,
    example: ShiftType.REGULAR,
  })
  shiftType: ShiftType;

  // @ApiProperty({
  //   description: 'Factory ID',
  //   format: 'uuid',
  //   required: true,
  //   example: '123e4567-e89b-12d3-a456-426614174000',
  // })
  // factoryId: string;

  // @ApiProperty({
  //   description: 'Line ID',
  //   format: 'uuid',
  //   required: true,
  //   example: '123e4567-e89b-12d3-a456-426614174001',
  // })
  // lineId: string;

  // @ApiProperty({
  //   description: 'Team ID',
  //   format: 'uuid',
  //   required: true,
  //   example: '123e4567-e89b-12d3-a456-426614174002',
  // })
  // teamId: string;

  // @ApiProperty({
  //   description: 'Group ID',
  //   format: 'uuid',
  //   required: true,
  //   example: '123e4567-e89b-12d3-a456-426614174003',
  // })
  // groupId: string;
}

// Digital Form Update DTO
export const digitalFormUpdateDTOSchema = z.object({
  formName: z.string().optional(),
  description: z.string().optional(),
});

export class DigitalFormUpdateDTO {
  @ApiProperty({
    description: 'Updated name of the digital form',
    required: false,
    example: 'Updated Daily Production Form - Team A',
  })
  formName?: string;

  @ApiProperty({
    description: 'Updated description of the digital form',
    required: false,
    example: 'Updated production tracking for Team A',
  })
  description?: string;
}

// Digital Form Submit DTO
export const digitalFormSubmitDTOSchema = z.object({
  approvalRequestId: z.string().uuid().optional(),
});

export class DigitalFormSubmitDTO {
  @ApiProperty({
    description: 'ID of the approval request (for workflow tracking)',
    format: 'uuid',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174030',
  })
  approvalRequestId?: string;
}

// Digital Form Condition DTO for filtering
export const digitalFormCondDTOSchema = z.object({
  factoryId: z.string().uuid().optional(),
  lineId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  createdById: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'CONFIRMED', 'REJECTED']).optional(),
  dateFrom: z.string().optional(), // ISO date string
  dateTo: z.string().optional(), // ISO date string
  shiftType: z.enum(['REGULAR', 'EXTENDED', 'OVERTIME']).optional(),
  search: z.string().optional(),
});

export class DigitalFormCondDTO {
  @ApiProperty({
    description: 'Filter by factory ID',
    format: 'uuid',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  factoryId?: string;

  @ApiProperty({
    description: 'Filter by line ID',
    format: 'uuid',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  lineId?: string;

  @ApiProperty({
    description: 'Filter by team ID',
    format: 'uuid',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  teamId?: string;

  @ApiProperty({
    description: 'Filter by group ID',
    format: 'uuid',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  groupId?: string;

  @ApiProperty({
    description: 'Filter by creator ID',
    format: 'uuid',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174004',
  })
  createdById?: string;

  @ApiProperty({
    description: 'Filter by form status',
    enum: ['DRAFT', 'PENDING', 'CONFIRMED', 'REJECTED'],
    required: false,
    example: 'DRAFT',
  })
  status?: 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'REJECTED';

  @ApiProperty({
    description: 'Filter by start date (YYYY-MM-DD)',
    required: false,
    example: '2023-04-01',
  })
  dateFrom?: string;

  @ApiProperty({
    description: 'Filter by end date (YYYY-MM-DD)',
    required: false,
    example: '2023-04-30',
  })
  dateTo?: string;

  @ApiProperty({
    description: 'Filter by shift type',
    enum: ['REGULAR', 'EXTENDED', 'OVERTIME'],
    required: false,
    example: 'REGULAR',
  })
  shiftType?: 'REGULAR' | 'EXTENDED' | 'OVERTIME';

  @ApiProperty({
    description: 'Search in form code and name',
    required: false,
    example: 'Team A',
  })
  search?: string;
}

// Form Entry DTO
export class ProductionIssueDTO {
  @ApiProperty({
    description: 'Type of production issue',
    enum: ProductionIssueType,
    required: true,
    example: ProductionIssueType.WAITING_MATERIALS,
  })
  type: ProductionIssueType;

  @ApiProperty({
    description: 'Hour when the issue occurred (0-23)',
    type: Number,
    required: true,
    example: 2,
  })
  hour: number;

  @ApiProperty({
    description: 'Impact of the issue (percentage 0-100)',
    type: Number,
    required: true,
    minimum: 0,
    maximum: 100,
    example: 20,
  })
  impact: number;

  @ApiProperty({
    description: 'Description of the issue',
    required: false,
    example: 'Waiting for materials for 20 minutes',
  })
  description?: string;
}

export class DigitalFormEntryDTO {
  @ApiProperty({
    description: 'ID of the worker',
    format: 'uuid',
    required: true,
    example: '123e4567-e89b-12d3-a456-426614174011',
  })
  userId: string;

  @ApiProperty({
    description: 'ID of the handbag model',
    format: 'uuid',
    required: true,
    example: '123e4567-e89b-12d3-a456-426614174012',
  })
  handBagId: string;

  @ApiProperty({
    description: 'ID of the bag color',
    format: 'uuid',
    required: true,
    example: '123e4567-e89b-12d3-a456-426614174013',
  })
  bagColorId: string;

  @ApiProperty({
    description: 'ID of the production process',
    format: 'uuid',
    required: true,
    example: '123e4567-e89b-12d3-a456-426614174014',
  })
  processId: string;

  @ApiProperty({
    description: 'Planned output for this entry',
    type: Number,
    required: true,
    example: 50,
    default: 0,
  })
  plannedOutput: number = 0;

  @ApiProperty({
    description: 'Hourly production data (hour -> output count)',
    required: false,
    example: {
      '07:30-08:30': 12,
      '08:30-09:30': 15,
      '09:30-10:30': 18,
    },
    default: {},
  })
  hourlyData: Record<string, number> = {};

  @ApiProperty({
    description: 'Total output for the day',
    type: Number,
    required: false,
    example: 45,
    default: 0,
  })
  totalOutput = 0;

  @ApiProperty({
    description: 'Attendance status of the worker',
    enum: AttendanceStatus,
    required: false,
    example: AttendanceStatus.PRESENT,
    default: AttendanceStatus.PRESENT,
  })
  attendanceStatus?: AttendanceStatus;

  @ApiProperty({
    description: 'ShiftType of the worker',
    enum: ShiftType,
    required: true,
    example: ShiftType.REGULAR,
    default: ShiftType.REGULAR,
  })
  shiftType: ShiftType;

  @ApiProperty({
    description: 'Check-in time (ISO datetime)',
    required: false,
    example: '2023-04-15T07:25:00.000Z',
  })
  checkInTime?: string;

  @ApiProperty({
    description: 'Check-out time (ISO datetime)',
    required: false,
    example: '2023-04-15T16:35:00.000Z',
  })
  checkOutTime?: string;

  @ApiProperty({
    description: 'Note about attendance',
    required: false,
    example: 'Worker performed well today',
  })
  attendanceNote?: string;

  @ApiProperty({
    description: 'Production issues encountered',
    type: [ProductionIssueDTO],
    required: false,
    example: [
      {
        type: ProductionIssueType.WAITING_MATERIALS,
        hour: 2,
        impact: 20,
        description: 'Waiting for materials for 20 minutes',
      },
    ],
  })
  issues?: ProductionIssueDTO[];

  @ApiProperty({
    description: 'Quality score (0-100)',
    type: Number,
    required: false,
    minimum: 0,
    maximum: 100,
    example: 90,
    default: 100,
  })
  qualityScore?: number;

  @ApiProperty({
    description: 'Notes about quality',
    required: false,
    example: 'Minor quality issues with stitching',
  })
  qualityNotes?: string;
}

export const digitalFormEntryDTOSchema = z.object({
  userId: z.string().uuid(),
  handBagId: z.string().uuid(),
  bagColorId: z.string().uuid(),
  processId: z.string().uuid(),

  // Hourly data as a record of hour -> output
  hourlyData: z.record(z.string(), z.number()).default({}),
  plannedOutput: z.number().int().default(0),
  // Total output calculated from hourly data
  totalOutput: z.number().int().default(0),

  // Attendance information
  attendanceStatus: z
    .enum(['PRESENT', 'ABSENT', 'LATE', 'EARLY_LEAVE', 'LEAVE_APPROVED'])
    .transform((val) => AttendanceStatus[val as keyof typeof AttendanceStatus])
    .default('PRESENT'),

  shiftType: z
    .enum(['REGULAR', 'EXTENDED', 'OVERTIME'])
    .transform((val) => ShiftType[val as keyof typeof ShiftType])
    .default(ShiftType.REGULAR),

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

// Update Form Entry DTO
export class UpdateFormEntryDTO {
  @ApiProperty({
    description: 'ID worker',
    format: 'uuid',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174012',
  })
  userId?: string;

  @ApiProperty({
    description: 'ID of the handbag model',
    format: 'uuid',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174012',
  })
  handBagId?: string;

  @ApiProperty({
    description: 'ID of the bag color',
    format: 'uuid',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174013',
  })
  bagColorId?: string;

  @ApiProperty({
    description: 'ID of the production process',
    format: 'uuid',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174014',
  })
  processId?: string;

  @ApiProperty({
    description: 'Planned output goal',
    type: Number,
    required: false,
    example: 50,
  })
  plannedOutput?: number;

  @ApiProperty({
    description: 'Hourly production data (hour -> output count)',
    required: false,
    example: {
      '07:30-08:30': 14,
      '08:30-09:30': 17,
      '09:30-10:30': 19,
    },
  })
  hourlyData?: Record<string, number>;

  @ApiProperty({
    description: 'Total output for the day',
    type: Number,
    required: false,
    example: 50,
  })
  totalOutput?: number;

  @ApiProperty({
    description: 'Attendance status of the worker',
    enum: AttendanceStatus,
    required: false,
    example: AttendanceStatus.PRESENT,
  })
  attendanceStatus?: AttendanceStatus;

  @ApiProperty({
    description: 'Shift type of the worker',
    enum: ShiftType,
    required: false,
    example: ShiftType.REGULAR,
  })
  shiftType?: ShiftType;

  @ApiProperty({
    description: 'Check-in time (ISO datetime)',
    required: false,
    example: '2023-04-15T07:25:00.000Z',
  })
  checkInTime?: string;

  @ApiProperty({
    description: 'Check-out time (ISO datetime)',
    required: false,
    example: '2023-04-15T16:35:00.000Z',
  })
  checkOutTime?: string;

  @ApiProperty({
    description: 'Note about attendance',
    required: false,
    example: 'Updated attendance note',
  })
  attendanceNote?: string;

  @ApiProperty({
    description: 'Production issues encountered',
    type: [ProductionIssueDTO],
    required: false,
    example: [
      {
        type: ProductionIssueType.QUALITY_ISSUES,
        hour: 3,
        impact: 15,
        description: 'Quality issue with materials',
      },
    ],
  })
  issues?: ProductionIssueDTO[];

  @ApiProperty({
    description: 'Quality score (0-100)',
    type: Number,
    required: false,
    minimum: 0,
    maximum: 100,
    example: 95,
  })
  qualityScore?: number;

  @ApiProperty({
    description: 'Notes about quality',
    required: false,
    example: 'Updated quality notes',
  })
  qualityNotes?: string;
}

// Schemas cho các issues tracking
export const productionIssueSchema = z.object({
  type: z.nativeEnum(ProductionIssueType),
  hour: z.number().int(),
  impact: z.number().int().min(0).max(100),
  description: z.string().optional(),
});

export const updateFormEntryDTOSchema = z.object({
  // Không cho phép thay đổi userId

  // Các trường có thể cập nhật
  handBagId: z.string().uuid().optional(),
  bagColorId: z.string().uuid().optional(),
  processId: z.string().uuid().optional(),

  hourlyData: z.record(z.string(), z.number()).optional(),
  plannedOutput: z.number().int().optional(),
  totalOutput: z.number().int().optional(),

  attendanceStatus: z.nativeEnum(AttendanceStatus).optional(),
  shiftType: z.nativeEnum(ShiftType).optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  attendanceNote: z.string().optional(),

  issues: z.array(productionIssueSchema).optional(),

  qualityScore: z.number().int().min(0).max(100).optional(),
  qualityNotes: z.string().optional(),
});

// DTO cho các responses
export class DigitalFormResponseDTO {
  @ApiProperty({
    description: 'Success status',
    type: Boolean,
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'ID of the created form',
    type: Object,
    example: { id: '123e4567-e89b-12d3-a456-426614174000' },
  })
  data: { id: string };
}

export class DigitalFormListResponseDTO {
  @ApiProperty({
    description: 'Success status',
    type: Boolean,
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Array of digital forms',
    type: Array,
    example: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        formCode: 'PCD-230415-F01-L03-T02-G01-R-001',
        formName: 'Daily Production Form - Team A',
        status: 'DRAFT',
        date: '2023-04-15T00:00:00.000Z',
      },
    ],
  })
  data: any[];

  @ApiProperty({
    description: 'Total number of forms',
    type: Number,
    example: 42,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    type: Number,
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    type: Number,
    example: 10,
  })
  limit: number;
}

// Trong digital-form.model.ts, cập nhật DigitalForm interface
export interface DigitalForm {
  id: string;
  formCode: string;
  formName: string;
  description: string | null;
  date: Date;
  shiftType: ShiftType;
  factoryId: string;
  lineId: string;
  teamId: string;
  groupId: string;
  userId: string; // Thêm trường này
  status: RecordStatus;
  createdById: string;
  createdAt: Date;
  updatedById: string | null;
  updatedAt: Date;
  submitTime: Date | null;
  approvalRequestId: string | null;
  approvedAt: Date | null;
  isExported: boolean;
  syncStatus: string | null;
}

// Cập nhật DigitalFormEntry interface
export interface DigitalFormEntry {
  id: string;
  formId: string;
  userId: string;
  handBagId: string;
  bagColorId: string;
  processId: string;
  plannedOutput: number; // Thêm trường này
  hourlyData: Record<string, number>;
  totalOutput: number;
  attendanceStatus: AttendanceStatus;
  shiftType: ShiftType;
  checkInTime: Date | null;
  checkOutTime: Date | null;
  attendanceNote: string | null;
  issues?: ProductionIssue[];
  qualityScore: number;
  qualityNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
