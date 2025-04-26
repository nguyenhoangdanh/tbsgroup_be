import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppError, ErrNotFound, Requester, UserRole } from 'src/share';
import { USER_REPOSITORY } from './user.di-token';
import {
  PaginationDTO,
  UserCondDTO,
  UserRoleAssignmentDTO,
  UserUpdateDTO,
} from './user.dto';
import {
  ErrPermissionDenied,
  ErrRoleAlreadyAssigned,
  User,
} from './user.model';
import { IUserRepository, IUserService } from './user.port';
import { ROLE_SERVICE } from '../role/role.di-token';
import { IRoleService } from '../role/role.port';

@Injectable()
export class UserService implements IUserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(ROLE_SERVICE) private readonly roleService: IRoleService,
  ) {}

  async profile(userId: string): Promise<Omit<User, 'password' | 'salt'>> {
    try {
      const user = await this.userRepo.get(userId);

      if (!user) {
        this.logger.warn(`Profile request for non-existent user: ${userId}`);
        throw AppError.from(ErrNotFound, 404);
      }

      // Exclude sensitive information
      const { password, salt, ...userInfo } = user;
      return userInfo;
    } catch (error) {
      if (error instanceof AppError && error.message === 'Not found') {
        // Convert "Not found" errors to Unauthorized for profile requests
        // This helps when a token contains a deleted user ID
        throw AppError.from(
          new Error('Người dùng không tồn tại, vui lòng đăng nhập lại'),
          401,
        );
      }
      throw error;
    }
  }

  async update(
    requester: Requester,
    userId: string,
    dto: UserUpdateDTO,
  ): Promise<void> {
    // Check if user exists
    const user = await this.userRepo.get(userId);
    if (!user) {
      throw AppError.from(ErrNotFound, 404);
    }

    // Check permissions:
    // 1. User can update their own profile (but with limited fields)
    // 2. ADMIN and SUPER_ADMIN can update any user
    // 3. Managers can update users in their hierarchy
    const isSelfUpdate = requester.sub === userId;
    const isAdmin =
      requester.role === UserRole.ADMIN ||
      requester.role === UserRole.SUPER_ADMIN;

    if (!isSelfUpdate && !isAdmin) {
      // Check hierarchical permissions for managers
      const hasAccess = await this.canAccessEntity(
        requester.sub,
        'user',
        userId,
      );
      if (!hasAccess) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Non-admins cannot change status or role
      if (dto.status !== undefined || dto.roleId !== undefined) {
        throw AppError.from(ErrPermissionDenied, 403);
      }
    }

    // If it's a self-update by a non-admin, restrict the fields that can be updated
    if (isSelfUpdate && !isAdmin) {
      const { avatar, fullName, email, phone } = dto;
      await this.userRepo.update(userId, {
        avatar,
        fullName,
        email,
        phone,
        updatedAt: new Date(),
      });
    } else {
      // For admins or managers, update all allowed fields
      await this.userRepo.update(userId, { ...dto, updatedAt: new Date() });
    }

    this.logger.log(`User updated: ${userId} by ${requester.sub}`);
  }

  async delete(requester: Requester, userId: string): Promise<void> {
    // Check if user exists
    const user = await this.userRepo.get(userId);
    if (!user) {
      throw AppError.from(ErrNotFound, 404);
    }

    // Check permissions (only self, ADMIN, or SUPER_ADMIN can delete)
    const isSelf = requester.sub === userId;
    const isAdmin =
      requester.role === UserRole.ADMIN ||
      requester.role === UserRole.SUPER_ADMIN;

    if (!isSelf && !isAdmin) {
      throw AppError.from(ErrPermissionDenied, 403);
    }

    // Soft delete the user (change status to DELETED)
    await this.userRepo.delete(userId, false);

    this.logger.log(`User deleted: ${userId} by ${requester.sub}`);
  }

  // Role management methods
  async assignRole(
    requester: Requester,
    userId: string,
    dto: UserRoleAssignmentDTO,
  ): Promise<void> {
    // Check if user exists
    const user = await this.userRepo.get(userId);
    if (!user) {
      throw AppError.from(ErrNotFound, 404);
    }

    // Check if requester has permission to assign roles
    if (
      requester.role !== UserRole.ADMIN &&
      requester.role !== UserRole.SUPER_ADMIN
    ) {
      throw AppError.from(ErrPermissionDenied, 403);
    }

    // Check if user already has this role with the same scope
    const existingRoles = await this.userRepo.getUserRoles(userId);
    const duplicateRole = existingRoles.find(
      (r) => r.roleId === dto.roleId && r.scope === dto.scope,
    );

    if (duplicateRole) {
      throw AppError.from(ErrRoleAlreadyAssigned, 400);
    }

    // Assign the role
    await this.userRepo.assignRole(
      userId,
      dto.roleId,
      dto.scope,
      dto.expiryDate,
    );

    this.logger.log(
      `Role ${dto.roleId} assigned to user ${userId} by ${requester.sub}`,
    );
  }

  async removeRole(
    requester: Requester,
    userId: string,
    roleId: string,
    scope?: string,
  ): Promise<void> {
    // Check if user exists
    const user = await this.userRepo.get(userId);
    if (!user) {
      throw AppError.from(ErrNotFound, 404);
    }

    // Check if requester has permission to remove roles
    if (
      requester.role !== UserRole.ADMIN &&
      requester.role !== UserRole.SUPER_ADMIN
    ) {
      throw AppError.from(ErrPermissionDenied, 403);
    }

    // Remove the role
    await this.userRepo.removeRole(userId, roleId, scope);

    this.logger.log(
      `Role ${roleId} removed from user ${userId} by ${requester.sub}`,
    );
  }

  async getUserRoles(
    userId: string,
  ): Promise<
    { roleId: string; role: UserRole; scope?: string; expiryDate?: Date }[]
  > {
    // Check if user exists
    const user = await this.userRepo.get(userId);
    if (!user) {
      throw AppError.from(ErrNotFound, 404);
    }

    // Get all assigned roles
    const roles = await this.userRepo.getUserRoles(userId);

    // Include default role if not already included
    const hasDefaultRole = roles.some(
      (r) => r.roleId === user.roleId && !r.scope,
    );
    if (!hasDefaultRole && user.roleId) {
      // Add default role if not already in the list
      const userRole = await this.roleService.getRole(user.roleId);
      roles.push({
        roleId: user.roleId,
        role: userRole.code as UserRole,
        scope: undefined,
      });
    }

    return roles;
  }

  // Access control methods
  async canAccessEntity(
    userId: string,
    entityType: string,
    entityId: string,
  ): Promise<boolean> {
    // Get user
    const user = await this.userRepo.get(userId);
    if (!user) {
      return false;
    }

    // Get user roles
    const userRoles = await this.userRepo.getUserRoles(userId);
    const roles = userRoles.map((r) => r.role);

    // ADMIN and SUPER_ADMIN have full access
    if (
      roles.includes(UserRole.ADMIN) ||
      roles.includes(UserRole.SUPER_ADMIN)
    ) {
      return true;
    }

    // Check access based on entity type
    switch (entityType.toLowerCase()) {
      case 'factory':
        return this.userRepo.isFactoryManager(userId, entityId);

      case 'line':
        return this.userRepo.isLineManager(userId, entityId);

      case 'team':
        return this.userRepo.isTeamLeader(userId, entityId);

      case 'group':
        return this.userRepo.isGroupLeader(userId, entityId);

      case 'user':
        // A user can access another user if they manage any organization unit that user belongs to
        const targetUser = await this.userRepo.get(entityId);
        if (!targetUser) return false;

        // Self access
        if (userId === entityId) return true;

        // Check if user is a manager of target user's organizational units
        if (
          targetUser.factoryId &&
          (await this.userRepo.isFactoryManager(userId, targetUser.factoryId))
        ) {
          return true;
        }
        if (
          targetUser.lineId &&
          (await this.userRepo.isLineManager(userId, targetUser.lineId))
        ) {
          return true;
        }
        if (
          targetUser.teamId &&
          (await this.userRepo.isTeamLeader(userId, targetUser.teamId))
        ) {
          return true;
        }
        if (
          targetUser.groupId &&
          (await this.userRepo.isGroupLeader(userId, targetUser.groupId))
        ) {
          return true;
        }

        return false;

      default:
        this.logger.warn(
          `Unknown entity type: ${entityType} requested by user ${userId}`,
        );
        return false;
    }
  }

  // User management methods
  async listUsers(
    requester: Requester,
    conditions: UserCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: Array<Omit<User, 'password' | 'salt'>>;
    total: number;
    page: number;
    limit: number;
  }> {
    // Apply access control filters based on requester's role and permissions
    const filteredConditions = { ...conditions };

    // If not admin, restrict to organizational units the requester can access
    if (
      requester.role !== UserRole.ADMIN &&
      requester.role !== UserRole.SUPER_ADMIN
    ) {
      const managerialAccess = await this.userRepo.getManagerialAccess(
        requester.sub,
      );

      // Refine factory filter based on access
      if (filteredConditions.factoryId) {
        if (
          !managerialAccess.factories.includes(filteredConditions.factoryId)
        ) {
          throw AppError.from(ErrPermissionDenied, 403);
        }
      } else if (managerialAccess.factories.length > 0) {
        filteredConditions.factoryId = managerialAccess.factories[0]; // Default to first factory
      }

      // Apply similar logic for other organizational units
      if (
        filteredConditions.lineId &&
        !managerialAccess.lines.includes(filteredConditions.lineId)
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      if (
        filteredConditions.teamId &&
        !managerialAccess.teams.includes(filteredConditions.teamId)
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      if (
        filteredConditions.groupId &&
        !managerialAccess.groups.includes(filteredConditions.groupId)
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }
    }

    // Get users with pagination
    const { data, total } = await this.userRepo.list(
      filteredConditions,
      pagination,
    );

    // Remove sensitive information
    const sanitizedData = data.map((user) => {
      const { password, salt, ...userInfo } = user;
      return userInfo;
    });

    return {
      data: sanitizedData,
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }
}
