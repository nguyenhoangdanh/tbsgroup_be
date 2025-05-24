import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Requester, UserRole } from '../interface';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const requester = request['requester'] as Requester;

    // Better error handling for missing requester
    if (!requester) {
      this.logger.error(
        'No requester found in request. Check auth middleware.',
      );
      throw new ForbiddenException(
        'Authentication information is missing or invalid',
      );
    }

    // Handle case where role is undefined
    if (requester.role === undefined) {
      this.logger.error(
        `User role is undefined for user ${requester.sub}. Check token payload extraction.`,
      );
      throw new ForbiddenException('User role information is missing');
    }

    this.logger.debug(
      `Checking if user role "${requester.role}" is in required roles: [${requiredRoles.join(', ')}]`,
    );

    // Now check permissions
    if (requester.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    const hasRequiredRole = requiredRoles.some(
      (role) => requester.role === role,
    );

    if (!hasRequiredRole) {
      this.logger.warn(
        `Access denied: User ${requester.sub} with role ${requester.role} tried to access a resource requiring roles [${requiredRoles.join(', ')}]`,
      );
      throw new ForbiddenException(
        `You do not have the required role to access this resource. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
