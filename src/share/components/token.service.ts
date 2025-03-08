import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenIntrospectResult, TokenPayload } from 'src/share';
import { randomBytes } from 'crypto';
import { Redis } from 'ioredis';
import { ITokenService } from '../../modules/user/user.port';
import { REDIS_CLIENT } from 'src/common/di-tokens';

@Injectable()
export class TokenService implements ITokenService {
  private readonly TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';
  private readonly DEFAULT_EXPIRY = '1d'; // 1 day default token expiry

  constructor(
    private readonly jwtService: JwtService,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
  ) {}

  async generateToken(
    payload: TokenPayload,
    expiresIn: string = this.DEFAULT_EXPIRY,
  ): Promise<string> {
    return this.jwtService.signAsync(payload, { expiresIn });
  }

  async generateResetToken(): Promise<string> {
    // Generate a random token for password reset (32 bytes = 64 hex chars)
    return randomBytes(32).toString('hex');
  }

  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      // Kiểm tra xem token có trong blacklist không
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        return null;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token);
      return payload;
    } catch (error) {
      return null;
    }
  }

  decodeToken(token: string): TokenPayload | null {
    try {
      // Decode token mà không verify (để lấy thông tin từ token hết hạn)
      return this.jwtService.decode(token) as TokenPayload;
    } catch (error) {
      return null;
    }
  }

  getExpirationTime(token: string): number {
    try {
      const decoded = this.jwtService.decode(token) as { exp?: number };
      if (!decoded || !decoded.exp) {
        return 0;
      }

      const expiryTimestamp = decoded.exp * 1000; // Convert to milliseconds
      const currentTimestamp = Date.now();

      return Math.max(
        0,
        Math.floor((expiryTimestamp - currentTimestamp) / 1000),
      );
    } catch (error) {
      return 0;
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklistKey = `${this.TOKEN_BLACKLIST_PREFIX}${token}`;
    const exists = await this.redisClient.exists(blacklistKey);
    return exists === 1;
  }

  async blacklistToken(token: string, expiresIn: number): Promise<void> {
    const blacklistKey = `${this.TOKEN_BLACKLIST_PREFIX}${token}`;
    await this.redisClient.set(blacklistKey, '1', 'EX', expiresIn);
  }

  // Trong token.service.ts
  async introspect(token: string): Promise<TokenIntrospectResult> {
    try {
      // Kiểm tra blacklist
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        return {
          payload: null,
          error: new Error('Token đã bị vô hiệu hóa'),
          isOk: false,
        };
      }

      // Verify token
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token);
      return { payload, isOk: true };
    } catch (error) {
      return {
        payload: null,
        error,
        isOk: false,
      };
    }
  }
}
