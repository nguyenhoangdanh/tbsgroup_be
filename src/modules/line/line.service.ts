import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppError, ErrNotFound, Requester, UserRole } from 'src/share';
import { v4 as uuidv4 } from 'uuid';
import { FACTORY_REPOSITORY } from '../factory/factory.di-token';
import { IFactoryRepository } from '../factory/factory.port';
import { LINE_REPOSITORY } from './line.di-token';
import { LineCreateDTO, LineManagerDTO, LineUpdateDTO } from './line.dto';
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
  implements ILineService
{
  // Change from private to protected to match BaseCrudService
  protected readonly logger = new Logger(LineService.name);

  constructor(
    @Inject(LINE_REPOSITORY) private readonly lineRepo: ILineRepository,
    @Inject(FACTORY_REPOSITORY)
    private readonly factoryRepo: IFactoryRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {
    // Pass both required parameters: entityName and repository
    super('Line', lineRepo);
  }

  /**
   * Tìm dây chuyền theo factory ID
   */
  async findByFactoryId(factoryId: string): Promise<Line[]> {
    return this.lineRepo.listByFactoryId(factoryId);
  }

  /**
   * Tìm dây chuyền theo code
   */
  async findByCode(code: string): Promise<Line | null> {
    return this.lineRepo.findByCode(code);
  }

  /**
   * Tạo dây chuyền mới
   * Override phương thức từ BaseCrudService
   */
  async createEntity(
    requester: Requester,
    dto: LineCreateDTO,
  ): Promise<string> {
    // Kiểm tra quyền người dùng
    if (
      !(await this.canManageFactory(requester.sub, dto.factoryId)) &&
      !this.hasAdminPermission(requester)
    ) {
      throw AppError.from(ErrPermissionDenied, 403);
    }

    // Kiểm tra nhà máy tồn tại
    const factory = await this.factoryRepo.get(dto.factoryId);
    if (!factory) {
      throw AppError.from(ErrFactoryNotFound, 404);
    }

    // Kiểm tra trùng code
    const existingByCode = await this.lineRepo.findByCode(dto.code);
    if (existingByCode) {
      throw AppError.from(ErrLineCodeExists, 400);
    }

    // Kiểm tra trùng tên trong cùng nhà máy
    const existingByName = await this.lineRepo.findByCond({
      name: dto.name,
      factoryId: dto.factoryId,
    });
    if (existingByName) {
      throw AppError.from(ErrLineNameExists, 400);
    }

    // Tạo dây chuyền mới
    const line: Line = {
      id: uuidv4(),
      code: dto.code,
      name: dto.name,
      description: dto.description || null,
      factoryId: dto.factoryId,
      capacity: dto.capacity || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Lưu dây chuyền
    await this.lineRepo.insert(line);
    this.logger.log(`Line created: ${line.id} by user ${requester.sub}`);

    return line.id;
  }

  /**
   * Cập nhật dây chuyền
   * Override phương thức từ BaseCrudService
   */
  async updateEntity(
    requester: Requester,
    id: string,
    dto: LineUpdateDTO,
  ): Promise<void> {
    // Kiểm tra dây chuyền tồn tại
    const line = await this.lineRepo.get(id);
    if (!line) {
      throw AppError.from(ErrNotFound, 404);
    }

    // Kiểm tra quyền quản lý
    if (
      !(await this.canManageLine(requester.sub, id)) &&
      !this.hasAdminPermission(requester)
    ) {
      throw AppError.from(ErrPermissionDenied, 403);
    }

    // Kiểm tra trùng tên trong cùng nhà máy nếu tên được cập nhật
    if (dto.name && dto.name !== line.name) {
      const existingByName = await this.lineRepo.findByCond({
        name: dto.name,
        factoryId: line.factoryId,
      });

      if (existingByName && existingByName.id !== id) {
        throw AppError.from(ErrLineNameExists, 400);
      }
    }

    // Cập nhật dây chuyền
    await this.lineRepo.update(id, {
      ...dto,
      updatedAt: new Date(),
    });

    this.logger.log(`Line updated: ${id} by user ${requester.sub}`);
  }

  /**
   * Xóa dây chuyền
   * Override phương thức từ BaseCrudService
   */
  async deleteEntity(requester: Requester, id: string): Promise<void> {
    // Kiểm tra dây chuyền tồn tại
    const line = await this.lineRepo.get(id);
    if (!line) {
      throw AppError.from(ErrNotFound, 404);
    }

    // Kiểm tra quyền quản lý
    if (!this.hasAdminPermission(requester)) {
      throw AppError.from(ErrPermissionDenied, 403);
    }

    // Kiểm tra xem dây chuyền có teams không
    const hasTeams = await this.lineRepo.hasTeams(id);
    if (hasTeams) {
      throw AppError.from(
        new Error('Dây chuyền đang có teams, không thể xóa'),
        400,
      );
    }

    // Xóa dây chuyền
    await this.lineRepo.delete(id);
    this.logger.log(`Line deleted: ${id} by user ${requester.sub}`);
  }

  /**
   * Thêm người quản lý dây chuyền
   */
  async addLineManager(
    requester: Requester,
    lineId: string,
    dto: LineManagerDTO,
  ): Promise<void> {
    // Kiểm tra dây chuyền tồn tại
    const line = await this.lineRepo.get(lineId);
    if (!line) {
      throw AppError.from(ErrNotFound, 404);
    }

    // Kiểm tra quyền quản lý
    if (
      !(await this.canManageLine(requester.sub, lineId)) &&
      !this.hasAdminPermission(requester)
    ) {
      throw AppError.from(ErrPermissionDenied, 403);
    }

    // Kiểm tra người dùng tồn tại
    const user = await this.userRepo.get(dto.userId);
    if (!user) {
      throw AppError.from(new Error('Người dùng không tồn tại'), 404);
    }

    // Thêm quản lý
    await this.lineRepo.addManager(lineId, dto);

    // Nếu là quản lý chính, gán vai trò LINE_MANAGER
    if (dto.isPrimary) {
      // Kiểm tra xem đã có vai trò chưa
      const userRoles = await this.userRepo.getUserRoles(dto.userId);
      const hasRole = userRoles.some(
        (role) => role.role === UserRole.LINE_MANAGER && role.scope === lineId,
      );

      if (!hasRole) {
        // Gán vai trò LINE_MANAGER với phạm vi là lineId
        await this.userRepo.assignRole(
          dto.userId,
          UserRole.LINE_MANAGER,
          lineId,
        );
      }
    }

    this.logger.log(
      `Line manager added: ${dto.userId} to line ${lineId} by user ${requester.sub}`,
    );
  }

  /**
   * Cập nhật thông tin người quản lý dây chuyền
   */
  async updateLineManager(
    requester: Requester,
    lineId: string,
    userId: string,
    isPrimary: boolean,
    endDate?: Date,
  ): Promise<void> {
    // Kiểm tra dây chuyền tồn tại
    const line = await this.lineRepo.get(lineId);
    if (!line) {
      throw AppError.from(ErrNotFound, 404);
    }

    // Kiểm tra quyền quản lý
    if (
      !(await this.canManageLine(requester.sub, lineId)) &&
      !this.hasAdminPermission(requester)
    ) {
      throw AppError.from(ErrPermissionDenied, 403);
    }

    // Kiểm tra người dùng tồn tại
    const user = await this.userRepo.get(userId);
    if (!user) {
      throw AppError.from(new Error('Người dùng không tồn tại'), 404);
    }

    // Cập nhật quản lý
    await this.lineRepo.updateManager(lineId, userId, isPrimary, endDate);

    // Cập nhật vai trò nếu cần
    if (isPrimary) {
      // Kiểm tra xem đã có vai trò chưa
      const userRoles = await this.userRepo.getUserRoles(userId);
      const hasRole = userRoles.some(
        (role) => role.role === UserRole.LINE_MANAGER && role.scope === lineId,
      );

      if (!hasRole) {
        // Gán vai trò LINE_MANAGER với phạm vi là lineId
        await this.userRepo.assignRole(userId, UserRole.LINE_MANAGER, lineId);
      }
    }

    this.logger.log(
      `Line manager updated: ${userId} for line ${lineId} by user ${requester.sub}`,
    );
  }

  /**
   * Xóa người quản lý khỏi dây chuyền
   */
  async removeLineManager(
    requester: Requester,
    lineId: string,
    userId: string,
  ): Promise<void> {
    // Kiểm tra dây chuyền tồn tại
    const line = await this.lineRepo.get(lineId);
    if (!line) {
      throw AppError.from(ErrNotFound, 404);
    }

    // Kiểm tra quyền quản lý
    if (
      !(await this.canManageLine(requester.sub, lineId)) &&
      !this.hasAdminPermission(requester)
    ) {
      throw AppError.from(ErrPermissionDenied, 403);
    }

    // Xóa quản lý
    await this.lineRepo.removeManager(lineId, userId);

    // Xóa vai trò LINE_MANAGER với phạm vi là lineId
    try {
      await this.userRepo.removeRole(userId, UserRole.LINE_MANAGER, lineId);
    } catch (error) {
      this.logger.error(
        `Error removing LINE_MANAGER role for user ${userId}: ${error.message}`,
      );
      // Continue execution even if role removal fails
    }

    this.logger.log(
      `Line manager removed: ${userId} from line ${lineId} by user ${requester.sub}`,
    );
  }

  /**
   * Lấy danh sách người quản lý dây chuyền
   */
  async getLineManagers(lineId: string): Promise<
    Array<{
      userId: string;
      isPrimary: boolean;
      startDate: Date;
      endDate: Date | null;
      user?: {
        id: string;
        fullName: string;
        avatar?: string | null;
      };
    }>
  > {
    // Kiểm tra dây chuyền tồn tại
    const line = await this.lineRepo.get(lineId);
    if (!line) {
      throw AppError.from(ErrNotFound, 404);
    }

    const managers = await this.lineRepo.getManagers(lineId);

    // Enrich with user data if available
    const enrichedManagers = [];
    for (const manager of managers) {
      try {
        const user = await this.userRepo.get(manager.userId);
        if (user) {
          enrichedManagers.push({
            ...manager,
            user: {
              id: user.id,
              fullName: user.fullName,
              avatar: user.avatar || null,
            },
          });
        } else {
          enrichedManagers.push(manager);
        }
      } catch (error) {
        // If there's an error getting user info, just return the manager without user data
        enrichedManagers.push(manager);
      }
    }

    return enrichedManagers;
  }

  /**
   * Kiểm tra người dùng có quyền quản lý dây chuyền hay không
   */
  async canManageLine(userId: string, lineId: string): Promise<boolean> {
    // Kiểm tra người dùng tồn tại
    const user = await this.userRepo.get(userId);
    if (!user) {
      return false;
    }

    // Lấy dây chuyền để biết factoryId
    const line = await this.lineRepo.get(lineId);
    if (!line) {
      return false;
    }

    // Kiểm tra quyền LINE_MANAGER
    const isLineManager = await this.lineRepo.isManager(userId, lineId);
    if (isLineManager) {
      return true;
    }

    // Kiểm tra quyền quản lý nhà máy
    const canManageFactory = await this.canManageFactory(
      userId,
      line.factoryId,
    );
    return canManageFactory;
  }

  /**
   * Kiểm tra người dùng có quyền quản lý nhà máy hay không
   */
  async canManageFactory(userId: string, factoryId: string): Promise<boolean> {
    return this.factoryRepo.isManager(userId, factoryId);
  }

  /**
   * Lấy danh sách ID dây chuyền mà người dùng có quyền truy cập
   */
  async getUserAccessibleLines(userId: string): Promise<string[]> {
    // Lấy danh sách quyền quản lý
    const managerialAccess = await this.userRepo.getManagerialAccess(userId);

    // Gộp các dây chuyền từ quyền LINE_MANAGER trực tiếp
    const lineIds = [...managerialAccess.lines];

    // Thêm dây chuyền từ quyền FACTORY_MANAGER
    if (managerialAccess.factories.length > 0) {
      // Với mỗi nhà máy, lấy danh sách dây chuyền
      for (const factoryId of managerialAccess.factories) {
        const lines = await this.lineRepo.listByFactoryId(factoryId);
        lineIds.push(...lines.map((line) => line.id));
      }
    }

    // Loại bỏ trùng lặp
    return [...new Set(lineIds)];
  }

  /**
   * Helper method để kiểm tra người dùng có quyền admin hay không
   */
  private hasAdminPermission(requester: Requester): boolean {
    return (
      requester.role === UserRole.ADMIN ||
      requester.role === UserRole.SUPER_ADMIN
    );
  }
}
