import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppError, ErrNotFound, Requester, UserRole } from 'src/share';
import { v4 as uuidv4 } from 'uuid';
import { BAG_PROCESS_REPOSITORY } from './bag-process.di-token';
import {
  BagProcessCondDTO,
  BagProcessCreateDTO,
  BagProcessUpdateDTO,
  PaginationDTO,
} from './bag-process.dto';
import {
  BagProcess,
  ErrBagProcessCodeExists,
  ErrBagProcessHasPositions,
  ErrBagProcessHasProduction,
  ErrBagProcessNameExists,
  ErrBagProcessNotFound,
  ErrPermissionDenied,
} from './bag-process.model';
import { IBagProcessRepository, IBagProcessService } from './bag-process.port';

@Injectable()
export class BagProcessService implements IBagProcessService {
  private readonly logger = new Logger(BagProcessService.name);

  constructor(
    @Inject(BAG_PROCESS_REPOSITORY)
    private readonly bagProcessRepo: IBagProcessRepository,
  ) {}

  // ========== BagProcess Methods ==========
  async createBagProcess(
    requester: Requester,
    dto: BagProcessCreateDTO,
  ): Promise<string> {
    try {
      // Kiểm tra quyền
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Kiểm tra code trùng lặp
      const existingBagProcessWithCode = await this.bagProcessRepo.findBagProcessByCode(
        dto.code,
      );
      if (existingBagProcessWithCode) {
        throw AppError.from(ErrBagProcessCodeExists, 400);
      }

      // Kiểm tra name trùng lặp
      const existingBagProcessWithName = await this.bagProcessRepo.findBagProcessByCond({
        name: dto.name,
      });
      if (existingBagProcessWithName) {
        throw AppError.from(ErrBagProcessNameExists, 400);
      }

      // Tạo công đoạn mới
      const newId = uuidv4();
      const newBagProcess: BagProcess = {
        id: newId,
        code: dto.code,
        name: dto.name,
        description: dto.description || null,
        orderIndex: dto.orderIndex || 0,
        processType: dto.processType || null,
        standardOutput: dto.standardOutput || 0,
        cycleDuration: dto.cycleDuration || null,
        machineType: dto.machineType || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.bagProcessRepo.insertBagProcess(newBagProcess);
      this.logger.log(`New bag process created: ${dto.name} (${newId})`);

      return newId;
    } catch (error) {
      this.logger.error(
        `Error during bag process creation: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi tạo công đoạn: ${error.message}`),
        400,
      );
    }
  }

  async updateBagProcess(
    requester: Requester,
    id: string,
    dto: BagProcessUpdateDTO,
  ): Promise<void> {
    try {
      // Kiểm tra công đoạn tồn tại
      const bagProcess = await this.bagProcessRepo.getBagProcess(id);
      if (!bagProcess) {
        throw AppError.from(ErrBagProcessNotFound, 404);
      }

      // Kiểm tra quyền
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Kiểm tra tên trùng lặp (nếu có cập nhật tên)
      if (dto.name && dto.name !== bagProcess.name) {
        const existingWithName = await this.bagProcessRepo.findBagProcessByCond({
          name: dto.name,
        });
        if (existingWithName && existingWithName.id !== id) {
          throw AppError.from(ErrBagProcessNameExists, 400);
        }
      }

      // Cập nhật công đoạn
      await this.bagProcessRepo.updateBagProcess(id, {
        ...dto,
        updatedAt: new Date(),
      });

      this.logger.log(`Bag process updated: ${id} by ${requester.sub}`);
    } catch (error) {
      this.logger.error(
        `Error updating bag process ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi cập nhật công đoạn: ${error.message}`),
        400,
      );
    }
  }

  async deleteBagProcess(requester: Requester, id: string): Promise<void> {
    try {
      // Kiểm tra công đoạn tồn tại
      const bagProcess = await this.bagProcessRepo.getBagProcess(id);
      if (!bagProcess) {
        throw AppError.from(ErrBagProcessNotFound, 404);
      }

      // Kiểm tra quyền (chỉ ADMIN và SUPER_ADMIN có thể xóa công đoạn)
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Kiểm tra công đoạn có trong sản xuất không
      const hasProductionRecords = await this.bagProcessRepo.hasProductionRecords(id);
      if (hasProductionRecords) {
        throw AppError.from(ErrBagProcessHasProduction, 400);
      }

      // Kiểm tra công đoạn có liên kết với vị trí công việc không
      const hasPositionLinks = await this.bagProcessRepo.hasPositionLinks(id);
      if (hasPositionLinks) {
        throw AppError.from(ErrBagProcessHasPositions, 400);
      }

      // Kiểm tra công đoạn có liên kết với màu túi không
      const hasColorProcessLinks = await this.bagProcessRepo.hasColorProcessLinks(id);
      if (hasColorProcessLinks) {
        throw AppError.from(
          new Error('Công đoạn đang được sử dụng trong màu túi, không thể xóa'),
          400,
        );
      }

      // Xóa công đoạn
      await this.bagProcessRepo.deleteBagProcess(id);
      this.logger.log(`Bag process deleted: ${id} by ${requester.sub}`);
    } catch (error) {
      this.logger.error(
        `Error deleting bag process ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi xóa công đoạn: ${error.message}`),
        400,
      );
    }
  }

  async getBagProcess(id: string): Promise<BagProcess> {
    try {
      const bagProcess = await this.bagProcessRepo.getBagProcess(id);
      if (!bagProcess) {
        throw AppError.from(ErrBagProcessNotFound, 404);
      }
      return bagProcess;
    } catch (error) {
      this.logger.error(
        `Error getting bag process ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi lấy thông tin công đoạn: ${error.message}`),
        400,
      );
    }
  }

  async listBagProcesses(
    conditions: BagProcessCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: BagProcess[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const { data, total } = await this.bagProcessRepo.listBagProcesses(
        conditions,
        pagination,
      );

      return {
        data,
        total,
        page: pagination.page,
        limit: pagination.limit,
      };
    } catch (error) {
      this.logger.error(
        `Error listing bag processes: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi lấy danh sách công đoạn: ${error.message}`),
        400,
      );
    }
  }
}