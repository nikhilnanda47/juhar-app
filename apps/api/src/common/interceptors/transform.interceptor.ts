import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { requestIdOf, RequestWithId } from '../logging/request-id.middleware';

export interface ApiResponseShape<T> {
  success: boolean;
  data: T;
  requestId: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponseShape<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponseShape<T>> {
    const requestId = requestIdOf(context.switchToHttp().getRequest<RequestWithId>());

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        requestId,
      })),
    );
  }
}
