// src/bag-group-rates/bag-group-rates.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppError, Requester, UserRole } from 'src/share';
import { v4 as uuidv4 } from 'uuid';
import { BAG_GROUP_RATE_REPOSITORY } from './bag-group-rate.di-token';
import {
  BagGroupRateCondDTO,
  BagGroupRateCreateDTO,
  BagGroupRateUpdateDTO,
  PaginationDTO,
  BatchCreateBagGroupRateDTO,
} from './bag-group-rate.dto';
import {
  BagGroupRate,
  BagGroupRateWithName,
  ErrBagGroupRateExists,
  ErrBagGroupRateNotFound,
  ErrGroupNotFound,
  ErrHandBagNotFound,
  ErrPermissionDenied,
} from './bag-group-rate.model';
import {
  IBagGroupRateRepository,
  IBagGroupRateService,
} from './bag-group-rate.port';
import prisma from 'src/share/components/prisma';

// Định nghĩa các interface cần thiết
interface HandBagBasic {
  id: string;
  code: string;
  name: string;
  imageUrl?: string | null;
}

interface BagGroupRateBasic {
  id: string;
  handBagId: string;
  groupId: string;
  outputRate: number;
  notes?: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  handBag?: HandBagBasic;
}

interface HandBagWithRates {
  id: string;
  code: string;
  name: string;
  imageUrl?: string | null;
  rates: { outputRate: number }[];
}

interface HandBagWithStats {
  id: string;
  code: string;
  name: string;
  imageUrl?: string | null;
  totalGroups: number;
  averageOutputRate: number;
  lowestOutputRate: number;
  highestOutputRate: number;
}

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
        requester.role !== UserRole.SUPER_ADMIN &&
        requester.role !== UserRole.LINE_MANAGER &&
        requester.role !== UserRole.TEAM_LEADER
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Kiểm tra tồn tại của túi
      const handBagExists = await this.checkHandBagExists(dto.handBagId);
      if (!handBagExists) {
        throw AppError.from(ErrHandBagNotFound, 404);
      }

      // Kiểm tra tồn tại của nhóm
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
      this.logger.log(
        `New bag group rate created: ${newId} for handBag ${dto.handBagId} and group ${dto.groupId}`,
      );

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

  async batchCreateBagGroupRates(
    requester: Requester,
    dto: BatchCreateBagGroupRateDTO,
  ): Promise<string[]> {
    try {
      // Kiểm tra quyền
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN &&
        requester.role !== UserRole.LINE_MANAGER &&
        requester.role !== UserRole.TEAM_LEADER
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Kiểm tra tồn tại của túi
      const handBagExists = await this.checkHandBagExists(dto.handBagId);
      if (!handBagExists) {
        throw AppError.from(ErrHandBagNotFound, 404);
      }

      // Kiểm tra tồn tại của tất cả các nhóm
      const groupIds = dto.groupRates.map((item) => item.groupId);
      for (const groupId of groupIds) {
        const groupExists = await this.checkGroupExists(groupId);
        if (!groupExists) {
          throw AppError.from(
            new Error(`Nhóm với ID ${groupId} không tồn tại`),
            404,
          );
        }
      }

      // Tạo hoặc cập nhật năng suất cho từng nhóm
      const results: string[] = [];

      // Sử dụng Promise.all để xử lý song song
      await Promise.all(
        dto.groupRates.map(async (item) => {
          try {
            // Kiểm tra năng suất đã tồn tại chưa
            const existingRate = await this.bagGroupRateRepo.findBagGroupRate(
              dto.handBagId,
              item.groupId,
            );

            if (existingRate) {
              // Cập nhật nếu đã tồn tại
              await this.bagGroupRateRepo.updateBagGroupRate(existingRate.id, {
                outputRate: item.outputRate,
                notes: item.notes,
                active: true,
                updatedAt: new Date(),
              });
              results.push(existingRate.id);
              this.logger.log(`Updated bag group rate: ${existingRate.id}`);
            } else {
              // Tạo mới nếu chưa tồn tại
              const newId = uuidv4();
              const newBagGroupRate: BagGroupRate = {
                id: newId,
                handBagId: dto.handBagId,
                groupId: item.groupId,
                outputRate: item.outputRate,
                notes: item.notes || null,
                active: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              };

              await this.bagGroupRateRepo.insertBagGroupRate(newBagGroupRate);
              results.push(newId);
              this.logger.log(`Created new bag group rate: ${newId}`);
            }
          } catch (error) {
            this.logger.error(
              `Error processing group rate for group ${item.groupId}: ${error.message}`,
              error.stack,
            );
            throw error;
          }
        }),
      );

      return results;
    } catch (error) {
      this.logger.error(
        `Error during batch creation of bag group rates: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(
          `Lỗi khi tạo hàng loạt năng suất túi theo nhóm: ${error.message}`,
        ),
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
        requester.role !== UserRole.SUPER_ADMIN &&
        requester.role !== UserRole.LINE_MANAGER &&
        requester.role !== UserRole.TEAM_LEADER
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
        new Error(
          `Lỗi khi lấy thông tin năng suất túi theo nhóm: ${error.message}`,
        ),
        400,
      );
    }
  }

  async listBagGroupRates(
    conditions: BagGroupRateCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: BagGroupRateWithName[];
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
        new Error(
          `Lỗi khi lấy danh sách năng suất túi theo nhóm: ${error.message}`,
        ),
        400,
      );
    }
  }

  async getBagGroupRatesForHandBag(handBagId: string): Promise<BagGroupRate[]> {
    try {
      // Kiểm tra tồn tại của túi
      const handBagExists = await this.checkHandBagExists(handBagId);
      if (!handBagExists) {
        throw AppError.from(ErrHandBagNotFound, 404);
      }

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
        new Error(
          `Lỗi khi lấy năng suất túi theo nhóm cho túi: ${error.message}`,
        ),
        400,
      );
    }
  }

  async getBagGroupRatesForGroup(groupId: string): Promise<BagGroupRate[]> {
    try {
      // Kiểm tra tồn tại của nhóm
      const groupExists = await this.checkGroupExists(groupId);
      if (!groupExists) {
        throw AppError.from(ErrGroupNotFound, 404);
      }

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
        new Error(
          `Lỗi khi lấy năng suất túi theo nhóm cho nhóm: ${error.message}`,
        ),
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

      // Lấy thông tin chi tiết túi xách
      const handBag = await this.getHandBagDetails(handBagId);

      // Lấy tất cả năng suất theo nhóm cho túi này
      const rates =
        await this.bagGroupRateRepo.getBagGroupRatesForHandBag(handBagId);

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
      const outputRates = rates.map((rate) => rate.outputRate);
      const averageOutputRate = this.calculateAverage(outputRates);
      const highestOutputRate = Math.max(...outputRates);
      const lowestOutputRate = Math.min(...outputRates);

      // Lấy thêm thông tin từ các nhóm
      const groupsWithDetails = await Promise.all(
        rates.map(async (rate) => {
          const group = await this.getGroupDetails(rate.groupId);

          // Tính số lượng thành viên trong nhóm
          const memberCount = await this.getGroupMemberCount(rate.groupId);

          return {
            ...rate,
            group,
            memberCount,
            performancePercentage: (
              (rate.outputRate / averageOutputRate) *
              100
            ).toFixed(2),
            isHighPerformer: rate.outputRate > averageOutputRate,
            outputPerMember:
              memberCount > 0 ? (rate.outputRate / memberCount).toFixed(2) : 0,
          };
        }),
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

  // ==== Các phương thức hỗ trợ ====
  private async checkHandBagExists(handBagId: string): Promise<boolean> {
    try {
      return await prisma.handBag
        .findUnique({
          where: { id: handBagId },
        })
        .then((bag) => !!bag);
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
      return await prisma.group
        .findUnique({
          where: { id: groupId },
        })
        .then((group) => !!group);
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
      // Lấy chi tiết túi với thông tin đầy đủ
      return await prisma.handBag.findUnique({
        where: { id: handBagId },
        include: {
          bagColors: {
            where: { active: true },
          },
        },
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
      return await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          team: true,
          leaders: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  employeeId: true,
                  email: true,
                },
              },
            },
            where: {
              OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
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

  private async getGroupMemberCount(groupId: string): Promise<number> {
    try {
      return await prisma.user.count({
        where: {
          groupId,
          status: 'ACTIVE',
        },
      });
    } catch (error) {
      this.logger.error(
        `Error getting group member count ${groupId}: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((total, num) => total + num, 0);
    return sum / numbers.length;
  }

  // Thêm vào bag-group-rate.service.ts
  async getHandBagGroupRatesDetails(handBagId: string): Promise<{
    handBag: any;
    groups: any[];
    statistics: {
      totalGroups: number;
      averageOutputRate: number;
      highestOutputRate: number;
      lowestOutputRate: number;
    };
  }> {
    try {
      // Lấy thông tin chi tiết túi
      const handBagDetails = await prisma.handBag.findUnique({
        where: { id: handBagId },
        select: {
          id: true,
          code: true,
          name: true,
          imageUrl: true,
          description: true,
          material: true,
          dimensions: true,
        },
      });

      if (!handBagDetails) {
        throw AppError.from(ErrHandBagNotFound, 404);
      }

      // Lấy tất cả nhóm và năng suất của túi này
      const groupRates =
        await this.bagGroupRateRepo.getBagGroupRatesForHandBag(handBagId);

      // Lấy thông tin chi tiết cho mỗi nhóm
      const groupsWithDetails = await Promise.all(
        groupRates.map(async (rate) => {
          const group = await prisma.group.findUnique({
            where: { id: rate.groupId },
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
              leaders: {
                include: {
                  user: {
                    select: {
                      id: true,
                      fullName: true,
                      employeeId: true,
                    },
                  },
                },
                where: {
                  OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
                },
              },
            },
          });

          const memberCount = await prisma.user.count({
            where: {
              groupId: rate.groupId,
              status: 'ACTIVE',
            },
          });

          return {
            ...rate,
            group,
            memberCount,
          };
        }),
      );

      // Tính toán thống kê
      const outputRates = groupRates.map((rate) => rate.outputRate);
      const averageOutputRate = this.calculateAverage(outputRates);
      const highestOutputRate =
        outputRates.length > 0 ? Math.max(...outputRates) : 0;
      const lowestOutputRate =
        outputRates.length > 0 ? Math.min(...outputRates) : 0;

      return {
        handBag: handBagDetails,
        groups: groupsWithDetails,
        statistics: {
          totalGroups: groupRates.length,
          averageOutputRate,
          highestOutputRate,
          lowestOutputRate,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error getting hand bag group rates details ${handBagId}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(
          `Lỗi khi lấy chi tiết năng suất túi theo nhóm: ${error.message}`,
        ),
        400,
      );
    }
  }

  // Sửa lỗi trong phương thức groupBagGroupRatesByHandBag trong BagGroupRateService

  async groupBagGroupRatesByHandBag(): Promise<{
    handBags: HandBagWithStats[];
  }> {
    try {
      this.logger.log('Starting groupBagGroupRatesByHandBag method');

      // Lấy tất cả túi xách trước
      const allHandBags: HandBagBasic[] = await prisma.handBag.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          imageUrl: true,
        },
      });

      this.logger.log(`Found ${allHandBags.length} hand bags`);

      if (!allHandBags || allHandBags.length === 0) {
        return { handBags: [] };
      }

      // Lấy tất cả bag group rates
      const allRates: BagGroupRateBasic[] = await prisma.bagGroupRate.findMany({
        where: {
          active: true,
        },
        include: {
          handBag: {
            select: {
              id: true,
              code: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      });

      this.logger.log(`Found ${allRates.length} bag group rates`);

      // Map để lưu trữ dữ liệu tổng hợp
      const handBagMap = new Map<string, HandBagWithRates>();

      // Khởi tạo map với tất cả túi xách
      for (const handBag of allHandBags) {
        handBagMap.set(handBag.id, {
          id: handBag.id,
          code: handBag.code,
          name: handBag.name,
          imageUrl: handBag.imageUrl || undefined,
          rates: [],
        });
      }

      // Thêm rates vào các túi tương ứng - ĐÃ SỬA LỖI Ở ĐÂY
      for (const rate of allRates) {
        if (!rate.handBagId || !handBagMap.has(rate.handBagId)) continue;

        const handBagData = handBagMap.get(rate.handBagId);
        if (handBagData) {
          handBagData.rates.push({
            outputRate: rate.outputRate,
          });
        }
      }

      // Tính toán thống kê cho mỗi túi
      const handBags: HandBagWithStats[] = Array.from(handBagMap.values()).map(
        (handBag) => {
          const rates = handBag.rates.map((rate) => rate.outputRate);
          const validRates = rates.length > 0;

          return {
            id: handBag.id,
            code: handBag.code,
            name: handBag.name,
            imageUrl: handBag.imageUrl === null ? undefined : handBag.imageUrl, // Chuyển đổi null thành undefined
            totalGroups: rates.length,
            averageOutputRate: this.calculateAverage(rates),
            lowestOutputRate: validRates ? Math.min(...rates) : 0,
            highestOutputRate: validRates ? Math.max(...rates) : 0,
          };
        },
      );

      this.logger.log(
        `Successfully processed ${handBags.length} hand bags with stats`,
      );
      return { handBags };
    } catch (error) {
      this.logger.error(
        `Error grouping bag group rates by hand bag: ${error.message}`,
        error.stack,
      );
      throw AppError.from(
        new Error(`Lỗi khi nhóm năng suất túi theo mã túi: ${error.message}`),
        500,
      );
    }
  }
}
