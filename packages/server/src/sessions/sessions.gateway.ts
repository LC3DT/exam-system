import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: 'monitor', cors: { origin: '*' } })
export class SessionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const examId = client.handshake.query.examId as string;
    if (examId) {
      client.join(`exam:${examId}`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log('Monitor client disconnected:', client.id);
  }

  @SubscribeMessage('joinExamRoom')
  handleJoinRoom(client: Socket, payload: { examId: string }) {
    client.join(`exam:${payload.examId}`);
  }

  broadcastStatus(examId: string, data: any) {
    this.server.to(`exam:${examId}`).emit('liveStatus', data);
  }

  broadcastViolation(examId: string, violation: any) {
    this.server.to(`exam:${examId}`).emit('newViolation', violation);
  }
}
