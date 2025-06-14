import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as express from 'express';

@Injectable()
export class BodyCaptureMiddleware implements NestMiddleware {
  private readonly logger = new Logger(BodyCaptureMiddleware.name);
  private jsonParser = express.json({ limit: '10mb' });

  use(req: Request, res: Response, next: NextFunction) {
    // Store the original req.body before any middleware might modify it
    const originalBody = { ...req.body };

    // Create a custom property descriptor for req.body
    // This ensures the body property can't be completely replaced, only its properties modified
    Object.defineProperty(req, 'body', {
      configurable: true,
      enumerable: true,
      get: function () {
        return originalBody;
      },
      set: function (newValue) {
        // When any middleware tries to set req.body = {}, transfer all properties
        // from the original body object to the new body object
        if (newValue && typeof newValue === 'object') {
          Object.assign(newValue, originalBody);
        }
        return newValue;
      },
    });

    // Process the request
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      this.jsonParser(req, res, (err: any) => {
        if (err) {
          this.logger.error(`Error parsing JSON body: ${err.message}`);
          res.status(400).json({
            statusCode: 400,
            message: 'Invalid JSON in request body',
            error: err.message,
          });
          return;
        }

        // Log body after successful parsing
        this.logger.debug(`Captured request body: ${JSON.stringify(req.body)}`);

        // Store the parsed body in a custom property that won't be overwritten
        (req as any)._parsedBody = { ...req.body };

        next();
      });
    } else {
      next();
    }
  }
}
