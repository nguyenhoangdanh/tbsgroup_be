import { Injectable, Logger } from '@nestjs/common';
import { Line as PrismaLine, Prisma } from '@prisma/client';
import { PrismaService } from 'src/share/prisma.service';
import { AppError } from 'src/share';
import { LineCondDTO, LineManagerDTO } from './line.dto';
import { Line } from './line.model';
import { BasePrismaRepository } from 'src/CrudModule/base-prisma.repository';
import { LineCreateDTO, LineUpdateDTO } from './line.dto';
import { UserRole } from 'src/share';

@Injectable()
export class LinePrismaRepository extends BasePrismaRepository<
  Line,
  LineCreateDTO,
  LineUpdateDTO
> {
  // Change from private to protected
  protected readonly logger = new Logger(LinePrismaRepository.name);

  constructor(private readonly prisma: PrismaService) {
    // Using a string literal 'Line' here, not the Line type
    super('Line', prisma.line);
  }

  // Chuyển đổi entity Prisma thành model domain
  protected _toModel(data: PrismaLine): Line {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      factoryId: data.factoryId,
      capacity: data.capacity || 0,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  // Chuyển đổi điều kiện lọc thành where clause Prisma
  protected _conditionsToWhereClause(
    conditions: LineCondDTO,
  ): Prisma.LineWhereInput {
    const whereClause: Prisma.LineWhereInput = {};

    if (conditions.code) {
      whereClause.code = {
        contains: conditions.code,
        mode: 'insensitive',
      };
    }

    if (conditions.name) {
      whereClause.name = {
        contains: conditions.name,
        mode: 'insensitive',
      };
    }

    if (conditions.factoryId) {
      whereClause.factoryId = conditions.factoryId;
    }

    // Tìm kiếm chung theo code hoặc name
    if (conditions.search) {
      whereClause.OR = [
        {
          code: {
            contains: conditions.search,
            mode: 'insensitive',
          },
        },
        {
          name: {
            contains: conditions.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return whereClause;
  }

  // Tìm line theo mã code
  async findByCode(code: string): Promise<Line | null> {
    try {
      const data = await this.prisma.line.findFirst({
        where: { code: { equals: code, mode: 'insensitive' } },
      });

      return data ? this._toModel(data) : null;
    } catch (error) {
      this.handleRepositoryError(error, `Lỗi khi tìm line theo code ${code}`);
    }
  }

  // Liệt kê line theo factory ID
  async listByFactoryId(factoryId: string): Promise<Line[]> {
    try {
      const data = await this.prisma.line.findMany({
        where: { factoryId },
        orderBy: { name: 'asc' },
      });

      return data.map((item) => this._toModel(item));
    } catch (error) {
      this.handleRepositoryError(
        error,
        `Lỗi khi liệt kê line theo factory ID ${factoryId}`,
      );
    }
  }

  // Thêm manager cho line
  async addManager(lineId: string, managerDTO: LineManagerDTO): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Nếu đây là primary manager, cập nhật tất cả manager hiện tại không còn là primary
        if (managerDTO.isPrimary) {
          await tx.lineManager.updateMany({
            where: { lineId, isPrimary: true },
            data: { isPrimary: false },
          });
        }

        // Thêm manager mới
        await tx.lineManager.create({
          data: {
            lineId,
            userId: managerDTO.userId,
            isPrimary: managerDTO.isPrimary,
            startDate: managerDTO.startDate,
            endDate: managerDTO.endDate,
          },
        });
      });
    } catch (error) {
      this.handleRepositoryError(
        error,
        `Lỗi khi thêm manager cho line ${lineId}`,
      );
    }
  }

  // Xóa manager khỏi line
  async removeManager(lineId: string, userId: string): Promise<void> {
    try {
      await this.prisma.lineManager.deleteMany({
        where: { lineId, userId },
      });
    } catch (error) {
      this.handleRepositoryError(
        error,
        `Lỗi khi xóa manager khỏi line ${lineId}`,
      );
    }
  }

  // Cập nhật thông tin manager
  async updateManager(
    lineId: string,
    userId: string,
    isPrimary: boolean,
    endDate?: Date,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Nếu đặt làm primary, cập nhật tất cả các primary manager hiện tại
        if (isPrimary) {
          await tx.lineManager.updateMany({
            where: { lineId, isPrimary: true },
            data: { isPrimary: false },
          });
        }

        // Cập nhật manager cụ thể
        await tx.lineManager.updateMany({
          where: { lineId, userId },
          data: {
            isPrimary,
            ...(endDate ? { endDate } : {}),
          },
        });
      });
    } catch (error) {
      this.handleRepositoryError(
        error,
        `Lỗi khi cập nhật manager của line ${lineId}`,
      );
    }
  }

  // Lấy danh sách managers của line
  async getManagers(lineId: string): Promise<
    {
      userId: string;
      isPrimary: boolean;
      startDate: Date;
      endDate: Date | null;
    }[]
  > {
    try {
      const managers = await this.prisma.lineManager.findMany({
        where: {
          lineId,
          OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        },
        orderBy: [{ isPrimary: 'desc' }, { startDate: 'desc' }],
      });

      return managers.map((manager) => ({
        userId: manager.userId,
        isPrimary: manager.isPrimary,
        startDate: manager.startDate,
        endDate: manager.endDate,
      }));
    } catch (error) {
      this.handleRepositoryError(
        error,
        `Lỗi khi lấy manager của line ${lineId}`,
      );
      return []; // Để TypeScript không báo lỗi
    }
  }

  // Kiểm tra line có teams không
  async hasTeams(lineId: string): Promise<boolean> {
    try {
      const count = await this.prisma.team.count({
        where: { lineId },
      });
      return count > 0;
    } catch (error) {
      this.handleRepositoryError(
        error,
        `Lỗi khi kiểm tra line ${lineId} có teams không`,
      );
      return false; // Giả định không có teams nếu có lỗi
    }
  }

  // Kiểm tra người dùng có quyền quản lý line không
  async isManager(userId: string, lineId: string): Promise<boolean> {
    try {
      // Kiểm tra vai trò admin
      const hasAdminRole = await this.prisma.userRoleAssignment.findFirst({
        where: {
          userId,
          role: {
            code: {
              in: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
            },
          },
          OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
        },
      });

      if (hasAdminRole) {
        return true;
      }

      // Kiểm tra phân công quản lý trực tiếp
      const directAssignment = await this.prisma.lineManager.findFirst({
        where: {
          userId,
          lineId,
          OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        },
      });

      if (directAssignment) {
        return true;
      }

      // Kiểm tra quyền quản lý dựa trên vai trò
      const roleAssignment = await this.prisma.userRoleAssignment.findFirst({
        where: {
          userId,
          role: {
            code: UserRole.LINE_MANAGER,
          },
          scope: lineId,
          OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
        },
      });

      return !!roleAssignment;
    } catch (error) {
      this.handleRepositoryError(
        error,
        `Lỗi khi kiểm tra quyền quản lý line ${lineId}`,
      );
      return false; // Mặc định là không có quyền quản lý nếu có lỗi
    }
  }

  // Xử lý lỗi repository một cách nhất quán
  private handleRepositoryError(error: any, message: string): never {
    this.logger.error(`${message}: ${error.message}`, error.stack);
    throw AppError.from(
      new Error(`${message}: ${error.message}`),
      error.status || 500,
    );
  }
}
