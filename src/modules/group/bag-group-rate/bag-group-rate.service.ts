import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppError, Requester, UserRole } from 'src/share';
import { v4 as uuidv4 } from 'uuid';
import { BAG_GROUP_RATE_REPOSITORY } from './bag-group-rate.di-token';
import {
  BagGroupRateCondDTO,
  BagGroupRateCreateDTO,
  BagGroupRateUpdateDTO,
  PaginationDTO,
} from './bag-group-rate.dto';
import {
  BagGroupRate,
  ErrBagGroupRateExists,
  ErrBagGroupRateNotFound,
  ErrGroupNotFound,
  ErrHandBagNotFound,
  ErrPermissionDenied,
} from './bag-group-rate.model';
import { IBagGroupRateRepository, IBagGroupRateService } from './bag-group-rate.port';
import prisma from 'src/share/components/prisma';

@Injectable()
export class BagGroupRateService implements IBagGroupRateService {
  private readonly logger = new Logger(BagGroupRateService.name);

  constructor(
    @Inject(BAG_GROUP_RATE_REPOSITORY)
    private readonly bagGroupRateRepo: IBagGroupRateRepository,
  ) {}

  async createBagGroupRate(
    requester: Requester,
    dto: BagGroupRateCreateDTO,
  ): Promise<string> {
    try {
      // Kiểm tra quyền
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Kiểm tra tồn tại của túi và nhóm (giả định có service kiểm tra)
      // Đây là phương pháp đơn giản, bạn nên inject các repository hoặc service thích hợp để kiểm tra đúng
      const handBagExists = await this.checkHandBagExists(dto.handBagId);
      if (!handBagExists) {
        throw AppError.from(ErrHandBagNotFound, 404);
      }

      const groupExists = await this.checkGroupExists(dto.groupId);
      if (!groupExists) {
        throw AppError.from(ErrGroupNotFound, 404);
      }

      // Kiểm tra đã tồn tại năng suất cho túi/nhóm này chưa
      const existingRate = await this.bagGroupRateRepo.findBagGroupRate(
        dto.handBagId,
        dto.groupId,
      );
      if (existingRate) {
        throw AppError.from(ErrBagGroupRateExists, 400);
      }

      // Tạo mới
      const newId = uuidv4();
      const newBagGroupRate: BagGroupRate = {
        id: newId,
        handBagId: dto.handBagId,
        groupId: dto.groupId,
        outputRate: dto.outputRate,
        notes: dto.notes || null,
        active: dto.active !== undefined ? dto.active : true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.bagGroupRateRepo.insertBagGroupRate(newBagGroupRate);
      this.logger.log(`New bag group rate created: ${newId} for handBag ${dto.handBagId} and group ${dto.groupId}`);

      return newId;
    } catch (error) {
      this.logger.error(
        `Error during bag group rate creation: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi tạo năng suất túi theo nhóm: ${error.message}`),
        400,
      );
    }
  }

  async updateBagGroupRate(
    requester: Requester,
    id: string,
    dto: BagGroupRateUpdateDTO,
  ): Promise<void> {
    try {
      // Kiểm tra tồn tại
      const bagGroupRate = await this.bagGroupRateRepo.getBagGroupRate(id);
      if (!bagGroupRate) {
        throw AppError.from(ErrBagGroupRateNotFound, 404);
      }

      // Kiểm tra quyền
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Cập nhật
      await this.bagGroupRateRepo.updateBagGroupRate(id, {
        ...dto,
        updatedAt: new Date(),
      });

      this.logger.log(`Bag group rate updated: ${id} by ${requester.sub}`);
    } catch (error) {
      this.logger.error(
        `Error updating bag group rate ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi cập nhật năng suất túi theo nhóm: ${error.message}`),
        400,
      );
    }
  }
    
    
  async deleteBagGroupRate(requester: Requester, id: string): Promise<void> {
    try {
      // Kiểm tra tồn tại
      const bagGroupRate = await this.bagGroupRateRepo.getBagGroupRate(id);
      if (!bagGroupRate) {
        throw AppError.from(ErrBagGroupRateNotFound, 404);
      }

      // Kiểm tra quyền
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Xóa
      await this.bagGroupRateRepo.deleteBagGroupRate(id);
      this.logger.log(`Bag group rate deleted: ${id} by ${requester.sub}`);
    } catch (error) {
      this.logger.error(
        `Error deleting bag group rate ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi xóa năng suất túi theo nhóm: ${error.message}`),
        400,
      );
    }
  }

  async getBagGroupRate(id: string): Promise<BagGroupRate> {
    try {
      const bagGroupRate = await this.bagGroupRateRepo.getBagGroupRate(id);
      if (!bagGroupRate) {
        throw AppError.from(ErrBagGroupRateNotFound, 404);
      }
      return bagGroupRate;
    } catch (error) {
      this.logger.error(
        `Error getting bag group rate ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi lấy thông tin năng suất túi theo nhóm: ${error.message}`),
        400,
      );
    }
  }

  async listBagGroupRates(
    conditions: BagGroupRateCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: BagGroupRate[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const { data, total } = await this.bagGroupRateRepo.listBagGroupRates(
        conditions,
        pagination,
      );

      return {
        data,
        total,
        page: pagination.page || 1,
        limit: pagination.limit || 10,
      };
    } catch (error) {
      this.logger.error(
        `Error listing bag group rates: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi lấy danh sách năng suất túi theo nhóm: ${error.message}`),
        400,
      );
    }
  }

  async getBagGroupRatesForHandBag(handBagId: string): Promise<BagGroupRate[]> {
    try {
      return await this.bagGroupRateRepo.getBagGroupRatesForHandBag(handBagId);
    } catch (error) {
      this.logger.error(
        `Error getting bag group rates for handBag ${handBagId}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi lấy năng suất túi theo nhóm cho túi: ${error.message}`),
        400,
      );
    }
  }

  async getBagGroupRatesForGroup(groupId: string): Promise<BagGroupRate[]> {
    try {
      return await this.bagGroupRateRepo.getBagGroupRatesForGroup(groupId);
    } catch (error) {
      this.logger.error(
        `Error getting bag group rates for group ${groupId}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi lấy năng suất túi theo nhóm cho nhóm: ${error.message}`),
        400,
      );
    }
  }
    
  async getProductivityAnalysis(handBagId: string): Promise<{
    handBag: any;
    groups: any[];
    averageOutputRate: number;
    highestOutputRate: number;
    lowestOutputRate: number;
  }> {
    try {
      // Kiểm tra tồn tại của túi
      const handBagExists = await this.checkHandBagExists(handBagId);
      if (!handBagExists) {
        throw AppError.from(ErrHandBagNotFound, 404);
      }

      // Lấy thông tin handBag - giả định (cần inject HandBagRepository thực tế)
      const handBag = await this.getHandBagDetails(handBagId);

      // Lấy tất cả năng suất theo nhóm cho túi này
      const rates = await this.bagGroupRateRepo.getBagGroupRatesForHandBag(handBagId);

      if (rates.length === 0) {
        return {
          handBag,
          groups: [],
          averageOutputRate: 0,
          highestOutputRate: 0,
          lowestOutputRate: 0,
        };
      }

      // Tính toán các chỉ số
      const outputRates = rates.map(rate => rate.outputRate);
      const averageOutputRate = this.calculateAverage(outputRates);
      const highestOutputRate = Math.max(...outputRates);
      const lowestOutputRate = Math.min(...outputRates);

      // Lấy thêm thông tin từ các nhóm - giả định (cần inject GroupRepository thực tế)
      const groupsWithDetails = await Promise.all(
        rates.map(async (rate) => {
          const group = await this.getGroupDetails(rate.groupId);
          return {
            ...rate,
            group,
            performancePercentage: ((rate.outputRate / averageOutputRate) * 100).toFixed(2),
            isHighPerformer: rate.outputRate > averageOutputRate,
          };
        })
      );

      return {
        handBag,
        groups: groupsWithDetails,
        averageOutputRate,
        highestOutputRate,
        lowestOutputRate,
      };
    } catch (error) {
      this.logger.error(
        `Error analyzing productivity for handBag ${handBagId}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi phân tích năng suất túi: ${error.message}`),
        400,
      );
    }
  }

  // Các phương thức hỗ trợ - trong thực tế nên inject các service cần thiết
  private async checkHandBagExists(handBagId: string): Promise<boolean> {
    try {
      // Giả định có phương thức kiểm tra túi tồn tại
      // Trong thực tế bạn nên inject HandBagRepository vào service này
      return await prisma.handBag.findUnique({
        where: { id: handBagId },
      }).then(bag => !!bag);
    } catch (error) {
      this.logger.error(
        `Error checking handBag existence ${handBagId}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  private async checkGroupExists(groupId: string): Promise<boolean> {
    try {
      // Giả định có phương thức kiểm tra nhóm tồn tại
      // Trong thực tế bạn nên inject GroupRepository vào service này
      return await prisma.group.findUnique({
        where: { id: groupId },
      }).then(group => !!group);
    } catch (error) {
      this.logger.error(
        `Error checking group existence ${groupId}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  private async getHandBagDetails(handBagId: string): Promise<any> {
    try {
      // Giả định có phương thức lấy chi tiết túi
      return await prisma.handBag.findUnique({
        where: { id: handBagId },
      });
    } catch (error) {
      this.logger.error(
        `Error getting handBag details ${handBagId}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get handBag details: ${error.message}`);
    }
  }

  private async getGroupDetails(groupId: string): Promise<any> {
    try {
      // Giả định có phương thức lấy chi tiết nhóm
      return await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          team: true,
          leaders: {
            include: {
              user: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Error getting group details ${groupId}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get group details: ${error.message}`);
    }
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((total, num) => total + num, 0);
    return sum / numbers.length;
  }
}