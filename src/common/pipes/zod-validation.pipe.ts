import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  Logger,
  PipeTransform,
} from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  private readonly logger = new Logger(ZodValidationPipe.name);

  constructor(private schema: ZodSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    try {
      // Debug logs to see what's coming into the validation pipe
      this.logger.debug(`Validation input value: ${JSON.stringify(value)}`);
      this.logger.debug(
        `Metadata type: ${metadata.type}, data: ${JSON.stringify(metadata)}`,
      );

      // For body validation, check if we have an empty value but _parsedBody exists
      if (
        metadata.type === 'body' &&
        (!value || Object.keys(value).length === 0)
      ) {
        // Access the current request via other means
        const currentReq = this.getRequestFromExecutionContext();

        if (currentReq) {
          // Check if the request has our special _parsedBody property
          if (
            currentReq._parsedBody &&
            Object.keys(currentReq._parsedBody).length > 0
          ) {
            this.logger.debug(
              `Using _parsedBody: ${JSON.stringify(currentReq._parsedBody)}`,
            );
            value = currentReq._parsedBody;
          }
          // Or use the regular body if it has content
          else if (currentReq.body && Object.keys(currentReq.body).length > 0) {
            this.logger.debug(
              `Using regular body: ${JSON.stringify(currentReq.body)}`,
            );
            value = currentReq.body;
          } else {
            this.logger.debug('Request has no usable body');
          }
        }
      }

      // Nếu không có dữ liệu đầu vào (value), bỏ qua validation
      if (value === undefined) {
        return undefined;
      }

      // Thực hiện parse dữ liệu với schema Zod
      const result = this.schema.parse(value);
      this.logger.debug(
        `Validation successful, result: ${JSON.stringify(result)}`,
      );
      return result;
    } catch (error) {
      // Log validation errors for debugging
      this.logger.error(`Validation error: ${JSON.stringify(error)}`);

      // Format lỗi để trả về client một thông báo cụ thể
      const formattedErrors = this.formatZodError(error);
      throw new BadRequestException({
        message: 'Validation failed',
        errors: formattedErrors,
      });
    }
  }

  private formatZodError(error: any): any {
    if (!error.errors) {
      return [{ message: 'Unknown validation error' }];
    }

    return error.errors.map((err: any) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
  }

  // Helper method to get the current request object using alternative methods
  private getRequestFromExecutionContext() {
    try {
      // Try to access the request from globals (if middleware stored it there)
      const nodeGlobals = global as any;
      if (nodeGlobals.currentRequest) {
        return nodeGlobals.currentRequest;
      }

      // If using AsyncLocalStorage (Node.js 12.17.0+), you could access it here
      // This depends on your setup though

      // As a fallback, just look for a _parsedBody in the global scope
      // for debugging purposes
      for (const key in nodeGlobals) {
        if (
          nodeGlobals[key] &&
          typeof nodeGlobals[key] === 'object' &&
          nodeGlobals[key]._parsedBody
        ) {
          return nodeGlobals[key];
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Error getting current request: ${error.message}`);
      return null;
    }
  }
}
