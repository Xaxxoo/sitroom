import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL },
  namespace: '/sitroom',
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) throw new Error('Missing token');

      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      const user = await this.usersService.findOne(payload.sub);
      if (!user || !user.isActive) throw new Error('Invalid user');

      client.data.user = { id: user.id, role: user.role };
      this.logger.log(`Client connected: ${client.id} (user ${user.id})`);
    } catch {
      this.logger.warn(`Rejected unauthenticated socket: ${client.id}`);
      client.disconnect(true);
    }
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token as string | undefined;
    if (authToken) return authToken.replace(/^Bearer\s+/i, '');

    const header = client.handshake.headers?.authorization;
    if (header) return header.replace(/^Bearer\s+/i, '');

    return undefined;
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, room: string) {
    client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);
  }

  emitResultSubmitted(result: any) {
    this.server.emit('result:submitted', result);
    this.server.emit('aggregation:update');
  }

  emitAnomaly(result: any) {
    this.server.emit('result:anomaly', result);
  }

  emitIncidentReported(incident: any) {
    this.server.emit('incident:reported', incident);
  }

  emitIncidentUpdated(incident: any) {
    this.server.emit('incident:updated', incident);
  }

  emitAgentStatus(data: { userId: string; online: boolean }) {
    this.server.emit('agent:status', data);
  }
}
