import { Controller, Inject, Get, Post, Delete, Param, Body, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { RemoteAuthGuard } from 'src/share/guard';
import { LINE_SERVICE } from './line.di-token';
import { ILineService } from './line.port';
import { ErrLineNotFound } from './line.model';
import { AppError } from 'src/share';
import { Line } from './line.model';

@Controller('internal/lines')  // Internal API endpoint path
@UseGuards(RemoteAuthGuard) // Apply RemoteAuthGuard to all endpoints
export class LineRpcHttpController {
  constructor(
    @Inject(LINE_SERVICE) private readonly lineService: ILineService
  ) {}

  // Internal API endpoints for microservice communication
  
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getLineById(@Param('id') id: string) {
    const line = await this.lineService.getEntity(id);
    if (!line) {
      throw AppError.from(ErrLineNotFound, 404);
    }
    return { success: true, data: line };
  }

  @Get('by-code/:code')
  @HttpCode(HttpStatus.OK)
  async getLineByCode(@Param('code') code: string) {
    const line = await this.lineService.findByCode(code);
    if (!line) {
      throw AppError.from(ErrLineNotFound, 404);
    }
    return { success: true, data: line };
  }

  @Get('factory/:factoryId/list')
  @HttpCode(HttpStatus.OK)
  async getLinesByFactoryId(@Param('factoryId') factoryId: string) {
    const lines = await this.lineService.findByFactoryId(factoryId);
    return { success: true, data: lines };
  }
}