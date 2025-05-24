import { UserDepartment } from './user-department.model';
import {
  CreateUserDepartmentDto,
  FilterUserDepartmentDto,
  UpdateUserDepartmentDto,
} from './user-department.dto';

/**
 * Interface định nghĩa các phương thức của UserDepartment Repository
 */
export interface IUserDepartmentRepository {
  create(data: CreateUserDepartmentDto): Promise<UserDepartment>;
  findById(
    userId: string,
    departmentId: string,
  ): Promise<UserDepartment | null>;
  findByUserId(userId: string): Promise<UserDepartment[]>;
  findByDepartmentId(departmentId: string): Promise<UserDepartment[]>;
  findAll(filter?: FilterUserDepartmentDto): Promise<UserDepartment[]>;
  update(
    userId: string,
    departmentId: string,
    data: UpdateUserDepartmentDto,
  ): Promise<UserDepartment>;
  delete(userId: string, departmentId: string): Promise<UserDepartment>;
  // Phương thức mở rộng
  findWithRelations(filter: FilterUserDepartmentDto): Promise<UserDepartment[]>;
}

/**
 * Interface định nghĩa các phương thức của UserDepartment Service
 */
export interface IUserDepartmentService {
  create(data: CreateUserDepartmentDto): Promise<UserDepartment>;
  findById(userId: string, departmentId: string): Promise<UserDepartment>;
  findByUserId(
    userId: string,
    includeRelations?: boolean,
  ): Promise<UserDepartment[]>;
  findByDepartmentId(
    departmentId: string,
    includeRelations?: boolean,
  ): Promise<UserDepartment[]>;
  findAll(filter?: FilterUserDepartmentDto): Promise<UserDepartment[]>;
  update(
    userId: string,
    departmentId: string,
    data: UpdateUserDepartmentDto,
  ): Promise<UserDepartment>;
  delete(userId: string, departmentId: string): Promise<UserDepartment>;
  // Phương thức mở rộng
  assignUserToDepartment(
    userId: string,
    departmentId: string,
    roleId: string,
  ): Promise<UserDepartment>;
  removeUserFromDepartment(
    userId: string,
    departmentId: string,
  ): Promise<UserDepartment>;
  getDepartmentUsers(departmentId: string): Promise<any[]>; // Danh sách user của phòng ban với thông tin đầy đủ
  getUserDepartments(userId: string): Promise<any[]>; // Danh sách phòng ban của user với thông tin đầy đủ
}
