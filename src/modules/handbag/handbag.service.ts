import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppError, ErrNotFound, Requester, UserRole } from 'src/share';
import { v4 as uuidv4 } from 'uuid';
import { HANDBAG_REPOSITORY } from './handbag.di-token';
import {
  BagColorCondDTO,
  BagColorCreateDTO,
  BagColorProcessCondDTO,
  BagColorProcessCreateDTO,
  BagColorProcessUpdateDTO,
  BagColorUpdateDTO,
  HandBagCondDTO,
  HandBagCreateDTO,
  HandBagUpdateDTO,
  PaginationDTO,
} from './handbag.dto';
import {
  BagColor,
  BagColorProcess,
  ErrBagColorCodeExists,
  ErrBagColorNotFound,
  ErrBagColorProcessExists,
  ErrBagColorProcessNotFound,
  ErrBagProcessNotFound,
  ErrHandBagCodeExists,
  ErrHandBagHasProduction,
  ErrHandBagNameExists,
  ErrHandBagNotFound,
  ErrPermissionDenied,
  HandBag,
} from './handbag.model';
import { IHandBagRepository, IHandBagService } from './handbag.port';

@Injectable()
export class HandBagService implements IHandBagService {
  private readonly logger = new Logger(HandBagService.name);

  constructor(
    @Inject(HANDBAG_REPOSITORY)
    private readonly handBagRepo: IHandBagRepository,
  ) {}

  // ========== HandBag Methods ==========
  async createHandBag(
    requester: Requester,
    dto: HandBagCreateDTO,
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
      const existingHandBagWithCode = await this.handBagRepo.findHandBagByCode(
        dto.code,
      );
      if (existingHandBagWithCode) {
        throw AppError.from(ErrHandBagCodeExists, 400);
      }

      // Kiểm tra name trùng lặp
      const existingHandBagWithName = await this.handBagRepo.findHandBagByCond({
        name: dto.name,
      });
      if (existingHandBagWithName) {
        throw AppError.from(ErrHandBagNameExists, 400);
      }

      // Tạo túi mới
      const newId = uuidv4();
      const newHandBag: HandBag = {
        id: newId,
        code: dto.code,
        name: dto.name,
        description: dto.description || null,
        imageUrl: dto.imageUrl || null,
        active: dto.active !== undefined ? dto.active : true,
        category: dto.category || null,
        dimensions: dto.dimensions || null,
        material: dto.material || null,
        weight: dto.weight || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.handBagRepo.insertHandBag(newHandBag);
      this.logger.log(`New handbag created: ${dto.name} (${newId})`);

      return newId;
    } catch (error) {
      this.logger.error(
        `Error during handbag creation: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi tạo túi xách: ${error.message}`),
        400,
      );
    }
  }

  async updateHandBag(
    requester: Requester,
    id: string,
    dto: HandBagUpdateDTO,
  ): Promise<void> {
    try {
      // Kiểm tra túi tồn tại
      const handBag = await this.handBagRepo.getHandBag(id);
      if (!handBag) {
        throw AppError.from(ErrHandBagNotFound, 404);
      }

      // Kiểm tra quyền
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Kiểm tra tên trùng lặp (nếu có cập nhật tên)
      if (dto.name && dto.name !== handBag.name) {
        const existingWithName = await this.handBagRepo.findHandBagByCond({
          name: dto.name,
        });
        if (existingWithName && existingWithName.id !== id) {
          throw AppError.from(ErrHandBagNameExists, 400);
        }
      }

      // Cập nhật túi
      await this.handBagRepo.updateHandBag(id, {
        ...dto,
        updatedAt: new Date(),
      });

      this.logger.log(`Handbag updated: ${id} by ${requester.sub}`);
    } catch (error) {
      this.logger.error(
        `Error updating handbag ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi cập nhật túi xách: ${error.message}`),
        400,
      );
    }
  }

  async deleteHandBag(requester: Requester, id: string): Promise<void> {
    try {
      // Kiểm tra túi tồn tại
      const handBag = await this.handBagRepo.getHandBag(id);
      if (!handBag) {
        throw AppError.from(ErrHandBagNotFound, 404);
      }

      // Kiểm tra quyền (chỉ ADMIN và SUPER_ADMIN có thể xóa túi)
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Kiểm tra túi có trong sản xuất không
      const hasProductionRecords =
        await this.handBagRepo.hasProductionRecords(id);
      if (hasProductionRecords) {
        throw AppError.from(ErrHandBagHasProduction, 400);
      }

      // Xóa túi
      await this.handBagRepo.deleteHandBag(id);
      this.logger.log(`HandBag deleted: ${id} by ${requester.sub}`);
    } catch (error) {
      this.logger.error(
        `Error deleting handbag ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi xóa túi xách: ${error.message}`),
        400,
      );
    }
  }

  async getHandBag(id: string): Promise<HandBag> {
    try {
      const handBag = await this.handBagRepo.getHandBag(id);
      if (!handBag) {
        throw AppError.from(ErrHandBagNotFound, 404);
      }
      return handBag;
    } catch (error) {
      this.logger.error(
        `Error getting handbag ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi lấy thông tin túi xách: ${error.message}`),
        400,
      );
    }
  }

  async listHandBags(
    conditions: HandBagCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: HandBag[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const { data, total } = await this.handBagRepo.listHandBags(
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
        `Error listing handbags: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi lấy danh sách túi xách: ${error.message}`),
        400,
      );
    }
  }

  // ========== BagColor Methods ==========
  async createBagColor(
    requester: Requester,
    dto: BagColorCreateDTO,
  ): Promise<string> {
    try {
      // Kiểm tra quyền
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Kiểm tra túi tồn tại
      const handBag = await this.handBagRepo.getHandBag(dto.handBagId);
      if (!handBag) {
        throw AppError.from(ErrHandBagNotFound, 404);
      }

      // Kiểm tra mã màu trùng lặp
      const existingBagColor = await this.handBagRepo.findBagColorByCode(
        dto.handBagId,
        dto.colorCode,
      );
      if (existingBagColor) {
        throw AppError.from(ErrBagColorCodeExists, 400);
      }

      // Tạo màu túi mới
      const newId = uuidv4();
      const newBagColor: BagColor = {
        id: newId,
        handBagId: dto.handBagId,
        colorCode: dto.colorCode,
        colorName: dto.colorName,
        hexCode: dto.hexCode || null,
        active: dto.active !== undefined ? dto.active : true,
        imageUrl: dto.imageUrl || null,
        notes: dto.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.handBagRepo.insertBagColor(newBagColor);
      this.logger.log(`New bag color created: ${dto.colorName} (${newId})`);

      return newId;
    } catch (error) {
      this.logger.error(
        `Error during bag color creation: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi tạo màu túi: ${error.message}`),
        400,
      );
    }
  }

  async updateBagColor(
    requester: Requester,
    id: string,
    dto: BagColorUpdateDTO,
  ): Promise<void> {
    try {
      // Kiểm tra màu túi tồn tại
      const bagColor = await this.handBagRepo.getBagColor(id);
      if (!bagColor) {
        throw AppError.from(ErrBagColorNotFound, 404);
      }

      // Kiểm tra quyền
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Cập nhật màu túi
      await this.handBagRepo.updateBagColor(id, {
        ...dto,
        updatedAt: new Date(),
      });

      this.logger.log(`Bag color updated: ${id} by ${requester.sub}`);
    } catch (error) {
      this.logger.error(
        `Error updating bag color ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi cập nhật màu túi: ${error.message}`),
        400,
      );
    }
  }

  async deleteBagColor(requester: Requester, id: string): Promise<void> {
    try {
      // Kiểm tra màu túi tồn tại
      const bagColor = await this.handBagRepo.getBagColor(id);
      if (!bagColor) {
        throw AppError.from(ErrBagColorNotFound, 404);
      }

      // Kiểm tra quyền (chỉ ADMIN và SUPER_ADMIN có thể xóa màu túi)
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Kiểm tra màu túi có trong sản xuất không
      const hasProductionRecords =
        await this.handBagRepo.hasProductionRecordsForColor(id);
      if (hasProductionRecords) {
        throw AppError.from(
          new Error('Màu túi đang được sử dụng trong sản xuất, không thể xóa'),
          400,
        );
      }

      // Xóa màu túi
      await this.handBagRepo.deleteBagColor(id);
      this.logger.log(`Bag color deleted: ${id} by ${requester.sub}`);
    } catch (error) {
      this.logger.error(
        `Error deleting bag color ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi xóa màu túi: ${error.message}`),
        400,
      );
    }
  }

  async getBagColor(id: string): Promise<BagColor> {
    try {
      const bagColor = await this.handBagRepo.getBagColor(id);
      if (!bagColor) {
        throw AppError.from(ErrBagColorNotFound, 404);
      }
      return bagColor;
    } catch (error) {
      this.logger.error(
        `Error getting bag color ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi lấy thông tin màu túi: ${error.message}`),
        400,
      );
    }
  }

  async listBagColors(
    conditions: BagColorCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: BagColor[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const { data, total } = await this.handBagRepo.listBagColors(
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
        `Error listing bag colors: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi lấy danh sách màu túi: ${error.message}`),
        400,
      );
    }
  }

  // ========== BagColorProcess Methods ==========
  async createBagColorProcess(
    requester: Requester,
    dto: BagColorProcessCreateDTO,
  ): Promise<string> {
    try {
      // Kiểm tra quyền
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Kiểm tra màu túi tồn tại
      const bagColor = await this.handBagRepo.getBagColor(dto.bagColorId);
      if (!bagColor) {
        throw AppError.from(ErrBagColorNotFound, 404);
      }

      // Kiểm tra công đoạn đã tồn tại cho màu túi này chưa
      const existingProcess = await this.handBagRepo.findBagColorProcess(
        dto.bagColorId,
        dto.bagProcessId,
      );
      if (existingProcess) {
        throw AppError.from(ErrBagColorProcessExists, 400);
      }

      // Tạo công đoạn màu túi mới
      const newId = uuidv4();
      const newBagColorProcess: BagColorProcess = {
        id: newId,
        bagColorId: dto.bagColorId,
        bagProcessId: dto.bagProcessId,
        standardOutput: dto.standardOutput,
        difficulty: dto.difficulty || null,
        timeEstimate: dto.timeEstimate || null,
        materialUsage: dto.materialUsage || null,
        qualityNotes: dto.qualityNotes || null,
        specialTools: dto.specialTools || null,
        productivity: dto.productivity,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.handBagRepo.insertBagColorProcess(newBagColorProcess);
      this.logger.log(`New bag color process created: (${newId})`);

      return newId;
    } catch (error) {
      this.logger.error(
        `Error during bag color process creation: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi tạo công đoạn màu túi: ${error.message}`),
        400,
      );
    }
  }

  async updateBagColorProcess(
    requester: Requester,
    id: string,
    dto: BagColorProcessUpdateDTO,
  ): Promise<void> {
    try {
      // Kiểm tra công đoạn màu túi tồn tại
      const bagColorProcess = await this.handBagRepo.getBagColorProcess(id);
      if (!bagColorProcess) {
        throw AppError.from(ErrBagColorProcessNotFound, 404);
      }

      // Kiểm tra quyền
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Cập nhật công đoạn màu túi
      await this.handBagRepo.updateBagColorProcess(id, {
        ...dto,
        updatedAt: new Date(),
      });

      this.logger.log(`Bag color process updated: ${id} by ${requester.sub}`);
    } catch (error) {
      this.logger.error(
        `Error updating bag color process ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi cập nhật công đoạn màu túi: ${error.message}`),
        400,
      );
    }
  }

  async deleteBagColorProcess(requester: Requester, id: string): Promise<void> {
    try {
      // Kiểm tra công đoạn màu túi tồn tại
      const bagColorProcess = await this.handBagRepo.getBagColorProcess(id);
      if (!bagColorProcess) {
        throw AppError.from(ErrBagColorProcessNotFound, 404);
      }

      // Kiểm tra quyền (chỉ ADMIN và SUPER_ADMIN có thể xóa công đoạn màu túi)
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Xóa công đoạn màu túi
      await this.handBagRepo.deleteBagColorProcess(id);
      this.logger.log(`Bag color process deleted: ${id} by ${requester.sub}`);
    } catch (error) {
      this.logger.error(
        `Error deleting bag color process ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi xóa công đoạn màu túi: ${error.message}`),
        400,
      );
    }
  }

  async getBagColorProcess(id: string): Promise<BagColorProcess> {
    try {
      const bagColorProcess = await this.handBagRepo.getBagColorProcess(id);
      if (!bagColorProcess) {
        throw AppError.from(ErrBagColorProcessNotFound, 404);
      }
      return bagColorProcess;
    } catch (error) {
      this.logger.error(
        `Error getting bag color process ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi lấy thông tin công đoạn màu túi: ${error.message}`),
        400,
      );
    }
  }

  async listBagColorProcesses(
    conditions: BagColorProcessCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: BagColorProcess[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const { data, total } = await this.handBagRepo.listBagColorProcesses(
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
        `Error listing bag color processes: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi lấy danh sách công đoạn màu túi: ${error.message}`),
        400,
      );
    }
  }
}
