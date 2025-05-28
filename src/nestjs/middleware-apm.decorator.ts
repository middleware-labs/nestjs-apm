import { SetMetadata } from "@nestjs/common";
import {
  trace,
  context,
  Attributes,
  SpanStatusCode,
  Exception,
} from "@opentelemetry/api";
import { MetricAttributes } from "@opentelemetry/api-metrics";
import { getMeter } from "../init";
import { ApmRouteRegistry } from "./middleware-apm.route-registry";

export const MIDDLEWARE_APM_IGNORE = "middleware_apm_ignore";

/**
 * Decorator to ignore OpenTelemetry tracing for a specific endpoint or controller method.
 * When applied, this decorator prevents the creation and export of OTEL traces for the decorated method.
 * Works in conjunction with the MiddlewareApmInterceptor to suppress tracing.
 */
export function IgnoreApmTrace() {
  return function (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
    // Set metadata for the interceptor
    if (propertyKey && descriptor) {
      // Method decorator - try to extract route info
      SetMetadata(MIDDLEWARE_APM_IGNORE, true)(target, propertyKey, descriptor);
      
      // Try to get route information from the target
      const controllerPath = Reflect.getMetadata('path', target.constructor) || '';
      const methodPath = Reflect.getMetadata('path', descriptor.value) || '';
      
      if (controllerPath || methodPath) {
        const fullPath = `${controllerPath}${methodPath}`.replace(/\/+/g, '/');
        if (fullPath && fullPath !== '/') {
          ApmRouteRegistry.addIgnoredRoute(fullPath);
        }
      }
    } else {
      // Class decorator
      SetMetadata(MIDDLEWARE_APM_IGNORE, true)(target);
      
      // Try to get controller path
      const controllerPath = Reflect.getMetadata('path', target) || '';
      if (controllerPath) {
        // Add a wildcard pattern for all routes under this controller
        ApmRouteRegistry.addIgnoredRoute(`${controllerPath}/*`);
      }
    }
  };
}

/**
 * Adds custom attributes to the current span
 * @param attributes Key-value pairs to add as span attributes
 */
export function WithAttributes(attributes: Attributes) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const span = trace.getSpan(context.active());
      if (span) {
        Object.entries(attributes).forEach(([key, value]) => {
          if (value !== undefined) {
            span.setAttribute(key, value);
          }
        });
      }
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Creates a new span for the decorated method
 * @param operationName Name of the span
 * @param attributes Optional initial attributes for the span
 */
export function CreateSpan(operationName: string, attributes: Attributes = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const tracer = trace.getTracer("nestjs");

    descriptor.value = async function (...args: any[]) {
      const span = tracer.startSpan(operationName);
      Object.entries(attributes).forEach(([key, value]) => {
        if (value) span.setAttribute(key, value);
      });

      return context.with(trace.setSpan(context.active(), span), async () => {
        try {
          const result = await originalMethod.apply(this, args);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: errorMessage,
          });

          // Convert unknown error to Exception type
          const exception: Exception = {
            name: error instanceof Error ? error.name : "UnknownError",
            message: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
          };
          span.recordException(exception);
          throw error;
        } finally {
          span.end();
        }
      });
    };

    return descriptor;
  };
}

/**
 * Records method parameters as span attributes
 * @param paramNames Optional array of parameter names to record
 */
export function RecordParams(paramNames?: string[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const span = trace.getSpan(context.active());
      if (span) {
        args.forEach((arg, index) => {
          const paramName = paramNames?.[index] || `param_${index}`;
          if (typeof arg !== "function" && typeof arg !== "object") {
            span.setAttribute(paramName, String(arg));
          }
        });
      }
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
