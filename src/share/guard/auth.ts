import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ErrTokenInvalid } from '../app-error';
import { REMOTE_AUTH_GUARD, TOKEN_INTROSPECTOR } from '../di-token';
import { ITokenIntrospect } from '../interface';

@Injectable()
export class RemoteAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_INTROSPECTOR) private readonly introspector: ITokenIntrospect,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // const token = extractTokenFromHeader(request);
    const token = extractTokenFromRequest(request); // 🔄 Dùng hàm mới

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const { payload, error, isOk } =
        await this.introspector.introspect(token);

      if (!isOk) {
        throw ErrTokenInvalid.withLog('Token parse failed').withLog(
          error!.message,
        );
      }

      request['requester'] = payload;
    } catch (error) {
      console.error('Token introspect error:', error);
      throw new UnauthorizedException();
    }

    return true;
  }
}

function extractTokenFromHeader(request: Request): string | undefined {
  const [type, token] = request.headers.authorization?.split(' ') ?? [];
  return type === 'Bearer' ? token : undefined;
}

// ✅ Hàm mới: lấy token từ Cookie hoặc Authorization Header
function extractTokenFromRequest(request: Request): string | undefined {
  // Ưu tiên lấy token từ cookie trước
  if (request.cookies?.accessToken) {
    return request.cookies.accessToken;
  }

  // Nếu không có trong cookie, lấy từ Authorization header
  const [type, token] = request.headers.authorization?.split(' ') ?? [];
  return type === 'Bearer' ? token : undefined;
}

@Injectable()
export class RemoteAuthGuardOptional implements CanActivate {
  constructor(
    @Inject(REMOTE_AUTH_GUARD) private readonly authGuard: RemoteAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // const token = extractTokenFromHeader(request);
    const token = extractTokenFromRequest(request);

    if (!token) {
      return true;
    }

    return this.authGuard.canActivate(context);
  }
}
