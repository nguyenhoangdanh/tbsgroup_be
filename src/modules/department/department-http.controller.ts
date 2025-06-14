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
  Req,
  BadRequestException,
  UseInterceptors,
  Patch,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IDepartmentService } from './department.port';
import { DEPARTMENT_SERVICE } from './department.di-token';
import {
  CreateDepartmentDto,
  FilterDepartmentDto,
  UpdateDepartmentDto,
  createDepartmentSchema,
  updateDepartmentSchema,
  filterDepartmentSchema,
} from './department.dto';
import { Department } from './department.model';
import { BodyPreservationInterceptor } from 'src/common/interceptors/body-preservation.interceptor';
import { Request } from 'express';

@ApiTags('Departments')
@Controller('departments')
export class DepartmentHttpController {
  private readonly logger = new Logger(DepartmentHttpController.name);

  constructor(
    @Inject(DEPARTMENT_SERVICE)
    private departmentService: IDepartmentService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo mới phòng ban' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tạo mới phòng ban thành công',
  })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(BodyPreservationInterceptor)
  async create(
    @Req() req: Request,
    @Body() data: CreateDepartmentDto,
  ): Promise<Department> {
    // Get the raw request body
    const bodyData = req.body || {};
    this.logger.debug(
      `Request body in controller: ${JSON.stringify(bodyData)}`,
    );

    try {
      // Manually validate with Zod
      const validatedData = createDepartmentSchema.parse(bodyData);
      this.logger.debug(`Validated data: ${JSON.stringify(validatedData)}`);

      // Pass validated data to service
      return this.departmentService.create({
        ...validatedData,
        code: validatedData.code || '',
      } as CreateDepartmentDto);
    } catch (error) {
      this.logger.error(
        `Validation error in controller: ${JSON.stringify(error)}`,
      );

      // Format validation errors
      if (error.errors) {
        const formattedErrors = error.errors.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        throw new BadRequestException({
          message: 'Validation failed',
          errors: formattedErrors,
        });
      }

      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách phòng ban' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Danh sách phòng ban' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() filter: FilterDepartmentDto,
    @Req() req: Request,
  ): Promise<Department[]> {
    // Log the raw query parameters from the request
    this.logger.log(`Raw query parameters: ${JSON.stringify(req.query)}`);
    this.logger.log(`Received filter object: ${JSON.stringify(filter)}`);

    try {
      // Create a new filter object that combines the request query and the parsed DTO
      const combinedFilter = {
        ...req.query,
        ...filter,
      };

      this.logger.log(
        `Combined filter before validation: ${JSON.stringify(combinedFilter)}`,
      );

      // Manually validate with Zod
      const validatedFilter = filterDepartmentSchema.parse(combinedFilter);

      this.logger.log(
        `Validated filter after Zod processing: ${JSON.stringify(validatedFilter)}`,
      );

      return this.departmentService.findAll(validatedFilter);
    } catch (error) {
      this.logger.error(
        `Validation error in findAll: ${JSON.stringify(error)}`,
      );

      // Format validation errors
      if (error.errors) {
        const formattedErrors = error.errors.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        throw new BadRequestException({
          message: 'Validation failed',
          errors: formattedErrors,
        });
      }

      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin phòng ban theo ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Thông tin phòng ban' })
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string): Promise<Department> {
    this.logger.log(`Lấy thông tin phòng ban với ID: ${id}`);
    return this.departmentService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin phòng ban' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cập nhật phòng ban thành công',
  })
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(BodyPreservationInterceptor)
  async update(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() data: UpdateDepartmentDto,
  ): Promise<Department> {
    // Get the raw request body
    const bodyData = req.body || {};
    this.logger.debug(`Update request body: ${JSON.stringify(bodyData)}`);

    try {
      // Manually validate with Zod
      const validatedData = updateDepartmentSchema.parse(bodyData);
      this.logger.debug(
        `Validated update data: ${JSON.stringify(validatedData)}`,
      );

      // Pass validated data to service
      return this.departmentService.update(id, validatedData);
    } catch (error) {
      this.logger.error(`Validation error in update: ${JSON.stringify(error)}`);

      // Format validation errors
      if (error.errors) {
        const formattedErrors = error.errors.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        throw new BadRequestException({
          message: 'Validation failed',
          errors: formattedErrors,
        });
      }

      throw error;
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa phòng ban' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Xóa phòng ban thành công',
  })
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string): Promise<Department> {
    this.logger.log(`Xóa phòng ban với ID: ${id}`);
    return this.departmentService.delete(id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Lấy thông tin phòng ban theo mã' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Thông tin phòng ban' })
  @HttpCode(HttpStatus.OK)
  async findByCode(@Param('code') code: string): Promise<Department | null> {
    this.logger.log(`Lấy thông tin phòng ban với mã: ${code}`);
    return this.departmentService.findByCode(code);
  }

  @Get(':id/hierarchy')
  @ApiOperation({ summary: 'Lấy phân cấp phòng ban' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Phân cấp phòng ban' })
  @HttpCode(HttpStatus.OK)
  async getDepartmentHierarchy(@Param('id') id: string): Promise<any> {
    this.logger.log(`Lấy phân cấp phòng ban với ID: ${id}`);
    return this.departmentService.getDepartmentHierarchy(id);
  }

  @Get('tree/organization')
  @ApiOperation({ summary: 'Lấy cây tổ chức' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cây tổ chức phòng ban' })
  @HttpCode(HttpStatus.OK)
  async getOrganizationTree(): Promise<any> {
    this.logger.log('Lấy cây tổ chức phòng ban');
    return this.departmentService.getOrganizationTree();
  }
}
