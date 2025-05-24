import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { TOKEN_INTROSPECTOR } from '../di-token';
import { ITokenIntrospect, UserRole } from '../interface';
import { extractTokenFromRequest } from 'src/common/utils/token-extractor';

@Injectable()
export class RemoteAuthGuard implements CanActivate {
  private readonly logger = new Logger(RemoteAuthGuard.name);
  constructor(
    @Inject(TOKEN_INTROSPECTOR) private readonly introspector: ITokenIntrospect,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const token = extractTokenFromRequest(request);
    if (!token) {
      throw new UnauthorizedException('Bạn cần đăng nhập để truy cập');
    }

    try {
      // Verify token validity
      const { payload, isOk } = await this.introspector.introspect(token);

      if (!isOk || !payload) {
        // Only if token is invalid, check if it's blacklisted
        const isBlacklisted = await this.introspector.isTokenBlacklisted(token);
        if (isBlacklisted) {
          // Help the client by clearing any cookies
          response.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          });
          throw new UnauthorizedException(
            'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
          );
        }
        throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
      }

      // Log token payload for debugging
      this.logger.debug(`Token payload: ${JSON.stringify(payload)}`);

      // Check if role is missing in the payload
      if (!payload.role) {
        this.logger.warn(`User ${payload.sub} has no role in token payload`);
      }

      // Set user info in request with fallback for role
      request['requester'] = {
        sub: payload.sub,
        role: payload.role || UserRole.WORKER, // Provide a default role if undefined
        roleId: payload.roleId,
        factoryId: payload.factoryId,
        lineId: payload.lineId,
        teamId: payload.teamId,
        groupId: payload.groupId,
      };

      this.logger.debug(
        `Requester set: ${JSON.stringify(request['requester'])}`,
      );
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Authentication error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }
}

@Injectable()
export class RemoteAuthGuardOptional implements CanActivate {
  private readonly logger = new Logger(RemoteAuthGuardOptional.name);

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

      if (!isOk) {
        this.logger.error('Token introspect error:', error);
        return true; // Cho phép truy cập nếu token không hợp lệ
      }

      // Check if role is missing in the payload
      if (payload && !payload.role) {
        this.logger.warn(`User ${payload.sub} has no role in token payload`);
        // Add a default role to prevent undefined role errors
        payload.role = UserRole.WORKER;
      }

      request['requester'] = payload;
    } catch (error) {
      this.logger.error('Token introspect error:', error);
      return true; // Cho phép truy cập nếu có lỗi
    }

    return true;
  }
}
