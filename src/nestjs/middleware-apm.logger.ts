import { Logger as NestLogger, LoggerService } from "@nestjs/common";
import { trace as otelTrace, context as otelContext, SpanStatusCode } from "@opentelemetry/api";
import { log } from "../logger";

/**
 * Custom logger that extends NestJS Logger and integrates with OpenTelemetry
 * to correlate logs with spans and set span status based on log severity.
 */
export class MiddlewareApmLogger extends NestLogger implements LoggerService {
  constructor(context?: string) {
    super(context ?? "");
  }

  /**
   * Log a message with INFO level and correlate with current span
   */
  log(message: any, ...optionalParams: any[]) {
    super.log(message, ...optionalParams);
    this.recordLog("INFO", message, ...optionalParams);
  }

  /**
   * Log a message with DEBUG level and correlate with current span
   */
  debug(message: any, ...optionalParams: any[]) {
    super.debug(message, ...optionalParams);
    this.recordLog("DEBUG", message, ...optionalParams);
  }

  /**
   * Log a message with WARN level and correlate with current span
   * Also sets the span status to UNSET with warning message
   */
  warn(message: any, ...optionalParams: any[]) {
    super.warn(message, ...optionalParams);
    this.recordLog("WARN", message, ...optionalParams);

    // Set span status to UNSET with warning message
    const span = otelTrace.getSpan(otelContext.active());
    if (span) {
      span.setStatus({ code: SpanStatusCode.UNSET, message: String(message) });
    }
  }

  /**
   * Log a message with ERROR level and correlate with current span
   * Also sets the span status to ERROR and records exception if available
   */
  error(message: any, trace?: string, ...optionalParams: any[]) {
    super.error(message, trace, ...optionalParams);

    // Extract error object if it exists in params
    let errorObj: Error | undefined;
    let attributes: Record<string, any> = {};

    if (trace) {
      attributes["stack"] = trace;

      // Try to find an error object in the parameters
      const errorParam = [trace, ...optionalParams].find(
        (param) => param instanceof Error
      );
      if (errorParam instanceof Error) {
        errorObj = errorParam;
      }
    }

    this.recordLog("ERROR", message, attributes);

    // Set span status to ERROR and record exception
    const span = otelTrace.getSpan(otelContext.active());
    if (span) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(message) });

      if (errorObj) {
        span.recordException(errorObj);
      } else if (trace) {
        // Create a synthetic exception if we have a stack trace but no error object
        span.recordException({
          name: "Error",
          message: String(message),
          stack: trace,
        });
      }
    }
  }

  /**
   * Log a message with VERBOSE level and correlate with current span
   */
  verbose(message: any, ...optionalParams: any[]) {
    super.verbose(message, ...optionalParams);
    this.recordLog("DEBUG", message, ...optionalParams); // Map verbose to DEBUG
  }

  /**
   * Record a log message with the OpenTelemetry logger and correlate with current span
   */
  private recordLog(level: string, message: any, ...optionalParams: any[]) {
    let attributes: Record<string, any> = {};

    // Extract context from logger
    if (this.context) {
      attributes["logger.name"] = this.context;
    }

    // Extract additional attributes from optional params
    if (optionalParams.length > 0) {
      const lastParam = optionalParams[optionalParams.length - 1];
      if (
        lastParam &&
        typeof lastParam === "object" &&
        !(lastParam instanceof Error)
      ) {
        Object.assign(attributes, lastParam);
      }
    }

    // Send log to OpenTelemetry
    log(level, String(message), attributes);
  }
}

/**
 * Factory function to create a MiddlewareApmLogger with the given context
 */
export function middlewareLogger(context?: string): LoggerService {
  return new MiddlewareApmLogger(context);
}
