import { AttendanceStatus, ShiftType } from '@prisma/client';

/**
 * Interface for hourly output data
 */
export interface HourlyOutput {
  output: number;
  issues: number;
}

/**
 * Interface for production entry (worker's entry in a form)
 */
export interface ProductionEntry {
  id: string;
  totalOutput: number;
  plannedOutput: number;
  attendanceStatus: AttendanceStatus;
  handBagId: string;
  bagColorId?: string;
  processId?: string;
  hourlyData?: Record<string, { output: number; qualityIssues: number }>;
  handBag?: {
    id: string;
    code: string;
    name: string;
  };
  bagColor?: {
    id: string;
    colorCode: string;
    colorName: string;
  };
  process?: {
    id: string;
    code: string;
    name: string;
  };
  user?: {
    id: string;
    fullName: string;
    employeeId: string;
  };
}

/**
 * Interface for production form
 */
export interface ProductionForm {
  id: string;
  shiftType: ShiftType;
  factoryId: string;
  lineId?: string;
  teamId?: string;
  groupId?: string;
  team?: {
    id: string;
    code: string;
    name: string;
  };
  group?: {
    id: string;
    code: string;
    name: string;
  };
  entries: ProductionEntry[];
}
