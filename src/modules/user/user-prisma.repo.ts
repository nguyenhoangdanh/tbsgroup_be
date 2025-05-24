import { Injectable, Logger } from '@nestjs/common';
import { PaginationDTO, UserCondDTO } from './user.dto';
import { User } from './user.model';
import { IUserRepository } from './user.port';
import { UserRole } from 'src/share';
import { PrismaService } from 'src/share/prisma.service';

@Injectable()
export class UserPrismaRepository implements IUserRepository {
  private readonly logger = new Logger(UserPrismaRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async get(id: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      // Kiểm tra user đã bị xóa mềm chưa (nếu có trường deletedAt)
      if (user && 'deletedAt' in user && user.deletedAt !== null) {
        return null;
      }

      return user as User;
    } catch (error) {
      this.logger.error(`Error when getting user by ID: ${error.message}`);
      throw error;
    }
  }

  async findByCond(cond: UserCondDTO): Promise<User | null> {
    try {
      const whereClause = { ...cond };

      // Loại bỏ các bản ghi đã bị xóa mềm (nếu có trường deletedAt)
      const user = await this.prisma.user.findFirst({
        where: whereClause,
      });

      if (user && 'deletedAt' in user && user.deletedAt !== null) {
        return null;
      }

      return user as User;
    } catch (error) {
      this.logger.error(`Error in findByCond: ${error.message}`);
      throw error;
    }
  }

  async findByCardId(cardId: string, employeeId: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { cardId, employeeId },
      });

      if (user && 'deletedAt' in user && user.deletedAt !== null) {
        return null;
      }

      return user as User;
    } catch (error) {
      this.logger.error(`Error in findByCardId: ${error.message}`);
      throw error;
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { username },
      });

      if (user && 'deletedAt' in user && user.deletedAt !== null) {
        return null;
      }

      return user as User;
    } catch (error) {
      this.logger.error(`Error in findByUsername: ${error.message}`);
      throw error;
    }
  }

  async findByResetToken(token: string): Promise<User | null> {
    try {
      // Sửa để phù hợp với schema mới
      const user = await this.prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpiry: { gt: new Date() },
        },
      });

      return user as User;
    } catch (error) {
      this.logger.error(`Error in findByResetToken: ${error.message}`);
      throw error;
    }
  }

  async listByIds(ids: string[]): Promise<User[]> {
    try {
      const users = await this.prisma.user.findMany({
        where: { id: { in: ids } },
      });

      // Lọc ra các user chưa bị xóa mềm
      const activeUsers = users.filter(
        (user) => !('deletedAt' in user) || user.deletedAt === null,
      );

      return activeUsers as User[];
    } catch (error) {
      this.logger.error(`Error in listByIds: ${error.message}`);
      throw error;
    }
  }

  async list(
    conditions: UserCondDTO,
    pagination: PaginationDTO,
  ): Promise<{ data: User[]; total: number }> {
    try {
      const { page, limit, sortBy, sortOrder } = pagination;

      const whereClause: any = { ...conditions };

      // Filtering by role
      if (conditions.roleId) {
        whereClause.roleId = conditions.roleId;
      }

      if (conditions.roleCode) {
        whereClause.role = {
          code: conditions.roleCode,
        };
      }

      // Filter by name if provided (case-insensitive)
      if (conditions.fullName) {
        whereClause.fullName = {
          contains: conditions.fullName,
          mode: 'insensitive',
        };
      }

      if (conditions.username) {
        whereClause.username = {
          contains: conditions.username,
          mode: 'insensitive',
        };
      }

      // Bỏ qua các user đã bị xóa mềm
      // Mặc định loại bỏ các user đã bị xóa mềm trong logic của application

      // Count total before pagination
      const total = await this.prisma.user.count({ where: whereClause });

      // Get paginated data
      const users = await this.prisma.user.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          factory: true,
          line: true,
          team: true,
          group: true,
          position: true,
          role: true,
        },
      });

      return {
        data: users as unknown as User[],
        total,
      };
    } catch (error) {
      this.logger.error(`Error in list: ${error.message}`);
      throw error;
    }
  }

  async insert(user: User): Promise<void> {
    try {
      // Chuyển đổi dữ liệu của User thành dữ liệu phù hợp với Prisma schema
      await this.prisma.user.create({
        data: this.mapUserToPrisma(user),
      });
    } catch (error) {
      this.logger.error(`Error in insert: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, dto: Partial<User>): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: this.mapUserToPrisma(dto as User),
      });
    } catch (error) {
      this.logger.error(`Error in update: ${error.message}`);
      throw error;
    }
  }

  async delete(id: string, isHard: boolean): Promise<void> {
    try {
      if (isHard) {
        await this.prisma.user.delete({
          where: { id },
        });
      } else {
        // Thay đổi để thích ứng với cách xử lý soft delete
        await this.prisma.user.update({
          where: { id },
          data: {
            status: 'DELETED',
            // Xóa mềm bằng cách xử lý ở application layer
          },
        });
      }
    } catch (error) {
      this.logger.error(`Error in delete: ${error.message}`);
      throw error;
    }
  }

  async invalidateToken(token: string): Promise<void> {
    // Implement token invalidation in Redis cache
    // This would typically store token in a blacklist with TTL matching token expiry
    this.logger.log(`Token invalidated: ${token.substring(0, 10)}...`);
  }

  async assignRole(
    userId: string,
    roleId: string,
    scope?: string,
    expiryDate?: Date,
  ): Promise<void> {
    try {
      await this.prisma.userRoleAssignment.create({
        data: {
          userId,
          roleId,
          scope,
          expiryDate,
        },
      });
    } catch (error) {
      this.logger.error(`Error in assignRole: ${error.message}`);
      throw error;
    }
  }

  async removeRole(
    userId: string,
    roleId: string,
    scope?: string,
  ): Promise<void> {
    try {
      await this.prisma.userRoleAssignment.deleteMany({
        where: {
          userId,
          roleId,
          scope: scope || null,
        },
      });
    } catch (error) {
      this.logger.error(`Error in removeRole: ${error.message}`);
      throw error;
    }
  }

  async getUserRoles(userId: string): Promise<
    {
      roleId: string;
      role: UserRole;
      scope?: string;
      expiryDate?: Date | null;
    }[]
  > {
    try {
      const userRoles = await this.prisma.userRoleAssignment.findMany({
        where: { userId },
        include: { role: true },
      });

      return userRoles.map((ur) => ({
        roleId: ur.roleId,
        role: ur.role.code as UserRole,
        scope: ur.scope || undefined,
        expiryDate: ur.expiryDate,
      }));
    } catch (error) {
      this.logger.error(`Error in getUserRoles: ${error.message}`);
      throw error;
    }
  }

  async isFactoryManager(userId: string, factoryId: string): Promise<boolean> {
    try {
      // Check if user has factory manager role for this factory
      const userRole = await this.prisma.userRoleAssignment.findFirst({
        where: {
          userId,
          role: { code: UserRole.FACTORY_MANAGER },
          scope: factoryId,
        },
      });

      return !!userRole;
    } catch (error) {
      this.logger.error(`Error in isFactoryManager: ${error.message}`);
      throw error;
    }
  }

  async isLineManager(userId: string, lineId: string): Promise<boolean> {
    try {
      // Check if user has line manager role for this line
      const userRole = await this.prisma.userRoleAssignment.findFirst({
        where: {
          userId,
          role: { code: UserRole.LINE_MANAGER },
          scope: lineId,
        },
      });

      return !!userRole;
    } catch (error) {
      this.logger.error(`Error in isLineManager: ${error.message}`);
      throw error;
    }
  }

  async isTeamLeader(userId: string, teamId: string): Promise<boolean> {
    try {
      // Check if user has team leader role for this team
      const userRole = await this.prisma.userRoleAssignment.findFirst({
        where: {
          userId,
          role: { code: UserRole.TEAM_LEADER },
          scope: teamId,
        },
      });

      return !!userRole;
    } catch (error) {
      this.logger.error(`Error in isTeamLeader: ${error.message}`);
      throw error;
    }
  }

  async isGroupLeader(userId: string, groupId: string): Promise<boolean> {
    try {
      // Check if user has group leader role for this group
      const userRole = await this.prisma.userRoleAssignment.findFirst({
        where: {
          userId,
          role: { code: UserRole.GROUP_LEADER },
          scope: groupId,
        },
      });

      return !!userRole;
    } catch (error) {
      this.logger.error(`Error in isGroupLeader: ${error.message}`);
      throw error;
    }
  }

  async getManagerialAccess(userId: string): Promise<{
    factories: string[];
    lines: string[];
    teams: string[];
    groups: string[];
  }> {
    try {
      // Get all user roles with scopes
      const userRoles = await this.prisma.userRoleAssignment.findMany({
        where: { userId },
        include: { role: true },
      });

      const result = {
        factories: [] as string[],
        lines: [] as string[],
        teams: [] as string[],
        groups: [] as string[],
      };

      // Map roles to their respective organization units
      for (const userRole of userRoles) {
        if (!userRole.scope) continue;

        switch (userRole.role.code) {
          case UserRole.FACTORY_MANAGER:
            result.factories.push(userRole.scope);
            break;
          case UserRole.LINE_MANAGER:
            result.lines.push(userRole.scope);
            break;
          case UserRole.TEAM_LEADER:
            result.teams.push(userRole.scope);
            break;
          case UserRole.GROUP_LEADER:
            result.groups.push(userRole.scope);
            break;
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Error in getManagerialAccess: ${error.message}`);
      throw error;
    }
  }

  // Helper để chuyển đổi User model sang dữ liệu Prisma
  private mapUserToPrisma(user: User): any {
    // Loại bỏ các trường không tồn tại trong schema Prisma
    const {
      // Trích xuất các thuộc tính cần xử lý đặc biệt
      factoryId,
      roleId,
      lineId,
      teamId,
      groupId,
      positionId,
      ...prismaData
    } = user;

    // Tạo đối tượng dữ liệu Prisma với các quan hệ phù hợp
    return {
      ...prismaData,
      // Xử lý quan hệ với factory nếu có factoryId
      ...(factoryId
        ? {
            factory: {
              connect: { id: factoryId },
            },
          }
        : {}),
      // Xử lý quan hệ với role nếu có roleId
      ...(roleId
        ? {
            role: {
              connect: { id: roleId },
            },
          }
        : {}),
      // Xử lý quan hệ với line nếu có lineId
      ...(lineId
        ? {
            line: {
              connect: { id: lineId },
            },
          }
        : {}),
      // Xử lý quan hệ với team nếu có teamId
      ...(teamId
        ? {
            team: {
              connect: { id: teamId },
            },
          }
        : {}),
      // Xử lý quan hệ với group nếu có groupId
      ...(groupId
        ? {
            group: {
              connect: { id: groupId },
            },
          }
        : {}),
      // Xử lý quan hệ với position nếu có positionId
      ...(positionId
        ? {
            position: {
              connect: { id: positionId },
            },
          }
        : {}),
    };
  }
}
