import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IUserDepartmentRepository,
  IUserDepartmentService,
} from './user-department.port';
import { USER_DEPARTMENT_REPOSITORY } from './user-department.di-token';
import {
  UserDepartment,
  ErrUserDepartmentExists,
  ErrUserDepartmentNotFound,
} from './user-department.model';
import {
  CreateUserDepartmentDto,
  FilterUserDepartmentDto,
  UpdateUserDepartmentDto,
} from './user-department.dto';

@Injectable()
export class UserDepartmentService implements IUserDepartmentService {
  private readonly logger = new Logger(UserDepartmentService.name);

  constructor(
    @Inject(USER_DEPARTMENT_REPOSITORY)
    private userDepartmentRepository: IUserDepartmentRepository,
  ) {}

  async create(data: CreateUserDepartmentDto): Promise<UserDepartment> {
    try {
      // Kiểm tra quan hệ đã tồn tại chưa
      const existing = await this.userDepartmentRepository.findById(
        data.userId,
        data.departmentId,
      );
      if (existing) {
        throw ErrUserDepartmentExists;
      }

      // Tạo quan hệ mới
      return this.userDepartmentRepository.create(data);
    } catch (error) {
      this.logger.error(
        `Lỗi khi tạo quan hệ người dùng-phòng ban: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findById(
    userId: string,
    departmentId: string,
  ): Promise<UserDepartment> {
    try {
      const userDepartment = await this.userDepartmentRepository.findById(
        userId,
        departmentId,
      );
      if (!userDepartment) {
        throw ErrUserDepartmentNotFound;
      }
      return userDepartment;
    } catch (error) {
      this.logger.error(
        `Lỗi khi tìm quan hệ theo ID: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByUserId(
    userId: string,
    includeRelations = false,
  ): Promise<UserDepartment[]> {
    try {
      if (includeRelations) {
        return this.userDepartmentRepository.findWithRelations({
          userId,
          includeDepartment: true, // Explicitly set to boolean true
          includeRole: true, // Explicitly set to boolean true
        });
      }
      return this.userDepartmentRepository.findByUserId(userId);
    } catch (error) {
      this.logger.error(
        `Lỗi khi tìm quan hệ theo người dùng: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByDepartmentId(
    departmentId: string,
    includeRelations = false,
  ): Promise<UserDepartment[]> {
    try {
      if (includeRelations) {
        return this.userDepartmentRepository.findWithRelations({
          departmentId,
          includeUser: true, // Explicitly set to boolean true
          includeRole: true, // Explicitly set to boolean true
        });
      }
      return this.userDepartmentRepository.findByDepartmentId(departmentId);
    } catch (error) {
      this.logger.error(
        `Lỗi khi tìm quan hệ theo phòng ban: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAll(filter?: FilterUserDepartmentDto): Promise<UserDepartment[]> {
    try {
      // Create a new filter object with default values for include* properties
      const enhancedFilter: FilterUserDepartmentDto = {
        ...filter,
        // Only set these if they were actually provided as true
        includeUser: filter?.includeUser === true,
        includeDepartment: filter?.includeDepartment === true,
        includeRole: filter?.includeRole === true,
      };

      const includeRelations =
        enhancedFilter.includeUser ||
        enhancedFilter.includeDepartment ||
        enhancedFilter.includeRole;

      if (includeRelations) {
        return this.userDepartmentRepository.findWithRelations(enhancedFilter);
      }

      return this.userDepartmentRepository.findAll(filter);
    } catch (error) {
      this.logger.error(
        `Lỗi khi tìm tất cả quan hệ: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async update(
    userId: string,
    departmentId: string,
    data: UpdateUserDepartmentDto,
  ): Promise<UserDepartment> {
    try {
      // Kiểm tra quan hệ có tồn tại không
      await this.findById(userId, departmentId);

      // Cập nhật quan hệ
      return this.userDepartmentRepository.update(userId, departmentId, data);
    } catch (error) {
      this.logger.error(
        `Lỗi khi cập nhật quan hệ: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async delete(userId: string, departmentId: string): Promise<UserDepartment> {
    try {
      // Kiểm tra quan hệ có tồn tại không
      await this.findById(userId, departmentId);

      // Xóa quan hệ
      return this.userDepartmentRepository.delete(userId, departmentId);
    } catch (error) {
      this.logger.error(`Lỗi khi xóa quan hệ: ${error.message}`, error.stack);
      throw error;
    }
  }

  async assignUserToDepartment(
    userId: string,
    departmentId: string,
    roleId: string,
  ): Promise<UserDepartment> {
    try {
      // Kiểm tra đã có quan hệ chưa
      const existing = await this.userDepartmentRepository.findById(
        userId,
        departmentId,
      );

      if (existing) {
        // Nếu đã có quan hệ, cập nhật vai trò
        return this.userDepartmentRepository.update(userId, departmentId, {
          roleId,
        });
      } else {
        // Nếu chưa có quan hệ, tạo mới
        return this.userDepartmentRepository.create({
          userId,
          departmentId,
          roleId,
        });
      }
    } catch (error) {
      this.logger.error(
        `Lỗi khi gán người dùng vào phòng ban: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async removeUserFromDepartment(
    userId: string,
    departmentId: string,
  ): Promise<UserDepartment> {
    try {
      // Xóa quan hệ
      return this.delete(userId, departmentId);
    } catch (error) {
      this.logger.error(
        `Lỗi khi xóa người dùng khỏi phòng ban: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getDepartmentUsers(departmentId: string): Promise<any[]> {
    try {
      // Lấy tất cả người dùng của phòng ban kèm theo thông tin đầy đủ
      const userDepartments =
        await this.userDepartmentRepository.findWithRelations({
          departmentId,
          includeUser: true, // Explicitly set to boolean true
          includeRole: true, // Explicitly set to boolean true
        });

      // Chuyển đổi thành danh sách người dùng với thông tin phòng ban
      return userDepartments.map((ud) => ({
        user: ud.user,
        roleId: ud.roleId,
        role: ud.role,
        departmentId,
        createdAt: ud.createdAt,
      }));
    } catch (error) {
      this.logger.error(
        `Lỗi khi lấy danh sách người dùng của phòng ban: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getUserDepartments(userId: string): Promise<any[]> {
    try {
      // Lấy tất cả phòng ban của người dùng kèm theo thông tin đầy đủ
      const userDepartments =
        await this.userDepartmentRepository.findWithRelations({
          userId,
          includeDepartment: true, // Explicitly set to boolean true
          includeRole: true, // Explicitly set to boolean true
        });

      // Chuyển đổi thành danh sách phòng ban với thông tin người dùng
      return userDepartments.map((ud) => ({
        department: ud.department,
        roleId: ud.roleId,
        role: ud.role,
        userId,
        createdAt: ud.createdAt,
      }));
    } catch (error) {
      this.logger.error(
        `Lỗi khi lấy danh sách phòng ban của người dùng: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
