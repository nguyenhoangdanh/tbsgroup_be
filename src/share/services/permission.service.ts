import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma.service';
import { ConfigService } from '@nestjs/config';
import { IAdapter } from '../patterns/abstract-factory';

/**
 * Interface for permission checking
 */
export interface IPermissionService {
  /**
   * Check if a user has a specific permission
   */
  hasPermission(
    userId: string,
    permission: string,
    resource?: string,
  ): Promise<boolean>;

  /**
   * Get all permissions for a user
   */
  getUserPermissions(userId: string): Promise<string[]>;

  /**
   * Check if user has role
   */
  hasRole(userId: string, roleCode: string): Promise<boolean>;

  /**
   * Clear permission cache for a user
   */
  clearCache(userId: string): Promise<void>;
}

/**
 * Permission adapter interface
 */
export interface IPermissionAdapter extends IAdapter {
  /**
   * Get the permission service
   */
  getPermissionService(): IPermissionService;
}

/**
 * Base permission adapter with caching capability
 */
@Injectable()
export class PermissionService implements IPermissionService {
  private readonly logger = new Logger(PermissionService.name);
  private readonly cacheDuration: number;
  private readonly useCache: boolean;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    // Get cache configuration from environment
    this.cacheDuration = this.configService.get<number>(
      'PERMISSION_CACHE_TTL',
      300,
    ); // 5 minutes default
    this.useCache = this.configService.get<boolean>(
      'USE_PERMISSION_CACHE',
      true,
    );
  }

  /**
   * Check if user has permission
   * @param userId User ID to check
   * @param permission Permission code to check
   * @param resource Optional resource identifier (e.g., "factory:123")
   */
  async hasPermission(
    userId: string,
    permission: string,
    resource?: string,
  ): Promise<boolean> {
    try {
      const cacheKey = `perm:${userId}:${permission}:${resource || 'global'}`;

      // Try to get permission check result from cache
      if (this.useCache) {
        const cachedResult = await this.cacheManager.get<boolean>(cacheKey);
        // Fix: Check for null/undefined and default to false
        if (cachedResult !== undefined && cachedResult !== null) {
          return cachedResult;
        }
      }

      // If not in cache, do database check
      const result = await this.checkPermissionInDatabase(
        userId,
        permission,
        resource,
      );

      // Cache result for future checks
      if (this.useCache) {
        await this.cacheManager.set(
          cacheKey,
          result,
          this.cacheDuration * 1000,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Error checking permission: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Get all permissions for a user
   * @param userId User ID
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const cacheKey = `permissions:${userId}`;

      // Try to get permissions from cache
      if (this.useCache) {
        const cachedPermissions =
          await this.cacheManager.get<string[]>(cacheKey);
        if (cachedPermissions) {
          return cachedPermissions;
        }
      }

      // If not in cache, do database query
      const permissions = await this.fetchUserPermissionsFromDatabase(userId);

      // Cache permissions
      if (this.useCache) {
        await this.cacheManager.set(
          cacheKey,
          permissions,
          this.cacheDuration * 1000,
        );
      }

      return permissions;
    } catch (error) {
      this.logger.error(
        `Error getting user permissions: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Check if user has role
   * @param userId User ID
   * @param roleCode Role code to check
   */
  async hasRole(userId: string, roleCode: string): Promise<boolean> {
    try {
      const cacheKey = `role:${userId}:${roleCode}`;

      // Try to get role check result from cache
      if (this.useCache) {
        const cachedResult = await this.cacheManager.get<boolean>(cacheKey);
        // Fix: Check for null/undefined and default to false
        if (cachedResult !== undefined && cachedResult !== null) {
          return cachedResult;
        }
      }

      // If not in cache, do database check
      const result = await this.checkUserRoleInDatabase(userId, roleCode);

      // Cache result for future checks
      if (this.useCache) {
        await this.cacheManager.set(
          cacheKey,
          result,
          this.cacheDuration * 1000,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(`Error checking role: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Clear permission cache for a user
   * @param userId User ID
   */
  async clearCache(userId: string): Promise<void> {
    try {
      // Multi-pattern delete is not supported by all cache managers
      // Delete role cache
      const userRoles = await this.prisma.role.findMany({
        select: { code: true },
      });

      for (const role of userRoles) {
        await this.cacheManager.del(`role:${userId}:${role.code}`);
      }

      // Delete permissions cache
      await this.cacheManager.del(`permissions:${userId}`);

      // Delete individual permission caches
      const userPermissions =
        await this.fetchUserPermissionsFromDatabase(userId);
      for (const permission of userPermissions) {
        await this.cacheManager.del(`perm:${userId}:${permission}:global`);
      }

      this.logger.log(`Permission cache cleared for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Error clearing permission cache: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Check permission in database
   * @private
   */
  private async checkPermissionInDatabase(
    userId: string,
    permission: string,
    resource?: string,
  ): Promise<boolean> {
    // First, get user roles
    const userRoleAssignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId },
      include: { role: true },
    });

    // If no roles, no permissions
    if (!userRoleAssignments.length) {
      return false;
    }

    // Extract role IDs
    const roleIds = userRoleAssignments.map((ura) => ura.roleId);

    // Check if any role has the permission
    const permissionCheck = await this.prisma.permission.findFirst({
      where: {
        code: permission,
        isActive: true,
        rolePermissions: {
          some: {
            roleId: { in: roleIds },
          },
        },
      },
    });

    // If permission found, check resource scope if needed
    if (permissionCheck && resource) {
      // For resource-specific permissions, check scope if needed
      if (resource.includes(':')) {
        const [resourceType, resourceId] = resource.split(':');

        // Check if user has scope-specific role for this resource
        const scopedRoleCheck = userRoleAssignments.some(
          (ura) => ura.scope === resource || ura.scope === resourceType,
        );

        if (scopedRoleCheck) {
          return true;
        }

        // Additional resource-specific checks can be added here
        // For example, check if user is a manager of a factory
        if (resourceType === 'factory') {
          const factoryManager = await this.prisma.factoryManager.findUnique({
            where: {
              factoryId_userId: {
                factoryId: resourceId,
                userId,
              },
            },
          });

          if (factoryManager) {
            return true;
          }
        }

        return false;
      }
    }

    return !!permissionCheck;
  }

  /**
   * Check if user has role in database
   * @private
   */
  private async checkUserRoleInDatabase(
    userId: string,
    roleCode: string,
  ): Promise<boolean> {
    const roleCheck = await this.prisma.userRoleAssignment.findFirst({
      where: {
        userId,
        role: {
          code: roleCode,
        },
        // Check if role hasn't expired
        OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
      },
    });

    return !!roleCheck;
  }

  /**
   * Fetch user permissions from database
   * @private
   */
  private async fetchUserPermissionsFromDatabase(
    userId: string,
  ): Promise<string[]> {
    // Get user's roles
    const userRoles = await this.prisma.userRoleAssignment.findMany({
      where: { userId },
      select: { roleId: true },
    });

    if (!userRoles.length) {
      return [];
    }

    // Get permissions for these roles
    const roleIds = userRoles.map((ur) => ur.roleId);
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      include: { permission: true },
    });

    // Extract permission codes
    const permissions = rolePermissions
      .map((rp) => rp.permission.code)
      .filter(Boolean);

    return [...new Set(permissions)]; // Remove duplicates
  }
}

/**
 * Factory for creating permission service instances with decorator pattern
 */
export class PermissionServiceFactory {
  /**
   * Create a permission service with optional caching
   */
  static create(
    prisma: PrismaService,
    cacheManager: Cache,
    configService: ConfigService,
  ): IPermissionService {
    return new PermissionService(prisma, cacheManager, configService);
  }

  /**
   * Create permission service with performance monitoring
   */
  static createWithMonitoring(
    permissionService: IPermissionService,
    logger: Logger,
  ): IPermissionService {
    // Wrap with monitoring decorator
    return {
      async hasPermission(
        userId: string,
        permission: string,
        resource?: string,
      ): Promise<boolean> {
        const start = Date.now();
        try {
          return await permissionService.hasPermission(
            userId,
            permission,
            resource,
          );
        } finally {
          logger.debug(
            `Permission check for ${permission} took ${Date.now() - start}ms`,
          );
        }
      },

      async getUserPermissions(userId: string): Promise<string[]> {
        const start = Date.now();
        try {
          return await permissionService.getUserPermissions(userId);
        } finally {
          logger.debug(
            `Getting permissions for user ${userId} took ${Date.now() - start}ms`,
          );
        }
      },

      async hasRole(userId: string, roleCode: string): Promise<boolean> {
        const start = Date.now();
        try {
          return await permissionService.hasRole(userId, roleCode);
        } finally {
          logger.debug(
            `Role check for ${roleCode} took ${Date.now() - start}ms`,
          );
        }
      },

      async clearCache(userId: string): Promise<void> {
        const start = Date.now();
        try {
          return await permissionService.clearCache(userId);
        } finally {
          logger.debug(
            `Clearing cache for user ${userId} took ${Date.now() - start}ms`,
          );
        }
      },
    };
  }
}
