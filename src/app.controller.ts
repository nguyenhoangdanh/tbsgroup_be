import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get hello message' })
  @ApiResponse({ status: 200, description: 'Returns a greeting message' })
  async getHello(): Promise<string> {
    return await this.appService.getHello();
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Returns server health status' })
  async health(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('status')
  @Public()
  @ApiOperation({ summary: 'API status endpoint' })
  @ApiResponse({ status: 200, description: 'Returns API status and version' })
  async status(): Promise<{
    message: string;
    version: string;
    environment: string;
  }> {
    return {
      message: 'TBS Group Daily Performance API is running',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
