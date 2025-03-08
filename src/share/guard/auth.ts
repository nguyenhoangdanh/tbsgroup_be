import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ErrTokenInvalid } from '../app-error';
import { TOKEN_INTROSPECTOR } from '../di-token';
import { ITokenIntrospect } from '../interface';

@Injectable()
export class RemoteAuthGuard implements CanActivate {
  private readonly logger = new Logger(RemoteAuthGuard.name);
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
      // Kiểm tra blacklist trước với xử lý lỗi
      try {
        const isBlacklisted = await this.introspector.isTokenBlacklisted(token);
        if (isBlacklisted) {
          this.logger.debug('Token is blacklisted');
          throw new UnauthorizedException(
            'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
          );
        }
      } catch (blacklistError) {
        if (blacklistError instanceof UnauthorizedException) {
          throw blacklistError;
        }
        this.logger.error(
          `Error checking token blacklist: ${blacklistError.message}`,
          blacklistError.stack,
        );
        // Tiếp tục với introspect nếu lỗi blacklist không phải UnauthorizedException
      }

      // Introspect token
      const { payload, error, isOk } =
        await this.introspector.introspect(token);

      if (!isOk || !payload) {
        const errorMsg = error?.message || 'Invalid token';
        this.logger.debug(`Token introspection failed: ${errorMsg}`);
        throw ErrTokenInvalid.withLog('Token parse failed').withLog(errorMsg);
      }

      // Đặt payload vào request
      request['requester'] = payload;

      // Log thành công (debug level)
      this.logger.debug(
        `Token introspection successful for user: ${payload.sub}`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Token introspection error: ${error.message}`,
        error.stack,
      );

      // Xử lý lỗi cụ thể hơn
      if (error instanceof UnauthorizedException) {
        throw error; // Giữ nguyên lỗi gốc nếu đã là UnauthorizedException
      }

      // Khác biệt thông báo lỗi dựa trên loại lỗi
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException(
          'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
        );
      }

      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
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
