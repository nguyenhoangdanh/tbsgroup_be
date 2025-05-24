import {
  Controller,
  Inject,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { RemoteAuthGuard } from 'src/share/guard';
import { TEAM_SERVICE } from './team.di-token';
import { ITeamService } from './team.port';
import { ErrTeamNotFound } from './team.model';
import { AppError } from 'src/share';

@Controller('internal/teams') // Internal API endpoint path
@UseGuards(RemoteAuthGuard) // Apply RemoteAuthGuard to all endpoints
export class TeamRpcHttpController {
  constructor(
    @Inject(TEAM_SERVICE) private readonly teamService: ITeamService,
  ) {}

  // Internal API endpoints for microservice communication

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getTeamById(@Param('id') id: string) {
    const team = await this.teamService.getEntity(id);
    if (!team) {
      throw AppError.from(ErrTeamNotFound, 404);
    }
    return { success: true, data: team };
  }

  @Get('by-code/:code')
  @HttpCode(HttpStatus.OK)
  async getTeamByCode(@Param('code') code: string) {
    const team = await this.teamService.findByCode(code);
    if (!team) {
      throw AppError.from(ErrTeamNotFound, 404);
    }
    return { success: true, data: team };
  }

  @Get('line/:lineId/list')
  @HttpCode(HttpStatus.OK)
  async getTeamsByLineId(@Param('lineId') lineId: string) {
    const teams = await this.teamService.findByLineId(lineId);
    return { success: true, data: teams };
  }
}
