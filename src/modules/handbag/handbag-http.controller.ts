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
  import { HANDBAG_SERVICE } from './handbag.di-token';
  import {
    BagColorCondDTO,
    BagColorCreateDTO,
    BagColorProcessCondDTO,
    BagColorProcessCreateDTO,
    BagColorProcessUpdateDTO,
    BagColorUpdateDTO,
    HandBagCondDTO,
    HandBagCreateDTO,
    HandBagUpdateDTO,
    PaginationDTO,
  } from './handbag.dto';
  import {
    ErrBagColorNotFound,
    ErrBagColorProcessNotFound,
    ErrHandBagNotFound,
  } from './handbag.model';
  import { IHandBagService } from './handbag.port';
  
  @Controller('handbags')
  @UseGuards(RemoteAuthGuard)
  export class HandBagHttpController {
    private readonly logger = new Logger(HandBagHttpController.name);
  
    constructor(
      @Inject(HANDBAG_SERVICE) private readonly handBagService: IHandBagService,
    ) {}
  
    // ========== HandBag Endpoints ==========
    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @HttpCode(HttpStatus.CREATED)
    async createHandBag(
      @Request() req: ReqWithRequester,
      @Body() dto: HandBagCreateDTO,
    ) {
      const handBagId = await this.handBagService.createHandBag(
        req.requester,
        dto,
      );
      return {
        success: true,
        data: { id: handBagId },
      };
    }
  
    @Get()
    @HttpCode(HttpStatus.OK)
    async listHandBags(
      @Query() conditions: HandBagCondDTO,
      @Query() pagination: PaginationDTO,
    ) {
      // Ensure pagination has default values
      const validatedPagination: PaginationDTO = {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        sortBy: pagination.sortBy || 'createdAt',
        sortOrder: pagination.sortOrder || 'desc',
      };
  
      const result = await this.handBagService.listHandBags(
        conditions,
        validatedPagination,
      );
  
      return { success: true, ...result };
    }
  
    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async getHandBag(@Param('id') id: string) {
      try {
        const handBag = await this.handBagService.getHandBag(id);
        return { success: true, data: handBag };
      } catch (error) {
        if (error instanceof AppError && error.message === 'Not found') {
          throw AppError.from(ErrHandBagNotFound, 404);
        }
        throw error;
      }
    }
  
    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @HttpCode(HttpStatus.OK)
    async updateHandBag(
      @Request() req: ReqWithRequester,
      @Param('id') id: string,
      @Body() dto: HandBagUpdateDTO,
    ) {
      await this.handBagService.updateHandBag(req.requester, id, dto);
      return { success: true };
    }
  
    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @HttpCode(HttpStatus.OK)
    async deleteHandBag(
      @Request() req: ReqWithRequester,
      @Param('id') id: string,
    ) {
      await this.handBagService.deleteHandBag(req.requester, id);
      return { success: true };
    }
  
    // ========== BagColor Endpoints ==========
    @Post('colors')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @HttpCode(HttpStatus.CREATED)
    async createBagColor(
      @Request() req: ReqWithRequester,
      @Body() dto: BagColorCreateDTO,
    ) {
      const bagColorId = await this.handBagService.createBagColor(
        req.requester,
        dto,
      );
      return {
        success: true,
        data: { id: bagColorId },
      };
    }
  
    @Get('colors')
    @HttpCode(HttpStatus.OK)
    async listBagColors(
      @Query() conditions: BagColorCondDTO,
      @Query() pagination: PaginationDTO,
    ) {
      // Ensure pagination has default values
      const validatedPagination: PaginationDTO = {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        sortBy: pagination.sortBy || 'createdAt',
        sortOrder: pagination.sortOrder || 'desc',
      };
  
      const result = await this.handBagService.listBagColors(
        conditions,
        validatedPagination,
      );
  
      return { success: true, ...result };
    }
  
    @Get('colors/:id')
    @HttpCode(HttpStatus.OK)
    async getBagColor(@Param('id') id: string) {
      try {
        const bagColor = await this.handBagService.getBagColor(id);
        return { success: true, data: bagColor };
      } catch (error) {
        if (error instanceof AppError && error.message === 'Not found') {
          throw AppError.from(ErrBagColorNotFound, 404);
        }
        throw error;
      }
    }
  
    @Patch('colors/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @HttpCode(HttpStatus.OK)
    async updateBagColor(
      @Request() req: ReqWithRequester,
      @Param('id') id: string,
      @Body() dto: BagColorUpdateDTO,
    ) {
      await this.handBagService.updateBagColor(req.requester, id, dto);
      return { success: true };
    }
  
    @Delete('colors/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @HttpCode(HttpStatus.OK)
    async deleteBagColor(
      @Request() req: ReqWithRequester,
      @Param('id') id: string,
    ) {
      await this.handBagService.deleteBagColor(req.requester, id);
      return { success: true };
    }
  
    // ========== BagColorProcess Endpoints ==========
    @Post('processes')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @HttpCode(HttpStatus.CREATED)
    async createBagColorProcess(
      @Request() req: ReqWithRequester,
      @Body() dto: BagColorProcessCreateDTO,
    ) {
      const processId = await this.handBagService.createBagColorProcess(
        req.requester,
        dto,
      );
      return {
        success: true,
        data: { id: processId },
      };
    }
  
    @Get('processes')
    @HttpCode(HttpStatus.OK)
    async listBagColorProcesses(
      @Query() conditions: BagColorProcessCondDTO,
      @Query() pagination: PaginationDTO,
    ) {
      // Ensure pagination has default values
      const validatedPagination: PaginationDTO = {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        sortBy: pagination.sortBy || 'createdAt',
        sortOrder: pagination.sortOrder || 'desc',
      };
  
      const result = await this.handBagService.listBagColorProcesses(
        conditions,
        validatedPagination,
      );
  
      return { success: true, ...result };
    }
  
    @Get('processes/:id')
    @HttpCode(HttpStatus.OK)
    async getBagColorProcess(@Param('id') id: string) {
      try {
        const process = await this.handBagService.getBagColorProcess(id);
        return { success: true, data: process };
      } catch (error) {
        if (error instanceof AppError && error.message === 'Not found') {
          throw AppError.from(ErrBagColorProcessNotFound, 404);
        }
        throw error;
      }
    }
  
    @Patch('processes/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @HttpCode(HttpStatus.OK)
    async updateBagColorProcess(
      @Request() req: ReqWithRequester,
      @Param('id') id: string,
      @Body() dto: BagColorProcessUpdateDTO,
    ) {
      await this.handBagService.updateBagColorProcess(req.requester, id, dto);
      return { success: true };
    }
  
    @Delete('processes/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @HttpCode(HttpStatus.OK)
    async deleteBagColorProcess(
      @Request() req: ReqWithRequester,
      @Param('id') id: string,
    ) {
      await this.handBagService.deleteBagColorProcess(req.requester, id);
      return { success: true };
    }

// ------------------------------    // RPC controller cho internal service communication
    private getPaginationWithDefaults(partial: Partial<PaginationDTO>): PaginationDTO {
      return {
        page: partial.page || 1,
        limit: partial.limit || 10,
        sortBy: partial.sortBy || 'createdAt',
        sortOrder: partial.sortOrder || 'desc',
      };
    }
    
    @Get(':id/full-details')
    @HttpCode(HttpStatus.OK)
    async getHandBagFullDetails(@Param('id') id: string) {
      // 1. Lấy thông tin túi
      const handBag = await this.handBagService.getHandBag(id);
      
      // 2. Lấy danh sách màu của túi - sử dụng helper function
      const { data: colors } = await this.handBagService.listBagColors(
        { handBagId: id }, 
        this.getPaginationWithDefaults({ page: 1, limit: 100 })
      );
      
      // 3. Lấy thông tin công đoạn cho từng màu
      const colorsWithProcesses = await Promise.all(
        colors.map(async (color) => {
          const { data: processes } = await this.handBagService.listBagColorProcesses(
            { bagColorId: color.id },
            this.getPaginationWithDefaults({ page: 1, limit: 100 })
          );
          
          return {
            ...color,
            processes
          };
        })
      );
      
      return {
        success: true,
        data: {
          ...handBag,
          colors: colorsWithProcesses
        }
      };
    }
  }
  
  // RPC controller cho internal service communication
  @Controller('rpc/handbags')
  export class HandBagRpcHttpController {
    constructor(
      @Inject(HANDBAG_SERVICE) private readonly handBagService: IHandBagService,
    ) {}
  
    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async getHandBag(@Param('id') id: string) {
      try {
        const handBag = await this.handBagService.getHandBag(id);
        return { success: true, data: handBag };
      } catch (error) {
        if (error instanceof AppError && error.message === 'Not found') {
          throw AppError.from(ErrHandBagNotFound, 404);
        }
        throw error;
      }
    }
  
    @Get('colors/:id')
    @HttpCode(HttpStatus.OK)
    async getBagColor(@Param('id') id: string) {
      try {
        const bagColor = await this.handBagService.getBagColor(id);
        return { success: true, data: bagColor };
      } catch (error) {
        if (error instanceof AppError && error.message === 'Not found') {
          throw AppError.from(ErrBagColorNotFound, 404);
        }
        throw error;
      }
    }
  
    @Post('list-by-ids')
    @HttpCode(HttpStatus.OK)
    async listHandBagsByIds(@Body('ids') ids: string[]) {
      if (!ids || !ids.length) {
        return { success: true, data: [] };
      }
  
      const handBags = await Promise.all(
        ids.map((id) => this.handBagService.getHandBag(id).catch(() => null)),
      );
  
      return {
        success: true,
        data: handBags.filter((handBag) => handBag !== null),
      };
    }
  
    @Post('colors/list-by-ids')
    @HttpCode(HttpStatus.OK)
    async listBagColorsByIds(@Body('ids') ids: string[]) {
      if (!ids || !ids.length) {
        return { success: true, data: [] };
      }
  
      const bagColors = await Promise.all(
        ids.map((id) => this.handBagService.getBagColor(id).catch(() => null)),
      );
  
      return {
        success: true,
        data: bagColors.filter((bagColor) => bagColor !== null),
      };
    }




    
  }