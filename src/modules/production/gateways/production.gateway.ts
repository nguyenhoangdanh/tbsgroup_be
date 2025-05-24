import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from 'src/auth/guards/ws-jwt.guard';

@WebSocketGateway({
  namespace: 'production',
  cors: {
    origin: '*',
  },
})
export class ProductionGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  private readonly connectedClients: Map<
    string,
    { userId: string; rooms: string[] }
  > = new Map();

  afterInit(server: Server) {
    console.log('Production WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Verify and decode the token
      // This would use a JWT guard in a real application
      // For now, we'll assume the userId is extracted from the token
      const userId = client.handshake.auth.token;

      if (!userId) {
        client.disconnect();
        return;
      }

      this.connectedClients.set(client.id, {
        userId,
        rooms: [],
      });

      console.log(`Client connected: ${client.id}, User: ${userId}`);
    } catch (error) {
      console.error(`Error handling connection: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    console.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinFactory')
  async handleJoinFactory(
    @ConnectedSocket() client: Socket,
    @MessageBody() factoryId: string,
  ) {
    const clientData = this.connectedClients.get(client.id);

    if (!clientData) return;

    const roomName = `factory:${factoryId}`;
    await client.join(roomName);

    // Update tracked rooms for this client
    clientData.rooms.push(roomName);
    this.connectedClients.set(client.id, clientData);

    console.log(`Client ${client.id} joined room ${roomName}`);
    return { event: 'joinedFactory', data: { factoryId } };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinLine')
  async handleJoinLine(
    @ConnectedSocket() client: Socket,
    @MessageBody() lineId: string,
  ) {
    const clientData = this.connectedClients.get(client.id);

    if (!clientData) return;

    const roomName = `line:${lineId}`;
    await client.join(roomName);

    // Update tracked rooms for this client
    clientData.rooms.push(roomName);
    this.connectedClients.set(client.id, clientData);

    console.log(`Client ${client.id} joined room ${roomName}`);
    return { event: 'joinedLine', data: { lineId } };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinTeam')
  async handleJoinTeam(
    @ConnectedSocket() client: Socket,
    @MessageBody() teamId: string,
  ) {
    const clientData = this.connectedClients.get(client.id);

    if (!clientData) return;

    const roomName = `team:${teamId}`;
    await client.join(roomName);

    // Update tracked rooms for this client
    clientData.rooms.push(roomName);
    this.connectedClients.set(client.id, clientData);

    console.log(`Client ${client.id} joined room ${roomName}`);
    return { event: 'joinedTeam', data: { teamId } };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinGroup')
  async handleJoinGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() groupId: string,
  ) {
    const clientData = this.connectedClients.get(client.id);

    if (!clientData) return;

    const roomName = `group:${groupId}`;
    await client.join(roomName);

    // Update tracked rooms for this client
    clientData.rooms.push(roomName);
    this.connectedClients.set(client.id, clientData);

    console.log(`Client ${client.id} joined room ${roomName}`);
    return { event: 'joinedGroup', data: { groupId } };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() roomInfo: { type: string; id: string },
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (!clientData) return;

    const { type, id } = roomInfo;
    const roomName = `${type}:${id}`;

    // Check if client is in the room
    if (clientData.rooms.includes(roomName)) {
      // Leave the room
      await client.leave(roomName);

      // Remove room from tracked rooms
      clientData.rooms = clientData.rooms.filter(room => room !== roomName);
      this.connectedClients.set(client.id, clientData);

      console.log(`Client ${client.id} left room ${roomName}`);
      return { event: 'leftRoom', data: { type, id } };
    }

    return { event: 'roomError', data: { message: 'Not in room' } };
  }

  // Method to broadcast hourly production data updates
  broadcastProductionUpdate(
    factoryId: string,
    lineId: string,
    teamId: string,
    groupId: string,
    data: any,
  ) {
    // Broadcasting to different hierarchical rooms
    if (factoryId) {
      this.server.to(`factory:${factoryId}`).emit('productionUpdate', {
        level: 'factory',
        id: factoryId,
        ...data,
      });
    }

    if (lineId) {
      this.server.to(`line:${lineId}`).emit('productionUpdate', {
        level: 'line',
        id: lineId,
        ...data,
      });
    }

    if (teamId) {
      this.server.to(`team:${teamId}`).emit('productionUpdate', {
        level: 'team',
        id: teamId,
        ...data,
      });
    }

    if (groupId) {
      this.server.to(`group:${groupId}`).emit('productionUpdate', {
        level: 'group',
        id: groupId,
        ...data,
      });
    }
  }

  // Method to broadcast real-time dashboard updates
  broadcastDashboardUpdate(
    level: 'factory' | 'line' | 'team' | 'group',
    id: string,
    data: any,
  ) {
    this.server.to(`${level}:${id}`).emit('dashboardUpdate', {
      level,
      id,
      ...data,
    });
  }
}
