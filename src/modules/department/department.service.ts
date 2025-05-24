import { Inject, Injectable, Logger } from '@nestjs/common';
import { IDepartmentRepository, IDepartmentService } from './department.port';
import { DEPARTMENT_REPOSITORY } from './department.di-token';
import {
  Department,
  ErrDepartmentCodeExists,
  ErrDepartmentNameExists,
  ErrDepartmentNotFound,
} from './department.model';
import {
  CreateDepartmentDto,
  FilterDepartmentDto,
  UpdateDepartmentDto,
} from './department.dto';

// Định nghĩa kiểu dữ liệu cho nút trong cây tổ chức
interface DepartmentTreeNode extends Department {
  children: DepartmentTreeNode[];
}

@Injectable()
export class DepartmentService implements IDepartmentService {
  private readonly logger = new Logger(DepartmentService.name);

  constructor(
    @Inject(DEPARTMENT_REPOSITORY)
    private departmentRepository: IDepartmentRepository,
  ) {}

  async create(data: CreateDepartmentDto): Promise<Department> {
    try {
      // Kiểm tra mã phòng ban đã tồn tại chưa
      const existingCode = await this.departmentRepository.findByCode(
        data.code,
      );
      if (existingCode) {
        throw ErrDepartmentCodeExists;
      }

      // Kiểm tra tên phòng ban đã tồn tại chưa
      const existingName = await this.departmentRepository.findByName(
        data.name,
      );
      if (existingName) {
        throw ErrDepartmentNameExists;
      }

      // Tạo phòng ban mới - FIXED: Removed id property that doesn't exist in CreateDepartmentDto
      return this.departmentRepository.create(data);
    } catch (error) {
      this.logger.error(`Lỗi khi tạo phòng ban: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findById(id: string): Promise<Department> {
    try {
      const department = await this.departmentRepository.findById(id);
      if (!department) {
        throw ErrDepartmentNotFound;
      }
      return department;
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
      return await this.departmentRepository.findByCode(code);
    } catch (error) {
      this.logger.error(
        `Lỗi khi tìm phòng ban theo mã: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAll(filter?: FilterDepartmentDto): Promise<Department[]> {
    try {
      return await this.departmentRepository.findAll(filter);
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
      // Kiểm tra phòng ban có tồn tại không
      const department = await this.findById(id);

      // Nếu thay đổi tên, kiểm tra tên mới đã tồn tại chưa
      if (data.name && data.name !== department.name) {
        const existingName = await this.departmentRepository.findByName(
          data.name,
        );
        if (existingName && existingName.id !== id) {
          throw ErrDepartmentNameExists;
        }
      }

      // Cập nhật phòng ban
      return this.departmentRepository.update(id, data);
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
      // Kiểm tra phòng ban có tồn tại không
      await this.findById(id);

      // Xóa phòng ban
      return this.departmentRepository.delete(id);
    } catch (error) {
      this.logger.error(`Lỗi khi xóa phòng ban: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getOrganizationTree(): Promise<DepartmentTreeNode[]> {
    try {
      // Lấy tất cả các phòng ban gốc (không có parent)
      const rootDepartments =
        await this.departmentRepository.findRootDepartments();

      // Xây dựng cây phòng ban đệ quy
      const buildTree = async (
        departments: Department[],
      ): Promise<DepartmentTreeNode[]> => {
        const result: DepartmentTreeNode[] = [];

        for (const department of departments) {
          const children = await this.departmentRepository.findChildren(
            department.id,
          );

          // Create a proper Department instance first, then add children property
          const departmentNode = new Department(department);

          // Now create the tree node by extending the Department instance with children
          const treeNode: DepartmentTreeNode = Object.assign(departmentNode, {
            children: children.length ? await buildTree(children) : [],
          });

          result.push(treeNode);
        }

        return result;
      };

      return buildTree(rootDepartments);
    } catch (error) {
      this.logger.error(
        `Lỗi khi lấy cây tổ chức: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getDepartmentHierarchy(id: string): Promise<Department[]> {
    try {
      const department = await this.findById(id);
      const hierarchy = [department];

      // Tìm tất cả các phòng ban cha (đệ quy lên trên)
      const findParents = async (dept: Department): Promise<void> => {
        if (!dept.parentId) return;

        const parent = await this.departmentRepository.findById(dept.parentId);
        if (parent) {
          hierarchy.unshift(parent); // Thêm phòng ban cha vào đầu mảng
          await findParents(parent);
        }
      };

      await findParents(department);

      return hierarchy;
    } catch (error) {
      this.logger.error(
        `Lỗi khi lấy phân cấp phòng ban: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
