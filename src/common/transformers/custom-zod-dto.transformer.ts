import { z } from 'zod';
import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';

/**
 * Trích xuất thông tin từ Zod schema để sử dụng cho ApiProperty decorator
 */
export function extractApiPropertyOptionsFromZod(
  zodSchema: z.ZodTypeAny,
): ApiPropertyOptions {
  const options: ApiPropertyOptions = {
    required: true,
  };

  // Xác định kiểu dữ liệu cơ bản
  if (zodSchema instanceof z.ZodString) {
    options.type = 'string';
  } else if (zodSchema instanceof z.ZodNumber) {
    options.type = 'number';
  } else if (zodSchema instanceof z.ZodBoolean) {
    options.type = 'boolean';
  } else if (zodSchema instanceof z.ZodDate) {
    options.type = 'string';
    options.format = 'date-time';
  } else if (zodSchema instanceof z.ZodArray) {
    options.type = 'array';
    const itemType = extractApiPropertyOptionsFromZod(zodSchema.element);

    // Fix for the items type
    options.items = {};
    if (itemType.type === 'string') {
      options.items.type = 'string';
    } else if (itemType.type === 'number') {
      options.items.type = 'number';
    } else if (itemType.type === 'boolean') {
      options.items.type = 'boolean';
    } else if (itemType.type === 'string' && itemType.format === 'date-time') {
      options.items.type = 'string';
      options.items.format = 'date-time';
    } else {
      options.items.type = 'object';
    }

    // Add enum to items if present
    if (itemType.enum && Array.isArray(itemType.enum)) {
      options.items.enum = itemType.enum;
    }
  } else if (zodSchema instanceof z.ZodEnum) {
    options.enum = Object.values(zodSchema._def.values);
    options.type = 'string';
  } else if (zodSchema instanceof z.ZodNativeEnum) {
    options.enum = Object.values(zodSchema._def.values);
    options.type = 'string';
  } else if (zodSchema instanceof z.ZodObject) {
    options.type = 'object';
  }

  // Xử lý các trường hợp đặc biệt
  if (zodSchema instanceof z.ZodOptional) {
    options.required = false;
    const innerOptions = extractApiPropertyOptionsFromZod(zodSchema.unwrap());
    return { ...innerOptions, required: false };
  }

  if (zodSchema instanceof z.ZodNullable) {
    options.nullable = true;
    const innerOptions = extractApiPropertyOptionsFromZod(zodSchema.unwrap());
    return { ...innerOptions, nullable: true };
  }

  if (zodSchema instanceof z.ZodDefault) {
    options.default = zodSchema._def.defaultValue();
    const innerOptions = extractApiPropertyOptionsFromZod(
      zodSchema._def.innerType,
    );
    return { ...innerOptions, default: options.default };
  }

  // Xử lý mô tả nếu có
  if ('description' in zodSchema._def && zodSchema._def.description) {
    options.description = zodSchema._def.description;
  }

  return options;
}

/**
 * Áp dụng các decorators ApiProperty từ Zod schema vào class DTO
 */
export function createDtoFromZodSchema(
  schema: z.ZodObject<any>,
  dtoClass: any,
): void {
  const shape = schema.shape;

  Object.keys(shape).forEach((key) => {
    const propertySchema = shape[key];
    const apiPropertyOptions = extractApiPropertyOptionsFromZod(propertySchema);

    // Áp dụng ApiProperty decorator vào property của DTO class
    ApiProperty(apiPropertyOptions)(dtoClass.prototype, key);
  });
}
