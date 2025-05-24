import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // WebSocket-specific context
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException('Authentication token not provided');
    }

    try {
      const payload = this.jwtService.verify(token);

      // Attach the decoded token to the socket object for later use
      client.data.user = payload;

      return true;
    } catch (error) {
      this.logger.error('Token verification failed', error);
      throw new WsException('Invalid authentication token');
    }
  }

  private extractToken(client: Socket): string | null {
    // Try to get the token from handshake auth
    if (client.handshake?.auth?.token) {
      return client.handshake.auth.token;
    }

    // Alternatively, try to get from handshake headers (Authorization: Bearer [token])
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.split(' ')[0] === 'Bearer') {
      return authHeader.split(' ')[1];
    }

    return null;
  }
}
