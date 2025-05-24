import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class EnhancedZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  async transform(value: any, metadata: ArgumentMetadata) {
    if (value === undefined) {
      return undefined;
    }

    try {
      // Xử lý dữ liệu đầu vào từ Swagger
      if (this.isFromSwagger(value)) {
        value = this.preprocessSwaggerData(value);
      }

      // Validate dữ liệu với Zod schema
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: this.formatZodError(error),
        });
      }

      throw new BadRequestException('Validation failed');
    }
  }

  private isFromSwagger(value: any): boolean {
    // Kiểm tra nếu request đến từ Swagger hoặc có các đặc điểm của dữ liệu từ Swagger
    if (value && (value['x-from-swagger'] || value['x-swagger-ui'])) {
      return true;
    }
    return false;
  }

  private preprocessSwaggerData(data: any): any {
    // Xử lý dữ liệu từ Swagger UI nếu cần
    // Ví dụ: chuyển đổi string thành boolean, number,... nếu cần
    const processed = { ...data };

    // Loại bỏ các trường đặc biệt của Swagger
    delete processed['x-from-swagger'];
    delete processed['x-swagger-ui'];

    // Chuyển đổi kiểu dữ liệu nếu cần
    Object.keys(processed).forEach((key) => {
      const value = processed[key];

      // Xử lý chuỗi "null" thành null
      if (value === 'null') {
        processed[key] = null;
      }

      // Xử lý chuỗi "true"/"false" thành boolean
      if (value === 'true') {
        processed[key] = true;
      } else if (value === 'false') {
        processed[key] = false;
      }

      // Xử lý chuỗi số thành số
      if (
        typeof value === 'string' &&
        !isNaN(Number(value)) &&
        value.trim() !== ''
      ) {
        processed[key] = Number(value);
      }
    });

    return processed;
  }

  private formatZodError(error: any): any[] {
    if (!error.errors) {
      return [{ message: error.message || 'Unknown validation error' }];
    }

    return error.errors.map((err: any) => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));
  }
}
