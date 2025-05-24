import { UsePipes, applyDecorators } from '@nestjs/common';
import { ZodObject } from 'zod';
import { EnhancedZodValidationPipe } from '../pipes/enhanced-zod-validation.pipe';

/**
 * Decorator kết hợp để áp dụng ZodValidation vào một route controller
 * @param schema Zod schema dùng để validate dữ liệu
 * @returns Decorator đã kết hợp
 */
export function UseZodValidation(schema: ZodObject<any>) {
  return applyDecorators(UsePipes(new EnhancedZodValidationPipe(schema)));
}
