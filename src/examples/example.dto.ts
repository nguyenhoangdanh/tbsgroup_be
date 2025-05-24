import { exampleItemSchema } from './example.schema';
import { createDtoFromZodSchema } from '../common/transformers/custom-zod-dto.transformer';

/**
 * DTO class cho Swagger documentation
 */
export class ExampleItemDto {
  name: string;
  description?: string;
  quantity: number;
  price: number;
  tags: string[];
  status: 'active' | 'inactive' | 'pending';
  createdAt?: Date;
}

// Áp dụng thông tin từ Zod schema vào DTO class để tạo Swagger docs
createDtoFromZodSchema(exampleItemSchema, ExampleItemDto);
