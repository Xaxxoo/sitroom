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

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL },
  namespace: '/sitroom',
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  afterInit() {
    this.logger.log('WebSocket gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
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
