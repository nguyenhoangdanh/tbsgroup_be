import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppError, Requester, UserRole } from 'src/share';
import { v4 as uuidv4 } from 'uuid';
import { GROUP_REPOSITORY } from './group.di-token';
import {
  GroupCondDTO,
  GroupCreateDTO,
  GroupLeaderCreateDTO,
  GroupLeaderUpdateDTO,
  GroupUpdateDTO,
  PaginationDTO,
} from './group.dto';
import {
  ErrGroupCodeExists,
  ErrGroupHasProductionData,
  ErrGroupHasUsers,
  ErrGroupNameExists,
  ErrGroupNotFound,
  ErrPermissionDenied,
  ErrTeamNotFound,
  Group,
  GroupLeader,
} from './group.model';
import { IGroupRepository, IGroupService } from './group.port';
import prisma from 'src/share/components/prisma';

@Injectable()
export class GroupService implements IGroupService {
  private readonly logger = new Logger(GroupService.name);

  constructor(
    @Inject(GROUP_REPOSITORY)
    private readonly groupRepo: IGroupRepository,
  ) {}

  async createGroup(
    requester: Requester,
    dto: GroupCreateDTO,
  ): Promise<string> {
    try {
      // Kiểm tra quyền
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN &&
        requester.role !== UserRole.TEAM_LEADER
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Kiểm tra tồn tại của team
      const teamExists = await this.checkTeamExists(dto.teamId);
      if (!teamExists) {
        throw AppError.from(ErrTeamNotFound, 404);
      }

      // Kiểm tra code trùng lặp
      const existingGroup = await this.groupRepo.findGroupByCode(dto.code);
      if (existingGroup) {
        throw AppError.from(ErrGroupCodeExists, 400);
      }

      // Kiểm tra name trùng lặp trong cùng team
      const existingWithName = await this.groupRepo.findGroupByCond({
        name: dto.name,
        teamId: dto.teamId,
      });
      if (existingWithName) {
        throw AppError.from(ErrGroupNameExists, 400);
      }

      // Tạo nhóm mới
      const newId = uuidv4();
      const newGroup: Group = {
        id: newId,
        code: dto.code,
        name: dto.name,
        description: dto.description || null,
        teamId: dto.teamId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.groupRepo.insertGroup(newGroup);
      this.logger.log(`New group created: ${dto.name} (${newId}) by ${requester.sub}`);

      return newId;
    } catch (error) {
      this.logger.error(
        `Error during group creation: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi tạo nhóm: ${error.message}`),
        400,
      );
    }
  }


  async updateGroup(
    requester: Requester,
    id: string,
    dto: GroupUpdateDTO,
  ): Promise<void> {
    try {
      // Kiểm tra nhóm tồn tại
      const group = await this.groupRepo.getGroup(id);
      if (!group) {
        throw AppError.from(ErrGroupNotFound, 404);
      }

      // Kiểm tra quyền
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN &&
        requester.role !== UserRole.TEAM_LEADER
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Nếu thay đổi team, kiểm tra team mới có tồn tại không
      if (dto.teamId && dto.teamId !== group.teamId) {
        const teamExists = await this.checkTeamExists(dto.teamId);
        if (!teamExists) {
          throw AppError.from(ErrTeamNotFound, 404);
        }
      }

      // Kiểm tra tên trùng lặp trong cùng team (nếu có cập nhật tên)
      if (dto.name && dto.name !== group.name) {
        const teamId = dto.teamId || group.teamId;
        const existingWithName = await this.groupRepo.findGroupByCond({
          name: dto.name,
          teamId,
        });
        if (existingWithName && existingWithName.id !== id) {
          throw AppError.from(ErrGroupNameExists, 400);
        }
      }

      // Cập nhật nhóm
      await this.groupRepo.updateGroup(id, {
        ...dto,
        updatedAt: new Date(),
      });

      this.logger.log(`Group updated: ${id} by ${requester.sub}`);
    } catch (error) {
      this.logger.error(
        `Error updating group ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi cập nhật nhóm: ${error.message}`),
        400,
      );
    }
  }

  async deleteGroup(requester: Requester, id: string): Promise<void> {
    try {
      // Kiểm tra nhóm tồn tại
      const group = await this.groupRepo.getGroup(id);
      if (!group) {
        throw AppError.from(ErrGroupNotFound, 404);
      }

      // Kiểm tra quyền
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Kiểm tra nhóm có thành viên không
      const hasUsers = await this.groupRepo.hasUsers(id);
      if (hasUsers) {
        throw AppError.from(ErrGroupHasUsers, 400);
      }

      // Kiểm tra nhóm có dữ liệu sản xuất không
      const hasProductionRates = await this.groupRepo.hasProductionRates(id);
      if (hasProductionRates) {
        throw AppError.from(ErrGroupHasProductionData, 400);
      }

      // Xóa nhóm
      await this.groupRepo.deleteGroup(id);
      this.logger.log(`Group deleted: ${id} by ${requester.sub}`);
    } catch (error) {
      this.logger.error(
        `Error deleting group ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi xóa nhóm: ${error.message}`),
        400,
      );
    }
  }


  async updateGroupLeader(
    requester: Requester,
    groupId: string,
    userId: string,
    dto: GroupLeaderUpdateDTO,
  ): Promise<void> {
    try {
      // Kiểm tra quyền
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN &&
        requester.role !== UserRole.TEAM_LEADER
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Kiểm tra nhóm tồn tại
      const group = await this.groupRepo.getGroup(groupId);
      if (!group) {
        throw AppError.from(ErrGroupNotFound, 404);
      }

      // Cập nhật thông tin nhóm trưởng
      await this.groupRepo.updateGroupLeader(groupId, userId, {
        ...dto,
        updatedAt: new Date(),
      });

      this.logger.log(`Group leader updated: ${userId} for group ${groupId} by ${requester.sub}`);
    } catch (error) {
      this.logger.error(
        `Error updating group leader: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi cập nhật thông tin nhóm trưởng: ${error.message}`),
        400,
      );
    }
  }

  async removeGroupLeader(
    requester: Requester,
    groupId: string,
    userId: string,
  ): Promise<void> {
    try {
      // Kiểm tra quyền
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN &&
        requester.role !== UserRole.TEAM_LEADER
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Kiểm tra nhóm tồn tại
      const group = await this.groupRepo.getGroup(groupId);
      if (!group) {
        throw AppError.from(ErrGroupNotFound, 404);
      }

      // Gỡ bỏ nhóm trưởng (cập nhật ngày kết thúc)
      await this.groupRepo.removeGroupLeader(groupId, userId);
      this.logger.log(`Group leader removed: ${userId} from group ${groupId} by ${requester.sub}`);
    } catch (error) {
      this.logger.error(
        `Error removing group leader: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi gỡ bỏ nhóm trưởng: ${error.message}`),
        400,
      );
    }
  }

  async getGroupLeaders(groupId: string): Promise<GroupLeader[]> {
    try {
      // Kiểm tra nhóm tồn tại
      const group = await this.groupRepo.getGroup(groupId);
      if (!group) {
        throw AppError.from(ErrGroupNotFound, 404);
      }

      return await this.groupRepo.getGroupLeaders(groupId);
    } catch (error) {
      this.logger.error(
        `Error getting group leaders: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi lấy danh sách nhóm trưởng: ${error.message}`),
        400,
      );
    }
  }

// ========== Group Performance Methods ==========
async getGroupPerformance(id: string): Promise<any> {
  try {
    const groupWithStats = await this.groupRepo.getGroupWithPerformanceStats(id);
    if (!groupWithStats) {
      throw AppError.from(ErrGroupNotFound, 404);
    }
    return groupWithStats;
  } catch (error) {
    this.logger.error(
      `Error getting group performance: ${error.message}`,
      error.stack,
    );

    if (error instanceof AppError) {
      throw error;
    }

    throw AppError.from(
      new Error(`Lỗi khi lấy thông tin hiệu suất nhóm: ${error.message}`),
      400,
    );
  }
}

async listGroupsWithPerformance(
  conditions: GroupCondDTO,
  pagination: PaginationDTO,
): Promise<{
  data: any[];
  total: number;
  page: number;
  limit: number;
}> {
  try {
    const { data, total } = await this.groupRepo.listGroupsWithPerformanceStats(
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
      `Error listing groups with performance: ${error.message}`,
      error.stack,
    );

    if (error instanceof AppError) {
      throw error;
    }

    throw AppError.from(
      new Error(`Lỗi khi lấy danh sách nhóm với hiệu suất: ${error.message}`),
      400,
    );
  }
}

// ========== Helper Methods ==========
private async checkTeamExists(teamId: string): Promise<boolean> {
  try {
    // Trong thực tế nên inject TeamRepository vào service
    return await prisma.team.findUnique({
      where: { id: teamId },
    }).then(team => !!team);
  } catch (error) {
    this.logger.error(
      `Error checking team existence ${teamId}: ${error.message}`,
      error.stack,
    );
    return false;
  }
}

private async checkUserExists(userId: string): Promise<boolean> {
  try {
    // Trong thực tế nên inject UserRepository vào service
    return await prisma.user.findUnique({
      where: { id: userId },
    }).then(user => !!user);
  } catch (error) {
    this.logger.error(
      `Error checking user existence ${userId}: ${error.message}`,
      error.stack,
    );
    return false;
  }
}
  
  
  // Bổ sung các phương thức còn thiếu trong GroupService:

async getGroup(id: string): Promise<Group> {
  try {
    const group = await this.groupRepo.getGroup(id);
    if (!group) {
      throw AppError.from(ErrGroupNotFound, 404);
    }
    return group;
  } catch (error) {
    this.logger.error(
      `Error getting group ${id}: ${error.message}`,
      error.stack,
    );

    if (error instanceof AppError) {
      throw error;
    }

    throw AppError.from(
      new Error(`Lỗi khi lấy thông tin nhóm: ${error.message}`),
      400,
    );
  }
}

async listGroups(
  conditions: GroupCondDTO,
  pagination: PaginationDTO,
): Promise<{
  data: Group[];
  total: number;
  page: number;
  limit: number;
}> {
  try {
    const { data, total } = await this.groupRepo.listGroups(
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
      `Error listing groups: ${error.message}`,
      error.stack,
    );

    if (error instanceof AppError) {
      throw error;
    }

    throw AppError.from(
      new Error(`Lỗi khi lấy danh sách nhóm: ${error.message}`),
      400,
    );
  }
}

async assignGroupLeader(
  requester: Requester,
  dto: GroupLeaderCreateDTO,
): Promise<void> {
  try {
    // Kiểm tra quyền
    if (
      requester.role !== UserRole.ADMIN &&
      requester.role !== UserRole.SUPER_ADMIN &&
      requester.role !== UserRole.TEAM_LEADER
    ) {
      throw AppError.from(ErrPermissionDenied, 403);
    }

    // Kiểm tra nhóm tồn tại
    const group = await this.groupRepo.getGroup(dto.groupId);
    if (!group) {
      throw AppError.from(ErrGroupNotFound, 404);
    }

    // Kiểm tra người dùng tồn tại
    const userExists = await this.checkUserExists(dto.userId);
    if (!userExists) {
      throw AppError.from(new Error('Không tìm thấy người dùng'), 404);
    }

    // Tạo nhóm trưởng mới
    const newGroupLeader: GroupLeader = {
      groupId: dto.groupId,
      userId: dto.userId,
      isPrimary: dto.isPrimary || false,
      startDate: dto.startDate,
      endDate: dto.endDate || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.groupRepo.addGroupLeader(newGroupLeader);
    this.logger.log(`New group leader assigned: ${dto.userId} for group ${dto.groupId} by ${requester.sub}`);
  } catch (error) {
    this.logger.error(
      `Error assigning group leader: ${error.message}`,
      error.stack,
    );

    if (error instanceof AppError) {
      throw error;
    }

    throw AppError.from(
      new Error(`Lỗi khi chỉ định nhóm trưởng: ${error.message}`),
      400,
    );
  }
}
}
