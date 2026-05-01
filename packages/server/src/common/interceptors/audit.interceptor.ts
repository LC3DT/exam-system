import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;
    const url = request.url;

    if (!user || method === 'GET') return next.handle();

    return next.handle().pipe(
      tap(() => {
        const resource = url.split('/')[2] || 'unknown';
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          this.prisma.auditLog.create({
            data: {
              userId: user.id,
              action: method,
              resource,
              resourceId: request.params?.id,
              ipAddress: request.ip,
              detail: request.body ? JSON.stringify(request.body).slice(0, 1000) : undefined,
            },
          }).catch((err) => console.error('Audit log failed:', err));
        }
      }),
    );
  }
}
