// digital-form-scheduler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import prisma from 'src/share/components/prisma';
import {
  DigitalForm,
  RecordStatus,
  ShiftType,
  AttendanceStatus,
} from './digital-form.model';
import { DIGITAL_FORM_REPOSITORY } from './digital-form.di-token';
import { IDigitalFormRepository } from './digital-form.port';
import { Inject } from '@nestjs/common';

@Injectable()
export class DigitalFormSchedulerService {
  private readonly logger = new Logger(DigitalFormSchedulerService.name);
  private readonly ADMIN_ID = 'd9a9b13e-b161-4500-b832-8056dd3273c6'; // ID super admin

  constructor(
    @Inject(DIGITAL_FORM_REPOSITORY)
    private readonly digitalFormRepo: IDigitalFormRepository,
  ) {}

  /**
   * Cron job chạy lúc 1 giờ sáng hàng ngày
   * Tạo digital form cho mỗi group trong hệ thống
   */
  @Cron('0 1 * * *') // Run at 1 AM daily
  async createDailyDigitalForms() {
    try {
      this.logger.log('Starting daily digital form creation');

      // Check if today is a holiday or weekend
      if (await this.isHolidayOrWeekend()) {
        this.logger.log(
          'Today is a holiday or weekend, skipping form creation',
        );
        return;
      }

      // Tìm một admin/super-admin trong hệ thống để làm người tạo form
      const adminUser = await prisma.user.findFirst({
        where: {
          OR: [{ role: { code: 'ADMIN' } }, { role: { code: 'SUPER_ADMIN' } }],
        },
      });

      if (!adminUser) {
        this.logger.error('Không tìm thấy admin user để tạo form');
        return;
      }

      const adminId = adminUser.id;
      this.logger.log(
        `Using admin user ${adminUser.fullName} (${adminId}) to create forms`,
      );

      // Get all active workers
      const workers = await prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          groupId: { not: null },
        },
        include: {
          group: true,
          team: true,
          line: true,
          factory: true,
        },
      });

      this.logger.log(
        `Found ${workers.length} workers to create digital forms for`,
      );

      // Get current date
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Create a digital form for each worker
      for (const worker of workers) {
        try {
          // Check if worker has all required organizational info
          if (
            !worker.factoryId ||
            !worker.lineId ||
            !worker.teamId ||
            !worker.groupId
          ) {
            this.logger.warn(
              `Worker ${worker.fullName} missing organizational info, skipping`,
            );
            continue;
          }

          // Check if a form already exists for this worker today
          const existingForm = await prisma.digitalProductionForm.findFirst({
            where: {
              userId: worker.id,
              date: {
                equals: today,
              },
              shiftType: ShiftType.REGULAR,
            },
          });

          if (existingForm) {
            this.logger.debug(
              `Form already exists for worker ${worker.fullName} today, skipping`,
            );
            continue;
          }

          // Generate form code
          const formCode = await this.generateFormCode(
            worker.factoryId,
            worker.lineId,
            worker.teamId,
            worker.groupId,
            today,
            ShiftType.REGULAR,
          );

          // Create form name and description with worker details
          const formName = `Phiếu công đoạn - ${worker.fullName} - ${worker.employeeId || ''} - ${today.toLocaleDateString('vi-VN')}`;
          const description = `Theo dõi sản lượng ${worker.fullName}`;

          // Create digital form
          const formId = uuidv4();
          const newForm: DigitalForm = {
            id: formId,
            formCode,
            formName,
            description,
            date: today,
            shiftType: ShiftType.REGULAR,
            factoryId: worker.factoryId,
            lineId: worker.lineId,
            teamId: worker.teamId,
            groupId: worker.groupId,
            userId: worker.id,
            status: RecordStatus.DRAFT,
            createdById: adminId, // Sử dụng ID của admin đã tìm được
            createdAt: new Date(),
            updatedById: adminId, // Sử dụng ID của admin đã tìm được
            updatedAt: new Date(),
            submitTime: null,
            approvalRequestId: null,
            approvedAt: null,
            isExported: false,
            syncStatus: null,
          };

          await this.digitalFormRepo.insertDigitalForm(newForm);
          this.logger.log(
            `Created digital form for worker ${worker.fullName}: ${formCode} (${formId})`,
          );
        } catch (error) {
          this.logger.error(
            `Error creating form for worker ${worker.fullName}: ${error.message}`,
            error.stack,
          );
          // Continue with next worker even if one fails
        }
      }

      this.logger.log('Completed daily digital form creation');
    } catch (error) {
      this.logger.error(
        `Error in daily digital form creation: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Kiểm tra xem ngày hiện tại có phải là ngày nghỉ hoặc cuối tuần không
   */
  private async isHolidayOrWeekend(): Promise<boolean> {
    const today = new Date();

    // Kiểm tra xem có phải là chủ nhật không (0 = Chủ nhật)
    if (today.getDay() === 0) {
      return true;
    }

    // Tạo danh sách các ngày lễ cố định trong năm (nếu bảng Holiday chưa được thiết lập)
    const fixedHolidays = [
      { date: '01-01', name: 'Tết Dương Lịch' }, // Tết Dương lịch
      { date: '30-04', name: 'Ngày Giải phóng miền Nam' }, // Ngày Giải phóng miền Nam
      { date: '01-05', name: 'Ngày Quốc tế Lao động' }, // Ngày Quốc tế Lao động
      { date: '02-09', name: 'Ngày Quốc khánh' }, // Ngày Quốc khánh
    ];

    // Kiểm tra ngày hiện tại có trùng với ngày lễ cố định không
    const todayMonth = (today.getMonth() + 1).toString().padStart(2, '0');
    const todayDay = today.getDate().toString().padStart(2, '0');
    const todayFormatted = `${todayDay}-${todayMonth}`;

    if (fixedHolidays.some((holiday) => holiday.date === todayFormatted)) {
      this.logger.log(`Hôm nay ${todayFormatted} là ngày lễ cố định`);
      return true;
    }

    // Thử truy vấn từ bảng Holiday (nếu có)
    try {
      const holiday = await prisma.holiday.findFirst({
        where: {
          date: {
            equals: today,
          },
          isFullDay: true,
        },
      });

      if (holiday) {
        this.logger.log(`Hôm nay là ngày lễ ${holiday.name}`);
        return true;
      }
    } catch (error) {
      this.logger.warn(
        'Không thể truy vấn bảng Holiday, sử dụng danh sách ngày lễ cố định',
        error,
      );
    }

    return false;
  }

  /**
   * Tạo digital form và entries cho một group cụ thể
   */
  // Trong phương thức createDigitalFormAndEntriesForGroup
  private async createDigitalFormAndEntriesForGroup(
    group: any,
    date: Date,
  ): Promise<void> {
    try {
      // Lấy danh sách công nhân trong group
      const workers = await prisma.user.findMany({
        where: {
          groupId: group.id,
          status: 'ACTIVE',
        },
      });

      if (workers.length === 0) {
        this.logger.log(
          `Không tìm thấy công nhân nào trong group ${group.code} - ${group.name}`,
        );
        return;
      }

      this.logger.log(
        `Tìm thấy ${workers.length} công nhân trong group ${group.code} - ${group.name}`,
      );

      // Tạo form riêng cho từng công nhân
      for (const worker of workers) {
        try {
          // Kiểm tra xem đã có form nào cho worker này trong ngày hôm nay chưa
          const existingForm = await prisma.digitalProductionForm.findFirst({
            where: {
              userId: worker.id,
              date: {
                equals: date,
              },
              shiftType: ShiftType.REGULAR,
            },
          });

          if (existingForm) {
            this.logger.log(
              `Đã tồn tại form cho worker ${worker.fullName} trong ngày hôm nay`,
            );
            continue;
          }

          // Tạo form code
          const formCode = await this.generateFormCode(
            group.team.line.factory.id,
            group.team.line.id,
            group.team.id,
            group.id,
            date,
            ShiftType.REGULAR,
          );

          // Tạo form name và description
          const formName = `Phiếu công đoạn - ${worker.fullName} - ${worker.employeeId || ''} - ${date.toLocaleDateString('vi-VN')}`;
          const description = `Theo dõi sản lượng ${worker.fullName}`;

          // Tạo digital form mới
          const formId = uuidv4();
          const newForm: DigitalForm = {
            id: formId,
            formCode,
            formName,
            description,
            date,
            shiftType: ShiftType.REGULAR,
            factoryId: group.team.line.factory.id,
            lineId: group.team.line.id,
            teamId: group.team.id,
            groupId: group.id,
            userId: worker.id, // Thêm trường userId
            status: RecordStatus.DRAFT,
            createdById: this.ADMIN_ID,
            createdAt: new Date(),
            updatedById: this.ADMIN_ID,
            updatedAt: new Date(),
            submitTime: null,
            approvalRequestId: null,
            approvedAt: null,
            isExported: false,
            syncStatus: null,
          };

          // Lưu digital form mới
          await this.digitalFormRepo.insertDigitalForm(newForm);
          this.logger.log(
            `Đã tạo digital form cho worker ${worker.fullName}: ${formCode} (${formId})`,
          );
        } catch (error) {
          this.logger.error(
            `Lỗi khi tạo form cho worker ${worker.fullName}: ${error.message}`,
            error.stack,
          );
          // Tiếp tục với worker tiếp theo nếu có lỗi
        }
      }
    } catch (error) {
      this.logger.error(
        `Lỗi khi tạo digital form và entries cho group ${group?.code} - ${group?.name}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Tạo entry mặc định cho một công nhân
   */
  private async createDefaultEntry(
    formId: string,
    userId: string,
    handBagId: string,
    bagColorId: string,
    processId: string,
  ): Promise<void> {
    try {
      // Kiểm tra xem entry đã tồn tại chưa
      const existingEntry = await prisma.productionFormEntry.findFirst({
        where: {
          formId,
          userId,
          handBagId,
          bagColorId,
          processId,
        },
      });

      if (existingEntry) {
        this.logger.debug(
          `Đã tồn tại entry cho user ${userId} trong form ${formId}`,
        );
        return;
      }

      const entryId = uuidv4();

      // Tạo dữ liệu sản xuất theo giờ mặc định - khởi tạo với giờ làm việc từ STANDARD_TIME_INTERVALS
      const defaultHourlyData: Record<string, number> = {
        '07:30-08:30': 0,
        '08:30-09:30': 0,
        '09:30-10:30': 0,
        '10:30-11:30': 0,
        '12:30-13:30': 0,
        '13:30-14:30': 0,
        '14:30-15:30': 0,
        '15:30-16:30': 0,
      };

      // Tạo entry mới
      await prisma.productionFormEntry.create({
        data: {
          id: entryId,
          formId,
          userId,
          handBagId,
          bagColorId,
          processId,
          hourlyData: defaultHourlyData,
          totalOutput: 0,
          attendanceStatus: AttendanceStatus.PRESENT,
          shiftType: ShiftType.REGULAR,
          qualityScore: 100,
          issues: [],
        },
      });

      this.logger.debug(
        `Đã tạo entry ${entryId} cho user ${userId} trong form ${formId}`,
      );
    } catch (error) {
      this.logger.error(
        `Lỗi khi tạo entry cho userId ${userId} trong formId ${formId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Tạo form code
   */
  private async generateFormCode(
    factoryId: string,
    lineId: string,
    teamId: string,
    groupId: string,
    date: Date,
    shiftType: ShiftType,
  ): Promise<string> {
    try {
      // Format: PCD-YYMMDD-FACTORY-LINE-TEAM-GROUP-SHIFT
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');

      // Get codes from repository
      const factoryCode = await this.digitalFormRepo.getFactoryCode(factoryId);
      const lineCode = await this.digitalFormRepo.getLineCode(lineId);
      const teamCode = await this.digitalFormRepo.getTeamCode(teamId);
      const groupCode = await this.digitalFormRepo.getGroupCode(groupId);

      // Convert shift type to code
      const shiftCode =
        shiftType === ShiftType.REGULAR
          ? 'R'
          : shiftType === ShiftType.EXTENDED
            ? 'E'
            : 'O';

      // Add a random suffix to ensure uniqueness
      const randomSuffix = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0');

      return `PCD-${year}${month}${day}-${factoryCode}-${lineCode}-${teamCode}-${groupCode}-${shiftCode}-${randomSuffix}`;
    } catch (error) {
      this.logger.error(
        `Error generating form code: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to generate form code: ${error.message}`);
    }
  }

  /**
   * Chạy thủ công job tạo form daily (dùng cho API)
   */
  async runDailyFormCreationManually() {
    this.logger.log('Chạy thủ công job tạo form daily');
    await this.createDailyDigitalForms();
    return true;
  }
}
