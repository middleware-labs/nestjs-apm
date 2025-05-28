import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { trace, context, SpanContext } from "@opentelemetry/api";
import { MIDDLEWARE_APM_IGNORE } from "./middleware-apm.decorator";
import { ApmRouteRegistry } from "./middleware-apm.route-registry";

// Non-recording span context for suppressing tracing
const NON_RECORDING_SPAN_CONTEXT: SpanContext = {
  traceId: "00000000000000000000000000000000",
  spanId: "0000000000000000",
  traceFlags: 0,
  isRemote: false,
};

@Injectable()
export class MiddlewareApmInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(executionContext: ExecutionContext, next: CallHandler): Observable<any> {
    // Check if the method or class has the IgnoreApmTrace decorator
    const shouldIgnore = this.reflector.getAllAndOverride<boolean>(
      MIDDLEWARE_APM_IGNORE,
      [executionContext.getHandler(), executionContext.getClass()]
    );

    if (shouldIgnore) {
      // Register the route in the registry for HTTP-level ignoring
      const request = executionContext.switchToHttp().getRequest();
      if (request && request.route && request.route.path) {
        const routePath = request.route.path;
        ApmRouteRegistry.addIgnoredRoute(routePath);
      }

      // Get the current span and end it if it's recording
      const activeSpan = trace.getSpan(context.active());
      if (activeSpan && activeSpan.isRecording()) {
        // Mark span as not exported by setting a special attribute
        activeSpan.setAttribute('middleware.apm.ignored', true);
        // End the span immediately to prevent it from being exported
        activeSpan.end();
      }
      
      // Create a context with a non-recording span for any child operations
      const nonRecordingContext = trace.setSpanContext(
        context.active(), 
        NON_RECORDING_SPAN_CONTEXT
      );
      
      return context.with(nonRecordingContext, () => {
        return next.handle();
      });
    }

    // If not ignoring, proceed normally
    return next.handle();
  }
} 