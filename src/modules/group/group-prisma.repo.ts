import { Injectable, Logger } from '@nestjs/common';
import {
  Group as PrismaGroup,
  GroupLeader as PrismaGroupLeader,
  Prisma,
} from '@prisma/client';
import prisma from 'src/share/components/prisma';
import { GroupCondDTO, PaginationDTO } from './group.dto';
import { Group, GroupLeader, GroupWithUsers } from './group.model';
import { IGroupRepository } from './group.port';

@Injectable()
export class GroupPrismaRepository implements IGroupRepository {
  private readonly logger = new Logger(GroupPrismaRepository.name);

  // ========== Private Utility Methods ==========
  private _toGroupModel(data: PrismaGroup): Group {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      teamId: data.teamId,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  private _toGroupWithUsersModel(
    data: PrismaGroup & { users?: any[] },
  ): GroupWithUsers {
    const baseModel = this._toGroupModel(data);

    return {
      ...baseModel,
      users: data.users || [],
    };
  }

  private _toGroupLeaderModel(data: PrismaGroupLeader): GroupLeader {
    return {
      groupId: data.groupId,
      userId: data.userId,
      isPrimary: data.isPrimary,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  private _groupConditionsToWhereClause(
    conditions: GroupCondDTO,
  ): Prisma.GroupWhereInput {
    const whereClause: Prisma.GroupWhereInput = {};

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

    if (conditions.teamId) {
      whereClause.teamId = conditions.teamId;
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

  // ========== Group Methods ==========
  async getGroup(id: string): Promise<Group | null> {
    try {
      const data = await prisma.group.findUnique({
        where: { id },
        include: {
          users: true, // Đảm bảo users được include
          team: true,
          leaders: {
            include: { user: true },
            where: {
              OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
            },
          },
        },
      });

      return data ? this._toGroupWithUsersModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error fetching group ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get group: ${error.message}`);
    }
  }

  async findGroupByCode(code: string): Promise<Group | null> {
    try {
      const data = await prisma.group.findFirst({
        where: { code: { equals: code, mode: 'insensitive' } },
      });

      return data ? this._toGroupModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error finding group by code ${code}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to find group by code: ${error.message}`);
    }
  }

  async findGroupByCond(cond: GroupCondDTO): Promise<Group | null> {
    try {
      const data = await prisma.group.findFirst({
        where: this._groupConditionsToWhereClause(cond),
      });

      return data ? this._toGroupModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error finding group by conditions: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to find group by conditions: ${error.message}`);
    }
  }

  async listGroups(
    conditions: GroupCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: Group[];
    total: number;
  }> {
    try {
      // Validate pagination parameters
      const page = Math.max(1, pagination.page || 1);
      const limit = Math.min(100, Math.max(1, pagination.limit || 10));
      const sortBy = pagination.sortBy || 'createdAt';
      const sortOrder = pagination.sortOrder || 'desc';

      const whereClause = this._groupConditionsToWhereClause(conditions);

      // Run count and data queries in parallel for efficiency
      const [total, data] = await Promise.all([
        prisma.group.count({ where: whereClause }),
        prisma.group.findMany({
          where: whereClause,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            team: true,
            leaders: {
              include: {
                user: true,
              },
              where: {
                // Chỉ lấy các leader hiện tại (chưa kết thúc hoặc chưa thiết lập ngày kết thúc)
                OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
              },
            },
          },
        }),
      ]);

      return {
        data: data.map(this._toGroupModel),
        total,
      };
    } catch (error) {
      this.logger.error(`Error listing groups: ${error.message}`, error.stack);
      throw new Error(`Failed to list groups: ${error.message}`);
    }
  }

  async insertGroup(group: Group): Promise<void> {
    try {
      await prisma.group.create({
        data: {
          id: group.id,
          code: group.code,
          name: group.name,
          description: group.description,
          teamId: group.teamId,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
        },
      });
    } catch (error) {
      this.logger.error(`Error inserting group: ${error.message}`, error.stack);
      throw new Error(`Failed to insert group: ${error.message}`);
    }
  }

  async updateGroup(id: string, dto: Partial<Group>): Promise<void> {
    try {
      // Filter out undefined values to avoid unintended updates
      const updateData: Prisma.GroupUpdateInput = {};

      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.description !== undefined)
        updateData.description = dto.description;
      if (dto.teamId !== undefined)
        updateData.team = { connect: { id: dto.teamId } };
      if (dto.updatedAt) updateData.updatedAt = dto.updatedAt;

      await prisma.group.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      this.logger.error(
        `Error updating group ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to update group: ${error.message}`);
    }
  }

  async deleteGroup(id: string): Promise<void> {
    try {
      await prisma.group.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(
        `Error deleting group ${id}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to delete group: ${error.message}`);
    }
  }

  // ========== GroupLeader Methods ==========
  async getGroupLeaders(groupId: string): Promise<GroupLeader[]> {
    try {
      const data = await prisma.groupLeader.findMany({
        where: {
          groupId,
          // Chỉ lấy các leader hiện tại (chưa kết thúc hoặc chưa thiết lập ngày kết thúc)
          OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        },
        include: {
          user: true,
        },
        orderBy: { isPrimary: 'desc' },
      });

      return data.map(this._toGroupLeaderModel);
    } catch (error) {
      this.logger.error(
        `Error fetching group leaders for group ${groupId}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get group leaders: ${error.message}`);
    }
  }

  async addGroupLeader(groupLeader: GroupLeader): Promise<void> {
    try {
      await prisma.groupLeader.create({
        data: {
          groupId: groupLeader.groupId,
          userId: groupLeader.userId,
          isPrimary: groupLeader.isPrimary,
          startDate: groupLeader.startDate,
          endDate: groupLeader.endDate,
          createdAt: groupLeader.createdAt,
          updatedAt: groupLeader.updatedAt,
        },
      });

      // Nếu đây là leader chính, cập nhật các leader khác thành phụ
      if (groupLeader.isPrimary) {
        await prisma.groupLeader.updateMany({
          where: {
            groupId: groupLeader.groupId,
            userId: { not: groupLeader.userId },
            isPrimary: true,
          },
          data: {
            isPrimary: false,
            updatedAt: new Date(),
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Error adding group leader: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to add group leader: ${error.message}`);
    }
  }

  async updateGroupLeader(
    groupId: string,
    userId: string,
    dto: Partial<GroupLeader>,
  ): Promise<void> {
    try {
      // Filter out undefined values to avoid unintended updates
      const updateData: Prisma.GroupLeaderUpdateInput = {};

      if (dto.isPrimary !== undefined) updateData.isPrimary = dto.isPrimary;
      if (dto.endDate !== undefined) updateData.endDate = dto.endDate;
      if (dto.updatedAt) updateData.updatedAt = dto.updatedAt;

      await prisma.groupLeader.update({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
        data: updateData,
      });

      // Nếu cập nhật thành leader chính, cập nhật các leader khác thành phụ
      if (dto.isPrimary === true) {
        await prisma.groupLeader.updateMany({
          where: {
            groupId,
            userId: { not: userId },
            isPrimary: true,
          },
          data: {
            isPrimary: false,
            updatedAt: new Date(),
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Error updating group leader: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to update group leader: ${error.message}`);
    }
  }

  async removeGroupLeader(groupId: string, userId: string): Promise<void> {
    try {
      // Không xóa hẳn, chỉ cập nhật ngày kết thúc
      await prisma.groupLeader.update({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
        data: {
          endDate: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Error removing group leader: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to remove group leader: ${error.message}`);
    }
  }

  // ========== Check Dependencies ==========
  async hasUsers(groupId: string): Promise<boolean> {
    try {
      const count = await prisma.user.count({
        where: { groupId },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking if group ${groupId} has users: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to check if group has users: ${error.message}`);
    }
  }

  async hasProductionRates(groupId: string): Promise<boolean> {
    try {
      const count = await prisma.bagGroupRate.count({
        where: { groupId },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking if group ${groupId} has production rates: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Failed to check if group has production rates: ${error.message}`,
      );
    }
  }

  // ========== Group with Performance Stats ==========
  async getGroupWithPerformanceStats(groupId: string): Promise<any> {
    try {
      // Lấy thông tin cơ bản của nhóm
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          team: true,
          leaders: {
            include: {
              user: true,
            },
            where: {
              OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
            },
          },
          users: true,
          bagRates: {
            include: {
              handBag: true,
            },
            where: { active: true },
          },
        },
      });

      if (!group) {
        return null;
      }

      // Tính toán các chỉ số năng suất
      const totalUsers = group.users.length;
      const bagRates = group.bagRates;
      const avgOutputRate =
        bagRates.length > 0
          ? bagRates.reduce((sum, rate) => sum + rate.outputRate, 0) /
            bagRates.length
          : 0;

      // Tìm mẫu túi có năng suất cao nhất và thấp nhất
      let highestRate = null;
      let lowestRate = null;

      if (bagRates.length > 0) {
        highestRate = bagRates.reduce((prev, current) =>
          prev.outputRate > current.outputRate ? prev : current,
        );

        lowestRate = bagRates.reduce((prev, current) =>
          prev.outputRate < current.outputRate ? prev : current,
        );
      }

      // Dữ liệu thống kê
      return {
        ...this._toGroupModel(group),
        teamName: group.team.name,
        leaders: group.leaders.map((leader) => ({
          userId: leader.userId,
          fullName: leader.user.fullName,
          isPrimary: leader.isPrimary,
          startDate: leader.startDate,
        })),
        performance: {
          totalUsers,
          totalBagRates: bagRates.length,
          avgOutputRate,
          highestRate: highestRate
            ? {
                handBagCode: highestRate.handBag.code,
                handBagName: highestRate.handBag.name,
                outputRate: highestRate.outputRate,
              }
            : null,
          lowestRate: lowestRate
            ? {
                handBagCode: lowestRate.handBag.code,
                handBagName: lowestRate.handBag.name,
                outputRate: lowestRate.outputRate,
              }
            : null,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error getting group with performance stats ${groupId}: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Failed to get group with performance stats: ${error.message}`,
      );
    }
  }

  async listGroupsWithPerformanceStats(
    conditions: GroupCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: any[];
    total: number;
  }> {
    try {
      // Validate pagination parameters
      const page = Math.max(1, pagination.page || 1);
      const limit = Math.min(100, Math.max(1, pagination.limit || 10));
      const sortBy = pagination.sortBy || 'createdAt';
      const sortOrder = pagination.sortOrder || 'desc';

      const whereClause = this._groupConditionsToWhereClause(conditions);

      // Trước tiên lấy tổng số bản ghi để phân trang
      const total = await prisma.group.count({ where: whereClause });

      // Lấy danh sách nhóm với thông tin cơ bản
      const groups = await prisma.group.findMany({
        where: whereClause,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          team: true,
          leaders: {
            include: {
              user: true,
            },
            where: {
              OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
            },
          },
          users: true,
          bagRates: {
            include: {
              handBag: true,
            },
            where: { active: true },
          },
        },
      });

      // Tính toán các chỉ số năng suất cho từng nhóm
      const groupsWithStats = groups.map((group) => {
        const totalUsers = group.users.length;
        const bagRates = group.bagRates;
        const avgOutputRate =
          bagRates.length > 0
            ? bagRates.reduce((sum, rate) => sum + rate.outputRate, 0) /
              bagRates.length
            : 0;

        // Tìm mẫu túi có năng suất cao nhất và thấp nhất
        let highestRate = null;
        let lowestRate = null;

        if (bagRates.length > 0) {
          highestRate = bagRates.reduce((prev, current) =>
            prev.outputRate > current.outputRate ? prev : current,
          );

          lowestRate = bagRates.reduce((prev, current) =>
            prev.outputRate < current.outputRate ? prev : current,
          );
        }

        // Dữ liệu thống kê
        return {
          ...this._toGroupModel(group),
          teamName: group.team.name,
          leaders: group.leaders.map((leader) => ({
            userId: leader.userId,
            fullName: leader.user.fullName,
            isPrimary: leader.isPrimary,
            startDate: leader.startDate,
          })),
          performance: {
            totalUsers,
            totalBagRates: bagRates.length,
            avgOutputRate,
            highestRate: highestRate
              ? {
                  handBagCode: highestRate.handBag.code,
                  handBagName: highestRate.handBag.name,
                  outputRate: highestRate.outputRate,
                }
              : null,
            lowestRate: lowestRate
              ? {
                  handBagCode: lowestRate.handBag.code,
                  handBagName: lowestRate.handBag.name,
                  outputRate: lowestRate.outputRate,
                }
              : null,
          },
        };
      });

      return {
        data: groupsWithStats,
        total,
      };
    } catch (error) {
      this.logger.error(
        `Error listing groups with performance stats: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Failed to list groups with performance stats: ${error.message}`,
      );
    }
  }
}
