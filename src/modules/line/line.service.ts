import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppError, ErrNotFound, Paginated, PagingDTO, Requester, UserRole } from 'src/share';
import { v4 as uuidv4 } from 'uuid';
import { FACTORY_REPOSITORY } from '../factory/factory.di-token';
import { IFactoryRepository } from '../factory/factory.port';
import { LINE_REPOSITORY } from './line.di-token';
import {
  LineCondDTO,
  LineCreateDTO,
  LineManagerDTO,
  LineUpdateDTO,
} from './line.dto';
import {
  ErrFactoryNotFound,
  ErrLineCodeExists,
  ErrLineNameExists,
  ErrPermissionDenied,
  Line,
} from './line.model';
import { ILineRepository, ILineService } from './line.port';
import { USER_REPOSITORY } from '../user/user.di-token';
import { IUserRepository } from '../user/user.port';
import { BaseCrudService } from 'src/CrudModule/base-crud.service';

@Injectable()
export class LineService
  extends BaseCrudService<Line, LineCreateDTO, LineUpdateDTO>
  implements ILineService {

  constructor(
    @Inject(LINE_REPOSITORY)
    private readonly lineRepo: ILineRepository,
    @Inject(FACTORY_REPOSITORY)
    private readonly factoryRepo: IFactoryRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
  ) {
    super('Line', lineRepo);
  }

  // Override createEntity with custom validation
  async createEntity(requester: Requester, dto: LineCreateDTO): Promise<string> {
    try {

       // Check if requester exists
    if (!requester) {
      throw AppError.from(new Error('Authentication required'), 401);
    }
      // Check permissions
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN &&
        requester.role !== UserRole.FACTORY_MANAGER
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // If Factory Manager, check if manages the factory
      if (requester.role === UserRole.FACTORY_MANAGER) {
        const canManageFactory = await this.factoryRepo.isManager(
          requester.sub,
          dto.factoryId,
        );
        if (!canManageFactory) {
          throw AppError.from(ErrPermissionDenied, 403);
        }
      }

      // Check if factory exists
      const factory = await this.factoryRepo.get(dto.factoryId);
      if (!factory) {
        throw AppError.from(ErrFactoryNotFound, 404);
      }

      // Check for duplicate code
      const existingLineWithCode = await this.lineRepo.findByCode(dto.code);
      if (existingLineWithCode) {
        throw AppError.from(ErrLineCodeExists, 400);
      }

      // Check for duplicate name within the same factory
      const existingLineWithName = await this.lineRepo.findByCond({
        name: dto.name,
        factoryId: dto.factoryId,
      } as LineCondDTO);
      if (existingLineWithName) {
        throw AppError.from(ErrLineNameExists, 400);
      }

      // Create new line
      const newId = uuidv4();
      const newLine: Line = {
        id: newId,
        code: dto.code,
        name: dto.name,
        description: dto.description || null,
        factoryId: dto.factoryId,
        capacity: dto.capacity || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.lineRepo.insert(newLine);
      this.logEvent('Created', newId, requester);

      return newId;
    } catch (error) {
      this.handleError(
        error,
        'Error during line creation',
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
    dto: LineUpdateDTO
  ): Promise<void> {
    try {
      // Check if line exists
      const line = await this.lineRepo.get(id);
      if (!line) {
        throw AppError.from(ErrNotFound, 404);
      }
  
      // Validate requester has permission
      await this.validateUpdate(requester, line, dto);
  
      // Check name uniqueness if name is being updated
      if (dto.name && dto.name !== line.name) {
        const existingWithName = await this.lineRepo.findByCond({
          name: dto.name,
          factoryId: line.factoryId,
        } as LineCondDTO);
        if (existingWithName && existingWithName.id !== id) {
          throw AppError.from(ErrLineNameExists, 400);
        }
      }
  
      // Update line with type assertion
      await this.lineRepo.update(id, {
        ...dto,
        updatedAt: new Date(),
      } as any); // Using 'as any' to bypass TypeScript error
  
      this.logEvent('Updated', id, requester);
    } catch (error) {
      this.handleError(
        error, 
        `Error updating line ${id}`,
        error instanceof AppError ? error.getStatusCode() : 400
      );
    }
  }

  // Override deleteEntity with custom validation
  async deleteEntity(requester: Requester, id: string): Promise<void> {
    try {
      // Check if line exists
      const line = await this.lineRepo.get(id);
      if (!line) {
        throw AppError.from(ErrNotFound, 404);
      }

      // Validate requester has permission
      await this.validateDelete(requester, line);

      // Check for associated teams
      const hasTeams = await this.lineRepo.hasTeams(id);
      if (hasTeams) {
        throw AppError.from(
          new Error('Dây chuyền đã có các tổ sản xuất, không thể xóa'),
          400,
        );
      }

      // Delete line
      await this.lineRepo.delete(id);
      this.logEvent('Deleted', id, requester);
    } catch (error) {
      this.handleError(
        error,
        `Error deleting line ${id}`,
        error instanceof AppError ? error.getStatusCode() : 400
      );
    }
  }

  // Override validation methods
  protected async validateUpdate(
    requester: Requester,
    line: Line,
    dto: LineUpdateDTO,
  ): Promise<void> {
    const canManage = await this.canManageLine(requester.sub, line.id);
    if (!canManage) {
      throw AppError.from(ErrPermissionDenied, 403);
    }
  }

  protected async validateDelete(
    requester: Requester,
    line: Line,
  ): Promise<void> {
    // Only ADMIN, SUPER_ADMIN or FACTORY_MANAGER of factory can delete
    if (
      requester.role !== UserRole.ADMIN &&
      requester.role !== UserRole.SUPER_ADMIN
    ) {
      const isFactoryManager = await this.factoryRepo.isManager(
        requester.sub,
        line.factoryId
      );
      if (!isFactoryManager) {
        throw AppError.from(ErrPermissionDenied, 403);
      }
    }
  }

  // Override checkPermission to implement line-specific permissions
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

    // Check line-specific permissions
    if (entityId) {
      const canManage = await this.canManageLine(requester.sub, entityId);
      if (!canManage) {
        throw AppError.from(ErrPermissionDenied, 403);
      }
    }
  }

  // Find by factory ID implementation
  async findByFactoryId(factoryId: string): Promise<Line[]> {
    try {
      return await this.lineRepo.listByFactoryId(factoryId);
    } catch (error) {
      this.handleError(
        error,
        `Error retrieving lines by factory ${factoryId}`,
        error instanceof AppError ? error.getStatusCode() : 400
      );
      return []; // Unreachable, but needed for typechecking
    }
  }

  // Line manager methods
  async addLineManager(
    requester: Requester,
    lineId: string,
    managerDTO: LineManagerDTO
  ): Promise<void> {
    try {
      // Check if line exists
      const line = await this.lineRepo.get(lineId);
      if (!line) {
        throw AppError.from(ErrNotFound, 404);
      }

      // Check permissions
      const canManage = await this.canManageLine(requester.sub, lineId);
      if (!canManage) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Check if user exists
      const user = await this.userRepo.get(managerDTO.userId);
      if (!user) {
        throw AppError.from(new Error('Người dùng không tồn tại'), 404);
      }

      // Add manager
      await this.lineRepo.addManager(lineId, managerDTO);
      this.logger.log(
        `Line manager added: ${managerDTO.userId} to line ${lineId} by ${requester.sub}`
      );
    } catch (error) {
      this.handleError(
        error,
        `Error adding line manager to ${lineId}`,
        error instanceof AppError ? error.getStatusCode() : 400
      );
    }
  }

  async removeLineManager(
    requester: Requester,
    lineId: string,
    userId: string
  ): Promise<void> {
    try {
      // Check if line exists
      const line = await this.lineRepo.get(lineId);
      if (!line) {
        throw AppError.from(ErrNotFound, 404);
      }

      // Check permissions
      const canManage = await this.canManageLine(requester.sub, lineId);
      if (!canManage) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Prevent removing oneself
      if (requester.sub === userId) {
        throw AppError.from(
          new Error('Không thể xóa chính mình khỏi vai trò quản lý'),
          400
        );
      }

      // Remove manager
      await this.lineRepo.removeManager(lineId, userId);
      this.logger.log(
        `Line manager removed: ${userId} from line ${lineId} by ${requester.sub}`
      );
    } catch (error) {
      this.handleError(
        error,
        `Error removing line manager from ${lineId}`,
        error instanceof AppError ? error.getStatusCode() : 400
      );
    }
  }

  async updateLineManager(
    requester: Requester,
    lineId: string,
    userId: string,
    isPrimary: boolean,
    endDate?: Date
  ): Promise<void> {
    try {
      // Check if line exists
      const line = await this.lineRepo.get(lineId);
      if (!line) {
        throw AppError.from(ErrNotFound, 404);
      }

      // Check permissions
      const canManage = await this.canManageLine(requester.sub, lineId);
      if (!canManage) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Update manager
      await this.lineRepo.updateManager(lineId, userId, isPrimary, endDate);
      this.logger.log(
        `Line manager updated: ${userId} for line ${lineId} by ${requester.sub}`
      );
    } catch (error) {
      this.handleError(
        error,
        `Error updating line manager for ${lineId}`,
        error instanceof AppError ? error.getStatusCode() : 400
      );
    }
  }

  async getLineManagers(
    lineId: string
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
      // Check if line exists
      const line = await this.lineRepo.get(lineId);
      if (!line) {
        throw AppError.from(ErrNotFound, 404);
      }

      // Get managers
      const managers = await this.lineRepo.getManagers(lineId);

      // Fetch user details if available
      if (managers.length > 0) {
        const userIds = managers.map(manager => manager.userId);
        const users = await this.userRepo.listByIds(userIds);

        // Combine manager info with user details
        return managers.map(manager => {
          const user = users.find(u => u.id === manager.userId);
          return {
            ...manager,
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

      return managers;
    } catch (error) {
      this.handleError(
        error,
        `Error getting line managers for ${lineId}`,
        error instanceof AppError ? error.getStatusCode() : 400
      );
      // This is needed for TypeScript
      return [];
    }
  }

  // Access validation methods
  async canManageLine(userId: string, lineId: string): Promise<boolean> {
    try {
      // Get line to check factory
      const line = await this.lineRepo.get(lineId);
      if (!line) {
        return false;
      }

      // Check direct line management
      const isLineManager = await this.lineRepo.isManager(userId, lineId);
      if (isLineManager) {
        return true;
      }

      // Check factory management (factory managers can manage lines)
      return await this.factoryRepo.isManager(userId, line.factoryId);
    } catch (error) {
      this.logger.error(
        `Error checking line management permission: ${error.message}`,
        error.stack
      );
      return false;
    }
  }

  async getUserAccessibleLines(userId: string): Promise<string[]> {
    try {
      // First check if user has administrative privileges
      const userRoles = await this.userRepo.getUserRoles(userId);
      const isAdmin = userRoles.some(
        r => r.role === UserRole.ADMIN || r.role === UserRole.SUPER_ADMIN
      );

      if (isAdmin) {
        // Admin can access all lines
        const lines = await this.lineRepo.list(
          {},
          { page: 1, limit: 1000, sort: 'name', order: 'asc' }
        );
        return lines.data.map(line => line.id);
      }

      // Get factories user can manage
      const managerialAccess = await this.userRepo.getManagerialAccess(userId);
      
      // Get all lines in accessible factories
      const linesByFactory: Line[] = [];
      for (const factoryId of managerialAccess.factories) {
        const factoryLines = await this.lineRepo.listByFactoryId(factoryId);
        linesByFactory.push(...factoryLines);
      }
      
      // Get directly managed lines
      const directLineIds = managerialAccess.lines;
      
      // Combine and remove duplicates
      const allLineIds = [
        ...new Set([
          ...linesByFactory.map(line => line.id),
          ...directLineIds
        ])
      ];
      
      return allLineIds;
    } catch (error) {
      this.logger.error(
        `Error getting user accessible lines: ${error.message}`,
        error.stack
      );
      return [];
    }
  }

   // Implement findByCode - needed by RPC controller
   async findByCode(code: string): Promise<Line | null> {
    try {
      return await this.lineRepo.findByCode(code);
    } catch (error) {
      this.handleError(
        error,
        `Error finding line by code ${code}`,
        error instanceof AppError ? error.getStatusCode() : 400
      );
      // This line is needed because TypeScript knows handleError never returns
      // but compiler doesn't recognize that for control flow analysis
      throw new Error("Unreachable code");
    }
  }
}