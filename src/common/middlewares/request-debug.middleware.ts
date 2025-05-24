import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestDebugMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestDebugMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Chi tiết request để debug
    if (req.method === 'POST' || req.method === 'PUT') {
      this.logger.debug(
        `[${req.method}] ${req.path} - Headers: ${JSON.stringify(req.headers)}`,
      );
      this.logger.debug(
        `[${req.method}] ${req.path} - Body: ${JSON.stringify(req.body)}`,
      );

      // Kiểm tra content-type
      if (
        !req.headers['content-type'] ||
        !req.headers['content-type'].includes('application/json')
      ) {
        this.logger.warn(
          `Request không có Content-Type đúng: ${req.headers['content-type']}`,
        );
      }

      // Kiểm tra body rỗng
      if (!req.body || Object.keys(req.body).length === 0) {
        this.logger.warn('Request body trống hoặc không hợp lệ');
      }
    }

    next();
  }
}
