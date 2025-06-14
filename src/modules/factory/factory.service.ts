import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppError, Requester, UserRole, Paginated } from 'src/share';
import { v4 as uuidv4 } from 'uuid';
import { USER_REPOSITORY } from '../user/user.di-token';
import { IUserRepository } from '../user/user.port';
import {
  FACTORY_ADAPTER_FACTORY,
  FACTORY_REPOSITORY,
} from './factory.di-token';
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
  ErrFactoryNameExists,
  ErrFactoryNotFound,
  ErrPermissionDenied,
  Factory,
} from './factory.model';
import { IFactoryRepository, IFactoryService } from './factory.port';
import {
  IFactoryRepositoryAdapter,
  FactoryRepositoryAdapterFactory,
} from './factory-adapter';
import { BaseCrudService } from 'src/CrudModule/base-crud.service';
import { PagingDTO } from 'src/share/data-model';
import { ICrudRepository } from 'src/CrudModule/crud.interface';

@Injectable()
export class FactoryService
  extends BaseCrudService<Factory, FactoryCreateDTO, FactoryUpdateDTO>
  implements IFactoryService
{
  // Change from private to protected to match the base class
  protected readonly logger = new Logger(FactoryService.name);
  private currentAdapter: IFactoryRepositoryAdapter;
  private _factoryRepository: IFactoryRepository;

  // Create a proxy repository that adapts the IFactoryRepository to ICrudRepository
  private readonly repositoryAdapter: ICrudRepository<
    Factory,
    FactoryCreateDTO,
    FactoryUpdateDTO
  >;

  constructor(
    @Inject(FACTORY_REPOSITORY)
    private readonly factoryRepository: IFactoryRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(FACTORY_ADAPTER_FACTORY)
    private readonly adapterFactory: FactoryRepositoryAdapterFactory,
    @Inject('FACTORY_ABSTRACT_FACTORY')
    private readonly abstractFactory: any,
  ) {
    // Create a repository adapter that implements ICrudRepository and adapts IFactoryRepository
    const repositoryAdapter: ICrudRepository<
      Factory,
      FactoryCreateDTO,
      FactoryUpdateDTO
    > = {
      // Forward most methods directly to factoryRepository
      get: (id: string) => factoryRepository.get(id),
      findByCond: (conditions: any) => factoryRepository.findByCond(conditions),

      // Fixed the insert method to convert DTO to Factory and return the ID
      insert: async (dto: FactoryCreateDTO): Promise<string> => {
        // Create a new Factory instance from the DTO
        const factory = new Factory({
          id: uuidv4(),
          code: dto.code,
          name: dto.name,
          description: dto.description,
          address: dto.address,
          departmentId: dto.departmentId,
          managingDepartmentId: dto.managingDepartmentId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Call the original insert method
        await factoryRepository.insert(factory);

        // Return the ID as required by ICrudRepository interface
        return factory.id;
      },

      update: (id: string, dto: Partial<Factory>) =>
        factoryRepository.update(id, dto),
      delete: (id: string) => factoryRepository.delete(id),

      // Transform the list method to match the Paginated interface
      list: async (
        conditions: any,
        paging: PagingDTO,
      ): Promise<Paginated<Factory>> => {
        const result = await factoryRepository.list(conditions, {
          page: paging.page || 1,
          limit: paging.limit || 10,
          sortBy: paging.sort,
          sortOrder: paging.order,
        });
        return {
          data: result.data,
          total: result.total,
          paging: {
            page: paging.page,
            limit: paging.limit,
            sort: paging.sort,
            order: paging.order,
          },
        };
      },
    };

    // Pass the adapted repository to super
    super('Factory', repositoryAdapter);
    this.repositoryAdapter = repositoryAdapter;

    // Khởi tạo adapter mặc định
    this.currentAdapter = this.adapterFactory.createAdapter('prisma');
    this._factoryRepository = this.factoryRepository;
  }

  /**
   * Tạo nhà máy mới
   * Override phương thức từ BaseCrudService
   */
  async createEntity(
    requester: Requester,
    dto: FactoryCreateDTO,
  ): Promise<string> {
    // Kiểm tra quyền tạo nhà máy
    if (!this.hasAdminPermission(requester)) {
      throw AppError.from(ErrPermissionDenied, 403);
    }

    // Kiểm tra mã nhà máy đã tồn tại chưa
    const existingFactoryByCode = await this.factoryRepository.findByCode(
      dto.code,
    );
    if (existingFactoryByCode) {
      throw AppError.from(ErrFactoryCodeExists, 400);
    }

    // Kiểm tra tên nhà máy đã tồn tại chưa
    const existingFactoryByName = await this.factoryRepository.findByCond({
      name: dto.name,
    });
    if (existingFactoryByName) {
      throw AppError.from(ErrFactoryNameExists, 400);
    }

    // Tạo đối tượng nhà máy mới
    const factory = new Factory({
      id: uuidv4(),
      code: dto.code,
      name: dto.name,
      description: dto.description,
      address: dto.address,
      departmentId: dto.departmentId,
      managingDepartmentId: dto.managingDepartmentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Lưu nhà máy vào database
    await this.factoryRepository.insert(factory);
    this.logger.log(`Factory created: ${factory.id} by user ${requester.sub}`);

    return factory.id;
  }

  /**
   * Lấy danh sách nhà máy theo điều kiện tìm kiếm
   * Sử dụng phương thức listEntities từ BaseCrudService nhưng mở rộng để xử lý điều kiện đặc biệt
   */
  async listFactories(
    requester: Requester,
    conditions: FactoryCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: Factory[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Xây dựng điều kiện tìm kiếm
    const searchConditions: any = {};

    if (conditions.code) {
      searchConditions.code = {
        contains: conditions.code,
        mode: 'insensitive',
      };
    }

    if (conditions.name) {
      searchConditions.name = {
        contains: conditions.name,
        mode: 'insensitive',
      };
    }

    if (conditions.departmentId) {
      searchConditions.departmentId = conditions.departmentId;
    }

    if (conditions.managingDepartmentId) {
      searchConditions.managingDepartmentId = conditions.managingDepartmentId;
    }

    // Tìm kiếm tổng quát theo cả mã và tên
    if (conditions.search) {
      searchConditions.OR = [
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

    // Với người dùng không phải admin, chỉ hiển thị các nhà máy họ có quyền truy cập
    if (!this.hasAdminPermission(requester)) {
      const accessibleFactoryIds = await this.getUserAccessibleFactories(
        requester.sub,
      );

      if (accessibleFactoryIds.length === 0) {
        // Trả về kết quả trống nếu không có quyền truy cập vào nhà máy nào
        return {
          data: [],
          total: 0,
          page: pagination.page || 1,
          limit: pagination.limit || 10,
          totalPages: 0,
        };
      }

      // Chỉ hiển thị các nhà máy trong danh sách accessibleFactoryIds
      searchConditions.id = {
        in: accessibleFactoryIds,
      };
    }

    // Sử dụng phương thức listEntities từ BaseCrudService để lấy dữ liệu
    const result = await this.listEntities(requester, searchConditions, {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      sort: pagination.sortBy || 'createdAt',
      order: (pagination.sortOrder || 'desc') as 'asc' | 'desc',
    });

    // Tính toán tổng số trang
    const totalPages = Math.ceil(result.total / (pagination.limit || 10));

    return {
      data: result.data,
      total: result.total,
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      totalPages,
    };
  }

  /**
   * Lấy thông tin một nhà máy theo ID
   * Sử dụng phương thức getEntity từ BaseCrudService nhưng đổi tên để tương thích với interface IFactoryService
   */
  async getFactory(id: string): Promise<Factory> {
    return this.getEntity(id);
  }

  /**
   * Cập nhật thông tin nhà máy
   * Override phương thức từ BaseCrudService
   */
  async updateEntity(
    requester: Requester,
    id: string,
    dto: FactoryUpdateDTO,
  ): Promise<void> {
    // Kiểm tra quyền cập nhật
    const canManage = await this.canManageFactory(requester.sub, id);
    if (!canManage && !this.hasAdminPermission(requester)) {
      throw AppError.from(ErrPermissionDenied, 403);
    }

    // Kiểm tra nhà máy tồn tại
    const factory = await this.factoryRepository.get(id);
    if (!factory) {
      throw AppError.from(ErrFactoryNotFound, 404);
    }

    // Kiểm tra tên nhà máy mới có trùng với nhà máy khác không
    if (dto.name && dto.name !== factory.name) {
      const existingFactory = await this.factoryRepository.findByCond({
        name: dto.name,
      });

      if (existingFactory && existingFactory.id !== id) {
        throw AppError.from(ErrFactoryNameExists, 400);
      }
    }

    // Cập nhật thông tin nhà máy
    await this.factoryRepository.update(id, {
      ...dto,
      updatedAt: new Date(),
    });

    this.logger.log(`Factory updated: ${id} by user ${requester.sub}`);
  }

  /**
   * Xóa nhà máy
   * Override phương thức từ BaseCrudService
   */
  async deleteEntity(requester: Requester, id: string): Promise<void> {
    // Kiểm tra quyền xóa nhà máy (chỉ admin mới có quyền)
    if (!this.hasAdminPermission(requester)) {
      throw AppError.from(ErrPermissionDenied, 403);
    }

    // Kiểm tra nhà máy tồn tại
    const factory = await this.factoryRepository.get(id);
    if (!factory) {
      throw AppError.from(ErrFactoryNotFound, 404);
    }

    // Kiểm tra nhà máy có dây chuyền không
    const hasLines = await this.factoryRepository.hasLines(id);
    if (hasLines) {
      throw AppError.from(ErrFactoryHasLines, 400);
    }

    // Xóa nhà máy
    await this.factoryRepository.delete(id);
    this.logger.log(`Factory deleted: ${id} by user ${requester.sub}`);
  }

  /**
   * Thêm người quản lý cho nhà máy
   */
  async addFactoryManager(
    requester: Requester,
    factoryId: string,
    dto: FactoryManagerDTO,
  ): Promise<void> {
    // Kiểm tra quyền quản lý nhà máy
    const canManage = await this.canManageFactory(requester.sub, factoryId);
    if (!canManage && !this.hasAdminPermission(requester)) {
      throw AppError.from(ErrPermissionDenied, 403);
    }

    // Kiểm tra nhà máy tồn tại
    const factory = await this.factoryRepository.get(factoryId);
    if (!factory) {
      throw AppError.from(ErrFactoryNotFound, 404);
    }

    // Kiểm tra người dùng tồn tại
    const user = await this.userRepository.get(dto.userId);
    if (!user) {
      throw AppError.from(new Error('Người dùng không tồn tại'), 404);
    }

    // Thêm quản lý cho nhà máy
    await this.factoryRepository.addManager(factoryId, dto);

    // Nếu là quản lý chính, gán vai trò FACTORY_MANAGER
    if (dto.isPrimary) {
      // Kiểm tra xem đã có vai trò chưa
      const userRoles = await this.userRepository.getUserRoles(dto.userId);
      const hasRole = userRoles.some(
        (role) =>
          role.role === UserRole.FACTORY_MANAGER && role.scope === factoryId,
      );

      if (!hasRole) {
        // Gán vai trò FACTORY_MANAGER với phạm vi là factoryId
        await this.userRepository.assignRole(
          dto.userId,
          UserRole.FACTORY_MANAGER,
          factoryId,
        );
      }
    }

    this.logger.log(
      `Factory manager added: ${dto.userId} to factory ${factoryId} by user ${requester.sub}`,
    );
  }

  /**
   * Cập nhật thông tin người quản lý nhà máy
   */
  async updateFactoryManager(
    requester: Requester,
    factoryId: string,
    userId: string,
    isPrimary: boolean,
    endDate?: Date,
  ): Promise<void> {
    // Kiểm tra quyền quản lý nhà máy
    const canManage = await this.canManageFactory(requester.sub, factoryId);
    if (!canManage && !this.hasAdminPermission(requester)) {
      throw AppError.from(ErrPermissionDenied, 403);
    }

    // Kiểm tra nhà máy tồn tại
    const factory = await this.factoryRepository.get(factoryId);
    if (!factory) {
      throw AppError.from(ErrFactoryNotFound, 404);
    }

    // Kiểm tra người dùng tồn tại
    const user = await this.userRepository.get(userId);
    if (!user) {
      throw AppError.from(new Error('Người dùng không tồn tại'), 404);
    }

    // Cập nhật thông tin quản lý
    await this.factoryRepository.updateManager(
      factoryId,
      userId,
      isPrimary,
      endDate,
    );

    // Cập nhật vai trò nếu cần
    if (isPrimary) {
      // Kiểm tra xem đã có vai trò chưa
      const userRoles = await this.userRepository.getUserRoles(userId);
      const hasRole = userRoles.some(
        (role) =>
          role.role === UserRole.FACTORY_MANAGER && role.scope === factoryId,
      );

      if (!hasRole) {
        // Gán vai trò FACTORY_MANAGER với phạm vi là factoryId
        await this.userRepository.assignRole(
          userId,
          UserRole.FACTORY_MANAGER,
          factoryId,
        );
      }
    }

    this.logger.log(
      `Factory manager updated: ${userId} for factory ${factoryId} by user ${requester.sub}`,
    );
  }

  /**
   * Xóa người quản lý khỏi nhà máy
   */
  async removeFactoryManager(
    requester: Requester,
    factoryId: string,
    userId: string,
  ): Promise<void> {
    // Kiểm tra quyền quản lý nhà máy
    const canManage = await this.canManageFactory(requester.sub, factoryId);
    if (!canManage && !this.hasAdminPermission(requester)) {
      throw AppError.from(ErrPermissionDenied, 403);
    }

    // Kiểm tra nhà máy tồn tại
    const factory = await this.factoryRepository.get(factoryId);
    if (!factory) {
      throw AppError.from(ErrFactoryNotFound, 404);
    }

    // Xóa quản lý
    await this.factoryRepository.removeManager(factoryId, userId);

    // Xóa vai trò FACTORY_MANAGER với phạm vi là factoryId
    try {
      await this.userRepository.removeRole(
        userId,
        UserRole.FACTORY_MANAGER,
        factoryId,
      );
    } catch (error) {
      this.logger.error(
        `Error removing FACTORY_MANAGER role for user ${userId}: ${error.message}`,
      );
      // Continue execution even if role removal fails
    }

    this.logger.log(
      `Factory manager removed: ${userId} from factory ${factoryId} by user ${requester.sub}`,
    );
  }

  /**
   * Lấy danh sách người quản lý nhà máy
   */
  async getFactoryManagers(factoryId: string): Promise<
    Array<{
      userId: string;
      isPrimary: boolean;
      startDate: Date;
      endDate: Date | null;
    }>
  > {
    // Kiểm tra nhà máy tồn tại
    const factory = await this.factoryRepository.get(factoryId);
    if (!factory) {
      throw AppError.from(ErrFactoryNotFound, 404);
    }

    return this.factoryRepository.getManagers(factoryId);
  }

  /**
   * Kiểm tra người dùng có quyền quản lý nhà máy không
   */
  async canManageFactory(userId: string, factoryId: string): Promise<boolean> {
    // Kiểm tra người dùng tồn tại
    const user = await this.userRepository.get(userId);
    if (!user) {
      return false;
    }

    // Kiểm tra quyền quản lý
    return this.factoryRepository.isManager(userId, factoryId);
  }

  /**
   * Lấy danh sách ID nhà máy mà người dùng có quyền truy cập
   */
  async getUserAccessibleFactories(userId: string): Promise<string[]> {
    // Lấy danh sách quyền quản lý
    const managerialAccess =
      await this.userRepository.getManagerialAccess(userId);

    // Gộp các nhà máy từ quyền FACTORY_MANAGER trực tiếp
    const factoryIds = [...managerialAccess.factories];

    // Loại bỏ trùng lặp
    return [...new Set(factoryIds)];
  }

  /**
   * Chuyển đổi loại repository trong runtime
   */
  async switchRepositoryType(type: string, config?: any): Promise<void> {
    try {
      // Kiểm tra loại repository có được hỗ trợ không
      if (!this.adapterFactory.canCreate(type)) {
        throw new Error(`Unsupported repository type: ${type}`);
      }

      // Tạo adapter mới
      const newAdapter = this.adapterFactory.createAdapter(type, config);

      // Khởi tạo adapter
      await newAdapter.initialize(config);

      // Cập nhật adapter và repository hiện tại
      this.currentAdapter = newAdapter;
      this._factoryRepository = newAdapter.getFactoryRepository();

      this.logger.log(`Successfully switched to repository type: ${type}`);
    } catch (error) {
      this.logger.error(`Failed to switch repository type: ${error.message}`);
      throw error;
    }
  }

  /**
   * Lấy thông tin repository hiện tại
   */
  async getRepositoryInfo(): Promise<{
    type: string;
    name: string;
    version?: string;
  }> {
    return this.currentAdapter.getAdapterInfo();
  }

  /**
   * Hàm hỗ trợ kiểm tra người dùng có quyền admin không
   */
  private hasAdminPermission(requester: Requester): boolean {
    return (
      requester.role === UserRole.ADMIN ||
      requester.role === UserRole.SUPER_ADMIN
    );
  }

  // Tạo các phương thức alias để tương thích với IFactoryService
  // Chỉ cần gọi các phương thức tương ứng từ base class

  async deleteFactory(requester: Requester, id: string): Promise<void> {
    return this.deleteEntity(requester, id);
  }

  async updateFactory(
    requester: Requester,
    id: string,
    dto: FactoryUpdateDTO,
  ): Promise<void> {
    return this.updateEntity(requester, id, dto);
  }

  async createFactory(
    requester: Requester,
    dto: FactoryCreateDTO,
  ): Promise<string> {
    return this.createEntity(requester, dto);
  }
}
