import { Injectable, Logger } from '@nestjs/common';
import {
  User as UserPrisma,
  UserRole as PrismaUserRole,
  UserStatus as PrismaUserStatus,
  Prisma,
} from '@prisma/client';
import { UserRole } from 'src/share';
import prisma from 'src/share/components/prisma';
import { PaginationDTO, UserCondDTO } from './user.dto';
import { User, UserStatus } from './user.model';
import { IUserRepository } from './user.port';

@Injectable()
export class UserPrismaRepository implements IUserRepository {
  private readonly logger = new Logger(UserPrismaRepository.name);

  // Query methods
  async get(id: string): Promise<User | null> {
    try {
      const data = await prisma.user.findUnique({
        where: { id },
      });

      if (!data) return null;
      return this._toModel(data);
    } catch (error) {
      this.logger.error(
        `Error fetching user ${id}: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  async findByCond(cond: UserCondDTO): Promise<User | null> {
    try {
      const data = await prisma.user.findFirst({
        where: this._conditionsToWhereClause(cond),
      });

      if (!data) return null;
      return this._toModel(data);
    } catch (error) {
      this.logger.error(
        `Error finding user by conditions: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  async findByCardId(cardId: string, employeeId: string): Promise<User | null> {
    try {
      const data = await prisma.user.findFirst({
        where: {
          cardId,
          employeeId,
        },
      });

      if (!data) return null;
      return this._toModel(data);
    } catch (error) {
      this.logger.error(
        `Error finding user by card ID: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    try {
      const data = await prisma.user.findFirst({
        where: {
          username,
        },
      });

      if (!data) return null;
      return this._toModel(data);
    } catch (error) {
      this.logger.error(
        `Error finding user by username: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  async findByResetToken(token: string): Promise<User | null> {
    try {
      const data = await prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpiry: {
            gt: new Date(), // Token not expired
          },
        },
      });

      if (!data) return null;
      return this._toModel(data);
    } catch (error) {
      this.logger.error(
        `Error finding user by reset token: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  async listByIds(ids: string[]): Promise<User[]> {
    try {
      const data = await prisma.user.findMany({
        where: { id: { in: ids } },
      });
      return data.map(this._toModel);
    } catch (error) {
      this.logger.error(
        `Error listing users by IDs: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  async list(
    conditions: UserCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: User[];
    total: number;
  }> {
    try {
      const whereClause = this._conditionsToWhereClause(conditions);

      // Get total count
      const total = await prisma.user.count({
        where: whereClause,
      });

      // Get paginated data
      const data = await prisma.user.findMany({
        where: whereClause,
        orderBy: {
          [pagination.sortBy]: pagination.sortOrder,
        },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      });

      return {
        data: data.map(this._toModel),
        total,
      };
    } catch (error) {
      this.logger.error(`Error listing users: ${error.message}`, error.stack);
      return {
        data: [],
        total: 0,
      };
    }
  }

  // Command methods
  async insert(user: User): Promise<void> {
    try {
      await prisma.user.create({
        data: this._toDbModel(user),
      });
    } catch (error) {
      this.logger.error(`Error inserting user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, dto: Partial<User>): Promise<void> {
    try {
      await prisma.user.update({
        where: { id },
        data: this._prepareUpdateData(dto),
      });
    } catch (error) {
      this.logger.error(
        `Error updating user ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async delete(id: string, isHard: boolean): Promise<void> {
    try {
      if (isHard) {
        await prisma.user.delete({ where: { id } });
      } else {
        await prisma.user.update({
          where: { id },
          data: { status: PrismaUserStatus.DELETED },
        });
      }
    } catch (error) {
      this.logger.error(
        `Error deleting user ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async invalidateToken(token: string): Promise<void> {
    // This is handled by the TokenService using Redis
    // No implementation needed in the repository
  }

  // Role management methods
  async assignRole(
    userId: string,
    role: UserRole,
    scope?: string,
    expiryDate?: Date,
  ): Promise<void> {
    try {
      await prisma.userRoleAssignment.create({
        data: {
          userId,
          role: role as PrismaUserRole,
          scope,
          // In the real implementation, add expiryDate to schema and include it here
        },
      });
    } catch (error) {
      this.logger.error(
        `Error assigning role to user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async removeRole(
    userId: string,
    role: UserRole,
    scope?: string,
  ): Promise<void> {
    try {
      await prisma.userRoleAssignment.deleteMany({
        where: {
          userId,
          role: role as PrismaUserRole,
          scope: scope || undefined,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error removing role from user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getUserRoles(
    userId: string,
  ): Promise<{ role: UserRole; scope?: string; expiryDate?: Date }[]> {
    try {
      const roles = await prisma.userRoleAssignment.findMany({
        where: { userId },
        select: {
          role: true,
          scope: true,
        },
      });

      return roles.map((r) => ({
        role: r.role as UserRole,
        scope: r.scope || undefined, // Chuyển null thành undefined
        // expiryDate sẽ được thêm khi schema cập nhật
      }));
    } catch (error) {
      this.logger.error(
        `Error getting user roles for ${userId}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }
  // Entity access methods
  async isFactoryManager(userId: string, factoryId: string): Promise<boolean> {
    try {
      // 1. Check direct assignment in FactoryManager
      const manager = await prisma.factoryManager.findFirst({
        where: {
          factoryId,
          userId,
          endDate: {
            gte: new Date(), // Still active
          },
        },
      });

      if (manager) return true;

      // 2. Check role-based assignment
      const userRole = await prisma.userRoleAssignment.findFirst({
        where: {
          userId,
          OR: [
            {
              role: PrismaUserRole.FACTORY_MANAGER,
              scope: `factory:${factoryId}`,
            },
            { role: PrismaUserRole.ADMIN },
            { role: PrismaUserRole.SUPER_ADMIN },
          ],
        },
      });

      return !!userRole;
    } catch (error) {
      this.logger.error(
        `Error checking factory manager status: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  async isLineManager(userId: string, lineId: string): Promise<boolean> {
    try {
      // 1. Check direct assignment in LineManager
      const manager = await prisma.lineManager.findFirst({
        where: {
          lineId,
          userId,
          endDate: {
            gte: new Date(), // Still active
          },
        },
      });

      if (manager) return true;

      // 2. Check role-based assignment for this specific line
      const lineRoleAssignment = await prisma.userRoleAssignment.findFirst({
        where: {
          userId,
          role: PrismaUserRole.LINE_MANAGER,
          scope: `line:${lineId}`,
        },
      });

      if (lineRoleAssignment) return true;

      // 3. Get factory ID of the line and check factory manager status
      const line = await prisma.line.findUnique({
        where: { id: lineId },
        select: { factoryId: true },
      });

      if (!line) return false;

      return this.isFactoryManager(userId, line.factoryId);
    } catch (error) {
      this.logger.error(
        `Error checking line manager status: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  async isTeamLeader(userId: string, teamId: string): Promise<boolean> {
    try {
      // 1. Check direct assignment in TeamLeader
      const leader = await prisma.teamLeader.findFirst({
        where: {
          teamId,
          userId,
          endDate: {
            gte: new Date(),
          },
        },
      });

      if (leader) return true;

      // 2. Check role-based team leader assignment
      const teamRoleAssignment = await prisma.userRoleAssignment.findFirst({
        where: {
          userId,
          role: PrismaUserRole.TEAM_LEADER,
          scope: `team:${teamId}`,
        },
      });

      if (teamRoleAssignment) return true;

      // 3. Get line ID of the team and check line manager status
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { lineId: true },
      });

      if (!team) return false;

      return this.isLineManager(userId, team.lineId);
    } catch (error) {
      this.logger.error(
        `Error checking team leader status: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  async isGroupLeader(userId: string, groupId: string): Promise<boolean> {
    try {
      // 1. Check direct assignment in GroupLeader
      const leader = await prisma.groupLeader.findFirst({
        where: {
          groupId,
          userId,
          endDate: {
            gte: new Date(),
          },
        },
      });

      if (leader) return true;

      // 2. Check role-based group leader assignment
      const groupRoleAssignment = await prisma.userRoleAssignment.findFirst({
        where: {
          userId,
          role: PrismaUserRole.GROUP_LEADER,
          scope: `group:${groupId}`,
        },
      });

      if (groupRoleAssignment) return true;

      // 3. Get team ID of the group and check team leader status
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: { teamId: true },
      });

      if (!group) return false;

      return this.isTeamLeader(userId, group.teamId);
    } catch (error) {
      this.logger.error(
        `Error checking group leader status: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  async getManagerialAccess(userId: string): Promise<{
    factories: string[];
    lines: string[];
    teams: string[];
    groups: string[];
  }> {
    try {
      // Get user's base info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
        },
      });

      // Admin and super admin have access to everything
      if (
        user &&
        (user.role === PrismaUserRole.ADMIN ||
          user.role === PrismaUserRole.SUPER_ADMIN)
      ) {
        const factories = await prisma.factory.findMany({
          select: { id: true },
        });
        const lines = await prisma.line.findMany({ select: { id: true } });
        const teams = await prisma.team.findMany({ select: { id: true } });
        const groups = await prisma.group.findMany({ select: { id: true } });

        return {
          factories: factories.map((f) => f.id),
          lines: lines.map((l) => l.id),
          teams: teams.map((t) => t.id),
          groups: groups.map((g) => g.id),
        };
      }

      // Get directly managed factories
      const managedFactories = await prisma.factoryManager.findMany({
        where: {
          userId,
          endDate: {
            gte: new Date(),
          },
        },
        select: {
          factoryId: true,
        },
      });

      // Get factory-scoped roles
      const factoryRoles = await prisma.userRoleAssignment.findMany({
        where: {
          userId,
          role: PrismaUserRole.FACTORY_MANAGER,
          scope: {
            startsWith: 'factory:',
          },
        },
        select: {
          scope: true,
        },
      });

      const factoryIds = [
        ...managedFactories.map((f) => f.factoryId),
        ...factoryRoles
          .map((r) => r.scope?.replace('factory:', '') || '')
          .filter((id) => id !== ''),
      ];

      // Get lines in these factories and directly managed lines
      const linesInFactories =
        factoryIds.length > 0
          ? await prisma.line.findMany({
              where: {
                factoryId: {
                  in: factoryIds,
                },
              },
              select: {
                id: true,
              },
            })
          : [];

      const managedLines = await prisma.lineManager.findMany({
        where: {
          userId,
          endDate: {
            gte: new Date(),
          },
        },
        select: {
          lineId: true,
        },
      });

      const lineRoles = await prisma.userRoleAssignment.findMany({
        where: {
          userId,
          role: PrismaUserRole.LINE_MANAGER,
          scope: {
            startsWith: 'line:',
          },
        },
        select: {
          scope: true,
        },
      });

      const lineIds = [
        ...managedLines.map((l) => l.lineId),
        ...lineRoles
          .map((r) => r.scope?.replace('line:', '') || '')
          .filter((id) => id !== ''),
        ...linesInFactories.map((l) => l.id),
      ];

      // Get teams in these lines and directly managed teams
      const teamsInLines =
        lineIds.length > 0
          ? await prisma.team.findMany({
              where: {
                lineId: {
                  in: lineIds,
                },
              },
              select: {
                id: true,
              },
            })
          : [];

      const managedTeams = await prisma.teamLeader.findMany({
        where: {
          userId,
          endDate: {
            gte: new Date(),
          },
        },
        select: {
          teamId: true,
        },
      });

      const teamRoles = await prisma.userRoleAssignment.findMany({
        where: {
          userId,
          role: PrismaUserRole.TEAM_LEADER,
          scope: {
            startsWith: 'team:',
          },
        },
        select: {
          scope: true,
        },
      });

      const teamIds = [
        ...managedTeams.map((t) => t.teamId),
        ...teamRoles
          .map((r) => r.scope?.replace('team:', '') || '')
          .filter((id) => id !== ''),
        ...teamsInLines.map((t) => t.id),
      ];

      // Get groups in these teams and directly managed groups
      const groupsInTeams =
        teamIds.length > 0
          ? await prisma.group.findMany({
              where: {
                teamId: {
                  in: teamIds,
                },
              },
              select: {
                id: true,
              },
            })
          : [];

      const managedGroups = await prisma.groupLeader.findMany({
        where: {
          userId,
          endDate: {
            gte: new Date(),
          },
        },
        select: {
          groupId: true,
        },
      });

      const groupRoles = await prisma.userRoleAssignment.findMany({
        where: {
          userId,
          role: PrismaUserRole.GROUP_LEADER,
          scope: {
            startsWith: 'group:',
          },
        },
        select: {
          scope: true,
        },
      });

      const groupIds = [
        ...managedGroups.map((g) => g.groupId),
        ...groupRoles
          .map((r) => r.scope?.replace('group:', '') || '')
          .filter((id) => id !== ''),
        ...groupsInTeams.map((g) => g.id),
      ];

      // Remove duplicates
      return {
        factories: [...new Set(factoryIds)],
        lines: [...new Set(lineIds)],
        teams: [...new Set(teamIds)],
        groups: [...new Set(groupIds)],
      };
    } catch (error) {
      this.logger.error(
        `Error getting managerial access for user ${userId}: ${error.message}`,
        error.stack,
      );
      return {
        factories: [],
        lines: [],
        teams: [],
        groups: [],
      };
    }
  }

  // Helper methods
  private _toModel(data: UserPrisma): User {
    return {
      ...data,
      role: data.role as UserRole,
      status: data.status as UserStatus,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      lastLogin: data.lastLogin ? new Date(data.lastLogin) : null,
      passwordResetExpiry: data.passwordResetExpiry
        ? new Date(data.passwordResetExpiry)
        : null,
    };
  }

  private _toDbModel(user: User): any {
    return {
      ...user,
      role: user.role as PrismaUserRole,
      status: user.status as PrismaUserStatus,
    };
  }

  private _prepareUpdateData(dto: Partial<User>): any {
    const prepared: any = { ...dto };

    // Convert enums
    if (dto.role !== undefined) {
      prepared.role = dto.role as PrismaUserRole;
    }

    if (dto.status !== undefined) {
      prepared.status = dto.status as PrismaUserStatus;
    }

    return prepared;
  }

  private _conditionsToWhereClause(
    conditions: UserCondDTO,
  ): Prisma.UserWhereInput {
    const whereClause: Prisma.UserWhereInput = {};

    if (conditions.username) {
      whereClause.username = {
        contains: conditions.username,
        mode: 'insensitive',
      };
    }

    if (conditions.fullName) {
      whereClause.fullName = {
        contains: conditions.fullName,
        mode: 'insensitive',
      };
    }

    if (conditions.role) {
      whereClause.role = conditions.role as PrismaUserRole;
    }

    if (conditions.status) {
      whereClause.status = conditions.status as PrismaUserStatus;
    }

    if (conditions.factoryId) {
      whereClause.factoryId = conditions.factoryId;
    }

    if (conditions.lineId) {
      whereClause.lineId = conditions.lineId;
    }

    if (conditions.teamId) {
      whereClause.teamId = conditions.teamId;
    }

    if (conditions.groupId) {
      whereClause.groupId = conditions.groupId;
    }

    if (conditions.positionId) {
      whereClause.positionId = conditions.positionId;
    }

    return whereClause;
  }
}
