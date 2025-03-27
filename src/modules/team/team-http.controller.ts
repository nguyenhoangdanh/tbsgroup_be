import { Controller, Inject, Get, Post, Delete, Patch, Param, Body, HttpCode, HttpStatus, Query, Request, UseGuards } from '@nestjs/common';
import { Team } from './team.model';
import { TeamCreateDTO, TeamUpdateDTO, TeamCondDTO, TeamLeaderDTO } from './team.dto';
import { CRUD_OPTIONS, CrudController } from 'src/CrudModule/crud.decorator';
import { TEAM_SERVICE } from './team.di-token';
import { AppError, ReqWithRequester, UserRole, PagingDTO, Paginated } from 'src/share';
import { ITeamService } from './team.port';
import { ErrTeamNotFound } from './team.model';
import { RemoteAuthGuard, Roles, RolesGuard } from 'src/share/guard';
import { BaseCrudController } from 'src/CrudModule/base-crud.controller';

@Controller('teams') // Set the base path explicitly here
@UseGuards(RemoteAuthGuard) // Apply RemoteAuthGuard to all endpoints
export class TeamCrudController extends BaseCrudController<Team, TeamCreateDTO, TeamUpdateDTO, TeamCondDTO> {
  constructor(
    @Inject(TEAM_SERVICE) private readonly teamService: ITeamService,
    @Inject(CRUD_OPTIONS) crudOptions: any
  ) {
    super(teamService, crudOptions);
  }

  // Custom endpoints beyond basic CRUD

  // Endpoint to get teams by line
  @Get('line/:lineId')
  @HttpCode(HttpStatus.OK)
  async getTeamsByLine(
    @Request() req: ReqWithRequester,
    @Param('lineId') lineId: string,
  ) {
    const teams = await this.teamService.findByLineId(lineId);
    return { success: true, data: teams };
  }

  // Team leader endpoints
  @Get(':id/leaders')
  @HttpCode(HttpStatus.OK)
  async getTeamLeaders(
    @Param('id') id: string
  ) {
    const leaders = await this.teamService.getTeamLeaders(id);
    return { success: true, data: leaders };
  }

  @Post(':id/leaders')
  @HttpCode(HttpStatus.CREATED)
  async addTeamLeader(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Body() dto: TeamLeaderDTO,
  ) {
    await this.teamService.addTeamLeader(req.requester, id, dto);
    return { success: true };
  }

  @Patch(':id/leaders/:userId')
  @HttpCode(HttpStatus.OK)
  async updateTeamLeader(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: { isPrimary?: boolean; endDate?: Date },
  ) {
    await this.teamService.updateTeamLeader(
      req.requester,
      id,
      userId,
      dto.isPrimary !== undefined ? dto.isPrimary : false,
      dto.endDate,
    );
    return { success: true };
  }

  @Delete(':id/leaders/:userId')
  @HttpCode(HttpStatus.OK)
  async removeTeamLeader(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    await this.teamService.removeTeamLeader(req.requester, id, userId);
    return { success: true };
  }

  // Access validation endpoints
  @Get(':id/can-manage')
  @HttpCode(HttpStatus.OK)
  async canManageTeam(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
  ) {
    const canManage = await this.teamService.canManageTeam(
      req.requester.sub,
      id,
    );
    return { success: true, data: canManage };
  }

  @Get('accessible')
  @HttpCode(HttpStatus.OK)
  async getAccessibleTeams(@Request() req: ReqWithRequester) {
    const teamIds = await this.teamService.getUserAccessibleTeams(
      req.requester.sub,
    );

    // If team IDs are found, get full team details
    if (teamIds.length > 0) {
      const teams = await Promise.all(
        teamIds.map((id) => this.teamService.getEntity(id)),
      );
      return { success: true, data: teams.filter(Boolean) }; // Filter out any null results
    }

    return { success: true, data: [] };
  }
}