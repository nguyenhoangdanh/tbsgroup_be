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
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AppError, ErrNotFound, ReqWithRequester, UserRole } from 'src/share';
import { RemoteAuthGuard, Roles, RolesGuard } from 'src/share/guard';
import { USER_REPOSITORY, USER_SERVICE } from './user.di-token';
import {
  PaginationDTO,
  UserCondDTO,
  UserRoleAssignmentDTO,
  UserUpdateDTO,
  UserUpdateProfileDTO,
} from './user.dto';
import { IUserRepository, IUserService } from './user.port';
import { ApiTags } from '@nestjs/swagger';

@Controller('users')
@ApiTags('Users')
export class UserHttpController {
  private readonly logger = new Logger(UserHttpController.name);
  constructor(
    @Inject(USER_SERVICE) private readonly userService: IUserService,
  ) {}

  /**
   * Profile management endpoints
   */
  @Get('profile')
  @UseGuards(RemoteAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getProfile(@Request() req: ReqWithRequester) {
    const data = await this.userService.profile(req.requester.sub);
    return { success: true, data };
  }

  @Patch('profile')
  @UseGuards(RemoteAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Request() req: ReqWithRequester,
    @Body() dto: UserUpdateProfileDTO,
  ) {
    await this.userService.update(req.requester, req.requester.sub, dto);
    return { success: true };
  }

  /**
   * User management endpoints
   */
  @Get()
  @UseGuards(RemoteAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.FACTORY_MANAGER,
    UserRole.LINE_MANAGER,
    UserRole.TEAM_LEADER,
  )
  @HttpCode(HttpStatus.OK)
  async listUsers(
    @Request() req: ReqWithRequester,
    @Query() conditions: UserCondDTO,
    @Query() pagination: PaginationDTO,
  ) {
    // Ensure pagination has default values
    const validatedPagination: PaginationDTO = {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      sortBy: pagination.sortBy || 'createdAt',
      sortOrder: pagination.sortOrder || 'desc',
    };
    const result = await this.userService.listUsers(
      req.requester,
      conditions,
      validatedPagination,
    );
    return { success: true, ...result };
  }

  @Get('users/:id')
  @UseGuards(RemoteAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUser(@Request() req: ReqWithRequester, @Param('id') id: string) {
    // Check if user is requesting their own profile or has admin access
    if (
      req.requester.sub !== id &&
      req.requester.role !== UserRole.ADMIN &&
      req.requester.role !== UserRole.SUPER_ADMIN
    ) {
      // Check if user has access to this user
      const hasAccess = await this.userService.canAccessEntity(
        req.requester.sub,
        'user',
        id,
      );
      if (!hasAccess) {
        throw AppError.from(
          new Error('Bạn không có quyền xem thông tin người dùng này'),
          403,
        );
      }
    }

    const data = await this.userService.profile(id);
    return { success: true, data };
  }

  @Patch('users/:id')
  @UseGuards(RemoteAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Body() dto: UserUpdateDTO,
  ) {
    await this.userService.update(req.requester, id, dto);
    return { success: true };
  }

  @Delete('users/:id')
  @UseGuards(RemoteAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Request() req: ReqWithRequester, @Param('id') id: string) {
    await this.userService.delete(req.requester, id);
    return { success: true };
  }

  /**
   * Role management endpoints
   */
  @Get('users/:id/roles')
  @UseGuards(RemoteAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserRoles(@Param('id') id: string) {
    const roles = await this.userService.getUserRoles(id);
    return { success: true, data: roles };
  }

  @Post('users/:id/roles')
  @UseGuards(RemoteAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async assignRole(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Body() dto: UserRoleAssignmentDTO,
  ) {
    await this.userService.assignRole(req.requester, id, dto);
    return { success: true };
  }

  @Delete('users/:id/roles/:roleId')
  @UseGuards(RemoteAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async removeRole(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @Body() body: { scope?: string },
  ) {
    await this.userService.removeRole(req.requester, id, roleId, body.scope);
    return { success: true };
  }

  /**
   * Access control endpoints
   */
  @Get('access/:entityType/:entityId')
  @UseGuards(RemoteAuthGuard)
  @HttpCode(HttpStatus.OK)
  async checkAccess(
    @Request() req: ReqWithRequester,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    const hasAccess = await this.userService.canAccessEntity(
      req.requester.sub,
      entityType,
      entityId,
    );
    return { success: true, data: hasAccess };
  }
}

/**
 * RPC Controller for internal service communication
 */
@Controller('rpc')
export class UserRpcHttpController {
  constructor(
    @Inject(USER_SERVICE) private readonly userService: IUserService,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  @Get('users/:id')
  @HttpCode(HttpStatus.OK)
  async getUser(@Param('id') id: string) {
    const user = await this.userRepository.get(id);
    if (!user) {
      throw AppError.from(ErrNotFound, 404);
    }
    return { data: this._toResponseModel(user) };
  }

  @Post('users/list-by-ids')
  @HttpCode(HttpStatus.OK)
  async listUsersByIds(@Body('ids') ids: string[]) {
    const users = await this.userRepository.listByIds(ids);
    return { data: users.map(this._toResponseModel) };
  }

  @Post('users/check-access')
  @HttpCode(HttpStatus.OK)
  async checkUserAccess(
    @Body() body: { userId: string; entityType: string; entityId: string },
  ) {
    const hasAccess = await this.userService.canAccessEntity(
      body.userId,
      body.entityType,
      body.entityId,
    );
    return { data: hasAccess };
  }

  private _toResponseModel(user: any): Omit<any, 'password' | 'salt'> {
    const { password, salt, ...rest } = user;
    return rest;
  }
}
