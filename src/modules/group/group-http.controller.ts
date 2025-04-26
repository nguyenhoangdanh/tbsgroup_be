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
import { AppError, ReqWithRequester, UserRole } from 'src/share';
import { RemoteAuthGuard, Roles, RolesGuard } from 'src/share/guard';
import { GROUP_SERVICE } from './group.di-token';
import {
  GroupCondDTO,
  GroupCreateDTO,
  GroupLeaderCreateDTO,
  GroupLeaderUpdateDTO,
  GroupUpdateDTO,
  PaginationDTO,
} from './group.dto';
import { ErrGroupNotFound } from './group.model';
import { IGroupService } from './group.port';
import { ApiTags } from '@nestjs/swagger';

@Controller('groups')
@ApiTags('Groups')
@UseGuards(RemoteAuthGuard)
export class GroupHttpController {
  private readonly logger = new Logger(GroupHttpController.name);

  constructor(
    @Inject(GROUP_SERVICE) private readonly groupService: IGroupService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEAM_LEADER)
  @HttpCode(HttpStatus.CREATED)
  async createGroup(
    @Request() req: ReqWithRequester,
    @Body() dto: GroupCreateDTO,
  ) {
    const id = await this.groupService.createGroup(req.requester, dto);
    return {
      success: true,
      data: { id },
    };
  }

  @Post(':id/users')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEAM_LEADER)
  @HttpCode(HttpStatus.OK)
  async addUsersToGroup(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Body() dto: { userIds: string[] },
  ) {
    const result = await this.groupService.addUsersToGroup(
      req.requester,
      id,
      dto.userIds,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listGroups(
    @Query() conditions: GroupCondDTO,
    @Query() pagination: PaginationDTO,
  ) {
    // Ensure pagination has default values
    const validatedPagination: PaginationDTO = {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      sortBy: pagination.sortBy || 'createdAt',
      sortOrder: pagination.sortOrder || 'desc',
    };

    const result = await this.groupService.listGroups(
      conditions,
      validatedPagination,
    );

    return { success: true, ...result };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getGroup(@Param('id') id: string) {
    try {
      const group = await this.groupService.getGroup(id);
      return { success: true, data: group };
    } catch (error) {
      if (
        error instanceof AppError &&
        error.message === ErrGroupNotFound.message
      ) {
        throw AppError.from(ErrGroupNotFound, 404);
      }
      throw error;
    }
  }

  @Get(':id/users')
  @HttpCode(HttpStatus.OK)
  async getGroupUsers(@Param('id') id: string) {
    try {
      const group = await this.groupService.getGroup(id);
      return {
        success: true,
        data: group.users || [],
      };
    } catch (error) {
      if (
        error instanceof AppError &&
        error.message === ErrGroupNotFound.message
      ) {
        throw AppError.from(ErrGroupNotFound, 404);
      }
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEAM_LEADER)
  @HttpCode(HttpStatus.OK)
  async updateGroup(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Body() dto: GroupUpdateDTO,
  ) {
    await this.groupService.updateGroup(req.requester, id, dto);
    return { success: true };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteGroup(@Request() req: ReqWithRequester, @Param('id') id: string) {
    await this.groupService.deleteGroup(req.requester, id);
    return { success: true };
  }

  // Group Leader endpoints
  @Post('leaders')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEAM_LEADER)
  @HttpCode(HttpStatus.CREATED)
  async assignGroupLeader(
    @Request() req: ReqWithRequester,
    @Body() dto: GroupLeaderCreateDTO,
  ) {
    await this.groupService.assignGroupLeader(req.requester, dto);
    return { success: true };
  }

  @Get(':id/leaders')
  @HttpCode(HttpStatus.OK)
  async getGroupLeaders(@Param('id') id: string) {
    const leaders = await this.groupService.getGroupLeaders(id);
    return { success: true, data: leaders };
  }

  @Patch(':groupId/leaders/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEAM_LEADER)
  @HttpCode(HttpStatus.OK)
  async updateGroupLeader(
    @Request() req: ReqWithRequester,
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
    @Body() dto: GroupLeaderUpdateDTO,
  ) {
    await this.groupService.updateGroupLeader(
      req.requester,
      groupId,
      userId,
      dto,
    );
    return { success: true };
  }

  @Delete(':groupId/leaders/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEAM_LEADER)
  @HttpCode(HttpStatus.OK)
  async removeGroupLeader(
    @Request() req: ReqWithRequester,
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
  ) {
    await this.groupService.removeGroupLeader(req.requester, groupId, userId);
    return { success: true };
  }

  // Group Performance endpoints
  @Get(':id/performance')
  @HttpCode(HttpStatus.OK)
  async getGroupPerformance(@Param('id') id: string) {
    const data = await this.groupService.getGroupPerformance(id);
    return { success: true, data };
  }

  @Get('performance/list')
  @HttpCode(HttpStatus.OK)
  async listGroupsWithPerformance(
    @Query() conditions: GroupCondDTO,
    @Query() pagination: PaginationDTO,
  ) {
    const validatedPagination: PaginationDTO = {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      sortBy: pagination.sortBy || 'createdAt',
      sortOrder: pagination.sortOrder || 'desc',
    };

    const result = await this.groupService.listGroupsWithPerformance(
      conditions,
      validatedPagination,
    );

    return { success: true, ...result };
  }
}

// RPC Controller cho giao tiếp nội bộ giữa các service
@Controller('rpc/groups')
export class GroupRpcHttpController {
  constructor(
    @Inject(GROUP_SERVICE) private readonly groupService: IGroupService,
  ) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getGroup(@Param('id') id: string) {
    try {
      const group = await this.groupService.getGroup(id);
      return { success: true, data: group };
    } catch (error) {
      if (
        error instanceof AppError &&
        error.message === ErrGroupNotFound.message
      ) {
        throw AppError.from(ErrGroupNotFound, 404);
      }
      throw error;
    }
  }

  @Get(':id/leaders')
  @HttpCode(HttpStatus.OK)
  async getGroupLeaders(@Param('id') id: string) {
    const leaders = await this.groupService.getGroupLeaders(id);
    return { success: true, data: leaders };
  }

  @Get(':id/performance')
  @HttpCode(HttpStatus.OK)
  async getGroupPerformance(@Param('id') id: string) {
    const data = await this.groupService.getGroupPerformance(id);
    return { success: true, data };
  }
}
