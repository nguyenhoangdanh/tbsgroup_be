/**
 * Định nghĩa các model/interface cho hệ thống báo cáo sản xuất
 */

/**
 * ProductionForm - Biểu mẫu sản xuất hàng ngày
 * Đại diện cho một form báo cáo sản xuất hàng ngày được gửi từ các nhóm sản xuất
 */
export interface ProductionForm {
  id: string;
  code: string;
  date: Date;
  factoryId: string;
  factory?: Factory;
  lineId: string;
  line?: Line;
  teamId: string;
  team?: Team;
  groupId: string;
  group?: Group;
  shift: string;
  handBagId: string;
  handBag?: HandBag;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  entries: ProductionEntry[];
  createdAt: Date;
  updatedAt: Date;
  submittedBy?: string;
  approvedBy?: string;
  notes?: string;
  totalPlanned: number;
  totalOutput: number;
  efficiency: number;
}

/**
 * HourlyOutput - Kết quả sản xuất theo giờ
 * Đại diện cho số lượng sản phẩm được sản xuất trong mỗi giờ làm việc
 */
export interface HourlyOutput {
  id: string;
  formId: string;
  form?: ProductionForm;
  hour: number;
  planned: number;
  actual: number;
  cumulative: number;
  efficiency: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ProductionEntry - Bản ghi sản xuất
 * Đại diện cho một bản ghi cụ thể về sản xuất của một công nhân
 */
export interface ProductionEntry {
  id: string;
  formId: string;
  form?: ProductionForm;
  workerId: string;
  worker?: Worker;
  processId?: string;
  process?: Process;
  planned: number;
  actual: number;
  efficiency: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Worker - Công nhân
 */
export interface Worker {
  id: string;
  code: string;
  employeeId: string;
  name: string;
  groupId?: string;
  group?: Group;
  isActive: boolean;
  entries?: ProductionEntry[];
}

/**
 * Factory - Nhà máy
 */
export interface Factory {
  id: string;
  code: string;
  name: string;
  address?: string;
  description?: string;
  lines?: Line[];
  forms?: ProductionForm[];
}

/**
 * Line - Chuyền sản xuất trong nhà máy
 */
export interface Line {
  id: string;
  code: string;
  name: string;
  factoryId: string;
  factory?: Factory;
  teams?: Team[];
  forms?: ProductionForm[];
}

/**
 * Team - Tổ sản xuất trong chuyền
 */
export interface Team {
  id: string;
  code: string;
  name: string;
  lineId: string;
  line?: Line;
  groups?: Group[];
  forms?: ProductionForm[];
}

/**
 * Group - Nhóm sản xuất trong tổ
 */
export interface Group {
  id: string;
  code: string;
  name: string;
  teamId: string;
  team?: Team;
  workers?: Worker[];
  forms?: ProductionForm[];
}

/**
 * HandBag - Mẫu sản phẩm túi xách được sản xuất
 */
export interface HandBag {
  id: string;
  code: string;
  name: string;
  imageUrl?: string;
  description?: string;
  plannedOutput?: number; // Số lượng dự kiến mỗi giờ
  forms?: ProductionForm[];
}

/**
 * Process - Quy trình sản xuất
 */
export interface Process {
  id: string;
  code: string;
  name: string;
  description?: string;
  standardTime?: number; // Thời gian tiêu chuẩn để hoàn thành (phút)
  entries?: ProductionEntry[];
}

/**
 * ShiftStat - Thống kê theo ca làm việc
 */
export interface ShiftStat {
  shift: string;
  totalOutput: number;
  count: number;
  efficiency: number;
}

/**
 * RecordShiftType - Loại bản ghi theo ca
 */
export type RecordShiftType = {
  [key: string]: {
    output: number;
    count: number;
    efficiency?: number;
  };
};

/**
 * ColorStat - Thống kê theo màu sắc
 */
export interface ColorStat {
  colorCode: string;
  colorName: string;
  count: number;
  output: number;
  planned: number;
}

/**
 * ProcessStat - Thống kê theo quy trình
 */
export interface ProcessStat {
  processId: string;
  processName: string;
  count: number;
  planned: number;
  output: number;
  efficiency: number;
}

/**
 * HandBagStat - Thống kê theo mẫu túi
 */
export interface HandBagStat {
  id: string;
  code: string;
  name: string;
  imageUrl?: string;
  output: number;
  planned: number;
  count: number;
  efficiency: number;
}

/**
 * PartialAttendanceStats - Thống kê chuyên cần một phần
 */
export interface PartialAttendanceStats {
  present: number;
  absent: number;
  total: number;
  presentRate: number;
}

/**
 * DailyBreakdown - Phân tích theo ngày
 */
export interface DailyBreakdown {
  date: string;
  totalOutput: number;
  plannedOutput?: number;
  efficiency?: number;
  forms: number;
}

/**
 * ProductionSummary - Tóm tắt sản xuất
 */
export interface ProductionSummary {
  totalForms: number;
  totalEntries: number;
  totalOutput: number;
  totalPlanned: number;
  efficiency: number;
  workers?: number;
  absentRate?: number;
}
