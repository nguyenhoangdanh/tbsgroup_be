import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppError, ErrNotFound, Paginated, PagingDTO, Requester, UserRole } from 'src/share';
import { v4 as uuidv4 } from 'uuid';
import { LINE_REPOSITORY } from '../line/line.di-token';
import { ILineRepository } from '../line/line.port';
import { TEAM_REPOSITORY } from './team.di-token';
import {
  TeamCondDTO,
  TeamCreateDTO,
  TeamLeaderDTO,
  TeamUpdateDTO,
} from './team.dto';
import {
  ErrLineNotFound,
  ErrTeamCodeExists,
  ErrTeamNameExists,
  ErrPermissionDenied,
  Team,
} from './team.model';
import { ITeamRepository, ITeamService } from './team.port';
import { USER_REPOSITORY } from '../user/user.di-token';
import { IUserRepository } from '../user/user.port';
import { BaseCrudService } from 'src/CrudModule/base-crud.service';

@Injectable()
export class TeamService
    extends BaseCrudService<Team, TeamCreateDTO, TeamUpdateDTO>
    implements ITeamService {

    constructor(
        @Inject(TEAM_REPOSITORY)
        private readonly teamRepo: ITeamRepository,
        @Inject(LINE_REPOSITORY)
        private readonly lineRepo: ILineRepository,
        @Inject(USER_REPOSITORY)
        private readonly userRepo: IUserRepository,
    ) {
        super('Team', teamRepo);
    }

    // Override createEntity with custom validation
    async createEntity(requester: Requester, dto: TeamCreateDTO): Promise<string> {
        try {
            // Check if requester exists
            if (!requester) {
                throw AppError.from(new Error('Authentication required'), 401);
            }
      
            // Check permissions
            if (
                requester.role !== UserRole.ADMIN &&
                requester.role !== UserRole.SUPER_ADMIN &&
                requester.role !== UserRole.FACTORY_MANAGER &&
                requester.role !== UserRole.LINE_MANAGER
            ) {
                throw AppError.from(ErrPermissionDenied, 403);
            }

            // If Line Manager, check if manages the line
            if (requester.role === UserRole.LINE_MANAGER) {
                const canManageLine = await this.lineRepo.isManager(
                    requester.sub,
                    dto.lineId,
                );
                if (!canManageLine) {
                    throw AppError.from(ErrPermissionDenied, 403);
                }
            }

            // Check if line exists
            const line = await this.lineRepo.get(dto.lineId);
            if (!line) {
                throw AppError.from(ErrLineNotFound, 404);
            }

            // Check for duplicate code
            const existingTeamWithCode = await this.teamRepo.findByCode(dto.code);
            if (existingTeamWithCode) {
                throw AppError.from(ErrTeamCodeExists, 400);
            }

            // Check for duplicate name within the same line
            const existingTeamWithName = await this.teamRepo.findByCond({
                name: dto.name,
                lineId: dto.lineId,
            } as TeamCondDTO);
            if (existingTeamWithName) {
                throw AppError.from(ErrTeamNameExists, 400);
            }

            // Create new team
            const newId = uuidv4();
            const newTeam: Team = {
                id: newId,
                code: dto.code,
                name: dto.name,
                description: dto.description || null,
                lineId: dto.lineId,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await this.teamRepo.insert(newTeam);
            this.logEvent('Created', newId, requester);

            return newId;
        } catch (error) {
            this.handleError(
                error,
                'Error during team creation',
                error instanceof AppError ? error.getStatusCode() : 400
            );
            // This line is needed because TypeScript knows handleError never returns
            // but compiler doesn't recognize that for control flow analysis
            throw new Error("Unreachable code");
        }
    }

    // Override updateEntity with custom validation
    async updateEntity(
        requester: Requester,
        id: string,
        dto: TeamUpdateDTO
    ): Promise<void> {
        try {
            // Check if team exists
            const team = await this.teamRepo.get(id);
            if (!team) {
                throw AppError.from(ErrNotFound, 404);
            }
  
            // Validate requester has permission
            await this.validateUpdate(requester, team, dto);
  
            // Check name uniqueness if name is being updated
            if (dto.name && dto.name !== team.name) {
                const existingWithName = await this.teamRepo.findByCond({
                    name: dto.name,
                    lineId: team.lineId,
                } as TeamCondDTO);
                if (existingWithName && existingWithName.id !== id) {
                    throw AppError.from(ErrTeamNameExists, 400);
                }
            }
  
            // Update team with type assertion
            await this.teamRepo.update(id, {
                ...dto,
                updatedAt: new Date(),
            } as any); // Using 'as any' to bypass TypeScript error
  
            this.logEvent('Updated', id, requester);
        } catch (error) {
            this.handleError(
                error,
                `Error updating team ${id}`,
                error instanceof AppError ? error.getStatusCode() : 400
            );
        }
    }

    // Override deleteEntity with custom validation
    async deleteEntity(requester: Requester, id: string): Promise<void> {
        try {
            // Check if team exists
            const team = await this.teamRepo.get(id);
            if (!team) {
                throw AppError.from(ErrNotFound, 404);
            }

            // Validate requester has permission
            await this.validateDelete(requester, team);

            // Check for associated groups
            const hasGroups = await this.teamRepo.hasGroups(id);
            if (hasGroups) {
                throw AppError.from(
                    new Error('Tổ đã có các nhóm sản xuất, không thể xóa'),
                    400,
                );
            }

            // Delete team
            await this.teamRepo.delete(id);
            this.logEvent('Deleted', id, requester);
        } catch (error) {
            this.handleError(
                error,
                `Error deleting team ${id}`,
                error instanceof AppError ? error.getStatusCode() : 400
            );
        }
    }

    // Override validation methods
    protected async validateUpdate(
        requester: Requester,
        team: Team,
        dto: TeamUpdateDTO,
    ): Promise<void> {
        const canManage = await this.canManageTeam(requester.sub, team.id);
        if (!canManage) {
            throw AppError.from(ErrPermissionDenied, 403);
        }
    }

    protected async validateDelete(
        requester: Requester,
        team: Team,
    ): Promise<void> {
        // Only ADMIN, SUPER_ADMIN, FACTORY_MANAGER or LINE_MANAGER of line can delete
        if (
            requester.role !== UserRole.ADMIN &&
            requester.role !== UserRole.SUPER_ADMIN
        ) {
            const isLineManager = await this.lineRepo.isManager(
                requester.sub,
                team.lineId
            );
            if (!isLineManager) {
                throw AppError.from(ErrPermissionDenied, 403);
            }
        }
    }

    // Override checkPermission to implement team-specific permissions
    protected async checkPermission(
        requester: Requester,
        action: 'create' | 'read' | 'update' | 'delete',
        entityId?: string,
    ): Promise<void> {
        if (
            requester.role === UserRole.ADMIN ||
            requester.role === UserRole.SUPER_ADMIN
        ) {
            return; // Admin has all permissions
        }

        // Check team-specific permissions
        if (entityId) {
            const canManage = await this.canManageTeam(requester.sub, entityId);
            if (!canManage) {
                throw AppError.from(ErrPermissionDenied, 403);
            }
        }
    }

    // Find by line ID implementation
    async findByLineId(lineId: string): Promise<Team[]> {
        try {
            return await this.teamRepo.listByLineId(lineId);
        } catch (error) {
            this.handleError(
                error,
                `Error retrieving teams by line ${lineId}`,
                error instanceof AppError ? error.getStatusCode() : 400
            );
            return []; // Unreachable, but needed for typechecking
        }
    }

    // Team leader methods
    async addTeamLeader(
        requester: Requester,
        teamId: string,
        leaderDTO: TeamLeaderDTO
    ): Promise<void> {
        try {
            // Check if team exists
            const team = await this.teamRepo.get(teamId);
            if (!team) {
                throw AppError.from(ErrNotFound, 404);
            }

            // Check permissions
            const canManage = await this.canManageTeam(requester.sub, teamId);
            if (!canManage) {
                throw AppError.from(ErrPermissionDenied, 403);
            }

            // Check if user exists
            const user = await this.userRepo.get(leaderDTO.userId);
            if (!user) {
                throw AppError.from(new Error('Người dùng không tồn tại'), 404);
            }

            // Add leader
            await this.teamRepo.addLeader(teamId, leaderDTO);
            this.logger.log(
                `Team leader added: ${leaderDTO.userId} to team ${teamId} by ${requester.sub}`
            );
        } catch (error) {
            this.handleError(
                error,
                `Error adding team leader to ${teamId}`,
                error instanceof AppError ? error.getStatusCode() : 400
            );
        }
    }

    async removeTeamLeader(
        requester: Requester,
        teamId: string,
        userId: string
    ): Promise<void> {
        try {
            // Check if team exists
            const team = await this.teamRepo.get(teamId);
            if (!team) {
                throw AppError.from(ErrNotFound, 404);
            }

            // Check permissions
            const canManage = await this.canManageTeam(requester.sub, teamId);
            if (!canManage) {
                throw AppError.from(ErrPermissionDenied, 403);
            }

            // Prevent removing oneself
            if (requester.sub === userId) {
                throw AppError.from(
                    new Error('Không thể xóa chính mình khỏi vai trò tổ trưởng'),
                    400
                );
            }

            // Remove leader
            await this.teamRepo.removeLeader(teamId, userId);
            this.logger.log(
                `Team leader removed: ${userId} from team ${teamId} by ${requester.sub}`
            );
        } catch (error) {
            this.handleError(
                error,
                `Error removing team leader from ${teamId}`,
                error instanceof AppError ? error.getStatusCode() : 400
            );
        }
    }

    async updateTeamLeader(
        requester: Requester,
        teamId: string,
        userId: string,
        isPrimary: boolean,
        endDate?: Date
    ): Promise<void> {
        try {
            // Check if team exists
            const team = await this.teamRepo.get(teamId);
            if (!team) {
                throw AppError.from(ErrNotFound, 404);
            }

            // Check permissions
            const canManage = await this.canManageTeam(requester.sub, teamId);
            if (!canManage) {
                throw AppError.from(ErrPermissionDenied, 403);
            }

            // Update leader
            await this.teamRepo.updateLeader(teamId, userId, isPrimary, endDate);
            this.logger.log(
                `Team leader updated: ${userId} for team ${teamId} by ${requester.sub}`
            );
        } catch (error) {
            this.handleError(
                error,
                `Error updating team leader for ${teamId}`,
                error instanceof AppError ? error.getStatusCode() : 400
            );
        }
    }

    async getTeamLeaders(
        teamId: string
    ): Promise<{
        userId: string;
        isPrimary: boolean;
        startDate: Date;
        endDate: Date | null;
        user?: {
            id: string;
            fullName: string;
            avatar?: string | null;
        };
    }[]> {
        try {
            // Check if team exists
            const team = await this.teamRepo.get(teamId);
            if (!team) {
                throw AppError.from(ErrNotFound, 404);
            }

            // Get leaders
            const leaders = await this.teamRepo.getLeaders(teamId);

            // Fetch user details if available
            if (leaders.length > 0) {
                const userIds = leaders.map(leader => leader.userId);
                const users = await this.userRepo.listByIds(userIds);

                // Combine leader info with user details
                return leaders.map(leader => {
                    const user = users.find(u => u.id === leader.userId);
                    return {
                        ...leader,
                        user: user
                            ? {
                                id: user.id,
                                fullName: user.fullName,
                                avatar: user.avatar
                            }
                            : undefined,
                    };
                });
            }

            return leaders;
        } catch (error) {
            this.handleError(
                error,
                `Error getting team leaders for ${teamId}`,
                error instanceof AppError ? error.getStatusCode() : 400
            );
            // This is needed for TypeScript
            return [];
        }
    }

    // Access validation methods
    async canManageTeam(userId: string, teamId: string): Promise<boolean> {
        try {
            // Get team to check line
            const team = await this.teamRepo.get(teamId);
            if (!team) {
                return false;
            }

            // Check direct team leadership
            const isTeamLeader = await this.teamRepo.isLeader(userId, teamId);
            if (isTeamLeader) {
                return true;
            }

            // Check line management (line managers can manage teams)
            return await this.lineRepo.isManager(userId, team.lineId);
        } catch (error) {
            this.logger.error(
                `Error checking team management permission: ${error.message}`,
                error.stack
            );
            return false;
        }
    }

    async getUserAccessibleTeams(userId: string): Promise<string[]> {
        try {
            // First check if user has administrative privileges
            const userRoles = await this.userRepo.getUserRoles(userId);
            const isAdmin = userRoles.some(
                r => r.role === UserRole.ADMIN || r.role === UserRole.SUPER_ADMIN
            );

            if (isAdmin) {
                // Admin can access all teams
                const teams = await this.teamRepo.list(
                    {},
                    { page: 1, limit: 1000, sort: 'name', order: 'asc' }
                );
                return teams.data.map(team => team.id);
            }

            // Get managerial access from user repository
            const managerialAccess = await this.userRepo.getManagerialAccess(userId);
      
            // Get all teams in accessible lines
            const teamsByLine: Team[] = [];
            for (const lineId of managerialAccess.lines) {
                const lineTeams = await this.teamRepo.listByLineId(lineId);
                teamsByLine.push(...lineTeams);
            }
      
            // Get directly led teams
            const directTeamIds = managerialAccess.teams || [];
      
            // Combine and remove duplicates
            const allTeamIds = [
                ...new Set([
                    ...teamsByLine.map(team => team.id),
                    ...directTeamIds
                ])
            ];
      
            return allTeamIds;
        } catch (error) {
            this.logger.error(
                `Error getting user accessible teams: ${error.message}`,
                error.stack
            );
            return [];
        }
    }

    // Implement findByCode - needed by RPC controller
    async findByCode(code: string): Promise<Team | null> {
        try {
            return await this.teamRepo.findByCode(code);
        } catch (error) {
            this.handleError(
                error,
                `Error finding team by code ${code}`,
                error instanceof AppError ? error.getStatusCode() : 400
            );
            // This line is needed because TypeScript knows handleError never returns
            // but compiler doesn't recognize that for control flow analysis
            throw new Error("Unreachable code");
        }
    }
}