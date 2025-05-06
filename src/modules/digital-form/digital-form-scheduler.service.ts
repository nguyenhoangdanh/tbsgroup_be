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
  @Cron('0 1 * * *') // Chạy lúc 1 giờ sáng hàng ngày
  async createDailyDigitalForms() {
    try {
      this.logger.log('Bắt đầu tạo digital forms hàng ngày');

      // Kiểm tra xem hôm nay có phải là ngày nghỉ không
      if (await this.isHolidayOrWeekend()) {
        this.logger.log('Hôm nay là ngày nghỉ, không tạo digital forms');
        return;
      }

      // Lấy danh sách tất cả các groups
      const groups = await prisma.group.findMany({
        include: {
          team: {
            include: {
              line: {
                include: {
                  factory: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(`Tìm thấy ${groups.length} groups để tạo digital forms`);

      // Lấy ngày hiện tại
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Tạo digital form cho mỗi group
      for (const group of groups) {
        await this.createDigitalFormAndEntriesForGroup(group, today);
      }

      this.logger.log('Hoàn thành tạo digital forms hàng ngày');
    } catch (error) {
      this.logger.error(
        `Lỗi khi tạo digital forms hàng ngày: ${error.message}`,
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
      );
    }

    return false;
  }

  /**
   * Tạo digital form và entries cho một group cụ thể
   */
  private async createDigitalFormAndEntriesForGroup(
    group: any,
    date: Date,
  ): Promise<void> {
    try {
      // Kiểm tra xem đã có form nào cho group này trong ngày hôm nay chưa
      const existingForm = await prisma.digitalProductionForm.findFirst({
        where: {
          groupId: group.id,
          date: {
            equals: date,
          },
          shiftType: ShiftType.REGULAR,
        },
      });

      // Tạo formId mới hoặc sử dụng formId đã tồn tại
      let formId: string;

      // Nếu form đã tồn tại
      if (existingForm) {
        this.logger.log(
          `Đã tồn tại form cho group ${group.code} - ${group.name} trong ngày hôm nay`,
        );
        formId = existingForm.id;

        // Kiểm tra xem đã có entries cho form này chưa
        const existingEntries = await prisma.productionFormEntry.count({
          where: {
            formId: existingForm.id,
          },
        });

        // Nếu đã có entries, không cần tạo thêm
        if (existingEntries > 0) {
          this.logger.log(
            `Form ${existingForm.formCode} đã có ${existingEntries} entries, không cần tạo thêm`,
          );
          return;
        }
      } else {
        // Tạo form mới nếu chưa tồn tại
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
        const formName = `Phiếu công đoạn - ${group.name}`;
        const description = `Phiếu công đoạn theo dõi sản lượng nhóm ${group.name} ngày ${date.toLocaleDateString('vi-VN')}`;

        // Tạo digital form mới
        formId = uuidv4();
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
          `Đã tạo digital form cho group ${group.code} - ${group.name}: ${formCode} (${formId})`,
        );
      }

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

      // Lấy danh sách túi xách và màu sắc
      const bagColors = await prisma.bagColor.findMany({
        where: {
          active: true,
        },
        include: {
          handBag: true,
        },
        take: 1, // Lấy một mẫu để tạo entry mặc định
      });

      if (bagColors.length === 0) {
        this.logger.log(
          `Không tìm thấy mẫu túi xách nào để tạo entries cho group ${group.code}`,
        );
        return;
      }

      // Lấy danh sách quy trình
      const processes = await prisma.bagProcess.findMany({
        take: 1, // Lấy một quy trình để tạo entry mặc định
      });

      if (processes.length === 0) {
        this.logger.log(
          `Không tìm thấy quy trình nào để tạo entries cho group ${group.code}`,
        );
        return;
      }

      // Tạo entries cho từng công nhân
      for (const worker of workers) {
        await this.createDefaultEntry(
          formId, // form ID
          worker.id, // user ID
          bagColors[0].handBag.id, // handBag ID
          bagColors[0].id, // bagColor ID
          processes[0].id, // process ID
        );
      }

      this.logger.log(
        `Đã tạo ${workers.length} entries cho digital form ${formId}`,
      );
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
