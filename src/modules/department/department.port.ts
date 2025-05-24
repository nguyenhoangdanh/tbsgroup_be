import { Department } from './department.model';
import {
  CreateDepartmentDto,
  FilterDepartmentDto,
  UpdateDepartmentDto,
} from './department.dto';

/**
 * Interface định nghĩa các phương thức của Department Repository
 */
export interface IDepartmentRepository {
  create(data: CreateDepartmentDto): Promise<Department>;
  findById(id: string): Promise<Department | null>;
  findByCode(code: string): Promise<Department | null>;
  findByName(name: string): Promise<Department | null>;
  findAll(filter?: FilterDepartmentDto): Promise<Department[]>;
  update(id: string, data: UpdateDepartmentDto): Promise<Department>;
  delete(id: string): Promise<Department>;
  // Thêm các phương thức liên quan đến quan hệ phân cấp
  findChildren(parentId: string): Promise<Department[]>;
  findParent(id: string): Promise<Department | null>;
  findRootDepartments(): Promise<Department[]>; // Các phòng ban cấp cao nhất (không có parent)
  // Thêm phương thức liên quan đến Factory
  findByFactory(factoryId: string): Promise<Department | null>;
  findWithFactories(): Promise<Department[]>;
}

/**
 * Interface định nghĩa các phương thức của Department Service
 */
export interface IDepartmentService {
  create(data: CreateDepartmentDto): Promise<Department>;
  findById(id: string): Promise<Department>;
  findByCode(code: string): Promise<Department | null>;
  findAll(filter?: FilterDepartmentDto): Promise<Department[]>;
  update(id: string, data: UpdateDepartmentDto): Promise<Department>;
  delete(id: string): Promise<Department>;
  // Phương thức liên quan đến cây phòng ban
  getOrganizationTree(): Promise<any>; // Trả về cấu trúc cây phòng ban
  getDepartmentHierarchy(id: string): Promise<any>; // Lấy cấu trúc phân cấp của một phòng ban
}
