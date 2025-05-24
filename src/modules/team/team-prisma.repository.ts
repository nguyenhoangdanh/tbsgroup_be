import { Injectable, Logger } from '@nestjs/common';
import { Team as PrismaTeam, Prisma } from '@prisma/client';
import prisma from 'src/share/components/prisma';
import { AppError } from 'src/share';
import { TeamCondDTO, TeamLeaderDTO } from './team.dto';
import { Team } from './team.model';
import { BasePrismaRepository } from 'src/CrudModule/base-prisma.repository';
import { TeamCreateDTO, TeamUpdateDTO } from './team.dto';
import { UserRole } from 'src/share';

@Injectable()
export class TeamPrismaRepository extends BasePrismaRepository<
  Team,
  TeamCreateDTO,
  TeamUpdateDTO
> {
  // Change from implicit private logger to explicit protected logger
  protected readonly logger = new Logger(TeamPrismaRepository.name);

  constructor() {
    super('Team', prisma.team);
  }

  // Implement abstract methods from BasePrismaRepository
  protected _toModel(data: PrismaTeam): Team {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      lineId: data.lineId,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  protected _conditionsToWhereClause(
    conditions: TeamCondDTO,
  ): Prisma.TeamWhereInput {
    const whereClause: Prisma.TeamWhereInput = {};

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

    if (conditions.lineId) {
      whereClause.lineId = conditions.lineId;
    }

    // Common search by code or name
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

  // Custom methods for Team Repository
  async findByCode(code: string): Promise<Team | null> {
    try {
      const data = await prisma.team.findFirst({
        where: { code: { equals: code, mode: 'insensitive' } },
      });

      return data ? this._toModel(data) : null;
    } catch (error) {
      this.logger.error(
        `Error finding team by code ${code}: ${error.message}`,
        error.stack,
      );
      throw AppError.from(
        new Error(`Failed to find team by code: ${error.message}`),
        500,
      );
    }
  }

  async listByLineId(lineId: string): Promise<Team[]> {
    try {
      const data = await prisma.team.findMany({
        where: { lineId },
        orderBy: { name: 'asc' },
      });

      return data.map((item: any) => this._toModel(item));
    } catch (error) {
      this.logger.error(
        `Error listing teams by line ID: ${error.message}`,
        error.stack,
      );
      throw AppError.from(
        new Error(`Failed to list teams by line ID: ${error.message}`),
        500,
      );
    }
  }

  // Update timestamp only
  async updateTimestamp(id: string): Promise<void> {
    try {
      await prisma.team.update({
        where: { id },
        data: {
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Error updating team timestamp ${id}: ${error.message}`,
        error.stack,
      );
      throw AppError.from(
        new Error(`Failed to update team timestamp: ${error.message}`),
        500,
      );
    }
  }

  // Team leader methods
  async addLeader(teamId: string, leaderDTO: TeamLeaderDTO): Promise<void> {
    try {
      // If this is a primary leader, update all existing leaders to not be primary
      if (leaderDTO.isPrimary) {
        await prisma.teamLeader.updateMany({
          where: { teamId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      // Add the new leader
      await prisma.teamLeader.create({
        data: {
          teamId,
          userId: leaderDTO.userId,
          isPrimary: leaderDTO.isPrimary,
          startDate: leaderDTO.startDate,
          endDate: leaderDTO.endDate,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error adding leader to team ${teamId}: ${error.message}`,
        error.stack,
      );
      throw AppError.from(
        new Error(`Failed to add team leader: ${error.message}`),
        500,
      );
    }
  }

  async removeLeader(teamId: string, userId: string): Promise<void> {
    try {
      await prisma.teamLeader.deleteMany({
        where: { teamId, userId },
      });
    } catch (error) {
      this.logger.error(
        `Error removing leader from team ${teamId}: ${error.message}`,
        error.stack,
      );
      throw AppError.from(
        new Error(`Failed to remove team leader: ${error.message}`),
        500,
      );
    }
  }

  async updateLeader(
    teamId: string,
    userId: string,
    isPrimary: boolean,
    endDate?: Date,
  ): Promise<void> {
    try {
      // If setting as primary, update all existing primary leaders
      if (isPrimary) {
        await prisma.teamLeader.updateMany({
          where: { teamId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      // Update the specific leader
      await prisma.teamLeader.updateMany({
        where: { teamId, userId },
        data: {
          isPrimary,
          ...(endDate ? { endDate } : {}),
        },
      });
    } catch (error) {
      this.logger.error(
        `Error updating leader for team ${teamId}: ${error.message}`,
        error.stack,
      );
      throw AppError.from(
        new Error(`Failed to update team leader: ${error.message}`),
        500,
      );
    }
  }

  async getLeaders(teamId: string): Promise<
    {
      userId: string;
      isPrimary: boolean;
      startDate: Date;
      endDate: Date | null;
    }[]
  > {
    try {
      const leaders = await prisma.teamLeader.findMany({
        where: {
          teamId,
          OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        },
        orderBy: [{ isPrimary: 'desc' }, { startDate: 'desc' }],
      });

      return leaders.map((leader) => ({
        userId: leader.userId,
        isPrimary: leader.isPrimary,
        startDate: leader.startDate,
        endDate: leader.endDate,
      }));
    } catch (error) {
      this.logger.error(
        `Error getting leaders for team ${teamId}: ${error.message}`,
        error.stack,
      );
      throw AppError.from(
        new Error(`Failed to get team leaders: ${error.message}`),
        500,
      );
    }
  }

  // Validation methods
  async hasGroups(teamId: string): Promise<boolean> {
    try {
      const count = await prisma.group.count({
        where: { teamId },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking if team ${teamId} has groups: ${error.message}`,
        error.stack,
      );
      throw AppError.from(
        new Error(`Failed to check if team has groups: ${error.message}`),
        500,
      );
    }
  }

  async isLeader(userId: string, teamId: string): Promise<boolean> {
    try {
      // Check if user has admin role
      const hasAdminRole = await prisma.userRoleAssignment.findFirst({
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

      // Check direct team leader assignment
      const directAssignment = await prisma.teamLeader.findFirst({
        where: {
          userId,
          teamId,
          OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        },
      });

      if (directAssignment) {
        return true;
      }

      // Check role-based team leader assignment
      const roleAssignment = await prisma.userRoleAssignment.findFirst({
        where: {
          userId,
          role: {
            code: 'TEAM_LEADER',
          },
          scope: `team:${teamId}`,
          OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
        },
      });

      return !!roleAssignment;
    } catch (error) {
      this.logger.error(
        `Error checking if user ${userId} is leader of team ${teamId}: ${error.message}`,
        error.stack,
      );
      throw AppError.from(
        new Error(`Failed to check team leader status: ${error.message}`),
        500,
      );
    }
  }
}
