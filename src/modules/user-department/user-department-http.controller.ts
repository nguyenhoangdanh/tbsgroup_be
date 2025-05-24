import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Post,
  Put,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IUserDepartmentService } from './user-department.port';
import { USER_DEPARTMENT_SERVICE } from './user-department.di-token';
import {
  CreateUserDepartmentDto,
  FilterUserDepartmentDto,
  UpdateUserDepartmentDto,
  createUserDepartmentSchema,
  updateUserDepartmentSchema,
  filterUserDepartmentSchema,
} from './user-department.dto';
import { UserDepartment } from './user-department.model';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';

@ApiTags('User-Departments')
@Controller('user-departments')
export class UserDepartmentHttpController {
  private readonly logger = new Logger(UserDepartmentHttpController.name);

  constructor(
    @Inject(USER_DEPARTMENT_SERVICE)
    private userDepartmentService: IUserDepartmentService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo mới quan hệ người dùng-phòng ban' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tạo mới quan hệ thành công',
  })
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createUserDepartmentSchema))
  async create(@Body() data: CreateUserDepartmentDto): Promise<UserDepartment> {
    this.logger.log(
      `Tạo mới quan hệ người dùng-phòng ban: ${JSON.stringify(data)}`,
    );
    return this.userDepartmentService.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách quan hệ người dùng-phòng ban' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Danh sách quan hệ' })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(filterUserDepartmentSchema))
  async findAll(
    @Query() filter: FilterUserDepartmentDto,
  ): Promise<UserDepartment[]> {
    this.logger.log(
      `Lấy danh sách quan hệ với filter: ${JSON.stringify(filter)}`,
    );
    return this.userDepartmentService.findAll(filter);
  }

  @Get('user/:userId/department/:departmentId')
  @ApiOperation({ summary: 'Lấy thông tin quan hệ theo ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Thông tin quan hệ' })
  @HttpCode(HttpStatus.OK)
  async findById(
    @Param('userId') userId: string,
    @Param('departmentId') departmentId: string,
  ): Promise<UserDepartment> {
    this.logger.log(
      `Lấy thông tin quan hệ với userId: ${userId}, departmentId: ${departmentId}`,
    );
    return this.userDepartmentService.findById(userId, departmentId);
  }

  @Put('user/:userId/department/:departmentId')
  @ApiOperation({ summary: 'Cập nhật thông tin quan hệ' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cập nhật quan hệ thành công',
  })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(updateUserDepartmentSchema))
  async update(
    @Param('userId') userId: string,
    @Param('departmentId') departmentId: string,
    @Body() data: UpdateUserDepartmentDto,
  ): Promise<UserDepartment> {
    this.logger.log(
      `Cập nhật quan hệ với userId: ${userId}, departmentId: ${departmentId}: ${JSON.stringify(data)}`,
    );
    return this.userDepartmentService.update(userId, departmentId, data);
  }

  @Delete('user/:userId/department/:departmentId')
  @ApiOperation({ summary: 'Xóa quan hệ' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Xóa quan hệ thành công' })
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param('userId') userId: string,
    @Param('departmentId') departmentId: string,
  ): Promise<UserDepartment> {
    this.logger.log(
      `Xóa quan hệ với userId: ${userId}, departmentId: ${departmentId}`,
    );
    return this.userDepartmentService.delete(userId, departmentId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Lấy danh sách phòng ban của người dùng' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Danh sách phòng ban của người dùng',
  })
  @HttpCode(HttpStatus.OK)
  async getUserDepartments(
    @Param('userId') userId: string,
    @Query('includeRelations') includeRelations?: boolean,
  ): Promise<UserDepartment[]> {
    this.logger.log(`Lấy danh sách phòng ban của người dùng với ID: ${userId}`);
    return this.userDepartmentService.findByUserId(userId, includeRelations);
  }

  @Get('department/:departmentId')
  @ApiOperation({ summary: 'Lấy danh sách người dùng của phòng ban' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Danh sách người dùng của phòng ban',
  })
  @HttpCode(HttpStatus.OK)
  async getDepartmentUsers(
    @Param('departmentId') departmentId: string,
    @Query('includeRelations') includeRelations?: boolean,
  ): Promise<UserDepartment[]> {
    this.logger.log(
      `Lấy danh sách người dùng của phòng ban với ID: ${departmentId}`,
    );
    return this.userDepartmentService.findByDepartmentId(
      departmentId,
      includeRelations,
    );
  }

  @Post('assign')
  @ApiOperation({ summary: 'Gán người dùng vào phòng ban' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Gán người dùng vào phòng ban thành công',
  })
  @HttpCode(HttpStatus.OK)
  async assignUserToDepartment(
    @Body() data: { userId: string; departmentId: string; roleId: string },
  ): Promise<UserDepartment> {
    this.logger.log(
      `Gán người dùng ${data.userId} vào phòng ban ${data.departmentId} với vai trò ${data.roleId}`,
    );
    return this.userDepartmentService.assignUserToDepartment(
      data.userId,
      data.departmentId,
      data.roleId,
    );
  }

  @Post('remove')
  @ApiOperation({ summary: 'Xóa người dùng khỏi phòng ban' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Xóa người dùng khỏi phòng ban thành công',
  })
  @HttpCode(HttpStatus.OK)
  async removeUserFromDepartment(
    @Body() data: { userId: string; departmentId: string },
  ): Promise<UserDepartment> {
    this.logger.log(
      `Xóa người dùng ${data.userId} khỏi phòng ban ${data.departmentId}`,
    );
    return this.userDepartmentService.removeUserFromDepartment(
      data.userId,
      data.departmentId,
    );
  }

  @Get('user/:userId/departments/details')
  @ApiOperation({ summary: 'Lấy danh sách phòng ban chi tiết của người dùng' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Danh sách phòng ban chi tiết của người dùng',
  })
  @HttpCode(HttpStatus.OK)
  async getUserDepartmentsDetails(
    @Param('userId') userId: string,
  ): Promise<any[]> {
    this.logger.log(
      `Lấy danh sách phòng ban chi tiết của người dùng với ID: ${userId}`,
    );
    return this.userDepartmentService.getUserDepartments(userId);
  }

  @Get('department/:departmentId/users/details')
  @ApiOperation({ summary: 'Lấy danh sách người dùng chi tiết của phòng ban' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Danh sách người dùng chi tiết của phòng ban',
  })
  @HttpCode(HttpStatus.OK)
  async getDepartmentUsersDetails(
    @Param('departmentId') departmentId: string,
  ): Promise<any[]> {
    this.logger.log(
      `Lấy danh sách người dùng chi tiết của phòng ban với ID: ${departmentId}`,
    );
    return this.userDepartmentService.getDepartmentUsers(departmentId);
  }
}
