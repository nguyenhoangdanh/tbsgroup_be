import { Injectable, ExecutionContext, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ITokenIntrospect } from '../interface';
import { TOKEN_INTROSPECTOR } from '../di-token';
import { RemoteAuthGuard } from './auth';

@Injectable()
export class SwaggerAuthGuard extends RemoteAuthGuard {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(TOKEN_INTROSPECTOR) introspector: ITokenIntrospect,
  ) {
    super(introspector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Check if the endpoint is marked as public
      const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
        context.getHandler(),
        context.getClass(),
      ]);

      if (isPublic) {
        return true;
      }

      const req = context.switchToHttp().getRequest();

      // Always allow access to Swagger documentation
      if (req.originalUrl?.includes('/api-docs')) {
        return true;
      }

      // Check if the request is from Swagger UI
      const fromSwagger = req.headers['x-from-swagger'] === 'true';

      // If it's a Swagger-initiated request with a valid Bearer token, proceed with normal auth
      const hasAuthHeader =
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer ');

      if (fromSwagger && !hasAuthHeader) {
        // For testing from Swagger UI without auth during development
        // You can make this configurable based on environment
        if (process.env.NODE_ENV !== 'production') {
          return true;
        }
      }

      // For all other requests, delegate to parent auth guard
      return await super.canActivate(context);
    } catch (error) {
      console.error('Error in SwaggerAuthGuard:', error);
      return false;
    }
  }
}
