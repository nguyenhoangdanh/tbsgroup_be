import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';

function extractTokenFromRequest(request: Request): string | undefined {
  // Check both cookie and Authorization header
  const cookieToken = request.cookies?.accessToken;
  const authHeader = request.headers.authorization;
  const headerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : undefined;

  // Return the first available token
  return cookieToken || headerToken;
}
// src/common/exceptions/auth-filter.exception.ts
@Catch(UnauthorizedException)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Check if this is a Swagger UI request
    const isSwaggerRequest = request.headers['referer']?.includes('api-docs');

    // Use the existing function to extract token
    const token = extractTokenFromRequest(request);

    // Customize message based on context
    const message = !token
      ? 'Authentication required'
      : 'Invalid or expired token';

    response.status(401).json({
      statusCode: 401,
      success: false,
      message: message,
      timestamp: new Date().toISOString(),
    });
  }
}
