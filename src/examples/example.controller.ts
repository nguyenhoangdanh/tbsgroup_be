import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { exampleItemSchema, ExampleItemDto } from './example.schema';
import { UseZodValidation } from '../common/decorators/zod-validation.decorator';
import { ExampleItemDto as ExampleItemSwaggerDto } from './example.dto';

@ApiTags('examples')
@Controller('examples')
export class ExampleController {
  private items: ExampleItemDto[] = [];

  @Post()
  @ApiOperation({ summary: 'Tạo một item mới' })
  @ApiResponse({
    status: 201,
    description: 'Item đã được tạo thành công',
    type: ExampleItemSwaggerDto,
  })
  @UseZodValidation(exampleItemSchema)
  create(@Body() createItemDto: ExampleItemDto) {
    const newItem = {
      ...createItemDto,
      createdAt: createItemDto.createdAt || new Date(),
    };

    this.items.push(newItem);
    return newItem;
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả items' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách items',
    type: [ExampleItemSwaggerDto],
  })
  findAll() {
    return this.items;
  }

  @Get(':name')
  @ApiOperation({ summary: 'Lấy thông tin một item theo tên' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin item',
    type: ExampleItemSwaggerDto,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy item' })
  findOne(@Param('name') name: string) {
    const item = this.items.find((item) => item.name === name);
    if (!item) {
      return { error: 'Item không tồn tại' };
    }
    return item;
  }

  @Put(':name')
  @ApiOperation({ summary: 'Cập nhật thông tin một item' })
  @ApiResponse({
    status: 200,
    description: 'Item đã được cập nhật',
    type: ExampleItemSwaggerDto,
  })
  @UseZodValidation(exampleItemSchema)
  update(@Param('name') name: string, @Body() updateItemDto: ExampleItemDto) {
    const index = this.items.findIndex((item) => item.name === name);
    if (index === -1) {
      return { error: 'Item không tồn tại' };
    }

    this.items[index] = {
      ...updateItemDto,
      createdAt: this.items[index].createdAt,
    };

    return this.items[index];
  }

  @Delete(':name')
  @ApiOperation({ summary: 'Xóa một item' })
  @ApiResponse({ status: 200, description: 'Item đã được xóa' })
  remove(@Param('name') name: string) {
    const index = this.items.findIndex((item) => item.name === name);
    if (index === -1) {
      return { error: 'Item không tồn tại' };
    }

    this.items.splice(index, 1);
    return { message: 'Item đã được xóa thành công' };
  }
}
