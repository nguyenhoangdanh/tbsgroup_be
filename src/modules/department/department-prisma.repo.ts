import { Injectable, Logger } from '@nestjs/common';
import { IDepartmentRepository } from './department.port';
import { Department, ErrDepartmentNotFound } from './department.model';
import {
  CreateDepartmentDto,
  FilterDepartmentDto,
  UpdateDepartmentDto,
} from './department.dto';
import { PrismaService } from 'src/share/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class DepartmentPrismaRepository implements IDepartmentRepository {
  private readonly logger = new Logger(DepartmentPrismaRepository.name);

  constructor(private prisma: PrismaService) {}

  async create(data: CreateDepartmentDto): Promise<Department> {
    try {
      const result = await this.prisma.department.create({
        data: {
          id: randomUUID(),
          code: data.code,
          name: data.name,
          description: data.description,
          departmentType: data.departmentType,
          parentId: data.parentId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return Department.from(result);
    } catch (error) {
      this.logger.error(`Lỗi khi tạo phòng ban: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findById(id: string): Promise<Department | null> {
    try {
      const department = await this.prisma.department.findUnique({
        where: { id },
      });

      return department ? Department.from(department) : null;
    } catch (error) {
      this.logger.error(
        `Lỗi khi tìm phòng ban theo ID: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByCode(code: string): Promise<Department | null> {
    try {
      // Add safety check for undefined code
      if (!code) {
        this.logger.warn('findByCode called with undefined or empty code');
        return null;
      }

      const department = await this.prisma.department.findUnique({
        where: { code },
      });
      return department ? Department.from(department) : null;
    } catch (error) {
      this.logger.error(
        `Lỗi khi tìm phòng ban theo mã: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByName(name: string): Promise<Department | null> {
    try {
      const department = await this.prisma.department.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });

      return department ? Department.from(department) : null;
    } catch (error) {
      this.logger.error(
        `Lỗi khi tìm phòng ban theo tên: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAll(filter?: FilterDepartmentDto): Promise<Department[]> {
    try {
      const where: any = {};

      if (filter?.code) {
        where.code = { contains: filter.code, mode: 'insensitive' };
      }

      if (filter?.name) {
        where.name = { contains: filter.name, mode: 'insensitive' };
      }

      if (filter?.departmentType) {
        where.departmentType = filter.departmentType;
      }

      // Enhanced parentId filter handling to properly distinguish between:
      // - undefined (not filtered)
      // - null (only root departments)
      // - specific ID (only departments with that parent)
      if (filter?.parentId !== undefined) {
        // If the string is "null" or actual null, filter for root departments
        if (filter.parentId === null || filter.parentId === 'null') {
          where.parentId = null;
          this.logger.debug(
            'Filtering for root departments with null parentId',
          );
        } else {
          // Otherwise use the provided ID
          where.parentId = filter.parentId;
          this.logger.debug(
            `Filtering for departments with parentId: ${filter.parentId}`,
          );
        }
      }

      this.logger.debug(`Department filter query: ${JSON.stringify(where)}`);

      const departments = await this.prisma.department.findMany({
        where,
        orderBy: [{ name: 'asc' }],
      });

      return departments.map(Department.from);
    } catch (error) {
      this.logger.error(
        `Lỗi khi tìm tất cả phòng ban: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async update(id: string, data: UpdateDepartmentDto): Promise<Department> {
    try {
      const department = await this.findById(id);
      if (!department) {
        throw ErrDepartmentNotFound;
      }

      const updated = await this.prisma.department.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          departmentType: data.departmentType,
          parentId: data.parentId,
          updatedAt: new Date(),
        },
      });

      return Department.from(updated);
    } catch (error) {
      this.logger.error(
        `Lỗi khi cập nhật phòng ban: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async delete(id: string): Promise<Department> {
    try {
      const department = await this.findById(id);
      if (!department) {
        throw ErrDepartmentNotFound;
      }

      // Kiểm tra xem có phòng ban con hay không trước khi xóa
      const children = await this.findChildren(id);
      if (children.length > 0) {
        throw new Error('Phòng ban có phòng ban con, không thể xóa');
      }

      // Kiểm tra xem có người dùng thuộc phòng ban hay không
      const users = await this.prisma.userDepartment.findMany({
        where: { departmentId: id },
      });
      if (users.length > 0) {
        throw new Error('Phòng ban có người dùng, không thể xóa');
      }

      const deleted = await this.prisma.department.delete({
        where: { id },
      });

      return Department.from(deleted);
    } catch (error) {
      this.logger.error(`Lỗi khi xóa phòng ban: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findChildren(parentId: string): Promise<Department[]> {
    try {
      const departments = await this.prisma.department.findMany({
        where: { parentId },
      });

      return departments.map(Department.from);
    } catch (error) {
      this.logger.error(
        `Lỗi khi tìm phòng ban con: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findParent(id: string): Promise<Department | null> {
    try {
      const department = await this.prisma.department.findUnique({
        where: { id },
        include: { parent: true },
      });

      return department?.parent ? Department.from(department.parent) : null;
    } catch (error) {
      this.logger.error(
        `Lỗi khi tìm phòng ban cha: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findRootDepartments(): Promise<Department[]> {
    try {
      const departments = await this.prisma.department.findMany({
        where: { parentId: null },
      });

      return departments.map(Department.from);
    } catch (error) {
      this.logger.error(
        `Lỗi khi tìm phòng ban gốc: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByFactory(factoryId: string): Promise<Department | null> {
    try {
      const factory = await this.prisma.factory.findUnique({
        where: { id: factoryId },
        include: { managingDepartment: true },
      });

      return factory?.managingDepartment
        ? Department.from(factory.managingDepartment)
        : null;
    } catch (error) {
      this.logger.error(
        `Lỗi khi tìm phòng ban theo nhà máy: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findWithFactories(): Promise<Department[]> {
    try {
      const departments = await this.prisma.department.findMany({
        include: { managedFactory: true },
      });

      return departments.map(Department.from);
    } catch (error) {
      this.logger.error(
        `Lỗi khi tìm phòng ban với nhà máy: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
