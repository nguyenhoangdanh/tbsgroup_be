import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import {
  BaseAdapter,
  ServiceAdapterFactory,
} from '../patterns/abstract-factory';
import {
  IPermissionAdapter,
  IPermissionService,
  PermissionService,
  PermissionServiceFactory,
} from './permission.service';

/**
 * Standard permission adapter using the database-backed permission service
 */
export class StandardPermissionAdapter
  extends BaseAdapter
  implements IPermissionAdapter
{
  private permissionService: IPermissionService;
  // Change from private to protected to match BaseAdapter
  protected logger = new Logger(StandardPermissionAdapter.name);

  constructor(
    prismaService: PrismaService,
    cacheManager: Cache,
    configService: ConfigService,
    withMonitoring = false,
  ) {
    super('StandardPermissionAdapter', 'standard', '1.0.0');

    // Create permission service with or without monitoring
    const basicService = PermissionServiceFactory.create(
      prismaService,
      cacheManager,
      configService,
    );

    this.permissionService = withMonitoring
      ? PermissionServiceFactory.createWithMonitoring(basicService, this.logger)
      : basicService;
  }

  async initialize(config?: any): Promise<void> {
    await super.initialize(config);
    // Additional initialization if needed
  }

  getPermissionService(): IPermissionService {
    return this.permissionService;
  }
}

/**
 * Role-based permission adapter for simplified permission checking
 * Only checks roles, not individual permissions
 */
export class RoleBasedPermissionAdapter
  extends BaseAdapter
  implements IPermissionAdapter
{
  private permissionService: IPermissionService;
  // Change from private to protected to match BaseAdapter
  protected logger = new Logger(RoleBasedPermissionAdapter.name);
  private roleMappings: Record<string, string[]>;

  constructor(
    prismaService: PrismaService,
    cacheManager: Cache,
    configService: ConfigService,
  ) {
    super('RoleBasedPermissionAdapter', 'role-based', '1.0.0');

    // Helper functions for internal use
    const getRolesForPermission = (permission: string): string[] => {
      // Return roles that have this permission
      const result: string[] = [];

      for (const [role, permissions] of Object.entries(this.roleMappings)) {
        if (permissions.includes(permission)) {
          result.push(role);
        }
      }

      return result;
    };

    const getPermissionsForRole = (roleCode: string): string[] => {
      // Return permissions for this role
      return this.roleMappings[roleCode] || [];
    };

    const getUserRoles = async (userId: string): Promise<string[]> => {
      const userRoleAssignments =
        await prismaService.userRoleAssignment.findMany({
          where: {
            userId,
            OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
          },
          include: {
            role: true,
          },
        });

      return userRoleAssignments.map((ura) => ura.role.code);
    };

    // Create a permission service implementation that only checks roles
    this.permissionService = {
      async hasPermission(userId: string, permission: string): Promise<boolean> {
        // For role-based permission adapter, we map permissions to roles
        // and then check if user has any of those roles
        const requiredRoles = getRolesForPermission(permission);

        // Check each role
        for (const roleCode of requiredRoles) {
          const hasRole = await this.hasRole(userId, roleCode);
          if (hasRole) return true;
        }

        return false;
      },

      async getUserPermissions(userId: string): Promise<string[]> {
        // Get user roles first
        const userRoles = await getUserRoles(userId);

        // Map roles to permissions
        const permissions = new Set<string>();

        for (const role of userRoles) {
          // Get permissions for this role from mappings
          const rolePermissions = getPermissionsForRole(role);
          for (const permission of rolePermissions) {
            permissions.add(permission);
          }
        }

        return Array.from(permissions);
      },

      async hasRole(userId: string, roleCode: string): Promise<boolean> {
        const userRoleAssignments =
          await prismaService.userRoleAssignment.findFirst({
            where: {
              userId,
              role: {
                code: roleCode,
              },
              OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
            },
          });

        return !!userRoleAssignments;
      },

      async clearCache(userId: string): Promise<void> {
        // Clear role cache for this user
        const userRoles = await getUserRoles(userId);

        for (const roleCode of userRoles) {
          await cacheManager.del(`role:${userId}:${roleCode}`);
        }
      },
    };

    // Initialize role-permission mappings
    this.roleMappings = {
      ADMIN: ['*'], // Admin has all permissions
      SUPER_ADMIN: ['*'], // Super admin has all permissions
      FACTORY_MANAGER: [
        'page:factory',
        'page:line',
        'feature:report',
        'data:factory',
        'data:employee',
      ],
      LINE_MANAGER: [
        'page:line',
        'page:team',
        'feature:attendance',
        'data:line',
        'data:team',
      ],
      TEAM_LEADER: [
        'page:team',
        'page:group',
        'feature:production',
        'data:team',
        'data:group',
      ],
      GROUP_LEADER: ['page:group', 'feature:production', 'data:group'],
      WORKER: ['page:production', 'feature:attendance'],
    };
  }

  async initialize(config?: any): Promise<void> {
    await super.initialize(config);

    // Override mappings if provided
    if (config?.roleMappings) {
      this.roleMappings = {
        ...this.roleMappings,
        ...config.roleMappings,
      };
    }
  }

  getPermissionService(): IPermissionService {
    return this.permissionService;
  }
}

/**
 * Factory for creating permission adapters
 */
@Injectable()
export class PermissionAdapterFactory
  implements ServiceAdapterFactory<IPermissionAdapter>
{
  private readonly SUPPORTED_TYPES = ['standard', 'role-based'];
  private readonly logger = new Logger(PermissionAdapterFactory.name);

  constructor(
    private readonly prismaService: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  createAdapter(type: string, config?: any): IPermissionAdapter {
    this.logger.log(`Creating permission adapter of type: ${type}`);

    switch (type) {
      case 'standard':
        const withMonitoring = config?.monitoring ?? false;
        const standardAdapter = new StandardPermissionAdapter(
          this.prismaService,
          this.cacheManager,
          this.configService,
          withMonitoring,
        );

        if (config) {
          void standardAdapter.initialize(config);
        }

        return standardAdapter;

      case 'role-based':
        const roleBasedAdapter = new RoleBasedPermissionAdapter(
          this.prismaService,
          this.cacheManager,
          this.configService,
        );

        if (config) {
          void roleBasedAdapter.initialize(config);
        }

        return roleBasedAdapter;

      default:
        throw new Error(`Unsupported permission adapter type: ${type}`);
    }
  }

  canCreate(type: string): boolean {
    return this.SUPPORTED_TYPES.includes(type);
  }

  getSupportedTypes(): string[] {
    return [...this.SUPPORTED_TYPES];
  }
}
