import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ErrTokenInvalid } from '../app-error';
import { TOKEN_INTROSPECTOR } from '../di-token';
import { ITokenIntrospect } from '../interface';

@Injectable()
export class RemoteAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_INTROSPECTOR) private readonly introspector: ITokenIntrospect,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException('Bạn cần đăng nhập để truy cập');
    }

    try {
      const { payload, error, isOk } =
        await this.introspector.introspect(token);

      if (!isOk || !payload) {
        throw ErrTokenInvalid.withLog('Token parse failed').withLog(
          error?.message || 'Invalid token',
        );
      }

      request['requester'] = payload;
    } catch (error) {
      console.error('Token introspect error:', error);
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }

    return true;
  }
}

// Helper để lấy token từ request
function extractTokenFromRequest(request: Request): string | undefined {
  // Ưu tiên lấy token từ cookie
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
    @Inject(TOKEN_INTROSPECTOR) private readonly introspector: ITokenIntrospect,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = extractTokenFromRequest(request);

    if (!token) {
      return true; // Cho phép truy cập nếu không có token
    }

    try {
      const { payload, error, isOk } =
        await this.introspector.introspect(token);

      if (!isOk) {
        console.error('Token introspect error:', error);
        return true; // Cho phép truy cập nếu token không hợp lệ
      }

      request['requester'] = payload;
    } catch (error) {
      console.error('Token introspect error:', error);
      return true; // Cho phép truy cập nếu có lỗi
    }

    return true;
  }
}
