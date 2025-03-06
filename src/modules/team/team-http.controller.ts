import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import { HTTP_CONTROLLER } from 'src/constant';
import { TEAM_SERVICE } from './team.di-token';
import { ITeamService } from './team.port';
import { TeamDTO } from './team.dto';

@Controller(HTTP_CONTROLLER.TEAM)
export class TeamHttpController {
  @Inject(TEAM_SERVICE)
  private readonly teamService: ITeamService;

  @Post('create')
  // @UseGuards(RemoteAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createLine(@Body() dto: TeamDTO) {
    return await this.teamService.create(dto);
  }
}
