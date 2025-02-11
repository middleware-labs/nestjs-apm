import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { MIDDLEWARE_APM_IGNORE } from './middleware-apm.decorator';

@Injectable()
export class MiddlewareApmInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(executionContext: ExecutionContext, next: CallHandler): Observable<any> {
    const shouldIgnore = this.reflector.get<boolean>(
      MIDDLEWARE_APM_IGNORE,
      executionContext.getHandler(),
    );

    if (shouldIgnore) {
      return next.handle();
    }

    const tracer = trace.getTracer('nestjs');
    const request = executionContext.switchToHttp().getRequest();
    const methodName = executionContext.getHandler().name;
    const className = executionContext.getClass().name;

    return context.with(context.active(), () => {
      const span = tracer.startSpan(`${className}.${methodName}`);

      return next.handle().pipe(
        tap({
          next: (value) => {
            span.setStatus({ code: SpanStatusCode.OK });
            span.end();
          },
          error: (error) => {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error.message,
            });
            span.recordException(error);
            span.end();
          },
        }),
      );
    });
  }
}