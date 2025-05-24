import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class BodyPreservationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(BodyPreservationInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Log the request body before processing
    this.logger.debug(
      `Request body in interceptor: ${JSON.stringify(request.body)}`,
    );

    // Ensure the body is properly set on the context
    if (request.body && Object.keys(request.body).length > 0) {
      // The body is already populated, nothing to do
      return next.handle();
    } else if (request.rawBody) {
      // If rawBody exists, try to parse it
      try {
        request.body = JSON.parse(request.rawBody);
        this.logger.debug(`Parsed raw body: ${JSON.stringify(request.body)}`);
      } catch (error) {
        this.logger.error(`Error parsing rawBody: ${error.message}`);
      }
    }

    return next.handle();
  }
}
