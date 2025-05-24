# Hướng dẫn sử dụng Zod Validation trong NestJS

Sau khi loại bỏ thư viện `@anatine/zod-plugins` và thay thế bằng giải pháp tùy chỉnh, đây là hướng dẫn chi tiết cách sử dụng các tính năng mới để validate dữ liệu với Zod.

## Cách thức sử dụng

### 1. Định nghĩa Zod Schema

```typescript
// user.schema.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  age: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
```

### 2. Tạo DTO Class cho Swagger

```typescript
// create-user.dto.ts
import { createUserSchema } from './user.schema';
import { createDtoFromZodSchema } from '../common/transformers/custom-zod-dto.transformer';

export class CreateUserDto {
  username: string;
  email: string;
  password: string;
  age?: number;
  isActive: boolean;
}

// Áp dụng thông tin schema vào DTO để tạo Swagger docs
createDtoFromZodSchema(createUserSchema, CreateUserDto);
```

### 3. Sử dụng Decorator Validation trong Controller

```typescript
// user.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { UseZodValidation } from '../common/decorators/zod-validation.decorator';
import { createUserSchema, CreateUserDto } from './user.schema';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @UseZodValidation(createUserSchema)
  async createUser(@Body() createUserDto: CreateUserDto) {
    // createUserDto đã được validate bởi createUserSchema
    return this.userService.create(createUserDto);
  }
}
```

## Cách thức hoạt động

1. `@UseZodValidation(schema)` áp dụng `EnhancedZodValidationPipe` cho handler method
2. Pipe validate request data với Zod schema và tự động chuyển đổi kiểu dữ liệu
3. Nếu là request từ Swagger UI, pipe sẽ tiền xử lý dữ liệu trước khi validate
4. Nếu validation fail, một BadRequestException được throw với thông tin lỗi chi tiết
5. `createDtoFromZodSchema` tự động áp dụng các ApiProperty decorators vào DTO class

## Xử lý Lỗi

Lỗi Zod sẽ được bắt và định dạng bởi `ZodExceptionFilter` toàn cục đã được đăng ký.

## Ưu điểm So Với @anatine/zod-plugins

1. Xử lý dữ liệu từ Swagger UI tốt hơn
2. Kiểm soát hoàn toàn quá trình validate
3. Dễ dàng mở rộng và tùy chỉnh
4. Không phụ thuộc vào thư viện bên ngoài
5. Cung cấp thông tin lỗi chi tiết và có thể tùy chỉnh