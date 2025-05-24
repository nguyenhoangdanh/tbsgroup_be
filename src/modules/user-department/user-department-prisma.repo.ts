import { Injectable, Logger } from '@nestjs/common';
import { IUserDepartmentRepository } from './user-department.port';
import {
  UserDepartment,
  ErrUserDepartmentNotFound,
} from './user-department.model';
import {
  CreateUserDepartmentDto,
  FilterUserDepartmentDto,
  UpdateUserDepartmentDto,
} from './user-department.dto';
import { PrismaService } from 'src/share/prisma.service';

@Injectable()
export class UserDepartmentPrismaRepository
  implements IUserDepartmentRepository
{
  private readonly logger = new Logger(UserDepartmentPrismaRepository.name);

  constructor(private prisma: PrismaService) {}

  async create(data: CreateUserDepartmentDto): Promise<UserDepartment> {
    try {
      const result = await this.prisma.userDepartment.create({
        data: {
          userId: data.userId,
          departmentId: data.departmentId,
          roleId: data.roleId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return UserDepartment.from(result);
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
  ): Promise<UserDepartment | null> {
    try {
      const userDepartment = await this.prisma.userDepartment.findUnique({
        where: {
          userId_departmentId: {
            userId,
            departmentId,
          },
        },
      });

      return userDepartment ? UserDepartment.from(userDepartment) : null;
    } catch (error) {
      this.logger.error(
        `Lỗi khi tìm quan hệ người dùng-phòng ban theo ID: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<UserDepartment[]> {
    try {
      const userDepartments = await this.prisma.userDepartment.findMany({
        where: { userId },
      });

      return userDepartments.map(UserDepartment.from);
    } catch (error) {
      this.logger.error(
        `Lỗi khi tìm quan hệ theo người dùng: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByDepartmentId(departmentId: string): Promise<UserDepartment[]> {
    try {
      const userDepartments = await this.prisma.userDepartment.findMany({
        where: { departmentId },
      });

      return userDepartments.map(UserDepartment.from);
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
      const where: any = {};

      if (filter?.userId) {
        where.userId = filter.userId;
      }

      if (filter?.departmentId) {
        where.departmentId = filter.departmentId;
      }

      if (filter?.roleId) {
        where.roleId = filter.roleId;
      }

      const userDepartments = await this.prisma.userDepartment.findMany({
        where,
      });

      return userDepartments.map(UserDepartment.from);
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
      const userDepartment = await this.findById(userId, departmentId);
      if (!userDepartment) {
        throw ErrUserDepartmentNotFound;
      }

      const updated = await this.prisma.userDepartment.update({
        where: {
          userId_departmentId: {
            userId,
            departmentId,
          },
        },
        data: {
          roleId: data.roleId,
          updatedAt: new Date(),
        },
      });

      return UserDepartment.from(updated);
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
      const userDepartment = await this.findById(userId, departmentId);
      if (!userDepartment) {
        throw ErrUserDepartmentNotFound;
      }

      const deleted = await this.prisma.userDepartment.delete({
        where: {
          userId_departmentId: {
            userId,
            departmentId,
          },
        },
      });

      return UserDepartment.from(deleted);
    } catch (error) {
      this.logger.error(`Lỗi khi xóa quan hệ: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findWithRelations(
    filter: FilterUserDepartmentDto,
  ): Promise<UserDepartment[]> {
    try {
      const where: any = {};

      if (filter?.userId) {
        where.userId = filter.userId;
      }

      if (filter?.departmentId) {
        where.departmentId = filter.departmentId;
      }

      if (filter?.roleId) {
        where.roleId = filter.roleId;
      }

      const include: any = {};

      if (filter?.includeUser === true) {
        include.user = true;
      }

      if (filter?.includeDepartment === true) {
        include.department = true;
      }

      if (filter?.includeRole === true) {
        include.Role = true;
      }

      const userDepartments = await this.prisma.userDepartment.findMany({
        where,
        include: Object.keys(include).length > 0 ? include : undefined,
      });

      return userDepartments.map(UserDepartment.from);
    } catch (error) {
      this.logger.error(
        `Lỗi khi tìm quan hệ với các thực thể liên quan: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
