import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppError, ErrNotFound, Requester, UserRole } from 'src/share';
import { v4 as uuidv4 } from 'uuid';
import { FACTORY_REPOSITORY } from './factory.di-token';
import {
  FactoryCondDTO,
  FactoryCreateDTO,
  FactoryManagerDTO,
  FactoryUpdateDTO,
  PaginationDTO,
} from './factory.dto';
import {
  ErrFactoryCodeExists,
  ErrFactoryHasLines,
  ErrFactoryHasManagers,
  ErrFactoryNameExists,
  ErrPermissionDenied,
  Factory,
} from './factory.model';
import { IFactoryRepository, IFactoryService } from './factory.port';
import { USER_REPOSITORY } from '../user/user.di-token';
import { IUserRepository } from '../user/user.port';

@Injectable()
export class FactoryService implements IFactoryService {
  private readonly logger = new Logger(FactoryService.name);

  constructor(
    @Inject(FACTORY_REPOSITORY)
    private readonly factoryRepo: IFactoryRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  // Factory CRUD methods
  async createFactory(
    requester: Requester,
    dto: FactoryCreateDTO,
  ): Promise<string> {
    try {
      // Kiểm tra quyền
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Kiểm tra code trùng lặp
      const existingFactoryWithCode = await this.factoryRepo.findByCode(
        dto.code,
      );
      if (existingFactoryWithCode) {
        throw AppError.from(ErrFactoryCodeExists, 400);
      }

      // Kiểm tra name trùng lặp
      const existingFactoryWithName = await this.factoryRepo.findByCond({
        name: dto.name,
      });
      if (existingFactoryWithName) {
        throw AppError.from(ErrFactoryNameExists, 400);
      }

      // Tạo nhà máy mới
      const newId = uuidv4();
      const newFactory: Factory = {
        id: newId,
        code: dto.code,
        name: dto.name,
        description: dto.description || null,
        address: dto.address || null,
        departmentId: dto.departmentId || null,
        managingDepartmentId: dto.managingDepartmentId || null, // Thêm trường này
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.factoryRepo.insert(newFactory);
      this.logger.log(`New factory created: ${dto.name} (${newId})`);

      return newId;
    } catch (error) {
      this.logger.error(
        `Error during factory creation: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi tạo nhà máy: ${error.message}`),
        400,
      );
    }
  }

  async updateFactory(
    requester: Requester,
    id: string,
    dto: FactoryUpdateDTO,
  ): Promise<void> {
    try {
      // Kiểm tra nhà máy tồn tại
      const factory = await this.factoryRepo.get(id);
      if (!factory) {
        throw AppError.from(ErrNotFound, 404);
      }

      // Kiểm tra quyền
      const canManage = await this.canManageFactory(requester.sub, id);
      if (!canManage) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Kiểm tra tên trùng lặp (nếu có cập nhật tên)
      if (dto.name && dto.name !== factory.name) {
        const existingWithName = await this.factoryRepo.findByCond({
          name: dto.name,
        });
        if (existingWithName && existingWithName.id !== id) {
          throw AppError.from(ErrFactoryNameExists, 400);
        }
      }

      // Cập nhật nhà máy
      await this.factoryRepo.update(id, {
        ...dto,
        updatedAt: new Date(),
      });

      this.logger.log(`Factory updated: ${id} by ${requester.sub}`);
    } catch (error) {
      this.logger.error(
        `Error updating factory ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi cập nhật nhà máy: ${error.message}`),
        400,
      );
    }
  }

  async deleteFactory(requester: Requester, id: string): Promise<void> {
    try {
      // Kiểm tra nhà máy tồn tại
      const factory = await this.factoryRepo.get(id);
      if (!factory) {
        throw AppError.from(ErrNotFound, 404);
      }

      // Kiểm tra quyền (chỉ ADMIN và SUPER_ADMIN có thể xóa nhà máy)
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Kiểm tra nhà máy có dây chuyền không
      const hasLines = await this.factoryRepo.hasLines(id);
      if (hasLines) {
        throw AppError.from(ErrFactoryHasLines, 400);
      }

      // Kiểm tra nhà máy có quản lý không
      const managers = await this.factoryRepo.getManagers(id);
      if (managers.length > 0) {
        throw AppError.from(ErrFactoryHasManagers, 400);
      }

      // Xóa nhà máy
      await this.factoryRepo.delete(id);
      this.logger.log(`Factory deleted: ${id} by ${requester.sub}`);
    } catch (error) {
      this.logger.error(
        `Error deleting factory ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi xóa nhà máy: ${error.message}`),
        400,
      );
    }
  }

  async getFactory(id: string): Promise<Factory> {
    try {
      const factory = await this.factoryRepo.get(id);
      if (!factory) {
        throw AppError.from(ErrNotFound, 404);
      }
      return factory;
    } catch (error) {
      this.logger.error(
        `Error getting factory ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi lấy thông tin nhà máy: ${error.message}`),
        400,
      );
    }
  }

  async listFactories(
    requester: Requester,
    conditions: FactoryCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: Factory[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      // Kiểm tra quyền hiển thị theo phạm vi truy cập
      // Nếu không phải ADMIN hoặc SUPER_ADMIN, chỉ hiển thị nhà máy mà user có quyền truy cập
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN
      ) {
        const accessibleFactories = await this.getUserAccessibleFactories(
          requester.sub,
        );

        // Nếu không có factories nào được truy cập
        if (accessibleFactories.length === 0) {
          return {
            data: [],
            total: 0,
            page: pagination.page,
            limit: pagination.limit,
          };
        }

        // Kết hợp danh sách factories được truy cập vào điều kiện tìm kiếm
        const { data, total } = await this.factoryRepo.list(
          conditions,
          pagination,
        );

        // Lọc kết quả theo factories mà user có thể truy cập
        const filteredData = data.filter((factory) =>
          accessibleFactories.includes(factory.id),
        );

        return {
          data: filteredData,
          total: total, // Giữ nguyên tổng số ban đầu để phân trang đúng
          page: pagination.page,
          limit: pagination.limit,
        };
      }

      // Đối với ADMIN và SUPER_ADMIN, hiển thị tất cả
      const { data, total } = await this.factoryRepo.list(
        conditions,
        pagination,
      );

      return {
        data,
        total,
        page: pagination.page,
        limit: pagination.limit,
      };
    } catch (error) {
      this.logger.error(
        `Error listing factories: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi lấy danh sách nhà máy: ${error.message}`),
        400,
      );
    }
  }

  // Factory manager methods
  async addFactoryManager(
    requester: Requester,
    factoryId: string,
    managerDTO: FactoryManagerDTO,
  ): Promise<void> {
    try {
      // Kiểm tra nhà máy tồn tại
      const factory = await this.factoryRepo.get(factoryId);
      if (!factory) {
        throw AppError.from(ErrNotFound, 404);
      }

      // Kiểm tra quyền (chỉ ADMIN, SUPER_ADMIN hoặc FACTORY_MANAGER hiện tại mới có thể thêm quản lý)
      const canManage = await this.canManageFactory(requester.sub, factoryId);
      if (!canManage) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Kiểm tra user tồn tại
      const user = await this.userRepo.get(managerDTO.userId);
      if (!user) {
        throw AppError.from(new Error('Người dùng không tồn tại'), 404);
      }

      // Thêm quản lý mới
      await this.factoryRepo.addManager(factoryId, managerDTO);
      this.logger.log(
        `Factory manager added: ${managerDTO.userId} to factory ${factoryId} by ${requester.sub}`,
      );
    } catch (error) {
      this.logger.error(
        `Error adding factory manager: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi thêm quản lý nhà máy: ${error.message}`),
        400,
      );
    }
  }

  async removeFactoryManager(
    requester: Requester,
    factoryId: string,
    userId: string,
  ): Promise<void> {
    try {
      // Kiểm tra nhà máy tồn tại
      const factory = await this.factoryRepo.get(factoryId);
      if (!factory) {
        throw AppError.from(ErrNotFound, 404);
      }

      // Kiểm tra quyền (chỉ ADMIN, SUPER_ADMIN hoặc FACTORY_MANAGER hiện tại mới có thể xóa quản lý)
      const canManage = await this.canManageFactory(requester.sub, factoryId);
      if (!canManage) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Người dùng không thể xóa chính mình khỏi vai trò quản lý
      if (requester.sub === userId) {
        throw AppError.from(
          new Error('Không thể xóa chính mình khỏi vai trò quản lý'),
          400,
        );
      }

      // Xóa quản lý
      await this.factoryRepo.removeManager(factoryId, userId);
      this.logger.log(
        `Factory manager removed: ${userId} from factory ${factoryId} by ${requester.sub}`,
      );
    } catch (error) {
      this.logger.error(
        `Error removing factory manager: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi xóa quản lý nhà máy: ${error.message}`),
        400,
      );
    }
  }

  async updateFactoryManager(
    requester: Requester,
    factoryId: string,
    userId: string,
    isPrimary: boolean,
    endDate?: Date,
  ): Promise<void> {
    try {
      // Kiểm tra nhà máy tồn tại
      const factory = await this.factoryRepo.get(factoryId);
      if (!factory) {
        throw AppError.from(ErrNotFound, 404);
      }

      // Kiểm tra quyền (chỉ ADMIN, SUPER_ADMIN hoặc FACTORY_MANAGER hiện tại mới có thể cập nhật quản lý)
      const canManage = await this.canManageFactory(requester.sub, factoryId);
      if (!canManage) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Cập nhật quản lý
      await this.factoryRepo.updateManager(
        factoryId,
        userId,
        isPrimary,
        endDate,
      );
      this.logger.log(
        `Factory manager updated: ${userId} for factory ${factoryId} by ${requester.sub}`,
      );
    } catch (error) {
      this.logger.error(
        `Error updating factory manager: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi cập nhật quản lý nhà máy: ${error.message}`),
        400,
      );
    }
  }

  async getFactoryManagers(factoryId: string): Promise<
    {
      userId: string;
      isPrimary: boolean;
      startDate: Date;
      endDate: Date | null;
      user?: {
        id: string;
        fullName: string;
        avatar?: string | null;
      };
    }[]
  > {
    try {
      // Kiểm tra nhà máy tồn tại
      const factory = await this.factoryRepo.get(factoryId);
      if (!factory) {
        throw AppError.from(ErrNotFound, 404);
      }

      // Lấy danh sách quản lý
      const managers = await this.factoryRepo.getManagers(factoryId);

      // Lấy thông tin chi tiết của từng quản lý
      if (managers.length > 0) {
        const userIds = managers.map((manager) => manager.userId);
        const users = await this.userRepo.listByIds(userIds);

        // Kết hợp thông tin user vào kết quả
        return managers.map((manager) => {
          const user = users.find((u) => u.id === manager.userId);
          return {
            ...manager,
            user: user
              ? {
                  id: user.id,
                  fullName: user.fullName,
                  avatar: user.avatar,
                }
              : undefined,
          };
        });
      }

      return managers;
    } catch (error) {
      this.logger.error(
        `Error getting factory managers for ${factoryId}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi lấy danh sách quản lý nhà máy: ${error.message}`),
        400,
      );
    }
  }

  // Access validation methods
  async canManageFactory(userId: string, factoryId: string): Promise<boolean> {
    try {
      // Kiểm tra quyền quản lý nhà máy
      return await this.factoryRepo.isManager(userId, factoryId);
    } catch (error) {
      this.logger.error(
        `Error checking factory management permission: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  async getUserAccessibleFactories(userId: string): Promise<string[]> {
    try {
      // Kiểm tra nếu user có quyền ADMIN hoặc SUPER_ADMIN
      const userRoles = await this.userRepo.getUserRoles(userId);
      const isAdmin = userRoles.some(
        (r) => r.role === UserRole.ADMIN || r.role === UserRole.SUPER_ADMIN,
      );

      if (isAdmin) {
        // Admin có thể truy cập tất cả nhà máy
        const factories = await this.factoryRepo.list(
          {},
          {
            page: 1,
            limit: 1000,
            sortBy: 'id',
            sortOrder: 'asc',
          },
        );
        return factories.data.map((f) => f.id);
      }

      // Kiểm tra quyền truy cập trực tiếp thông qua FactoryManager
      const managerialAccess = await this.userRepo.getManagerialAccess(userId);

      // Kết hợp với quyền từ vai trò FACTORY_MANAGER
      const factoryManagerRoles = userRoles.filter(
        (r) => r.role === UserRole.FACTORY_MANAGER,
      );

      // Lấy factoryId từ scope của vai trò (format: 'factory:id')
      const factoryIdsFromRoles = factoryManagerRoles
        .filter((r) => r.scope && r.scope.startsWith('factory:'))
        .map((r) => r.scope?.replace('factory:', '') || '')
        .filter((id) => id.length > 0);

      // Kết hợp factories từ các nguồn khác nhau và loại bỏ trùng lặp
      return [
        ...new Set([...managerialAccess.factories, ...factoryIdsFromRoles]),
      ];
    } catch (error) {
      this.logger.error(
        `Error getting user accessible factories: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  // Thêm phương thức mới để liên kết Factory với Department FACTORY_OFFICE
  async linkFactoryWithManagingDepartment(
    requester: Requester,
    factoryId: string,
    departmentId: string,
  ): Promise<void> {
    try {
      // Kiểm tra quyền
      if (
        requester.role !== UserRole.ADMIN &&
        requester.role !== UserRole.SUPER_ADMIN
      ) {
        throw AppError.from(ErrPermissionDenied, 403);
      }

      // Kiểm tra nhà máy tồn tại
      const factory = await this.factoryRepo.get(factoryId);
      if (!factory) {
        throw AppError.from(ErrNotFound, 404);
      }

      // Kiểm tra department tồn tại và là loại FACTORY_OFFICE
      // Giả sử có phương thức getDepartment và departmentType được trả về
      // Bạn cần thêm logic phù hợp với cấu trúc của bạn ở đây
      // const department = await this.departmentRepo.get(departmentId);
      // if (!department) {
      //   throw AppError.from(new Error('Không tìm thấy phòng ban'), 404);
      // }
      // if (department.departmentType !== 'FACTORY_OFFICE') {
      //   throw AppError.from(new Error('Phòng ban phải là văn phòng điều hành nhà máy'), 400);
      // }

      // Cập nhật mối quan hệ
      await this.factoryRepo.update(factoryId, {
        managingDepartmentId: departmentId,
        updatedAt: new Date(),
      });

      this.logger.log(
        `Factory ${factoryId} linked with department ${departmentId} by ${requester.sub}`,
      );
    } catch (error) {
      this.logger.error(
        `Error linking factory with department: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi liên kết nhà máy với phòng ban: ${error.message}`),
        400,
      );
    }
  }
}
