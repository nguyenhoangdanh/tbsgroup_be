import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as express from 'express';

@Injectable()
export class BodyParserMiddleware implements NestMiddleware {
  private readonly logger = new Logger(BodyParserMiddleware.name);
  private jsonParser = express.json({ limit: '10mb' });

  use(req: Request, res: Response, next: NextFunction) {
    // Kiểm tra xem request có phải là JSON request
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      // Đối với các request có content-type là application/json, sử dụng parser tùy chỉnh
      this.jsonParser(req, res, (err: any) => {
        if (err) {
          this.logger.error(`Lỗi khi parse JSON body: ${err.message}`);
          res.status(400).json({
            statusCode: 400,
            message: 'Invalid JSON in request body',
            error: err.message,
          });
          return;
        }

        // Log body sau khi parse thành công để debug
        this.logger.debug(
          `Request body sau khi parse: ${JSON.stringify(req.body)}`,
        );

        // Xử lý tiếp request
        next();
      });
    } else {
      // Nếu không phải JSON request, tiếp tục xử lý
      next();
    }
  }
}
